import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminPage, Notice, Panel } from "@/components/admin";
import { ActionForm, Field } from "@/components/forms";
import { changePasswordAction } from "@/app/admin/_actions/auth";
import { ROLE_LABELS } from "@/lib/labels";

export const metadata = { title: "حسابي" };

export default async function AccountPage() {
  // No requirePageUser here: it redirects to this page when a password change is due.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AdminPage title="حسابي">
      {user.mustChangePassword ? <Notice tone="warn">يجب تغيير كلمة المرور المؤقتة قبل متابعة العمل.</Notice> : null}
      <Panel title="البيانات">
        <p className="text-sm">{user.name} · <span className="ltr">{user.email}</span> · {ROLE_LABELS[user.role]}</p>
      </Panel>
      <Panel title="تغيير كلمة المرور">
        <ActionForm action={changePasswordAction} submitLabel="تغيير كلمة المرور" resetOnSuccess>
          <div className="grid max-w-md gap-3">
            <Field label="كلمة المرور الحالية" name="current" required><input name="current" type="password" className="input" dir="ltr" autoComplete="current-password" /></Field>
            <Field label="كلمة المرور الجديدة" name="next" required help="10 أحرف على الأقل، بحروف وأرقام."><input name="next" type="password" className="input" dir="ltr" autoComplete="new-password" /></Field>
            <Field label="تأكيد كلمة المرور" name="confirm" required><input name="confirm" type="password" className="input" dir="ltr" autoComplete="new-password" /></Field>
          </div>
        </ActionForm>
      </Panel>
    </AdminPage>
  );
}
