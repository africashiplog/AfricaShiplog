import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

/** Wipes all tables between test suites — safe because this only ever points at the test database. */
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (names.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  }
}

export async function createBranch(code = "TST") {
  const branch = await prisma.branch.create({
    data: { code, name: `Branch ${code}`, nameAr: `فرع ${code}` },
  });
  const cashRegister = await prisma.cashRegister.create({
    data: { branchId: branch.id, code: `${code}-01`, name: "الصندوق الرئيسي" },
  });
  return { branch, cashRegister };
}

export async function createPaymentMethods() {
  const cash = await prisma.paymentMethod.create({
    data: { code: "CASH", name: "Cash", nameAr: "نقدًا", requiresCashRegister: true },
  });
  const card = await prisma.paymentMethod.create({
    data: { code: "CARD", name: "Card", nameAr: "بطاقة", requiresCashRegister: false },
  });
  return { cash, card };
}

export async function createUser(branchId: string | null = null) {
  return prisma.user.create({
    data: {
      email: `user-${Math.random().toString(36).slice(2)}@test.local`,
      fullName: "Test User",
      passwordHash: await hashPassword("Password123!"),
      branchId,
    },
  });
}

export async function openCashSession(cashRegisterId: string, userId: string, openingBalance = 0) {
  return prisma.cashRegisterSession.create({
    data: { cashRegisterId, openedById: userId, openingBalance },
  });
}
