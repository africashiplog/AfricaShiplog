"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/_actions/auth";
import { SubmitButton } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, { ok: false });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-semibold">
        البريد الإلكتروني
        <input name="email" type="email" required autoComplete="username" dir="ltr" className="input mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        كلمة المرور
        <input name="password" type="password" required autoComplete="current-password" dir="ltr" className="input mt-1" />
      </label>
      {state.message ? <p role="alert" className="text-sm text-wine">{state.message}</p> : null}
      <SubmitButton className="btn btn-primary w-full">دخول</SubmitButton>
    </form>
  );
}
