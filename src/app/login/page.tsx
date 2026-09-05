import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = { title: "تسجيل الدخول | أفريكا شيبلوغ" };

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">أفريكا شيبلوغ</h1>
        <p className="mt-1 text-sm text-slate-500">نظام إدارة وكالة النقل والشحن</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-center text-lg font-semibold text-slate-800">تسجيل الدخول إلى النظام</h2>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
