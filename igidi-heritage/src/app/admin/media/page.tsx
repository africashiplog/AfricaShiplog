import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Notice } from "@/components/admin";
import { MEDIA_KIND_LABELS } from "@/lib/labels";
import { personDisplayName } from "@/services/records";

export const metadata = { title: "الصور والوثائق" };

export default async function MediaLibrary() {
  await requirePageUser();
  const media = await prisma.mediaFile.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { cemetery: true, person: true, source: true, oralAccount: true, uploadedBy: { select: { name: true } } } });
  return (
    <AdminPage title="مكتبة الصور والوثائق">
      <Notice>تُرفع الملفات من صفحة السجل المرتبط بها (المدفن، الشخص، المصدر، الرواية) ليبقى كل ملف موصولًا بسياقه.</Notice>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-parchment text-muted"><tr><th className="p-3 text-start">الملف</th><th className="p-3 text-start">النوع</th><th className="p-3 text-start">مرتبط بـ</th><th className="p-3 text-start">الحقوق</th><th className="p-3 text-start">العرض</th><th className="p-3 text-start">رفعه</th></tr></thead>
          <tbody>
            {media.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="p-3"><a href={`/api/media/${m.id}`} target="_blank" rel="noopener" className="link">{m.title ?? m.originalName}</a></td>
                <td className="p-3">{MEDIA_KIND_LABELS[m.kind]}</td>
                <td className="p-3">
                  {m.cemetery ? <Link className="link" href={`/admin/cemeteries/${m.cemetery.id}?tab=media`}>{m.cemetery.canonicalName}</Link> : null}
                  {m.person ? <Link className="link" href={`/admin/people/${m.person.id}?tab=media`}>{personDisplayName(m.person)}</Link> : null}
                  {m.source ? <Link className="link" href={`/admin/sources/${m.source.id}`}>{m.source.title}</Link> : null}
                  {m.oralAccount ? <Link className="link" href={`/admin/oral?edit=${m.oralAccount.id}`}>{m.oralAccount.title}</Link> : null}
                </td>
                <td className="p-3 text-xs">{m.rights ?? <span className="text-wine">غير محددة</span>}</td>
                <td className="p-3">{m.isPublic ? "عام" : "داخلي"}</td>
                <td className="p-3 text-xs text-muted">{m.uploadedBy?.name ?? "—"} · <span className="ltr">{m.createdAt.toISOString().slice(0, 10)}</span></td>
              </tr>
            ))}
            {media.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted">لا ملفات.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
