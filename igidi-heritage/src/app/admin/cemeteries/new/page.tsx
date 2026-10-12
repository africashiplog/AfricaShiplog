import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Panel } from "@/components/admin";
import { ActionForm, Field } from "@/components/forms";
import { loadOptions } from "@/services/admin-options";
import { createCemeteryAction } from "@/app/admin/_actions/records";

export const metadata = { title: "مدفن جديد" };

export default async function NewCemeteryPage() {
  await requirePageUser("content.edit");
  const { regions } = await loadOptions();
  return (
    <AdminPage title="إضافة مدفن جديد" crumbs={[{ href: "/admin/cemeteries", label: "المدافن" }]}>
      <Panel title="سجل أولي" description="يكفي الاسم المعتمد لإنشاء سجل أولي (مسودة). تُستكمل بقية المعلومات — التاريخ، الموقع، الأشخاص، المصادر — في الأقسام التالية بعد الحفظ.">
        <ActionForm action={createCemeteryAction} submitLabel="إنشاء المسودة ومتابعة التحرير">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الاسم المعتمد للمدفن" name="canonicalName" required help="كما ورد في المصدر الرئيس. يُنبَّه تلقائيًا إلى الأسماء المشابهة لتجنب التكرار.">
              <input id="canonicalName" name="canonicalName" className="input" dir="auto" required />
            </Field>
            <Field label="الاسم المحلي أو التاريخي (بكتابته الأصلية)" name="localName">
              <input id="localName" name="localName" className="input" dir="auto" />
            </Field>
            <Field label="المنطقة" name="regionId">
              <select id="regionId" name="regionId" className="input" defaultValue="">
                <option value="">— غير محددة —</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="القرية أو الموضع" name="locality"><input id="locality" name="locality" className="input" /></Field>
            <Field label="وصف موجز" name="summary" className="md:col-span-2"><textarea id="summary" name="summary" className="input" rows={3} /></Field>
          </div>
        </ActionForm>
      </Panel>
    </AdminPage>
  );
}
