import { chromium } from "playwright";
const URL = "http://localhost:3000/";
const OUT = "d:/PROJECTS/Gridlockr2/docs/screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 950 }, colorScheme: "dark", deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

let ok = false;
for (let i = 0; i < 20 && !ok; i++) {
  try { await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 8000 }); ok = true; } catch { await page.waitForTimeout(1500); }
}
await page.locator("text=Peak congestion").first().waitFor({ timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/fix-plan.png` });
console.log("captured fix-plan.png (KPI + tabs)");

// Switch to Accuracy tab to see the model-performance chart.
await page.getByRole("button", { name: "Accuracy" }).first().click().catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/fix-accuracy.png` });
console.log("captured fix-accuracy.png (chart axes)");

await browser.close();
console.log(errors.length ? "errors: " + errors.slice(0,5).join(" | ") : "no client errors ✅");
