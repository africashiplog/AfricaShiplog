import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getRevenueExpenseTrend, getVolumeTrend, getBranchRevenue, getDestinationRevenue } from "@/services/analytics-service";
import SimpleBarChart from "@/components/simple-bar-chart";

export const metadata = { title: "التحليلات المالية | أفريكا شيبلوغ" };

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "analytics.view")) redirect("/dashboard");

  const branchId = user.branchId ?? undefined;
  const [revenueExpenseTrend, volumeTrend, branchRevenue, destinationRevenue] = await Promise.all([
    getRevenueExpenseTrend(14, branchId),
    getVolumeTrend(14, branchId),
    getBranchRevenue(),
    getDestinationRevenue(),
  ]);

  const shortDate = (iso: string) => iso.slice(5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">التحليلات المالية</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">الإيرادات والمصروفات وصافي الربح (آخر 14 يومًا)</h2>
        <SimpleBarChart
          categories={revenueExpenseTrend.map((d) => shortDate(d.date))}
          series={[
            { label: "الإيرادات", color: "#0f6e5f", values: revenueExpenseTrend.map((d) => Number(d.revenue)) },
            { label: "المصروفات", color: "#b91c1c", values: revenueExpenseTrend.map((d) => Number(d.expenses)) },
            { label: "صافي الربح", color: "#0369a1", values: revenueExpenseTrend.map((d) => Number(d.profit)) },
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">حجم التذاكر والطرود (آخر 14 يومًا)</h2>
        <SimpleBarChart
          categories={volumeTrend.map((d) => shortDate(d.date))}
          series={[
            { label: "تذاكر", color: "#0f6e5f", values: volumeTrend.map((d) => d.tickets) },
            { label: "طرود", color: "#b45309", values: volumeTrend.map((d) => d.parcels) },
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">أداء الفروع (إجمالي الإيرادات والمصروفات)</h2>
        <SimpleBarChart
          categories={branchRevenue.map((b) => b.branchName)}
          series={[
            { label: "الإيرادات", color: "#0f6e5f", values: branchRevenue.map((b) => Number(b.revenue)) },
            { label: "المصروفات", color: "#b91c1c", values: branchRevenue.map((b) => Number(b.expenses)) },
          ]}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-semibold text-slate-800">الإيرادات حسب وجهة الرحلة</h2>
        <p className="mb-3 text-xs text-slate-400">
          هذه إيرادات وليست أرباحًا — لا توجد تكاليف موزعة لكل خط سير بعد. يمكن تفعيل توزيع التكاليف من الإعدادات لاحقًا لعرض الربحية الفعلية.
        </p>
        {destinationRevenue.length > 0 ? (
          <SimpleBarChart
            categories={destinationRevenue.map((d) => d.destination)}
            series={[{ label: "الإيرادات", color: "#0f6e5f", values: destinationRevenue.map((d) => Number(d.revenue)) }]}
          />
        ) : (
          <p className="text-sm text-slate-400">لا توجد بيانات كافية بعد</p>
        )}
      </section>
    </div>
  );
}
