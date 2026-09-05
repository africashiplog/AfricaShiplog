/**
 * Canonical permission catalog. `prisma/seed.ts` upserts these rows and wires
 * up the default role→permission grants below. The Roles & Permissions admin
 * screen (Phase 2 UI) lets Super Admin adjust grants per role and create new
 * custom roles — this file only defines what permissions *exist*, not who has
 * them by default beyond the initial seed.
 */
export interface PermissionDef {
  code: string;
  module: string;
  action: string;
  description: string;
  descriptionAr: string;
}

export const PERMISSIONS: PermissionDef[] = [
  // Branches
  { code: "branches.view", module: "branches", action: "view", description: "View branches", descriptionAr: "عرض الفروع" },
  { code: "branches.manage", module: "branches", action: "manage", description: "Create/edit branches", descriptionAr: "إدارة الفروع" },
  // Users & access control
  { code: "users.view", module: "users", action: "view", description: "View users", descriptionAr: "عرض المستخدمين" },
  { code: "users.manage", module: "users", action: "manage", description: "Create/edit/deactivate users", descriptionAr: "إدارة المستخدمين" },
  { code: "roles.manage", module: "roles", action: "manage", description: "Manage roles & permissions", descriptionAr: "إدارة الأدوار والصلاحيات" },
  // Customers
  { code: "customers.view", module: "customers", action: "view", description: "View customers", descriptionAr: "عرض العملاء" },
  { code: "customers.create", module: "customers", action: "create", description: "Create customers", descriptionAr: "إنشاء عملاء" },
  { code: "customers.edit", module: "customers", action: "edit", description: "Edit customers", descriptionAr: "تعديل العملاء" },
  // Vehicles / drivers
  { code: "vehicles.manage", module: "vehicles", action: "manage", description: "Manage vehicles", descriptionAr: "إدارة المركبات" },
  { code: "drivers.manage", module: "drivers", action: "manage", description: "Manage drivers", descriptionAr: "إدارة السائقين" },
  // Routes (priced lines between branches)
  { code: "routes.view", module: "routes", action: "view", description: "View routes", descriptionAr: "عرض الخطوط" },
  { code: "routes.manage", module: "routes", action: "manage", description: "Create/edit routes", descriptionAr: "إدارة الخطوط" },
  // Trips
  { code: "trips.view", module: "trips", action: "view", description: "View trips", descriptionAr: "عرض الرحلات" },
  { code: "trips.create", module: "trips", action: "create", description: "Create trips", descriptionAr: "إنشاء رحلات" },
  { code: "trips.edit", module: "trips", action: "edit", description: "Edit trips", descriptionAr: "تعديل الرحلات" },
  { code: "trips.cancel", module: "trips", action: "cancel", description: "Cancel trips", descriptionAr: "إلغاء الرحلات" },
  // Tickets
  { code: "tickets.view", module: "tickets", action: "view", description: "View tickets", descriptionAr: "عرض التذاكر" },
  { code: "tickets.create", module: "tickets", action: "create", description: "Sell tickets", descriptionAr: "بيع التذاكر" },
  { code: "tickets.edit", module: "tickets", action: "edit", description: "Edit tickets", descriptionAr: "تعديل التذاكر" },
  { code: "tickets.cancel", module: "tickets", action: "cancel", description: "Cancel tickets", descriptionAr: "إلغاء التذاكر" },
  { code: "tickets.refund", module: "tickets", action: "refund", description: "Refund tickets", descriptionAr: "استرداد التذاكر" },
  // Parcels
  { code: "parcels.view", module: "parcels", action: "view", description: "View parcels", descriptionAr: "عرض الطرود" },
  { code: "parcels.create", module: "parcels", action: "create", description: "Register parcels", descriptionAr: "تسجيل الطرود" },
  { code: "parcels.edit", module: "parcels", action: "edit", description: "Edit / change parcel status", descriptionAr: "تعديل الطرود وحالتها" },
  { code: "parcels.deliver", module: "parcels", action: "deliver", description: "Deliver parcels & collect COD", descriptionAr: "تسليم الطرود وتحصيل المبالغ" },
  { code: "parcels.cancel", module: "parcels", action: "cancel", description: "Cancel parcels", descriptionAr: "إلغاء الطرود" },
  // Cash registers
  { code: "cash.view", module: "cash", action: "view", description: "View cash registers", descriptionAr: "عرض الصناديق" },
  { code: "cash.open", module: "cash", action: "open", description: "Open a cash register session", descriptionAr: "فتح جلسة صندوق" },
  { code: "cash.close", module: "cash", action: "close", description: "Close a cash register (daily closing)", descriptionAr: "إغلاق الصندوق (الإقفال اليومي)" },
  { code: "cash.reopen", module: "cash", action: "reopen", description: "Reopen a closed cash register", descriptionAr: "إعادة فتح صندوق مغلق" },
  // Expenses
  { code: "expenses.view", module: "expenses", action: "view", description: "View expenses", descriptionAr: "عرض المصروفات" },
  { code: "expenses.create", module: "expenses", action: "create", description: "Record expenses", descriptionAr: "تسجيل مصروف" },
  { code: "expenses.approve", module: "expenses", action: "approve", description: "Approve / void expenses", descriptionAr: "اعتماد أو إبطال المصروفات" },
  // Financial
  { code: "financial.view", module: "financial", action: "view", description: "View financial transactions", descriptionAr: "عرض الحركات المالية" },
  { code: "financial.adjust", module: "financial", action: "adjust", description: "Create financial adjustments/reversals", descriptionAr: "إنشاء تسويات مالية" },
  // Reports & analytics
  { code: "reports.view", module: "reports", action: "view", description: "View reports", descriptionAr: "عرض التقارير" },
  { code: "analytics.view", module: "analytics", action: "view", description: "View profitability analytics", descriptionAr: "عرض التحليلات المالية" },
  // Audit
  { code: "audit.view", module: "audit", action: "view", description: "View the audit log", descriptionAr: "عرض سجل التدقيق" },
  // Settings & WhatsApp
  { code: "settings.manage", module: "settings", action: "manage", description: "Manage system settings", descriptionAr: "إدارة إعدادات النظام" },
  { code: "whatsapp.manage", module: "whatsapp", action: "manage", description: "Manage WhatsApp integration settings", descriptionAr: "إدارة إعدادات واتساب" },
];

