import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const HTML = "d:/PROJECTS/Gridlockr2/docs/deck.html";
const PDF = "d:/PROJECTS/Gridlockr2/docs/Conflux-Pitch-Deck.pdf";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
// Give the web font + images a moment to settle.
await page.waitForTimeout(1200);

await page.pdf({
  path: PDF,
  width: "1280px",
  height: "720px",
  printBackground: true,
  pageRanges: "",
});

// Also export slide 1 as a PNG so we can eyeball the design.
await page.locator(".slide").first().screenshot({
  path: "d:/PROJECTS/Gridlockr2/docs/screenshots/deck-slide1.png",
});

await browser.close();
console.log("PDF written:", PDF);
