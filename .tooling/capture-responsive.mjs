import { chromium } from "playwright";

const URL = "http://localhost:3000/";
const OUT = "d:/PROJECTS/Gridlockr2/docs/screenshots";
const VIEWPORTS = [
  { name: "mobile", w: 390, h: 844, full: true },
  { name: "tablet", w: 834, h: 1112, full: true },
  { name: "desktop", w: 1680, h: 950, full: false },
];

const browser = await chromium.launch();
const allErrors = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") allErrors.push(`[${vp.name}] ${m.text()}`); });
  page.on("pageerror", (e) => allErrors.push(`[${vp.name}] pageerror: ${e.message}`));

  // Retry navigation while dev server warms up.
  let loaded = false;
  for (let i = 0; i < 20 && !loaded; i++) {
    try { await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 8000 }); loaded = true; }
    catch { await page.waitForTimeout(1500); }
  }
  await page.locator("text=Peak congestion").first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500); // let map tiles settle
  await page.screenshot({ path: `${OUT}/resp-${vp.name}.png`, fullPage: vp.full });
  console.log(`captured resp-${vp.name}.png (${vp.w}x${vp.h}${vp.full ? " full" : ""})`);
  await ctx.close();
}

await browser.close();
if (allErrors.length) { console.log("\n=== ERRORS ==="); allErrors.slice(0, 10).forEach((e) => console.log(e)); }
else console.log("\nno client errors ✅");
