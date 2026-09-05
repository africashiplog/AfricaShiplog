import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listExpenses, listExpenseCategories } from "@/services/expense-service";
import { prisma } from "@/lib/db";
import ExpensesManager from "./expenses-manager";

export const metadata = { title: "المصروفات | أفريكا شيبلوغ" };

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "expenses.view")) redirect("/dashboard");

  const [expenses, categories, paymentMethods] = await Promise.all([
    listExpenses({ branchId: user.branchId ?? undefined }),
    listExpenseCategories(),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ExpensesManager
      initialExpenses={JSON.parse(JSON.stringify(expenses))}
      categories={categories.map((c) => ({ id: c.id, nameAr: c.nameAr }))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      canCreate={userHasPermission(user, "expenses.create")}
      canApprove={userHasPermission(user, "expenses.approve")}
    />
  );
}
