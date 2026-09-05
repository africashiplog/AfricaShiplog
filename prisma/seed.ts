/**
 * Development-only seed data: default roles/permissions, payment methods,
 * expense categories, a headquarters branch, one admin user, and a starter
 * WhatsApp notification template. Never run this against a production
 * database with real customer/financial data already in it — it is additive
 * (upserts by unique code) but the admin account it creates is for initial
 * bootstrap only.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../src/lib/auth/password";
import { PERMISSIONS, ROLE_DEFS, DEFAULT_ROLE_PERMISSIONS } from "../src/lib/auth/permissions-catalog";

const prisma = new PrismaClient();

async function seedPermissionsAndRoles() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, action: perm.action, description: perm.description, descriptionAr: perm.descriptionAr },
      create: perm,
    });
  }

  for (const role of ROLE_DEFS) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, nameAr: role.nameAr, isSystem: role.isSystem },
      create: role,
    });
  }

  for (const [roleCode, permissionCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

async function seedPaymentMethods() {
  const methods = [
    { code: "CASH", name: "Cash", nameAr: "نقدًا", requiresCashRegister: true },
    { code: "CARD", name: "Card", nameAr: "بطاقة مصرفية", requiresCashRegister: false },
    { code: "BANK_TRANSFER", name: "Bank transfer", nameAr: "تحويل بنكي", requiresCashRegister: false },
    { code: "ELECTRONIC", name: "Electronic payment", nameAr: "دفع إلكتروني", requiresCashRegister: false },
    { code: "OTHER", name: "Other", nameAr: "أخرى", requiresCashRegister: false },
  ];
  for (const m of methods) {
    await prisma.paymentMethod.upsert({ where: { code: m.code }, update: m, create: m });
  }
}

async function seedExpenseCategories() {
  const categories = [
    { code: "FUEL", name: "Fuel", nameAr: "وقود" },
    { code: "SALARIES", name: "Salaries", nameAr: "رواتب" },
    { code: "RENT", name: "Rent", nameAr: "إيجار" },
    { code: "ELECTRICITY", name: "Electricity", nameAr: "كهرباء" },
    { code: "INTERNET", name: "Internet", nameAr: "إنترنت" },
    { code: "MAINTENANCE", name: "Maintenance", nameAr: "صيانة" },
    { code: "TRANSPORTATION", name: "Transportation", nameAr: "نقل" },
    { code: "MARKETING", name: "Marketing", nameAr: "تسويق" },
    { code: "COMMISSIONS", name: "Commissions", nameAr: "عمولات" },
    { code: "OTHER", name: "Other", nameAr: "أخرى" },
  ];
  for (const c of categories) {
    await prisma.expenseCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, nameAr: c.nameAr },
      create: { ...c, isDefault: true },
    });
  }
}

async function seedBranch() {
  const branch = await prisma.branch.upsert({
    where: { code: "HQ" },
    update: {},
    create: {
      code: "HQ",
      name: "Head Office",
      nameAr: "الفرع الرئيسي",
      city: "Nouakchott",
      isActive: true,
    },
  });

  await prisma.cashRegister.upsert({
    where: { code: "HQ-01" },
    update: {},
    create: { branchId: branch.id, code: "HQ-01", name: "الصندوق الرئيسي" },
  });

  return branch;
}

async function seedNotificationTemplate() {
  await prisma.notificationTemplate.upsert({
    where: { code: "PARCEL_ARRIVED" },
    update: {},
    create: {
      code: "PARCEL_ARRIVED",
      name: "Parcel arrived at destination branch",
      bodyAr:
        "مرحبًا {{recipientName}}،\n\nطردكم رقم {{trackingNumber}} وصل إلى {{branchName}} وهو جاهز للاستلام.\n\nالمبلغ المستحق: {{amountDue}}\n\nعنوان الفرع:\n{{branchAddress}}\n\nللاستفسار: {{branchPhone}}\n\nشكرًا لكم.",
      variables: ["recipientName", "trackingNumber", "branchName", "amountDue", "branchAddress", "branchPhone"],
      isActive: true,
    },
  });
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@africashiplog.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email} (skipped)`);
    return;
  }

  const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(password);
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });

  const user = await prisma.user.create({
    data: {
      email,
      fullName: "System Administrator",
      fullNameAr: "مدير النظام",
      passwordHash,
      branchId: null, // global access
      mustChangePassword: true,
      roles: { create: { roleId: superAdminRole.id } },
    },
  });

  console.log("──────────────────────────────────────────────");
  console.log(" Seeded admin account (development only)");
  console.log(` Email:    ${user.email}`);
  console.log(` Password: ${password}`);
  console.log(" You will be required to change this password on first login.");
  console.log("──────────────────────────────────────────────");
}

async function main() {
  await seedPermissionsAndRoles();
  await seedPaymentMethods();
  await seedExpenseCategories();
  await seedBranch();
  await seedNotificationTemplate();
  await seedAdminUser();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
