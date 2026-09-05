import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import ChangePasswordForm from "./change-password-form";

export const metadata = { title: "تغيير كلمة المرور | أفريكا شيبلوغ" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-center text-lg font-semibold text-slate-800">تغيير كلمة المرور</h2>
        <ChangePasswordForm forced={user.mustChangePassword} />
      </div>
    </div>
  );
}
