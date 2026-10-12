"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MEDIA_KIND_LABELS } from "@/lib/labels";

/** Uploads to /api/admin/media (route handler, so large files are not bound by server-action limits). */
export function MediaUploader({ target, defaultKind = "PHOTO" }: { target: Record<string, string>; defaultKind?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    for (const [k, v] of Object.entries(target)) fd.set(k, v);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: data.error ?? "تعذّر رفع الملف" });
      else {
        setMsg({ ok: true, text: data.duplicate ? "رُفع الملف ✓ (تنبيه: يوجد ملف مطابق مرفوع سابقًا)" : "رُفع الملف ✓" });
        formRef.current?.reset();
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "انقطع الاتصال أثناء الرفع" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
      <label className="text-sm font-semibold md:col-span-2">
        الملف (صورة، PDF، صوت — حتى 25 ميغابايت)
        <input type="file" name="file" required className="input mt-1" accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,application/pdf,audio/*" />
      </label>
      <label className="text-sm font-semibold">
        النوع
        <select name="kind" defaultValue={defaultKind} className="input mt-1">
          {Object.entries(MEDIA_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">
        العنوان
        <input name="title" className="input mt-1" />
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        الوصف / التعليق
        <input name="caption" className="input mt-1" />
      </label>
      <label className="text-sm font-semibold">
        المصوّر / المالك
        <input name="credit" className="input mt-1" />
      </label>
      <label className="text-sm font-semibold">
        حقوق النشر / الترخيص
        <input name="rights" className="input mt-1" placeholder="مثال: بإذن المالك، CC BY 4.0…" />
      </label>
      <label className="flex items-center gap-2 text-sm md:col-span-3">
        <input type="checkbox" name="isPublic" /> يُعرض للعامة (يتطلب تحديد حقوق النشر، ولا يظهر إلا إذا نُشر السجل)
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={busy}>{busy ? "جارٍ الرفع…" : "رفع"}</button>
      </div>
      {msg ? <p className={`text-sm md:col-span-4 ${msg.ok ? "text-green" : "text-wine"}`} role="status">{msg.text}</p> : null}
    </form>
  );
}
