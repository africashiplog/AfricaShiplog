import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "لوحة التحكم | أفريكا شيبلوغ" };

export default async function DashboardHomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900">
        مرحبًا، {user?.fullNameAr ?? user?.fullName}
      </h1>
      <p className="text-sm text-slate-500">
        سيتم إضافة مؤشرات الأداء الرئيسية (الإيرادات، التذاكر، الطرود) إلى هذه اللوحة تدريجيًا مع
        اكتمال باقي وحدات النظام.
      </p>
    </div>
  );
}
