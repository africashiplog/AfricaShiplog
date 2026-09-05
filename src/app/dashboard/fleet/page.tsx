import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listVehicles } from "@/services/vehicle-service";
import { listDrivers } from "@/services/driver-service";
import { listBranches } from "@/services/branch-service";
import FleetManager from "./fleet-manager";

export const metadata = { title: "المركبات والسائقون | أفريكا شيبلوغ" };

export default async function FleetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "vehicles.manage") && !userHasPermission(user, "drivers.manage")) redirect("/dashboard");

  const [vehicles, drivers, branches] = await Promise.all([listVehicles(), listDrivers(), listBranches(false)]);

  return (
    <FleetManager
      initialVehicles={vehicles}
      initialDrivers={drivers}
      branches={branches.map((b) => ({ id: b.id, nameAr: b.nameAr }))}
    />
  );
}
