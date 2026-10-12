import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Panel } from "@/components/admin";
import { ActionForm, Field } from "@/components/forms";
import { getSiteSettings } from "@/services/settings";
import { saveSettingsAction } from "@/app/admin/_actions/settings";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  await requirePageUser("settings.manage");
  const s = await getSiteSettings();
  return (
    <AdminPage title="إعدادات المنصة">
      <Panel title="العرض الافتراضي للخريطة والنصوص التعريفية" description="مركز الخريطة الافتراضي هو إطار عرض فقط، وليس موقعًا لأي مدفن.">
        <ActionForm action={saveSettingsAction} submitLabel="حفظ الإعدادات">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="خط العرض للمركز" name="lat"><input name="lat" defaultValue={s.lat} className="input" dir="ltr" /></Field>
            <Field label="خط الطول للمركز" name="lng"><input name="lng" defaultValue={s.lng} className="input" dir="ltr" /></Field>
            <Field label="مستوى التكبير (2–18)" name="zoom"><input name="zoom" defaultValue={s.zoom} className="input" dir="ltr" /></Field>
            <Field label="النص التعريفي في الصفحة الرئيسية" name="intro" className="md:col-span-3"><textarea name="intro" defaultValue={s.intro ?? ""} className="input" rows={3} /></Field>
            <Field label="نص إضافي لصفحة المنهجية (اختياري)" name="methodology" className="md:col-span-3"><textarea name="methodology" defaultValue={s.methodology ?? ""} className="input" rows={6} /></Field>
          </div>
        </ActionForm>
      </Panel>
    </AdminPage>
  );
}
