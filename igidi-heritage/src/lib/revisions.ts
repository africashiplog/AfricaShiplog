import type { Prisma, RevisionAction } from "@prisma/client";

const IGNORED = new Set(["updatedAt", "createdAt", "searchText", "version"]);

type Plain = Record<string, unknown>;

/** JSON-safe copy (Decimal/Date -> string). */
export function toPlain(value: unknown): Plain | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Plain;
}

/** Field-level diff of two flat snapshots. */
export function diffSnapshots(before: Plain | null, after: Plain | null): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    if (IGNORED.has(k)) continue;
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) changes[k] = { from: a, to: b };
  }
  return changes;
}

export async function recordRevision(
  tx: Prisma.TransactionClient,
  args: {
    entityType: string;
    entityId: string;
    action: RevisionAction;
    userId: string | null;
    before?: unknown;
    after?: unknown;
    summary?: string;
  }
) {
  const before = toPlain(args.before);
  const after = toPlain(args.after);
  const changes = diffSnapshots(before, after);
  if (args.action === "UPDATE" && Object.keys(changes).length === 0) return;
  await tx.revision.create({
    data: {
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      userId: args.userId,
      summary: args.summary ?? null,
      changes: changes as Prisma.InputJsonValue,
      snapshot: (after ?? before ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
