/**
 * Sidebar navigation, gated by permission code. Only links to pages that
 * actually exist are listed here — extend this as each phase adds its pages,
 * rather than linking ahead to routes that 404.
 */
export interface NavItem {
  href: string;
  label: string;
  permission?: string; // omit for links every authenticated user can see
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم" },
  { href: "/dashboard/branches", label: "الفروع", permission: "branches.view" },
  { href: "/dashboard/users", label: "المستخدمون", permission: "users.view" },
  { href: "/dashboard/roles", label: "الأدوار والصلاحيات", permission: "roles.manage" },
];
