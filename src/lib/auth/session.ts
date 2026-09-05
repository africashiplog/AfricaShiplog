import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { signAccessToken, verifyAccessToken } from "./jwt";
import { generateRefreshToken, hashRefreshToken } from "./refresh-token";

export const ACCESS_COOKIE = "as_at";
export const REFRESH_COOKIE = "as_rt";

const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TOKEN_TTL_DAYS ?? "7");

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

async function clientMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent") ?? undefined,
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      undefined,
  };
}

/** Creates a new session (login): issues an access token cookie + a persisted refresh token. */
export async function createSession(userId: string) {
  const accessToken = await signAccessToken({ sub: userId });
  const refreshToken = generateRefreshToken();
  const meta = await clientMeta();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId,
      refreshToken: hashRefreshToken(refreshToken),
      expiresAt,
      ...meta,
    },
  });

  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * Number(process.env.JWT_ACCESS_TOKEN_TTL_MINUTES ?? "15")));
  store.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60));
}

/** Rotates the refresh token and issues a fresh access token cookie. Returns false if invalid. */
export async function refreshSession(): Promise<boolean> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const hashed = hashRefreshToken(refreshToken);
  const existing = await prisma.userSession.findUnique({ where: { refreshToken: hashed } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return false;
  }

  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.userSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
    prisma.userSession.create({
      data: {
        userId: existing.userId,
        refreshToken: hashRefreshToken(newRefreshToken),
        expiresAt,
        ...(await clientMeta()),
      },
    }),
  ]);

  const accessToken = await signAccessToken({ sub: existing.userId });
  store.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * Number(process.env.JWT_ACCESS_TOKEN_TTL_MINUTES ?? "15")));
  store.set(REFRESH_COOKIE, newRefreshToken, cookieOptions(REFRESH_TTL_DAYS * 24 * 60 * 60));
  return true;
}

/** Logs out: revokes the refresh token in the DB and clears cookies. */
export async function destroySession() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await prisma.userSession
      .updateMany({
        where: { refreshToken: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/** Reads and verifies the access token cookie; returns the user id or null. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  return payload?.sub ?? null;
}
