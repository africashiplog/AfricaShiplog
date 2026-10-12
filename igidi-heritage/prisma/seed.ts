/**
 * Seed: only what the project definition itself states — nothing historical is
 * invented here.
 *  - the first administrator account (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD,
 *    or a random password printed once),
 *  - the project's primary source record (title only; bibliographic details
 *    are left empty for the researcher to fill in),
 *  - the study region «إيگيدي» (no coordinates, no description).
 * Safe to run more than once.
 */
import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildSearchText } from "../src/lib/arabic";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.org").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString("base64url") + "7a";
    await prisma.user.create({
      data: { email, name: "مدير النظام", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
    });
    console.log(`Admin created: ${email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) console.log(`Temporary password (shown once): ${password}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  const title = "الحضارة الإيگيدية في ظلال المدافن الشمشوية";
  if (!(await prisma.source.findFirst({ where: { title } }))) {
    await prisma.source.create({
      data: {
        title,
        type: "BOOK",
        isPrimary: true,
        description: "المصدر الرئيس للمشروع. تُستكمل بيانات النشر (المؤلف، الناشر، السنة، الطبعة) من نسخة الكتاب.",
        searchText: buildSearchText([title]),
      },
    });
    console.log("Primary source created.");
  }

  const region = "إيگيدي";
  if (!(await prisma.region.findFirst({ where: { name: region, parentId: null } }))) {
    const altNames = ["إيكيدي"]; // spelling used in the project brief
    await prisma.region.create({ data: { name: region, altNames, kind: "منطقة", searchText: buildSearchText([region, ...altNames]) } });
    console.log("Study region created.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
