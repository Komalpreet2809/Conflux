import { chromium } from "playwright";

const URL = "http://localhost:3000/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 950 }, colorScheme: "dark", deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

let ok = false;
for (let i = 0; i < 20 && !ok; i++) {
  try { await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 8000 }); ok = true; }
  catch { await page.waitForTimeout(1500); }
}
await page.locator("text=Peak congestion").first().waitFor({ timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);

const readLW = () =>
  page.evaluate(() => {
    const el = document.querySelector('div[style*="--lw"]');
    return el ? getComputedStyle(el).getPropertyValue("--lw").trim() : "n/a";
  });

const before = await readLW();
await page.screenshot({ path: "d:/PROJECTS/Gridlockr2/docs/screenshots/resize-before.png" });

const handle = page.getByRole("separator").first();
const box = await handle.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 170, box.y + box.height / 2, { steps: 15 });
  await page.mouse.up();
}
await page.waitForTimeout(800);
const after = await readLW();
await page.screenshot({ path: "d:/PROJECTS/Gridlockr2/docs/screenshots/resize-after.png" });

console.log("left column width  before:", before, " after:", after);
console.log(before !== after ? "RESIZE WORKS ✅" : "no change ❌");
if (errors.length) { console.log("--- errors ---"); errors.slice(0, 6).forEach((e) => console.log(e)); }
else console.log("no client errors ✅");
await browser.close();
