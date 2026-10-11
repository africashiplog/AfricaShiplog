import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Panel } from "@/components/admin";
import { ActionForm, Field } from "@/components/forms";
import { ROLE_LABELS } from "@/lib/labels";
import { saveUserAction } from "@/app/admin/_actions/auth";
import type { User } from "@prisma/client";

export const metadata = { title: "المستخدمون" };

const ROLE_HELP: Record<string, string> = {
  ADMIN: "كل الصلاحيات، بما فيها المستخدمون والإعدادات والحذف النهائي.",
  REVIEWER: "التحرير والنشر والأرشفة والاستيراد واسترجاع النسخ.",
  EDITOR: "إنشاء السجلات وتحريرها ورفع الملفات وإرسالها للمراجعة.",
  VIEWER: "الاطلاع على بيانات الإدارة والمسودات دون تعديل.",
};

export default async function UsersPage() {
  const me = await requirePageUser("users.manage");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const form = (u?: User) => (
    <ActionForm action={saveUserAction} submitLabel={u ? "حفظ" : "إضافة المستخدم"} resetOnSuccess={!u} submitClassName={u ? "btn btn-ghost btn-sm" : "btn btn-primary"}>
      {u ? <input type="hidden" name="id" value={u.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="الاسم" name="name" required><input name="name" defaultValue={u?.name ?? ""} className="input" /></Field>
        <Field label="البريد الإلكتروني" name="email" required><input name="email" type="email" defaultValue={u?.email ?? ""} className="input" dir="ltr" /></Field>
        <Field label="الدور" name="role">
          <select name="role" defaultValue={u?.role ?? "EDITOR"} className="input">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label={u ? "كلمة مرور جديدة (اختياري)" : "كلمة مرور مؤقتة"} name="password" required={!u} help="10 أحرف على الأقل بحروف وأرقام. سيُطلب تغييرها عند الدخول.">
          <input name="password" type="password" className="input" dir="ltr" autoComplete="new-password" />
        </Field>
        {u ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={u.isActive} disabled={u.id === me.id} /> الحساب مفعّل</label> : null}
        {u && u.id === me.id ? <input type="hidden" name="isActive" value="on" /> : null}
      </div>
    </ActionForm>
  );
  return (
    <AdminPage title="المستخدمون والصلاحيات">
      <Panel title="الأدوار">
        <ul className="grid gap-2 text-sm md:grid-cols-2">{Object.entries(ROLE_LABELS).map(([k, v]) => <li key={k}><strong>{v}:</strong> {ROLE_HELP[k]}</li>)}</ul>
      </Panel>
      <Panel title="إضافة مستخدم">{form()}</Panel>
      <Panel title={`المستخدمون (${users.length})`}>
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-lg border border-line bg-white p-3">
              <p className="font-semibold">{u.name} <span className="text-sm font-normal text-muted">· {u.email} · {ROLE_LABELS[u.role]} · {u.isActive ? "مفعّل" : "معطّل"}{u.lastLoginAt ? ` · آخر دخول ${u.lastLoginAt.toISOString().slice(0, 10)}` : ""}</span></p>
              <details className="mt-2"><summary className="cursor-pointer text-sm text-green">تعديل</summary><div className="mt-2">{form(u)}</div></details>
            </li>
          ))}
        </ul>
      </Panel>
    </AdminPage>
  );
}
