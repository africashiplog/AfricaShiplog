import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listAuditLogs } from "@/services/audit-log-service";
import AuditLogManager from "./audit-log-manager";

export const metadata = { title: "السجل | أفريكا شيبلوغ" };

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "audit.view")) redirect("/dashboard");

  const logs = await listAuditLogs({ branchId: user.branchId ?? undefined });

  return <AuditLogManager initialLogs={JSON.parse(JSON.stringify(logs))} />;
}
