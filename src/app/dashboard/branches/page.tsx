import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listBranches } from "@/services/branch-service";
import BranchesManager from "./branches-manager";

export const metadata = { title: "الفروع | أفريكا شيبلوغ" };

export default async function BranchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "branches.view")) redirect("/dashboard");

  const branches = await listBranches(true);

  return <BranchesManager initialBranches={branches} canManage={userHasPermission(user, "branches.manage")} />;
}