export const ROLE_DEFS = [
  { code: "SUPER_ADMIN", name: "Super Admin", nameAr: "المدير العام للنظام", isSystem: true },
  { code: "GENERAL_MANAGER", name: "General Manager", nameAr: "المدير العام", isSystem: true },
  { code: "BRANCH_MANAGER", name: "Branch Manager", nameAr: "مدير الفرع", isSystem: true },
  { code: "TICKET_AGENT", name: "Ticket Agent", nameAr: "موظف التذاكر", isSystem: true },
  { code: "PARCEL_AGENT", name: "Parcel Agent", nameAr: "موظف الطرود", isSystem: true },
  { code: "ACCOUNTANT", name: "Accountant", nameAr: "المحاسب", isSystem: true },
] as const;

const ALL_CODES = PERMISSIONS.map((p) => p.code);

/** Default grants for the seeded system roles. Adjustable later via the Roles UI. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_CODES,
  GENERAL_MANAGER: [
    "branches.view",
    "customers.view", "customers.create", "customers.edit",
    "vehicles.manage", "drivers.manage",
    "routes.view", "routes.manage",
    "trips.view", "trips.create", "trips.edit", "trips.cancel",
    "tickets.view", "tickets.create", "tickets.edit", "tickets.cancel", "tickets.refund",
    "parcels.view", "parcels.create", "parcels.edit", "parcels.deliver", "parcels.cancel",
    "cash.view", "cash.reopen",
    "expenses.view", "expenses.approve",
    "financial.view", "financial.adjust",
    "reports.view", "analytics.view", "audit.view",
  ],
  BRANCH_MANAGER: [
    "customers.view", "customers.create", "customers.edit",
    "routes.view",
    "trips.view", "trips.create", "trips.edit",
    "tickets.view", "tickets.create", "tickets.edit", "tickets.cancel", "tickets.refund",
    "parcels.view", "parcels.create", "parcels.edit", "parcels.deliver", "parcels.cancel",
    "cash.view", "cash.open", "cash.close", "cash.reopen",
    "expenses.view", "expenses.create",
    "financial.view",
    "reports.view", "users.view",
  ],
  TICKET_AGENT: [
    "customers.view", "customers.create",
    "routes.view",
    "trips.view",
    "tickets.view", "tickets.create", "tickets.edit", "tickets.cancel",
  ],
  PARCEL_AGENT: [
    "customers.view", "customers.create",
    "routes.view",
    "parcels.view", "parcels.create", "parcels.edit", "parcels.deliver",
  ],
  ACCOUNTANT: [
    "cash.view", "cash.close", "cash.reopen",
    "expenses.view", "expenses.create", "expenses.approve",
    "financial.view", "financial.adjust",
    "reports.view", "analytics.view",
  ],
};
