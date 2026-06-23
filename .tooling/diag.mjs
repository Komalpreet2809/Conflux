import { chromium } from "playwright";
const URL = "http://localhost:3000/";
const OUT = "d:/PROJECTS/Gridlockr2/docs/screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 950 }, colorScheme: "dark", deviceScaleFactor: 2 });
let ok = false;
for (let i = 0; i < 20 && !ok; i++) { try { await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 8000 }); ok = true; } catch { await page.waitForTimeout(1500); } }
await page.locator("text=Peak congestion").first().waitFor({ timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);

// Zoom: right panel (tabs live here) at default width.
const rightAside = page.locator("aside").last();
await rightAside.screenshot({ path: `${OUT}/diag-right-default.png` });

// Zoom: the INTERVENTIONS KPI card.
const interv = page.locator("text=INTERVENTIONS").first();
const card = interv.locator("xpath=ancestor::div[contains(@class,'panel-2')][1]");
await card.screenshot({ path: `${OUT}/diag-kpi.png` }).catch(() => console.log("kpi card not found"));

// Now shrink the right column hard (drag right divider right by 90px) and re-shoot.
const handle = page.getByRole("separator").nth(1);
const box = await handle.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.locator("aside").last().screenshot({ path: `${OUT}/diag-right-narrow.png` });
}
console.log("done");
await browser.close();
