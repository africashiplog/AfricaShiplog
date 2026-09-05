import { redirect } from "next/navigation";
import { getCurrentUser, userHasPermission } from "@/lib/auth/current-user";
import { listRegistersForBranch } from "@/services/cash-register-service";
import { listBranches } from "@/services/branch-service";
import CashRegistersManager from "./cash-registers-manager";

export const metadata = { title: "الصناديق النقدية | أفريكا شيبلوغ" };

export default async function CashRegistersPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userHasPermission(user, "cash.view")) redirect("/dashboard");

  const { branchId: queryBranchId } = await searchParams;
  const branches = await listBranches(false);
  const branchId = user.branchId ?? queryBranchId ?? branches[0]?.id;

  const registers = branchId ? await listRegistersForBranch(branchId) : [];

  return (
    <div className="space-y-4">
      {!user.branchId && branches.length > 1 && (
        <form className="flex items-center gap-2 text-sm">
          <label className="font-medium text-slate-700">
            الفرع:{" "}
            <select name="branchId" defaultValue={branchId} className="ms-2 rounded-lg border border-slate-300 px-2 py-1">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
            عرض
          </button>
        </form>
      )}
      <CashRegistersManager
        initialRegisters={JSON.parse(JSON.stringify(registers)).map((r: { id: string; code: string; name: string; sessions: unknown[] }) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          openSession: r.sessions[0] ?? null,
        }))}
        canOpen={userHasPermission(user, "cash.open")}
      />
    </div>
  );
}
