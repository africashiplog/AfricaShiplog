"use client";

import { useState } from "react";

interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  descriptionAr: string | null;
}
interface RoleRow {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionIds: string[];
}

const emptyForm = { code: "", name: "", nameAr: "", description: "", permissionIds: [] as string[] };

export default function RolesManager({ initialRoles, permissions }: { initialRoles: RoleRow[]; permissions: Permission[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(r: RoleRow) {
    setEditingId(r.id);
    setForm({ code: r.code, name: r.name, nameAr: r.nameAr, description: r.description ?? "", permissionIds: r.permissionIds });
    setError(null);
    setShowForm(true);
  }

  function togglePermission(id: string) {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id) ? prev.permissionIds.filter((p) => p !== id) : [...prev.permissionIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId ? `/api/roles/${editingId}` : "/api/roles";
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId
        ? { name: form.name, nameAr: form.nameAr, description: form.description, permissionIds: form.permissionIds }
        : form;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ ما");
        return;
      }
      if (editingId) {
        setRoles((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...data.role } : r)));
      } else {
        setRoles((prev) => [...prev, { ...data.role, description: form.description || null, userCount: 0 }]);
      }
      setShowForm(false);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الدور؟")) return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message ?? "تعذر حذف الدور");
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">الأدوار والصلاحيات</h1>
        <button onClick={startCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + دور جديد
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{r.nameAr}</h3>
                <p className="ltr-nums text-xs text-slate-400">{r.code}</p>
              </div>
              {r.isSystem && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">دور نظام</span>}
            </div>
            <p className="mt-2 text-xs text-slate-500">{r.permissionIds.length} صلاحية · {r.userCount} مستخدم</p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => startEdit(r)} className="text-sm text-brand hover:underline">
                تعديل الصلاحيات
              </button>
              {!r.isSystem && (
                <button onClick={() => handleDelete(r.id)} className="text-sm text-danger hover:underline">
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{editingId ? "تعديل الدور" : "دور جديد"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">الرمز (بالإنجليزية، مثال: WAREHOUSE_CLERK)</span>
                  <input
                    dir="ltr"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">الاسم (عربي)</span>
                  <input
                    required
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">الاسم (إنجليزي)</span>
                  <input
                    dir="ltr"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700">الصلاحيات</span>
                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module} className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">{module}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => (
                          <label
                            key={p.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                              form.permissionIds.includes(p.id) ? "border-brand bg-brand/10 text-brand-dark" : "border-slate-300 text-slate-600"
                            }`}
                          >
                            <input type="checkbox" className="hidden" checked={form.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} />
                            {p.descriptionAr ?? p.code}
                          </label>
                        ))}
                      </div>
                    </div>
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
