import { redirect, notFound } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { getParcel } from "@/services/parcel-service";
import { prisma } from "@/lib/db";
import ParcelDetailClient from "./parcel-detail";

export const metadata = { title: "تفاصيل الطرد | أفريكا شيبلوغ" };

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "parcels.view")) redirect("/dashboard");

  const { id } = await params;
  const [parcel, paymentMethods] = await Promise.all([
    getParcel(id),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!parcel) notFound();

  return (
    <ParcelDetailClient
      initialParcel={JSON.parse(JSON.stringify(parcel))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      canEdit={userHasPermission(user, "parcels.edit")}
      canDeliver={userHasPermission(user, "parcels.deliver")}
      canCancel={userHasPermission(user, "parcels.cancel")}
    />
  );
}
