import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listCustomers } from "@/services/customer-service";
import CustomersManager from "./customers-manager";

export const metadata = { title: "العملاء | أفريكا شيبلوغ" };

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "customers.view")) redirect("/dashboard");

  const customers = await listCustomers();

  return (
    <CustomersManager
      initialCustomers={customers}
      canCreate={userHasPermission(user, "customers.create")}
      canEdit={userHasPermission(user, "customers.edit")}
    />
  );
}
