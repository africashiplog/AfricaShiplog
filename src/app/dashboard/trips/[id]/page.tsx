import { redirect, notFound } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getTrip } from "@/services/trip-service";
import { prisma } from "@/lib/db";
import TripDetailClient from "./trip-detail";

export const metadata = { title: "تفاصيل الرحلة | أفريكا شيبلوغ" };

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "trips.view")) redirect("/dashboard");

  const { id } = await params;
  const [trip, paymentMethods] = await Promise.all([
    getTrip(id),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!trip) notFound();

  return (
    <TripDetailClient
      initialTrip={JSON.parse(JSON.stringify(trip))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, code: p.code, nameAr: p.nameAr }))}
      canSell={userHasPermission(user, "tickets.create")}
      canCancelTicket={userHasPermission(user, "tickets.cancel")}
      canRefund={userHasPermission(user, "tickets.refund")}
      canMarkUsed={userHasPermission(user, "tickets.edit")}
    />
  );
}
