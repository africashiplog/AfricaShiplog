import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listParcels } from "@/services/parcel-service";
import { listBranches } from "@/services/branch-service";
import { listRoutes } from "@/services/route-service";
import { prisma } from "@/lib/db";
import ParcelsManager from "./parcels-manager";

export const metadata = { title: "الطرود / البريد | أفريكا شيبلوغ" };

export default async function ParcelsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "parcels.view")) redirect("/dashboard");

  const [parcels, branches, paymentMethods, routes] = await Promise.all([
    listParcels({ branchId: user.branchId ?? undefined }),
    listBranches(false),
    prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    listRoutes(false),
  ]);

  return (
    <ParcelsManager
      initialParcels={JSON.parse(JSON.stringify(parcels))}
      branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr }))}
      paymentMethods={paymentMethods.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      routes={JSON.parse(JSON.stringify(routes)).map((r: { id: string; originBranch: unknown; destinationBranch: unknown; pricePerKg: string }) => ({
        id: r.id,
        originBranch: r.originBranch,
        destinationBranch: r.destinationBranch,
        pricePerKg: r.pricePerKg,
      }))}
      canCreate={userHasPermission(user, "parcels.create")}
    />
  );
}
