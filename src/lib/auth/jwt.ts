import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not configured (set it in your environment).");
  }
  return encoder.encode(secret);
}

export interface AccessTokenPayload {
  sub: string; // user id
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const ttlMinutes = Number(process.env.JWT_ACCESS_TOKEN_TTL_MINUTES ?? "15");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
