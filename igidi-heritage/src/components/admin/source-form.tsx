import type { Source } from "@prisma/client";
import { ActionForm, Field } from "@/components/forms";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";
import { saveSourceAction } from "@/app/admin/_actions/catalog";

export function SourceForm({ source, readOnly = false }: { source?: Source; readOnly?: boolean }) {
  const s = source;
  return (
    <ActionForm action={saveSourceAction} submitLabel={s ? "حفظ المصدر" : "إضافة المصدر"} hideSubmit={readOnly}>
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-3">
        <Field label="عنوان الكتاب أو الوثيقة" name="title" required className="md:col-span-2"><input id="title" name="title" defaultValue={s?.title ?? ""} className="input" dir="auto" /></Field>
        <Field label="النوع" name="type">
          <select name="type" defaultValue={s?.type ?? "BOOK"} className="input">
            {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="المؤلف" name="author"><input name="author" defaultValue={s?.author ?? ""} className="input" /></Field>
        <Field label="المحقق" name="editor"><input name="editor" defaultValue={s?.editor ?? ""} className="input" /></Field>
        <Field label="الناشر" name="publisher"><input name="publisher" defaultValue={s?.publisher ?? ""} className="input" /></Field>
        <Field label="مكان النشر" name="publicationPlace"><input name="publicationPlace" defaultValue={s?.publicationPlace ?? ""} className="input" /></Field>
        <Field label="سنة النشر" name="year"><input name="year" defaultValue={s?.year ?? ""} className="input" placeholder="مثال: 1440هـ / 2019م" /></Field>
        <Field label="الطبعة" name="edition"><input name="edition" defaultValue={s?.edition ?? ""} className="input" /></Field>
        <Field label="عدد الأجزاء" name="volumes"><input name="volumes" defaultValue={s?.volumes ?? ""} className="input" /></Field>
        <Field label="رابط المصدر الرقمي" name="url" className="md:col-span-2"><input name="url" defaultValue={s?.url ?? ""} className="input" dir="ltr" placeholder="https://" /></Field>
        <Field label="وصف المصدر" name="description" className="md:col-span-3"><textarea name="description" defaultValue={s?.description ?? ""} className="input" rows={3} /></Field>
        <Field label="ملاحظات حول الموثوقية" name="reliabilityNotes" className="md:col-span-3"><textarea name="reliabilityNotes" defaultValue={s?.reliabilityNotes ?? ""} className="input" rows={3} /></Field>
        <Field label="حقوق النشر (هل يُسمح بنشر صور الصفحات والمقتطفات؟)" name="rightsNotes" className="md:col-span-3"><input name="rightsNotes" defaultValue={s?.rightsNotes ?? ""} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="isPrimary" defaultChecked={s?.isPrimary ?? false} /> مصدر رئيس للمشروع (يظهر في الصفحة الرئيسية)</label>
      </fieldset>
    </ActionForm>
  );
}
