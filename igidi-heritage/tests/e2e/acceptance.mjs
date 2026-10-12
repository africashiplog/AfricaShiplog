/**
 * End-to-end walkthrough of the project's 10 acceptance criteria, in a real
 * browser, against a THROWAWAY database (never the real one — test records are
 * clearly labelled «اختبار»).
 *
 *   BASE_URL=http://localhost:3200 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e/acceptance.mjs
 *
 * Requires the `playwright` package (globally or locally) and a Chromium build.
 */
import { createRequire } from "module";
import { mkdirSync } from "fs";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(`${process.env.NODE_GLOBAL_ROOT ?? "/opt/node22/lib/node_modules"}/playwright`);
}
const { chromium } = playwright;

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const EMAIL = process.env.ADMIN_EMAIL ?? "e2e-admin@example.org";
const PASS = process.env.ADMIN_PASSWORD ?? "E2e-Admin-Pass-2026";
const NEW_PASS = "E2e-New-Pass-2026";
const SHOTS = process.env.SHOTS_DIR ?? "./e2e-screenshots";
mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ locale: "ar", viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
page.on("dialog", (d) => d.accept());

async function saveAndWait(scope, label) {
  const btn = scope.getByRole("button", { name: label }).first();
  await btn.click();
  await page.waitForTimeout(300);
  await page.waitForLoadState("networkidle");
}

