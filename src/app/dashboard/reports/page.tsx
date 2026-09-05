import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import ReportsManager from "./reports-manager";

export const metadata = { title: "التقارير | أفريكا شيبلوغ" };

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "reports.view")) redirect("/dashboard");

  return <ReportsManager />;
}
