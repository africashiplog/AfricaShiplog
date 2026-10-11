import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "دخول المحررين" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <div className="ornament grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gold/40 bg-paper p-8 shadow-2xl">
        <p className="text-center text-4xl text-gold" aria-hidden>۞</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-green">لوحة إدارة المحتوى</h1>
        <p className="mb-6 text-center text-sm text-muted">مدافن الشمشوية — إيگيدي وضواحيها</p>
        <LoginForm next={next} />
        <Link href="/" className="mt-6 block text-center text-sm link">العودة إلى الموقع</Link>
      </div>
    </div>
  );
}
