import { redirect, notFound } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getCustomerProfile } from "@/services/customer-service";

export const metadata = { title: "ملف العميل | أفريكا شيبلوغ" };

const TICKET_STATUS_AR: Record<string, string> = {
  RESERVED: "محجوزة",
  PAID: "مدفوعة",
  USED: "مستخدمة",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

const PARCEL_STATUS_AR: Record<string, string> = {
  RECEIVED: "تم الاستلام",
  REGISTERED: "مسجلة",
  PROCESSING: "قيد المعالجة",
  DISPATCHED: "تم الإرسال",
  IN_TRANSIT: "في الطريق",
  ARRIVED: "وصلت إلى الفرع",
  READY_FOR_PICKUP: "جاهزة للاستلام",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغاة",
  RETURNED: "مرتجعة",
  LOST: "مفقودة",
  DAMAGED: "تالفة/مشكلة",
};

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "customers.view")) redirect("/dashboard");

  const { id } = await params;
  const profile = await getCustomerProfile(id);
  if (!profile) notFound();

  const { customer, ticketCount, sentCount, receivedCount } = profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
        <p className="ltr-nums text-sm text-slate-500">{customer.phone}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="التذاكر" value={ticketCount} />
        <StatCard label="طرود مرسلة" value={sentCount} />
        <StatCard label="طرود مستلمة" value={receivedCount} />
        <StatCard label="النوع" value={customer.type === "BUSINESS" ? "شركة" : "فرد"} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">آخر التذاكر</h2>
        {customer.tickets.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد تذاكر لهذا العميل بعد</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {customer.tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span className="ltr-nums font-mono text-xs text-slate-500">{t.ticketNumber}</span>
                <span>{TICKET_STATUS_AR[t.status] ?? t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">آخر الطرود المرسلة</h2>
        {customer.parcelsSent.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد طرود مرسلة بعد</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {customer.parcelsSent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="ltr-nums font-mono text-xs text-slate-500">{p.trackingNumber}</span>
                <span>{PARCEL_STATUS_AR[p.status] ?? p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">آخر الطرود المستلمة</h2>
        {customer.parcelsReceived.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد طرود مستلمة بعد</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {customer.parcelsReceived.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="ltr-nums font-mono text-xs text-slate-500">{p.trackingNumber}</span>
                <span>{PARCEL_STATUS_AR[p.status] ?? p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-xl font-bold text-brand-dark">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
