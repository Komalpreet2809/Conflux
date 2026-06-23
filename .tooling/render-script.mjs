import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const HTML = "d:/PROJECTS/Gridlockr2/docs/video-script.html";
const PDF = "d:/PROJECTS/Gridlockr2/docs/Conflux-Video-Script.pdf";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.pdf({ path: PDF, format: "A4", printBackground: true });
await browser.close();
console.log("PDF written:", PDF);
