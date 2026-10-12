import type { SectionSpec } from "@/lib/field-specs";
import { YEAR_RANGES } from "@/lib/field-specs";
import { ActionForm, Field } from "@/components/forms";
import type { ActionResult } from "@/lib/forms";

export interface Options {
  regions: Array<{ id: string; name: string }>;
  families: Array<{ id: string; name: string }>;
  periods: Array<{ id: string; name: string }>;
}

/** Renders one section of a record as its own form (only these fields are saved). */
export function SectionForm({
  section,
  record,
  periodIds,
  options,
  action,
  hidden,
  readOnly = false,
}: {
  section: SectionSpec;
  record: Record<string, unknown>;
  periodIds: string[];
  options: Options;
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  readOnly?: boolean;
}) {
  return (
    <ActionForm action={action} submitLabel={`حفظ «${section.title}»`} hideSubmit={readOnly}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="section" value={section.key} />
      <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-2">
        {section.fields.map((f) => {
          const value = record[f.name];
          const str = value == null ? "" : String(value);
          const cls = f.kind === "textarea" && (f.wide ?? false) ? "md:col-span-2" : f.kind === "textarea" ? "md:col-span-2" : "";
          switch (f.kind) {
            case "textarea":
              return (
                <Field key={f.name} label={f.label} name={f.name} help={f.help} required={f.required} className={cls}>
                  <textarea id={f.name} name={f.name} defaultValue={str} className="input" rows={f.wide ? 8 : 4} dir="auto" />
                </Field>
              );
            case "hijri":
            case "gregorian": {
              const r = YEAR_RANGES[f.kind];
              return (
                <Field key={f.name} label={f.label} name={f.name} help={f.help}>
                  <input id={f.name} name={f.name} defaultValue={str} className="input" inputMode="numeric" dir="ltr" placeholder={`${r.min}–${r.max}`} />
                </Field>
              );
            }
            case "region":
              return (
                <Field key={f.name} label={f.label} name={f.name} help="تُدار قائمة المناطق من «المناطق والفترات والأسر».">
                  <select id={f.name} name={f.name} defaultValue={str} className="input">
                    <option value="">— غير محددة —</option>
                    {options.regions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
              );
            case "family":
              return (
                <Field key={f.name} label={f.label} name={f.name}>
                  <select id={f.name} name={f.name} defaultValue={str} className="input">
                    <option value="">— غير محددة —</option>
                    {options.families.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
              );
            case "gender":
              return (
                <Field key={f.name} label={f.label} name={f.name}>
                  <select id={f.name} name={f.name} defaultValue={str} className="input">
                    <option value="">غير محدد</option>
                    <option value="M">ذكر</option>
                    <option value="F">أنثى</option>
                  </select>
                </Field>
              );
            case "periods":
              return (
                <Field key={f.name} label={f.label} name={f.name} className="md:col-span-2" help={options.periods.length ? undefined : "لم تُعرَّف فترات بعد — أضفها من «المناطق والفترات والأسر»."}>
                  <div className="flex flex-wrap gap-2">
                    {options.periods.map((o) => (
                      <label key={o.id} className="flex items-center gap-1.5 rounded border border-line bg-white px-2 py-1 text-sm">
                        <input type="checkbox" name={f.name} value={o.id} defaultChecked={periodIds.includes(o.id)} /> {o.name}
                      </label>
                    ))}
                  </div>
                </Field>
              );
            case "checkbox":
              return (
                <Field key={f.name} label="" name={f.name} help={f.help} className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name={f.name} defaultChecked={value === true} /> {f.label}
                  </label>
                </Field>
              );
            default:
              return (
                <Field key={f.name} label={f.label} name={f.name} help={f.help} required={f.required}>
                  <input id={f.name} name={f.name} defaultValue={str} className="input" placeholder={f.placeholder} dir="auto" />
                </Field>
              );
          }
        })}
      </fieldset>
    </ActionForm>
  );
}
