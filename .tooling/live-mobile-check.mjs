import { chromium } from "playwright";

const URL = "https://conflux-chi-orpin.vercel.app/";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("text=Peak congestion").first().waitFor({ timeout: 90000 }).catch(() => {});
await page.waitForTimeout(3500);

// New (responsive) build hides the hackathon badge below md; old build shows it.
const badgeVisible = await page.locator("text=GRIDLOCK Hackathon").first().isVisible().catch(() => false);
await page.screenshot({ path: "d:/PROJECTS/Gridlockr2/docs/screenshots/live-mobile.png", fullPage: true });

console.log("hackathon badge visible at 390px:", badgeVisible, badgeVisible ? "(OLD build still served — wait/redeploy)" : "(NEW responsive build live ✅)");
await browser.close();
