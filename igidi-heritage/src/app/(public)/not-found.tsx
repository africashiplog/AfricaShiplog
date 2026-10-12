import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-5xl text-gold">۞</p>
      <h1 className="mt-4 text-2xl font-bold text-green">الصفحة غير موجودة أو لم تُنشر بعد</h1>
      <Link href="/" className="btn btn-primary mt-6">العودة إلى الرئيسية</Link>
    </div>
  );
}
