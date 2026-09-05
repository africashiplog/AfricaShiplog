import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getDashboardKpis } from "@/services/analytics-service";

export const metadata = { title: "لوحة التحكم | أفريكا شيبلوغ" };

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  const canViewAnalytics = user ? userHasPermission(user, "analytics.view") : false;
  const kpis = canViewAnalytics ? await getDashboardKpis(user?.branchId ?? undefined) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">مرحبًا، {user?.fullNameAr ?? user?.fullName}</h1>
        {!kpis && (
          <p className="mt-1 text-sm text-slate-500">
            سيتم إضافة مؤشرات الأداء الرئيسية إلى هذه اللوحة حسب صلاحياتك.
          </p>
        )}
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="إيرادات اليوم" value={kpis.todayRevenue} />
          <Kpi label="مصروفات اليوم" value={kpis.todayExpenses} />
          <Kpi label="صافي الربح اليوم" value={kpis.todayNetProfit} highlight />
          <Kpi label="تذاكر اليوم" value={kpis.ticketCountToday} />
          <Kpi label="طرود اليوم" value={kpis.parcelCountToday} />
          <Kpi label="طرود جاهزة للاستلام" value={kpis.parcelsReadyForPickup} />
          <Kpi label="طرود متأخرة" value={kpis.delayedParcels} warn={kpis.delayedParcels > 0} />
          <Kpi label="صناديق مفتوحة" value={kpis.openCashRegisters} />
          <Kpi label="إغلاقات اليوم" value={kpis.closedCashRegistersToday} />
          <Kpi label="فروقات نقدية اليوم" value={kpis.cashDifferencesCount} warn={kpis.cashDifferencesCount > 0} />
          <Kpi label="رسائل واتساب فاشلة" value={kpis.whatsappFailures} warn={kpis.whatsappFailures > 0} />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, highlight, warn }: { label: string; value: string | number; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className={`ltr-nums text-lg font-bold ${highlight ? "text-brand-dark" : warn ? "text-warning" : "text-slate-800"}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
