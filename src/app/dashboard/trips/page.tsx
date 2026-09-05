import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listTrips } from "@/services/trip-service";
import { listBranches } from "@/services/branch-service";
import { listVehicles } from "@/services/vehicle-service";
import { listDrivers } from "@/services/driver-service";
import { listRoutes } from "@/services/route-service";
import TripsManager from "./trips-manager";

export const metadata = { title: "إدارة الرحلات | أفريكا شيبلوغ" };

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "trips.view")) redirect("/dashboard");

  const [trips, branches, vehicles, drivers, routes] = await Promise.all([
    listTrips(),
    listBranches(false),
    listVehicles(),
    listDrivers(),
    listRoutes(false),
  ]);

  return (
    <TripsManager
      initialTrips={JSON.parse(JSON.stringify(trips))}
      branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr }))}
      vehicles={vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber }))}
      drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
      routes={JSON.parse(JSON.stringify(routes)).map((r: { id: string; originBranch: unknown; destinationBranch: unknown; pricePerPassenger: string }) => ({
        id: r.id,
        originBranch: r.originBranch,
        destinationBranch: r.destinationBranch,
        pricePerPassenger: r.pricePerPassenger,
      }))}
      canCreate={userHasPermission(user, "trips.create")}
    />
  );
}
