import { Prisma } from "@prisma/client";
import { unstable_rethrow } from "next/navigation";
import { AuthError } from "@/lib/auth/guard";

export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Possible duplicates found; the user can confirm and resubmit. */
  duplicates?: Array<{ id: string; label: string; href: string }>;
  /** Monotonic token so the client can react to every result. */
  at?: number;
}

export const initialResult: ActionResult = { ok: false };

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>, message = "يرجى تصحيح الحقول المشار إليها") {
    super(message);
  }
}

export function str(fd: FormData, name: string, max = 20000): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function int(fd: FormData, name: string, errors: Record<string, string>, opts: { min?: number; max?: number } = {}): number | null {
  const raw = str(fd, name, 20);
  if (raw == null) return null;
  const ascii = raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!/^-?\d+$/.test(ascii)) {
    errors[name] = "يجب إدخال رقم صحيح";
    return null;
  }
  const n = Number(ascii);
  if ((opts.min != null && n < opts.min) || (opts.max != null && n > opts.max)) {
    errors[name] = `القيمة خارج النطاق المسموح (${opts.min ?? ""} – ${opts.max ?? ""})`;
    return null;
  }
  return n;
}

export function decimal(fd: FormData, name: string, errors: Record<string, string>, min: number, max: number): number | null {
  const raw = str(fd, name, 30);
  if (raw == null) return null;
  const ascii = raw.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace("٫", ".").replace(",", ".");
  const n = Number(ascii);
  if (!Number.isFinite(n) || n < min || n > max) {
    errors[name] = `يجب أن تكون القيمة رقمًا بين ${min} و${max}`;
    return null;
  }
  return Math.round(n * 1e6) / 1e6;
}

export function bool(fd: FormData, name: string): boolean {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function oneOf<T extends string>(fd: FormData, name: string, allowed: readonly T[], fallback: T): T {
  const v = fd.get(name);
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function ids(fd: FormData, name: string): string[] {
  return fd.getAll(name).filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 64);
}

/** Wraps a server action body: maps auth/validation/DB errors to an ActionResult. */
export async function runAction(fn: () => Promise<Partial<ActionResult> | void>): Promise<ActionResult> {
  try {
    const res = await fn();
    return { ok: true, ...(res ?? {}), at: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ValidationError) return { ok: false, message: e.message, errors: e.errors, at: Date.now() };
    if (e instanceof AuthError) return { ok: false, message: e.message, at: Date.now() };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { ok: false, message: "يوجد سجل مطابق بالفعل (قيمة مكررة)", at: Date.now() };
      if (e.code === "P2003") return { ok: false, message: "لا يمكن تنفيذ العملية لوجود سجلات مرتبطة", at: Date.now() };
      if (e.code === "P2025") return { ok: false, message: "السجل غير موجود أو حُذف", at: Date.now() };
    }
    if (e instanceof Error && e.message.startsWith("CONFLICT:")) {
      return { ok: false, message: e.message.slice(9), at: Date.now() };
    }
    console.error(e);
    return { ok: false, message: "حدث خطأ غير متوقع أثناء الحفظ", at: Date.now() };
  }
}

