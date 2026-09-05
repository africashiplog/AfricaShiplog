import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getDailyClosingSummary } from "@/services/daily-closing-service";
import DailyClosingManager from "./daily-closing-manager";

export const metadata = { title: "إغلاق الصندوق | أفريكا شيبلوغ" };

export default async function DailyClosingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "cash.close")) redirect("/dashboard");

  const today = new Date();
  const summary = await getDailyClosingSummary(today, user.branchId ?? undefined);
  const isoDate = today.toISOString().slice(0, 10);

  return <DailyClosingManager initialSummary={JSON.parse(JSON.stringify(summary))} initialDate={isoDate} />;
}
