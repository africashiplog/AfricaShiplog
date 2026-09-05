import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { resetDatabase, createUser, createBranch } from "./helpers";

describe("audit log", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("persists an immutable record with actor, action, and entity references", async () => {
    const user = await createUser();
    const { branch } = await createBranch();

    await writeAuditLog({
      userId: user.id,
      action: "TICKET_CANCEL",
      entityType: "Ticket",
      entityId: "some-ticket-id",
      branchId: branch.id,
      previousData: { status: "RESERVED" },
      newData: { status: "CANCELLED" },
    });

    const logs = await prisma.auditLog.findMany({ where: { userId: user.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("TICKET_CANCEL");
    expect(logs[0].entityType).toBe("Ticket");
    expect(logs[0].previousData).toEqual({ status: "RESERVED" });
    expect(logs[0].newData).toEqual({ status: "CANCELLED" });
  });

  it("accepts a null userId for system-initiated actions", async () => {
    await writeAuditLog({ userId: null, action: "SYSTEM_JOB", entityType: "System" });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "SYSTEM_JOB" } });
    expect(log.userId).toBeNull();
  });
});
