import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listExpenses, listExpenseCategories } from "@/services/expense-service";
import { prisma } from "@/lib/db";
import AccountingManager from "./accounting-manager";

export const metadata = { title: "المحاسبة | أفريكا شيبلوغ" };

export default async function AccountingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "expenses.view")) redirect("/dashboard");

  const [expenses, categories, paymentMethods, trips] = await Promise.all([
    listExpenses({ branchId: user.branchId ?? undefined }),
    listExpenseCategories(),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.trip.findMany({ where: { deletedAt: null }, orderBy: { departureDate: "desc" }, take: 200, select: { id: true, tripNumber: true } }),
  ]);

  return (
    <AccountingManager
      initialExpenses={JSON.parse(JSON.stringify(expenses))}
      categories={categories.map((c) => ({ id: c.id, nameAr: c.nameAr }))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      trips={trips}
      canCreateExpense={userHasPermission(user, "expenses.create")}
      canApproveExpense={userHasPermission(user, "expenses.approve")}
    />
  );
}
