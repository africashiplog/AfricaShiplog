import { randomBytes, createHash } from "crypto";

export function generateRefreshToken(): string {
  return randomBytes(48).toString("hex");
}

/** Refresh tokens are stored hashed — a DB leak alone can't be replayed as a session. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