try {
  // ---- Login + forced password change --------------------------------------
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/account/);
  await page.fill('input[name="current"]', PASS);
  await page.fill('input[name="next"]', NEW_PASS);
  await page.fill('input[name="confirm"]', NEW_PASS);
  await saveAndWait(page, "تغيير كلمة المرور");
  await page.getByText("تم تغيير كلمة المرور").waitFor();
  check("login + forced password change", true);

  // ---- 1. Add a new cemetery ------------------------------------------------
  await page.goto(`${BASE}/admin/cemeteries/new`);
  await page.fill('input[name="canonicalName"]', "مدفن أهل الاختبار");
  await page.selectOption('select[name="regionId"]', { label: "إيگيدي" });
  await saveAndWait(page, "إنشاء المسودة");
  await page.waitForURL(/\/admin\/cemeteries\/[a-z0-9]+\?created=1/);
  const cemeteryUrl = page.url().split("?")[0];
  check("1. add a new cemetery (draft)", true, cemeteryUrl);

  // ---- 3. Original name + translations + history -----------------------------
  await page.fill('input[name="localName"]', "اسم محلي تجريبي");
  await saveAndWait(page, "حفظ «الهوية والتسمية»");
  await page.getByText("حُفظت التعديلات").first().waitFor();
  await page.fill('input[name="name"]', "Cimetière d'essai");
  await page.selectOption('select[name="kind"]', "TRANSLATION");
  await page.selectOption('select[name="language"]', "FR");
  await saveAndWait(page, "إضافة الاسم");
  await page.getByText("Cimetière d'essai").waitFor();
  await page.goto(`${cemeteryUrl}?tab=history`);
  await page.fill('input[name="foundingDateText"]', "تاريخ اختباري");
  await page.fill('input[name="foundingYearHijri"]', "abc");
  await saveAndWait(page, "حفظ «التاريخ»");
  const yearError = await page.getByText("يجب إدخال رقم صحيح").isVisible();
  const keptInput = (await page.inputValue('input[name="foundingDateText"]')) === "تاريخ اختباري";
  check("validation error keeps the user's input", yearError && keptInput);
  await page.fill('input[name="foundingYearHijri"]', "1200");
  await saveAndWait(page, "حفظ «التاريخ»");
  await page.getByText("حُفظت التعديلات").first().waitFor();
  check("3. original name, translation and history saved", true);

  // ---- 2. Location: click on the map, then manual coordinates ---------------
  await page.goto(`${cemeteryUrl}?tab=location`);
  await page.locator(".leaflet-container").first().waitFor();
  await page.waitForTimeout(800);
  const box = await page.locator(".leaflet-container").first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const latFromClick = await page.inputValue('input[name="latitude"]');
  check("2a. clicking the map fills the coordinates", /^-?\d+\.\d{6}$/.test(latFromClick), latFromClick);
  // Missing method + radius for an approximate location must be refused
  await page.selectOption('select[name="precision"]', "APPROXIMATE");
  await saveAndWait(page, "حفظ الموقع");
  check("2b. approximate location without radius/method is refused", await page.getByText("نصف قطر عدم اليقين").first().isVisible());
  await page.fill('input[name="latitude"]', "17.000001");
  await page.fill('input[name="longitude"]', "-15.000001");
  await page.fill('input[name="radiusMeters"]', "750");
  await page.selectOption('select[name="method"]', "ESTIMATE");
  await saveAndWait(page, "حفظ الموقع");
  await page.getByText("الموقع الأساسي — تقريبي").waitFor();
  check("2c. manual coordinates saved as approximate (not confirmed)", await page.getByText("يُعرض غير مؤكد").isVisible());

  // ---- 4. Add a buried person + biography ----------------------------------
  await page.goto(`${cemeteryUrl}?tab=people`);
  await page.fill('input[name="fullName"]', "العلم الأول للاختبار");
  await saveAndWait(page, "إنشاء الشخص ومتابعة");
  await page.waitForURL(/\/admin\/people\/[a-z0-9]+\?created=1&tab=burials/);
  const person1Url = page.url().split("?")[0];
  // cemetery is preselected; mark as BURIED
  await page.selectOption('#link-cemetery select[name="relation"]', "BURIED");
  await saveAndWait(page.locator("#link-cemetery"), "ربط بالمدفن");
  await page.getByText("حُفظت العلاقة بالمدفن").waitFor();
  await page.goto(`${person1Url}?tab=biography`);
  await page.fill('textarea[name="biography"]', "سيرة اختبارية — النسخة الأولى.");
  await saveAndWait(page, "حفظ «السيرة»");
  await page.getByText("حُفظت التعديلات").first().waitFor();
  await page.goto(`${person1Url}?tab=dates`);
  await page.fill('input[name="deathYearHijri"]', "1250");
  await saveAndWait(page, "حفظ «الميلاد والوفاة»");
  await page.getByText("حُفظت التعديلات").first().waitFor();
  check("4. person created from the cemetery, linked as buried, biography saved", true);

  // ---- 6. Citations with page numbers ---------------------------------------
  await page.goto(`${person1Url}?tab=sources`);
  await page.selectOption('select[name="sourceId"]', { index: 1 });
  await page.selectOption('select[name="field"]', "death");
  await page.fill('input[name="pages"]', "45");
  await page.fill('textarea[name="quote"]', "نص اقتباس اختباري");
  await saveAndWait(page, "ربط بالمصدر");
  await page.getByText("أُضيف الاستشهاد").waitFor();
  const deathRow = page.locator("tr", { hasText: "الوفاة" }).first();
  check("6a. citation attached to the death date → status «موثقة»", (await deathRow.textContent()).includes("موثقة بمصدر مباشر"));
  await page.goto(`${person1Url}?tab=burials`);
  await page.getByText("التفاصيل والمصادر").first().click();
  await page.locator('select[name="sourceId"]').first().selectOption({ index: 1 });
  await page.locator('input[name="pages"]').first().fill("46");
  await saveAndWait(page, "ربط بالمصدر");
  await page.getByText("أُضيف الاستشهاد").waitFor();
  check("6b. citation attached to the burial relation itself", true);

  // ---- 7. Second person linked to the same cemetery -------------------------
  await page.goto(`${BASE}/admin/people/new`);
  await page.fill('input[name="fullName"]', "العلم الثاني للاختبار");
  await saveAndWait(page, "إنشاء المسودة");
  // Similar to the first person's name → the duplicate warning must appear; confirm it is a different person
  check("duplicate warning on a similar person name", await page.getByText("توجد سجلات بأسماء مشابهة").isVisible());
  await page.getByLabel("تحققتُ: هذا سجل مختلف").check();
  await saveAndWait(page, "إنشاء المسودة");
  await page.waitForURL(/\/admin\/people\/[a-z0-9]+\?created=1/);
  const person2Url = page.url().split("?")[0];
  await page.goto(`${cemeteryUrl}?tab=people`);
  const linkPanel = page.locator("section", { hasText: "ربط شخص مسجل بهذا المدفن" });
  await linkPanel.locator('select[name="personId"]').selectOption({ label: "العلم الثاني للاختبار" });
  await linkPanel.locator('select[name="relation"]').selectOption("BURIED_PROBABLE");
  await saveAndWait(linkPanel, "ربط");
  await page.getByText("حُفظت العلاقة بالمدفن").waitFor();
  check("7. second person linked to the same cemetery", (await page.locator("li", { hasText: "العلم الثاني للاختبار" }).count()) > 0);

  // Kinship: person 1 is father of person 2
  await page.goto(`${person2Url}?tab=relations`);
  await page.selectOption('select[name="role"]', "father");
  await page.locator('select[name="otherId"]').selectOption({ label: "العلم الأول للاختبار (ت 1250هـ)" });
  await page.selectOption('select[name="verification"]', "ORAL");
  await saveAndWait(page, "حفظ العلاقة");
  await page.getByText("حُفظت العلاقة").first().waitFor();
  // A second father must be refused
  await page.selectOption('select[name="role"]', "father");
  await page.locator('select[name="otherId"]').selectOption({ label: "العلم الأول للاختبار (ت 1250هـ)" });
  await saveAndWait(page, "حفظ العلاقة");
  check("kinship saved; a second father is refused", await page.getByText("أبٌ مسجل بالفعل").isVisible());

  // ---- Duplicate warning ----------------------------------------------------
  await page.goto(`${BASE}/admin/cemeteries/new`);
  await page.fill('input[name="canonicalName"]', "مدفن اهل الاختبار");
  await saveAndWait(page, "إنشاء المسودة");
  check("12. duplicate-name warning (hamza-insensitive)", await page.getByText("توجد سجلات بأسماء مشابهة").isVisible());

  // ---- Publish everything ----------------------------------------------------
  for (const url of [cemeteryUrl, person1Url, person2Url]) {
    await page.goto(`${url}?tab=workflow`);
    await saveAndWait(page, "مراجعة ونشر");
    await page.getByRole("button", { name: "إلغاء النشر" }).waitFor();
  }
  check("review + publish workflow", true);

  // ---- 5 + 8. Public pages: two-way links, search ---------------------------
  const pub = await ctx.newPage();
  await pub.goto(`${BASE}/search?q=${encodeURIComponent("الاختبار")}`);
  const hasCem = await pub.getByRole("link", { name: "مدفن أهل الاختبار" }).count();
  const hasP1 = await pub.getByRole("link", { name: "العلم الأول للاختبار" }).count();
  check("8a. search finds the cemetery and the person", hasCem > 0 && hasP1 > 0);
  await pub.goto(`${BASE}/search?q=${encodeURIComponent("مَدْفَن اهل")}`);
  check("8b. search ignores tashkeel and hamza", (await pub.getByRole("link", { name: "مدفن أهل الاختبار" }).count()) > 0);
  await pub.getByRole("link", { name: "مدفن أهل الاختبار" }).first().click();
  await pub.waitForURL(/\/cemeteries\//);
  const cemText = await pub.locator("main").textContent();
  check("5a. cemetery page lists the buried person", cemText.includes("العلم الأول للاختبار"));
  check("    probable burial shown separately, not as buried", cemText.includes("أشخاص مرتبطون بالمدفن دون ثبوت الدفن فيه") || cemText.includes("يُرجَّح دفنه فيه"));
  check("    approximate location is not shown as confirmed", cemText.includes("غير مؤكد") && !cemText.includes("موقع مؤكد"));
  check("    translation kept with its language", cemText.includes("Cimetière d'essai") && cemText.includes("الفرنسية"));
  await pub.screenshot({ path: `${SHOTS}/cemetery-desktop.png`, fullPage: true });
  await pub.getByRole("link", { name: "العلم الأول للاختبار" }).first().click();
  await pub.waitForURL(/\/people\//);
  const pText = await pub.locator("main").textContent();
  check("5b. person page links back to the cemetery", pText.includes("مدفن أهل الاختبار"));
  check("    death date shows its citation status + page", pText.includes("موثقة بمصدر مباشر") && pText.includes("45"));
  await pub.goto(`${BASE}/genealogy?person=${pub.url().split("/people/")[1]}`);
  await pub.locator("svg[role=img]").waitFor();
  check("genealogy tree renders the relation", (await pub.locator("svg[role=img] text").allTextContents()).some((t) => t.includes("العلم الثاني")));
  await pub.screenshot({ path: `${SHOTS}/genealogy.png` });
  await pub.goto(`${BASE}/map`);
  await pub.locator(".igidi-marker").first().waitFor({ timeout: 10000 });
  check("map shows the cemetery marker (approximate style)", (await pub.locator(".igidi-marker.approximate").count()) === 1);
  await pub.fill("#map-q", "العلم الثاني");
  await pub.waitForTimeout(1200);
  check("map search by buried person's name finds the cemetery", (await pub.locator(".igidi-marker").count()) === 1);
  await pub.selectOption("#map-precision", "CONFIRMED");
  await pub.waitForTimeout(1200);
  check("map filter «confirmed» excludes the approximate location", (await pub.locator(".igidi-marker").count()) === 0);
  await pub.screenshot({ path: `${SHOTS}/map.png` });

  // ---- 9. Edit + correction history + restore --------------------------------
  await page.goto(`${person1Url}?tab=biography`);
  await page.fill('textarea[name="biography"]', "سيرة اختبارية — نسخة مصححة.");
  await saveAndWait(page, "حفظ «السيرة»");
  await page.getByText("حُفظت التعديلات").first().waitFor();
  await page.goto(`${person1Url}?tab=workflow`);
  const histText = await page.locator("section", { hasText: "سجل التعديلات" }).textContent();
  check("9a. revision history kept (create + several updates)", (histText.match(/تعديل/g) ?? []).length >= 3);
  // Restore the version right after the first biography save
  const restoreButtons = page.getByRole("button", { name: "استرجاع هذه النسخة" });
  const n = await restoreButtons.count();
  await restoreButtons.nth(n - 3).click(); // older entry
  await page.waitForLoadState("networkidle");
  await page.getByText("تم استرجاع النسخة").waitFor();
  const after = await (await ctx.newPage()).goto(`${person1Url}?tab=biography`);
  void after;
  await page.goto(`${person1Url}?tab=biography`);
  const bio = await page.inputValue('textarea[name="biography"]');
  check("9b. restore a previous version (logged as a new revision)", bio.includes("النسخة الأولى"), bio);

  // ---- Optimistic locking ---------------------------------------------------
  const tabA = await ctx.newPage();
  const tabB = await ctx.newPage();
  await tabA.goto(`${cemeteryUrl}?tab=narrative`);
  await tabB.goto(`${cemeteryUrl}?tab=narrative`);
  await tabA.fill('textarea[name="history"]', "وصف من النافذة الأولى");
  await tabA.getByRole("button", { name: "حفظ «الوصف والروايات»" }).click();
  await tabA.getByText("حُفظت التعديلات").waitFor();
  await tabB.fill('textarea[name="history"]', "وصف من النافذة الثانية");
  await tabB.getByRole("button", { name: "حفظ «الوصف والروايات»" }).click();
  await tabB.waitForTimeout(800);
  check("concurrent edit is refused instead of silently overwriting", await tabB.getByText("عدّل مستخدم آخر").isVisible());

  // ---- 10. Export + backup --------------------------------------------------
  const json = await page.request.get(`${BASE}/api/admin/export?format=json`);
  const backup = await json.json();
  check("10a. full JSON backup downloads", json.ok() && backup.data.cemeteries.length >= 1 && backup.data.revisions.length > 5);
  check("     backup holds no password hashes", !JSON.stringify(backup).includes("passwordHash"));
  const csv = await page.request.get(`${BASE}/api/admin/export?format=csv&entity=people`);
  const csvText = await csv.text();
  check("10b. CSV export (UTF-8 BOM, Arabic)", csv.ok() && csvText.charCodeAt(0) === 0xfeff && csvText.includes("العلم الأول للاختبار"));

  // ---- Security spot-checks ------------------------------------------------
  const anon = await browser.newContext();
  const r1 = await anon.request.get(`${BASE}/api/admin/export?format=json`);
  check("anonymous export is refused", r1.status() === 401);
  const r2 = await anon.request.post(`${BASE}/api/admin/media`, { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
  check("anonymous upload is refused", r2.status() === 401);
  const bad = await page.request.post(`${BASE}/api/admin/media`, {
    headers: { origin: BASE },
    multipart: { file: { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>" + " ".repeat(40)) } },
  });
  check("upload with a fake image extension is rejected (magic bytes)", bad.status() === 415);
  const draftPage = await anon.request.get(`${BASE}/admin/cemeteries`, { maxRedirects: 0 });
  check("admin pages redirect anonymous visitors", draftPage.status() === 307);

  // ---- Mobile layout --------------------------------------------------------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "ar" });
  const m = await mobile.newPage();
  await m.goto(`${BASE}/`);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("mobile home has no horizontal scroll", !overflow);
  await m.screenshot({ path: `${SHOTS}/home-mobile.png`, fullPage: true });
  await m.goto(`${cemeteryUrl.replace("/admin/cemeteries/", "/cemeteries/")}`);
  await anon.close();
  await mobile.close();
  await page.goto(`${BASE}/`);
  await page.screenshot({ path: `${SHOTS}/home-desktop.png`, fullPage: true });
} catch (e) {
  check("unexpected failure", false, e.message);
  await page.screenshot({ path: `${SHOTS}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
