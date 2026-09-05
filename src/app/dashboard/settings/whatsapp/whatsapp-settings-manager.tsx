"use client";

import { useState } from "react";

interface Settings {
  businessAccountId: string | null;
  phoneNumberId: string | null;
  hasAccessToken: boolean;
  maskedAccessToken: string | null;
  webhookVerifyTokenSet: boolean;
  isConnected: boolean;
  lastTestedAt: string | null;
}
interface Template {
  id: string;
  code: string;
  name: string;
  bodyAr: string;
}
interface MessageRow {
  id: string;
  recipientPhone: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_AR: Record<string, string> = { PENDING: "قيد الانتظار", SENT: "أُرسلت", DELIVERED: "تم التوصيل", READ: "تمت القراءة", FAILED: "فشلت" };

export default function WhatsAppSettingsManager({
  initialSettings,
  initialTemplates,
  initialMessages,
}: {
  initialSettings: Settings;
  initialTemplates: Template[];
  initialMessages: MessageRow[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [templates, setTemplates] = useState(initialTemplates);
  const [messages, setMessages] = useState(initialMessages);
  const [form, setForm] = useState({
    businessAccountId: initialSettings.businessAccountId ?? "",
    phoneNumberId: initialSettings.phoneNumberId ?? "",
    accessToken: "",
    webhookVerifyToken: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.message ?? "تعذر الحفظ");
      return;
    }
    setSettings(data.settings);
    setForm({ ...form, accessToken: "" });
    setMessage("تم الحفظ");
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/whatsapp/test-connection", { method: "POST" });
    const data = await res.json();
    setTesting(false);
    setMessage(data.message ?? (data.isConnected ? "الاتصال ناجح" : "فشل الاتصال"));
    setSettings((prev) => ({ ...prev, isConnected: !!data.isConnected, lastTestedAt: new Date().toISOString() }));
  }

  async function saveTemplate(id: string, bodyAr: string) {
    const res = await fetch(`/api/whatsapp/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyAr }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر الحفظ");
      return;
    }
    setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)));
  }

  async function handleResend(id: string) {
    const res = await fetch(`/api/whatsapp/messages/${id}/resend`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر إعادة الإرسال");
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? data.message : m)));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">إعدادات واتساب</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">اتصال واتساب Business Cloud API</h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${settings.isConnected ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            {settings.isConnected ? "🟢 متصل" : "🔴 غير متصل"}
          </span>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <Field label="معرّف حساب واتساب Business" value={form.businessAccountId} onChange={(v) => setForm({ ...form, businessAccountId: v })} dir="ltr" />
          <Field label="معرّف رقم الهاتف (Phone Number ID)" value={form.phoneNumberId} onChange={(v) => setForm({ ...form, phoneNumberId: v })} dir="ltr" />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              رمز الوصول (Access Token) {settings.hasAccessToken && <span className="ltr-nums text-xs text-slate-400"> — الحالي: {settings.maskedAccessToken}</span>}
            </span>
            <input
              type="password"
              dir="ltr"
              placeholder={settings.hasAccessToken ? "اتركه فارغًا للإبقاء على الرمز الحالي" : ""}
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <Field label="رمز التحقق من الـ Webhook" value={form.webhookVerifyToken} onChange={(v) => setForm({ ...form, webhookVerifyToken: v })} dir="ltr" />

          {message && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
            <button type="button" onClick={handleTest} disabled={testing} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {testing ? "جارٍ الاختبار..." : "اختبار الاتصال"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">قوالب الرسائل</h2>
        <div className="space-y-4">
          {templates.map((t) => (
            <TemplateEditor key={t.id} template={t} onSave={saveTemplate} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-800">سجل الرسائل المرسلة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">الهاتف</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                <th className="px-3 py-2 text-start font-medium">الخطأ</th>
                <th className="px-3 py-2 text-start font-medium">التاريخ</th>
                <th className="px-3 py-2 text-start font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="ltr-nums px-3 py-2">{m.recipientPhone}</td>
                  <td className="px-3 py-2">{STATUS_AR[m.status] ?? m.status}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-500">{m.errorMessage ?? "—"}</td>
                  <td className="ltr-nums px-3 py-2 text-xs">{new Date(m.createdAt).toLocaleString("ar")}</td>
                  <td className="px-3 py-2">
                    {(m.status === "FAILED" || m.status === "PENDING") && (
                      <button onClick={() => handleResend(m.id)} className="text-sm text-brand hover:underline">
                        إعادة الإرسال
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    لا توجد رسائل بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave }: { template: Template; onSave: (id: string, body: string) => void }) {
  const [body, setBody] = useState(template.bodyAr);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="mb-1 text-sm font-medium text-slate-700">{template.name}</p>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <button onClick={() => onSave(template.id, body)} className="mt-2 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5">
        حفظ القالب
      </button>
    </div>
  );
}

function Field({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir?: "ltr" | "rtl" }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} dir={dir} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
    </label>
  );
}
