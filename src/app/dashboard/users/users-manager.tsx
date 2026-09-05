"use client";

import { useState } from "react";

interface RoleRef {
  id: string;
  code: string;
  nameAr: string;
}
interface BranchRef {
  id: string;
  code: string;
  nameAr: string;
}
interface UserRow {
  id: string;
  email: string;
  fullName: string;
  fullNameAr: string | null;
  phone: string | null;
  isActive: boolean;
  branch: BranchRef | null;
  roles: RoleRef[];
}

const emptyForm = { email: "", fullName: "", fullNameAr: "", phone: "", branchId: "", roleIds: [] as string[] };

export default function UsersManager({
  initialUsers,
  branches,
  roles,
  canManage,
}: {
  initialUsers: UserRow[];
  branches: BranchRef[];
  roles: RoleRef[];
  canManage: boolean;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({
      email: u.email,
      fullName: u.fullName,
      fullNameAr: u.fullNameAr ?? "",
      phone: u.phone ?? "",
      branchId: u.branch?.id ?? "",
      roleIds: u.roles.map((r) => r.id),
    });
    setError(null);
    setShowForm(true);
  }

  function toggleRole(id: string) {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(id) ? prev.roleIds.filter((r) => r !== id) : [...prev.roleIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = editingId
        ? {
            fullName: form.fullName,
            fullNameAr: form.fullNameAr,
            phone: form.phone,
            branchId: form.branchId || null,
            roleIds: form.roleIds,
          }
        : {
            email: form.email,
            fullName: form.fullName,
            fullNameAr: form.fullNameAr,
            phone: form.phone,
            branchId: form.branchId || null,
            roleIds: form.roleIds,
          };
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      if (editingId) {
        setUsers((prev) => prev.map((u) => (u.id === editingId ? data.user : u)));
      } else {
        setUsers((prev) => [data.user, ...prev]);
        setTempPassword({ email: data.user.email, password: data.tempPassword });
      }
      setShowForm(false);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("هل تريد أرشفة هذا المستخدم؟")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر أرشفة المستخدم");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
  }

  async function handleResetPassword(id: string, email: string) {
    if (!confirm("سيتم إنشاء كلمة مرور مؤقتة جديدة لهذا المستخدم. متابعة؟")) return;
    const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر إعادة تعيين كلمة المرور");
      return;
    }
    setTempPassword({ email, password: data.tempPassword });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">المستخدمون</h1>
        {canManage && (
          <button onClick={startCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + مستخدم جديد
          </button>
        )}
      </div>

      {tempPassword && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            كلمة مرور مؤقتة لـ <span className="ltr-nums">{tempPassword.email}</span>:{" "}
            <span className="ltr-nums font-mono">{tempPassword.password}</span>
          </p>
          <p className="mt-1">شارك هذه الكلمة مع الموظف بأمان — سيُطلب منه تغييرها عند أول تسجيل دخول.</p>
          <button onClick={() => setTempPassword(null)} className="mt-2 text-xs text-amber-700 underline">
            إغلاق
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">البريد الإلكتروني</th>
              <th className="px-4 py-3 text-start font-medium">الفرع</th>
              <th className="px-4 py-3 text-start font-medium">الأدوار</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              {canManage && <th className="px-4 py-3 text-start font-medium">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.fullNameAr ?? u.fullName}</td>
                <td className="ltr-nums px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">{u.branch?.nameAr ?? "جميع الفروع"}</td>
                <td className="px-4 py-3">{u.roles.map((r) => r.nameAr).join("، ") || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                    {u.isActive ? "نشط" : "معطل"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => startEdit(u)} className="text-sm text-brand hover:underline">
                        تعديل
                      </button>
                      <button onClick={() => handleResetPassword(u.id, u.email)} className="text-sm text-slate-600 hover:underline">
                        إعادة تعيين كلمة المرور
                      </button>
                      {u.isActive && (
                        <button onClick={() => handleArchive(u.id)} className="text-sm text-danger hover:underline">
                          أرشفة
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  لا يوجد مستخدمون بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editingId ? "تعديل المستخدم" : "مستخدم جديد"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => setForm({ ...form, email: v })} dir="ltr" required disabled={!!editingId} type="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="الاسم (عربي)" value={form.fullNameAr} onChange={(v) => setForm({ ...form, fullNameAr: v })} />
                <Field label="الاسم (إنجليزي)" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} dir="ltr" required />
              </div>
              <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} dir="ltr" />

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">الفرع</span>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">جميع الفروع (وصول عام)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">الأدوار</span>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <label key={r.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${form.roleIds.includes(r.id) ? "border-brand bg-brand/10 text-brand-dark" : "border-slate-300 text-slate-600"}`}>
                      <input type="checkbox" className="hidden" checked={form.roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                      {r.nameAr}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  إلغاء
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                  {submitting ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  required,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </label>
  );
}
