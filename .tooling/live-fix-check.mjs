import { chromium } from "playwright";
const URL = "https://conflux-chi-orpin.vercel.app/";
const OUT = "d:/PROJECTS/Gridlockr2/docs/screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 950 }, colorScheme: "dark", deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("text=Peak congestion").first().waitFor({ timeout: 90000 }).catch(() => {});
await page.waitForTimeout(3500);

const interv = page.locator("text=INTERVENTIONS").first();
const card = interv.locator("xpath=ancestor::div[contains(@class,'panel-2')][1]");
await card.screenshot({ path: `${OUT}/live-kpi.png` }).catch(() => console.log("kpi not found"));

// Detect old vs new: new build has icon-only action buttons (no 'Export' text in tab row)
const exportText = await page.getByRole("button", { name: "Export" }).count().catch(() => 0);
console.log("live build has OLD 'Export' text button:", exportText > 0 ? "YES (stale)" : "no (new build) ✅");
await browser.close();
