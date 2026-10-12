"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/forms";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const ErrorsContext = createContext<Record<string, string>>({});
const PendingContext = createContext(false);

/**
 * Form bound to a server action through useActionState: shows the result
 * message, per-field errors, and possible duplicates (with a "save anyway"
 * confirmation that resubmits with confirmDuplicate=1).
 */
export function ActionForm({
  action,
  children,
  submitLabel = "حفظ",
  className = "",
  resetOnSuccess = false,
  confirmText,
  submitClassName = "btn btn-primary",
  hideSubmit = false,
  id,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  confirmText?: string;
  submitClassName?: string;
  hideSubmit?: boolean;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmDup, setConfirmDup] = useState(false);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the duplicate confirmation after each server result
    if (state.at) setConfirmDup(false);
  }, [state.at, state.ok, resetOnSuccess]);

  return (
    <ErrorsContext.Provider value={state.errors ?? {}}>
      <PendingContext.Provider value={pending}>
      <form
        id={id}
        ref={formRef}
        className={className}
        onSubmit={(e) => {
          // Submit through a transition (not <form action>) so React does not
          // reset the user's input when the server returns validation errors.
          e.preventDefault();
          if (pending) return;
          if (confirmText && !window.confirm(confirmText)) return;
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        <input type="hidden" name="confirmDuplicate" value={confirmDup ? "1" : ""} />
        {state.duplicates?.length ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" role="alert">
            <p className="font-semibold text-amber-900">تنبيه: توجد سجلات بأسماء مشابهة — تحقّق من عدم التكرار:</p>
            <ul className="my-2 list-disc ps-6">
              {state.duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={d.href} className="link" target="_blank">{d.label}</Link>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={confirmDup} onChange={(e) => setConfirmDup(e.target.checked)} />
              تحققتُ: هذا سجل مختلف، أنشئه على أي حال
            </label>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {hideSubmit ? null : <SubmitButton className={submitClassName}>{submitLabel}</SubmitButton>}
          <ResultMessage state={state} />
        </div>
      </form>
      </PendingContext.Provider>
    </ErrorsContext.Provider>
  );
}

export function SubmitButton({ children, className = "btn btn-primary", name, value }: { children: React.ReactNode; className?: string; name?: string; value?: string }) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) || status.pending;
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? "جارٍ الحفظ…" : children}
    </button>
  );
}

function ResultMessage({ state }: { state: ActionResult }) {
  if (!state.at || state.duplicates?.length) return null;
  return (
    <span role="status" className={`text-sm font-medium ${state.ok ? "text-green" : "text-wine"}`}>
      {state.message ?? (state.ok ? "تم الحفظ ✓" : "تعذّر الحفظ")}
    </span>
  );
}

export function FieldError({ name }: { name: string }) {
  const errors = useContext(ErrorsContext);
  return errors[name] ? <p className="mt-1 text-xs text-wine">{errors[name]}</p> : null;
}

export function Field({
  label,
  name,
  help,
  required,
  children,
  className = "",
}: {
  label: string;
  name: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-ink-soft">
        {label}
        {required ? <span className="text-wine"> *</span> : null}
      </label>
      {children}
      {help ? <p className="mt-1 text-xs text-muted">{help}</p> : null}
      <FieldError name={name} />
    </div>
  );
}

/** Button that runs a server action after confirmation (deletes, status changes). */
export function ConfirmActionButton({
  action,
  label,
  confirmText,
  className = "btn btn-ghost btn-sm",
  fields = {},
}: {
  action: Action;
  label: string;
  confirmText?: string;
  className?: string;
  fields?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton className={className}>{label}</SubmitButton>
      {state.at && state.message ? <span role="status" className={`text-xs ${state.ok ? "text-green" : "text-wine"}`}>{state.message}</span> : null}
    </form>
  );
}
