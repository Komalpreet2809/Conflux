import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const HTML = "d:/PROJECTS/Gridlockr2/docs/deck.html";
const PDF = "d:/PROJECTS/Gridlockr2/docs/Conflux-Pitch-Deck.pdf";

const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const page = await browser.newPage({ ignoreHTTPSErrors: true });
await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
// Give the web font + images a moment to settle.
await page.waitForTimeout(1500);

await page.pdf({
  path: PDF,
  width: "1280px",
  height: "720px",
  printBackground: true,
  pageRanges: "",
});

await browser.close();
console.log("PDF written:", PDF);
