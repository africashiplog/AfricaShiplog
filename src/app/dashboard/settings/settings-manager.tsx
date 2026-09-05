"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import AgencyManager from "./agency-manager";
import RoutesManager from "./routes-manager";
import UsersManager from "../users/users-manager";
import RolesManager from "../roles/roles-manager";
import BranchesManager from "../branches/branches-manager";
import FleetManager from "../fleet/fleet-manager";
import WhatsAppSettingsManager from "./whatsapp/whatsapp-settings-manager";

type Tab = "agency" | "users" | "vehicles" | "routes" | "branches" | "roles" | "whatsapp";

const TABS: { id: Tab; label: string }[] = [
  { id: "agency", label: "الوكالة" },
  { id: "users", label: "المستخدمون" },
  { id: "vehicles", label: "المركبات" },
  { id: "routes", label: "الخطوط" },
  { id: "branches", label: "الفروع" },
  { id: "roles", label: "الأدوار" },
  { id: "whatsapp", label: "واتساب" },
];

interface Props {
  agencyProps: ComponentProps<typeof AgencyManager>;
  usersProps: ComponentProps<typeof UsersManager> | null;
  fleetProps: ComponentProps<typeof FleetManager> | null;
  routesProps: ComponentProps<typeof RoutesManager> | null;
  branchesProps: ComponentProps<typeof BranchesManager> | null;
  rolesProps: ComponentProps<typeof RolesManager> | null;
  whatsappProps: ComponentProps<typeof WhatsAppSettingsManager> | null;
}

export default function SettingsManager({ agencyProps, usersProps, fleetProps, routesProps, branchesProps, rolesProps, whatsappProps }: Props) {
  const availableTabs = TABS.filter((t) => {
    if (t.id === "agency") return true;
    if (t.id === "users") return !!usersProps;
    if (t.id === "vehicles") return !!fleetProps;
    if (t.id === "routes") return !!routesProps;
    if (t.id === "branches") return !!branchesProps;
    if (t.id === "roles") return !!rolesProps;
    if (t.id === "whatsapp") return !!whatsappProps;
    return false;
  });
  const [active, setActive] = useState<Tab>(availableTabs[0]?.id ?? "agency");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {availableTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              active === t.id ? "border-b-2 border-brand text-brand" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "agency" && <AgencyManager {...agencyProps} />}
      {active === "users" && usersProps && <UsersManager {...usersProps} />}
      {active === "vehicles" && fleetProps && <FleetManager {...fleetProps} />}
      {active === "routes" && routesProps && <RoutesManager {...routesProps} />}
      {active === "branches" && branchesProps && <BranchesManager {...branchesProps} />}
      {active === "roles" && rolesProps && <RolesManager {...rolesProps} />}
      {active === "whatsapp" && whatsappProps && <WhatsAppSettingsManager {...whatsappProps} />}
    </div>
  );
}
