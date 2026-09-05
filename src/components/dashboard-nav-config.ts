/**
 * Sidebar navigation, gated by permission code. Only links to pages that
 * actually exist are listed here — extend this as each phase adds its pages,
 * rather than linking ahead to routes that 404.
 */
export interface NavItem {
  href: string;
  label: string;
  permission?: string; // omit for links every authenticated user can see
  anyPermission?: string[]; // visible if the user holds ANY of these (used for pages made of multiple tabs)
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة القيادة" },
  { href: "/dashboard/tickets", label: "التذاكر", permission: "tickets.view" },
  { href: "/dashboard/parcels", label: "الطرود / البريد", permission: "parcels.view" },
  { href: "/dashboard/trips", label: "إدارة الرحلات", permission: "trips.view" },
  { href: "/dashboard/customers", label: "العملاء", permission: "customers.view" },
  { href: "/dashboard/audit-log", label: "السجل", permission: "audit.view" },
  { href: "/dashboard/cash-registers", label: "الصناديق النقدية", permission: "cash.view" },
  { href: "/dashboard/daily-closing", label: "إغلاق الصندوق", permission: "cash.close" },
  { href: "/dashboard/accounting", label: "المحاسبة", permission: "expenses.view" },
  {
    href: "/dashboard/settings",
    label: "الإعدادات",
    anyPermission: ["settings.manage", "users.manage", "users.view", "branches.manage", "roles.manage", "vehicles.manage", "routes.manage", "whatsapp.manage"],
  },
];
