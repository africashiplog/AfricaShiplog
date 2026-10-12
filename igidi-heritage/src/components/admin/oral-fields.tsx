import type { VerificationStatus } from "@prisma/client";
import { Field } from "@/components/forms";
import { VerificationSelect } from "./panels";

type Defaults = Partial<{
  title: string; narrator: string | null; recordedBy: string | null; recordedAt: string | null; place: string | null;
  content: string; consentNote: string | null; narratorPublic: boolean; isPublic: boolean; verification: VerificationStatus;
}>;

export function OralFields({ defaults = {} }: { defaults?: Defaults }) {
  const d = defaults;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="عنوان الرواية" name="title" required><input name="title" defaultValue={d.title ?? ""} className="input" /></Field>
      <Field label="الراوي" name="narrator" help="لا يُعرض اسمه للعامة إلا بموافقته."><input name="narrator" defaultValue={d.narrator ?? ""} className="input" /></Field>
      <Field label="سجّلها" name="recordedBy"><input name="recordedBy" defaultValue={d.recordedBy ?? ""} className="input" /></Field>
      <Field label="تاريخ التسجيل" name="recordedAt"><input name="recordedAt" defaultValue={d.recordedAt ?? ""} className="input" /></Field>
      <Field label="مكان التسجيل" name="place"><input name="place" defaultValue={d.place ?? ""} className="input" /></Field>
      <VerificationSelect defaultValue={d.verification ?? "ORAL"} />
      <Field label="نص الرواية أو ملخصها" name="content" required className="md:col-span-2"><textarea name="content" defaultValue={d.content ?? ""} className="input" rows={5} /></Field>
      <Field label="توثيق موافقة الراوي" name="consentNote" className="md:col-span-2"><input name="consentNote" defaultValue={d.consentNote ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="narratorPublic" defaultChecked={d.narratorPublic ?? false} /> إعلان اسم الراوي (بموافقته)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={d.isPublic ?? false} /> عرض الرواية للعامة</label>
    </div>
  );
}
