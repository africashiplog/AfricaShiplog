import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listParcels } from "@/services/parcel-service";
import { listBranches } from "@/services/branch-service";
import { prisma } from "@/lib/db";
import ParcelsManager from "./parcels-manager";

export const metadata = { title: "الطرود | أفريكا شيبلوغ" };

export default async function ParcelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "parcels.view")) redirect("/dashboard");

  const [parcels, branches, paymentMethods] = await Promise.all([
    listParcels({ branchId: user.branchId ?? undefined }),
    listBranches(false),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ParcelsManager
      initialParcels={JSON.parse(JSON.stringify(parcels))}
      branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr }))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      canCreate={userHasPermission(user, "parcels.create")}
    />
  );
}
