import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listTrips } from "@/services/trip-service";
import { listBranches } from "@/services/branch-service";
import { listVehicles } from "@/services/vehicle-service";
import { listDrivers } from "@/services/driver-service";
import TripsManager from "./trips-manager";

export const metadata = { title: "الرحلات | أفريكا شيبلوغ" };

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "trips.view")) redirect("/dashboard");

  const [trips, branches, vehicles, drivers] = await Promise.all([
    listTrips(),
    listBranches(false),
    listVehicles(),
    listDrivers(),
  ]);

  return (
    <TripsManager
      initialTrips={JSON.parse(JSON.stringify(trips))}
      branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr }))}
      vehicles={vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber }))}
      drivers={drivers.map((d) => ({ id: d.id, name: d.name }))}
      canCreate={userHasPermission(user, "trips.create")}
    />
  );
}
