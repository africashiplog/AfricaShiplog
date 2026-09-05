import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listTickets } from "@/services/ticket-service";
import TicketsManager from "./tickets-manager";

export const metadata = { title: "التذاكر | أفريكا شيبلوغ" };

export default async function TicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "tickets.view")) redirect("/dashboard");

  const tickets = await listTickets({ branchId: user.branchId ?? undefined });

  return <TicketsManager initialTickets={JSON.parse(JSON.stringify(tickets))} />;
}
