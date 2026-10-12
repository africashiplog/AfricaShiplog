import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "igidi_session";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? "12");

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "mustChangePassword">;

/**
 * Opaque random session token in an httpOnly cookie; only its SHA-256 is
 * stored, so a database leak does not leak usable sessions. Every request
 * re-validates against the database (revocation is immediate).
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

/** Current user for this request (memoized per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) return null;
  // Touch at most once every 5 minutes.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  const { id, email, name, role, mustChangePassword } = session.user;
  return { id, email, name, role, mustChangePassword };
});

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
