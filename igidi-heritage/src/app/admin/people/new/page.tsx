import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Panel } from "@/components/admin";
import { ActionForm, Field } from "@/components/forms";
import { loadOptions } from "@/services/admin-options";
import { createPersonAction } from "@/app/admin/_actions/records";

export const metadata = { title: "شخص جديد" };

export default async function NewPersonPage() {
  await requirePageUser("content.edit");
  const { families } = await loadOptions();
  return (
    <AdminPage title="تسجيل شخصية تاريخية" crumbs={[{ href: "/admin/people", label: "الأشخاص" }]}>
      <Panel title="سجل أولي" description="يكفي الاسم (الكامل أو الشائع) لإنشاء مسودة. تُستكمل السيرة والأنساب والمدفن والمصادر بعد الحفظ.">
        <ActionForm action={createPersonAction} submitLabel="إنشاء المسودة ومتابعة التحرير">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الاسم الكامل" name="fullName" help="كما ورد في المصدر. يُنبَّه إلى الأسماء المشابهة لتجنب التكرار."><input id="fullName" name="fullName" className="input" dir="auto" /></Field>
            <Field label="الاسم الشائع" name="commonName"><input id="commonName" name="commonName" className="input" dir="auto" /></Field>
            <Field label="النسب المختصر" name="nasab" className="md:col-span-2"><textarea id="nasab" name="nasab" className="input" rows={2} /></Field>
            <Field label="الأسرة / القبيلة" name="familyId">
              <select id="familyId" name="familyId" className="input" defaultValue="">
                <option value="">— غير محددة —</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="تعريف موجز" name="summary" className="md:col-span-2"><textarea id="summary" name="summary" className="input" rows={3} /></Field>
          </div>
        </ActionForm>
      </Panel>
    </AdminPage>
  );
}
