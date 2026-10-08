"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const repo = path.join(__dirname, "..", "..");
const artifacts = "/opt/cursor/artifacts";
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "banking-ui.json"), "utf8"));

function starters() {
  return [
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 24.68 },
    { id: "utilities", name: "Utilities", tier: "required", budget: 0 },
    { id: "phone-internet", name: "Phone & Internet", tier: "required", budget: 0 },
    { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 0 },
    { id: "education", name: "Education", tier: "required", budget: 0 },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 0 },
    { id: "gas-fuel", name: "Gas/Fuel", tier: "needs", budget: 24.68 },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 0 },
    { id: "education-needs", name: "Education (Needs)", tier: "needs", budget: 0 },
    { id: "dining", name: "Dining", tier: "wants", budget: 0 },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 0 },
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 0 },
    { id: "shopping", name: "Shopping", tier: "wants", budget: 12.34 },
    { id: "other", name: "Other", tier: "wants", budget: 0 }
  ];
}

function pageHtml(doc) {
  const file = function (rel) { return "file://" + path.join(repo, rel); };
  return "<!DOCTYPE html><html data-theme=\"justin\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    '<link rel="stylesheet" href="' + file("house/house.css") + '">' +
    '<link rel="stylesheet" href="' + file("house/list-cap.css") + '">' +
    '<link rel="stylesheet" href="' + file("house/banking.css") + '">' +
    "</head><body class=\"bank-page\"><main class=\"desk bank-desk\" id=\"bankDesk\">" +
    "<p>Loading banking…</p></main><script>window.__BANK_DOC=" + JSON.stringify(doc) + ";</script>" +
    "<script>(function(){var fixed=new Date('2026-10-16T16:00:00.000Z');var Real=Date;" +
    "function F(){var a=arguments;if(!(this instanceof F))return a.length?Real.apply(null,a):Real(fixed);" +
    "if(!a.length)return new Real(fixed.getTime());var list=[null];for(var i=0;i<a.length;i++)list.push(a[i]);" +
    "return new (Function.prototype.bind.apply(Real,list))();}F.now=function(){return fixed.getTime();};" +
    "F.parse=Real.parse;F.UTC=Real.UTC;F.prototype=Real.prototype;Date=F;})();</script>" +
    "<script>window.fetch=function(url,init){var u=String(url);var method=init&&init.method?String(init.method).toUpperCase():'GET';" +
    "function answer(body,status){return Promise.resolve({ok:status>=200&&status<300,status:status,type:'basic',json:function(){return Promise.resolve(body);}});}" +
    "if(u.indexOf('/data/banking/tiers.json')>=0&&method==='POST'){var body=JSON.parse(init.body);window.__posts=window.__posts||[];window.__posts.push(body);" +
    "if(body.categories)window.__BANK_DOC.tier_doc.categories=body.categories;return answer({schema:'banking-tiers/v1'},200);}" +
    "if(u.indexOf('/data/banking/tiers.json')>=0)return answer(window.__BANK_DOC.tier_doc,200);" +
    "if(u.indexOf('/data/banking.json')>=0)return answer(window.__BANK_DOC,200);" +
    "if(u.indexOf('categories.json')>=0)return answer({schema:'banking-custom-categories/v1',categories:[]},200);" +
    "if(u.indexOf('mustpay')>=0)return answer({schema:'banking-mustpay-overrides/v1',overrides:{}},200);" +
    "return answer({},404);};</script>" +
    '<script src="' + file("house/js/list-cap.js") + '"></script>' +
    '<script src="' + file("house/js/ticker.js") + '"></script>' +
    '<script src="' + file("house/js/banking.js") + '"></script></body></html>';
}

function docWith(groceries) {
  const doc = JSON.parse(JSON.stringify(fixture));
  const cats = starters();
  cats.forEach(function (row) { if (row.id === "groceries") row.budget = groceries; });
  doc.tier_doc = { rules: {}, plans: {}, categories: cats, category_rules: {}, category_tx: {} };
  return doc;
}

async function shot(page, selector, file) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible" });
  await el.evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await page.screenshot({ path: path.join(artifacts, file) });
}

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const mobile = path.join(os.tmpdir(), "category-budget-390.html");
  fs.writeFileSync(mobile, pageHtml(docWith(0)));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("file://" + mobile);
  await page.locator('[data-bank-cat-row="groceries"]').waitFor();
  await page.locator('[data-bank-cat-row="groceries"]').click();
  await page.locator('[data-bank-cat-budget="groceries"]').waitFor();
  await page.locator('[data-bank-cat-budget="groceries"]').fill("12.34");
  const sheet = await page.locator(".books-sheet").evaluate(function (node) {
    var overlay = node.parentNode;
    var os = getComputedStyle(overlay);
    var ss = getComputedStyle(node);
    var box = node.getBoundingClientRect();
    return {
      width: window.innerWidth,
      align: os.alignItems,
      radius: ss.borderTopLeftRadius + " " + ss.borderBottomLeftRadius,
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      height: Math.round(box.height)
    };
  });
  console.log("SHEET390", JSON.stringify(sheet));
  await shot(page, "[data-bank-cat-pop]", "category-popup-390.png");
  await page.locator('[data-bank-cat-save="groceries"]').click();
  await page.waitForFunction(function () {
    var row = document.querySelector('[data-bank-cat-row="groceries"]');
    return row && row.getAttribute("data-budget") === "12.34";
  });
  const budget = await page.locator('[data-bank-cat-row="groceries"]').getAttribute("data-budget");
  if (budget !== "12.34") throw new Error("groceries budget stayed " + budget);
  await page.locator("[data-bank-cat-close]").click();
  await page.locator("[data-bank-cat-pop]").waitFor({ state: "detached" });
  await page.locator(".bank-tier-summary").screenshot({ path: path.join(artifacts, "budget-categories-390.png") });
  await page.locator("[data-bank-overflow]").click();
  await page.locator('[data-bank-tab="edits"]').click();
  await page.locator("[data-bank-spend-cats]").waitFor();
  await shot(page, "[data-bank-spend-cats]", "edits-categories-390.png");
  await page.locator("[data-bank-find]").fill("Corner");
  await page.locator("[data-bank-tx-cat]").first().waitFor();
  await shot(page, ".bank-tx-search", "edits-category-picker-390.png");
  const wideFile = path.join(os.tmpdir(), "category-budget-1280.html");
  fs.writeFileSync(wideFile, pageHtml(docWith(12.34)));
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await wide.goto("file://" + wideFile);
  await wide.locator('[data-bank-cat-row="groceries"]').waitFor();
  await wide.screenshot({ path: path.join(artifacts, "budget-categories-1280.png"), fullPage: true });
  await wide.locator('[data-bank-cat-row="groceries"]').click();
  await wide.locator(".books-sheet").waitFor();
  await shot(wide, "[data-bank-cat-pop]", "category-popup-1280.png");
  await browser.close();
  console.log("PLAYWRIGHT_OK");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
