import { randomInt } from "crypto";

function datePart(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function randomDigits(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += randomInt(0, 10).toString();
  return out;
}

export function generateTripNumber() {
  return `TRP-${datePart()}-${randomDigits(4)}`;
}

export function generateTicketNumber() {
  return `TCK-${datePart()}-${randomDigits(6)}`;
}

export function generateTrackingNumber() {
  return `ASL${datePart()}${randomDigits(6)}`;
}

export function generateReferenceNumber(prefix: string) {
  return `${prefix}-${datePart()}-${randomDigits(6)}`;
}

/**
 * Runs `attempt` and retries on a Prisma unique-constraint violation (P2002),
 * regenerating the identifier each time — this is the safe way to guarantee
 * uniqueness under concurrency instead of check-then-insert, which races.
 */
export async function withUniqueRetry<T>(attempt: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt();
    } catch (e) {
      lastError = e;
      const code = (e as { code?: string } | null)?.code;
      if (code !== "P2002") throw e;
    }
  }
  throw lastError;
}
