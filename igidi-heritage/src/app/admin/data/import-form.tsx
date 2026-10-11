"use client";

import { useState } from "react";
import Link from "next/link";
import type { ImportReport } from "@/services/data-transfer";

export function ImportForm() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<"cemeteries" | "people">("cemeteries");

  async function run(form: HTMLFormElement, dryRun: boolean) {
    setBusy(true);
    setError(null);
    const fd = new FormData(form);
    fd.set("dryRun", dryRun ? "1" : "0");
    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "تعذّر الاستيراد");
      else setReport(data);
    } catch {
      setError("انقطع الاتصال");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); run(e.currentTarget, true); }} className="grid gap-3 md:grid-cols-3" id="import-form">
        <label className="text-sm font-semibold">
          نوع السجلات
          <select name="entity" className="input mt-1" value={entity} onChange={(e) => { setEntity(e.target.value as "cemeteries" | "people"); setReport(null); }}>
            <option value="cemeteries">مدافن</option>
            <option value="people">أشخاص</option>
          </select>
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          الملف (CSV أو JSON أو Excel ‎.xlsx)
          <input type="file" name="file" required accept=".csv,.json,.xlsx,.txt" className="input mt-1" onChange={() => setReport(null)} />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox" name="allowDuplicates" value="1" /> استيراد الصفوف المشابهة لسجلات موجودة (لا يُنصح به قبل مراجعة التنبيهات)
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <button className="btn btn-ghost" disabled={busy}>{busy ? "جارٍ الفحص…" : "1) فحص الملف (دون حفظ)"}</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !report || !report.dryRun || report.created.length === 0}
            onClick={() => { const f = document.getElementById("import-form") as HTMLFormElement; if (window.confirm("استيراد السجلات الصالحة كمسودات؟")) run(f, false); }}
          >
            2) استيراد السجلات الصالحة كمسودات
          </button>
          <a className="btn btn-ghost" href={`/api/admin/export?template=${entity}`}>تنزيل قالب CSV</a>
        </div>
      </form>
      {error ? <p className="mt-3 text-sm text-wine" role="alert">{error}</p> : null}
      {report ? (
        <div className="mt-4 rounded-lg border border-line bg-white p-4 text-sm" role="status">
          <p className="font-semibold text-green">
            {report.dryRun ? "نتيجة الفحص" : "نتيجة الاستيراد"}: {report.total} صفًا — {report.dryRun ? "صالح للاستيراد" : "أُنشئ"}: {report.created.length} · مكرر محتمل: {report.duplicates.length} · أخطاء: {report.errors.length}
          </p>
          {!report.dryRun && report.created.length ? (
            <ul className="mt-2 list-disc ps-6">{report.created.slice(0, 50).map((c) => <li key={c.row}><Link className="link" href={`/admin/${entity}/${c.id}`}>{c.label}</Link></li>)}</ul>
          ) : null}
          {report.duplicates.length ? (
            <div className="mt-3"><p className="font-semibold text-amber-900">تنبيه تكرار محتمل:</p><ul className="list-disc ps-6">{report.duplicates.map((d) => <li key={d.row}>صف {d.row}: «{d.label}» يشبه: {d.matches.join("، ")}</li>)}</ul></div>
          ) : null}
          {report.errors.length ? (
            <div className="mt-3"><p className="font-semibold text-wine">أخطاء:</p><ul className="list-disc ps-6">{report.errors.map((e) => <li key={e.row}>صف {e.row}: {e.message}</li>)}</ul></div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
