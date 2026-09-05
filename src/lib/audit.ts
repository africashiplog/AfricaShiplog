import { headers } from "next/headers";
import { prisma } from "@/lib/db";

interface AuditLogInput {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  previousData?: unknown;
  newData?: unknown;
}

/** Writes an immutable audit trail entry. Never expose an update/delete path for this table. */
export async function writeAuditLog(input: AuditLogInput) {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    // headers() is unavailable outside a request scope (e.g. seed scripts) — that's fine.
  }

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      branchId: input.branchId ?? null,
      previousData: input.previousData === undefined ? undefined : (input.previousData as object),
      newData: input.newData === undefined ? undefined : (input.newData as object),
      ipAddress,
      userAgent,
    },
  });
}
