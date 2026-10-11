import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Panel } from "@/components/admin";
import { SourceForm } from "@/components/admin/source-form";

export const metadata = { title: "مصدر جديد" };

export default async function NewSourcePage() {
  await requirePageUser("content.edit");
  return (
    <AdminPage title="إضافة مصدر" crumbs={[{ href: "/admin/sources", label: "المصادر" }]}>
      <Panel title="بيانات المصدر" description="أدخل البيانات المتاحة فقط؛ الحقول الناقصة تظهر «لم توثّق بعد».">
        <SourceForm />
      </Panel>
    </AdminPage>
  );
}
