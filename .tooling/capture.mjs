import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "d:/PROJECTS/Gridlockr2/docs/screenshots";
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1680, height: 950 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

console.log("navigating...");
await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 60000 });

// Wait for the forecast to load (KPIs render).
await page.locator("text=Peak congestion").first().waitFor({ timeout: 45000 });
// Let the map tiles + leaflet markers settle.
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/01-dashboard.png` });
console.log("captured 01-dashboard.png");

// Close-up of just the map to judge the marker styling.
const mapEl = page.locator(".leaflet-container").first();
if (await mapEl.count()) {
  await mapEl.screenshot({ path: `${OUT}/00-map-closeup.png` });
  console.log("captured 00-map-closeup.png");
}

// Jump to peak + play a frame for a richer map state.
const peakBtn = page.locator("button", { hasText: "Peak" }).first();
if (await peakBtn.count()) {
  await peakBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/02-peak.png` });
  console.log("captured 02-peak.png");
}

// Load a historical replay -> accuracy view.
const replayBtn = page.locator("text=RCB vs CSK").first();
if (await replayBtn.count()) {
  await replayBtn.click();
  await page.waitForTimeout(3000);
  await page.locator("text=Predicted vs Actual").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/03-replay-accuracy.png` });
  console.log("captured 03-replay-accuracy.png");
}

await browser.close();

if (errors.length) {
  console.log("\n=== CLIENT ERRORS DETECTED ===");
  errors.forEach((e) => console.log(e));
  process.exit(2);
} else {
  console.log("\nNo client console/page errors. ✅");
}
