import bcrypt from "bcryptjs";

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Minimum policy: 10+ chars with at least one letter and one digit. */
export function passwordPolicyError(plain: string): string | null {
  if (plain.length < 10) return "يجب ألا تقل كلمة المرور عن 10 أحرف";
  if (!/[A-Za-z؀-ۿ]/.test(plain) || !/\d/.test(plain)) return "يجب أن تحتوي كلمة المرور على حروف وأرقام";
  return null;
}
