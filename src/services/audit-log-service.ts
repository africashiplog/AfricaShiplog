import { prisma } from "@/lib/db";

export interface AuditLogFilter {
  branchId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function listAuditLogs(filter: AuditLogFilter = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
              ...(filter.dateTo ? { lte: filter.dateTo } : {}),
            },
          }
        : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, fullNameAr: true, email: true } },
      branch: { select: { id: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}
