import { chromium } from "playwright";

const URL = process.argv[2] || "https://conflux-chi-orpin.vercel.app/";
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 950 }, colorScheme: "dark" });
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

// Surface which API the client actually calls.
page.on("requestfailed", (r) => {
  if (/\/api\//.test(r.url())) errors.push("API request FAILED: " + r.url() + " — " + r.failure()?.errorText);
});

console.log("loading", URL, "...");
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });

let ok = false;
try {
  await page.locator("text=Peak congestion").first().waitFor({ timeout: 90000 });
  ok = true;
} catch {
  ok = false;
}

// Detect the error banner if present.
const bannerCount = await page.locator("text=is the API running").count().catch(() => 0);
const stillBooting = await page.locator("text=Booting command center").count().catch(() => 0);

await page.waitForTimeout(2500);
await page.screenshot({ path: "d:/PROJECTS/Gridlockr2/docs/screenshots/live-vercel.png" });

console.log("\n=== RESULT ===");
console.log("dashboard rendered (KPIs visible):", ok);
console.log("error banner shown:", bannerCount > 0);
console.log("stuck on booting:", stillBooting > 0);
if (ok) {
  const peak = await page.locator("text=Peak congestion").first().locator("xpath=..").innerText().catch(() => "");
  console.log("KPI sample:", peak.replace(/\n/g, " "));
}
if (errors.length) { console.log("\n--- errors ---"); errors.slice(0, 8).forEach((e) => console.log(e)); }
else console.log("no client/API errors ✅");

await browser.close();
process.exit(ok ? 0 : 2);
