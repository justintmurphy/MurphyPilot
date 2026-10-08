"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const repo = path.join(__dirname, "..", "..");
const artifacts = "/opt/cursor/artifacts";
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "banking-ui.json"), "utf8"));
const BRANDS = /UPMC|NFCU|Navy Federal|T-Mobile|M&T|Comcast|OneMain|GoodLeap|Aptive|Santander|FirstEnergy|Brightwheel|Progressive|Peoples Gas|BetrLink|Sofyre|Urban Air|Yippee|Dollar Shave|Travel Advantage|CLEFCU|Hooked|Truthifi|Vill Cap|Village/i;

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

async function elementShot(page, selector, file) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible" });
  await el.evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await el.screenshot({ path: path.join(artifacts, file) });
}

async function overflowReport(page) {
  return page.evaluate(function () {
    var vw = window.innerWidth;
    var doc = document.documentElement;
    var bad = [];
    if (doc.scrollWidth > doc.clientWidth + 1) bad.push("document " + doc.scrollWidth + ">" + doc.clientWidth);
    var nodes = document.querySelectorAll("body *");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > vw + 1.5 && r.left < vw - 1) {
        var name = (el.getAttribute && (el.getAttribute("data-bank-hero") || el.getAttribute("class"))) || el.tagName;
        bad.push(String(name).slice(0, 80) + " right=" + Math.round(r.right));
        if (bad.length > 8) break;
      }
    }
    return { vw: vw, scroll: doc.scrollWidth, client: doc.clientWidth, bad: bad };
  });
}

async function assertNoOverflow(page, label) {
  const report = await overflowReport(page);
  console.log("OVERFLOW", label, JSON.stringify(report));
  if (report.bad.length || report.scroll > report.client + 1) {
    throw new Error(label + " overflow " + JSON.stringify(report));
  }
}

async function heroFacts(page) {
  return page.evaluate(function () {
    var now = document.querySelector("[data-bank-hero-now]");
    var end = document.querySelector("[data-bank-hero-end]");
    var left = document.querySelector("[data-fund-left]");
    var rows = [];
    document.querySelectorAll("[data-bank-hero-acct]").forEach(function (el) {
      rows.push(Number(el.getAttribute("data-balance")));
    });
    var sum = Math.round(rows.reduce(function (n, v) { return n + v; }, 0) * 100) / 100;
    var accounts = "";
    var box = document.querySelector("[data-bank-hero-accounts]");
    if (box) accounts = box.textContent || "";
    var title = document.getElementById("bank-view-title");
    var hero = document.querySelector("[data-bank-hero]");
    var next = document.querySelector(".bank-next");
    function top(el) { return el ? el.getBoundingClientRect().top : null; }
    return {
      now: now ? Number(now.getAttribute("data-bank-hero-now")) : null,
      sum: sum,
      end: end ? Number(end.getAttribute("data-bank-hero-end")) : null,
      endCls: end ? end.className : "",
      left: left ? Number(left.getAttribute("data-fund-left")) : null,
      accounts: accounts,
      order: [top(title), top(hero), top(next)]
    };
  });
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
  await page.locator("[data-bank-hero]").waitFor();
  const before = await heroFacts(page);
  if (before.now !== before.sum) throw new Error("hero now " + before.now + " != account sum " + before.sum);
  if (before.end !== before.left) throw new Error("hero end " + before.end + " != funding left " + before.left);
  if (!(before.order[0] < before.order[1] && before.order[1] < before.order[2])) {
    throw new Error("title, hero, next order " + before.order.join(","));
  }
  await shot(page, "[data-bank-hero]", "banking-hero-390.png");
  await page.locator("[data-bank-hero-toggle]").click();
  await page.locator("[data-bank-hero-accounts]:not([hidden])").waitFor();
  const openFacts = await heroFacts(page);
  if (BRANDS.test(openFacts.accounts)) throw new Error("brand in hero accounts");
  if (/Overdraft/i.test(openFacts.accounts)) throw new Error("overdraft in hero accounts");
  await elementShot(page, "[data-bank-hero]", "banking-hero-expanded-390.png");
  await assertNoOverflow(page, "390-budget-expanded");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await assertNoOverflow(page, "360-budget-expanded");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.locator('[data-bank-cat-row="groceries"]').click();
  await page.locator('[data-bank-cat-budget="groceries"]').waitFor();
  await page.locator('[data-bank-cat-budget="groceries"]').fill("12.34");
  await page.locator('[data-bank-cat-save="groceries"]').click();
  await page.waitForFunction(function () {
    var left = document.querySelector('[data-cat-fig="left"]');
    var bar = document.querySelector("[data-bank-cat-pop] .mix-bar");
    var row = document.querySelector('[data-bank-cat-row="groceries"]');
    return left && /Left/.test(left.textContent) && /\$0\.00/.test(left.textContent) && bar && row && row.getAttribute("data-budget") === "12.34";
  });
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
      sheet: Math.round(box.width),
      height: Math.round(box.height)
    };
  });
  console.log("SHEET390", JSON.stringify(sheet));
  if (sheet.sheet > 390) throw new Error("phone sheet wider than 390");
  await shot(page, "[data-bank-cat-pop]", "category-popup-390.png");
  await assertNoOverflow(page, "390-popup");
  await page.locator("[data-bank-cat-close]").click();
  await page.locator("[data-bank-cat-pop]").waitFor({ state: "detached" });
  await page.locator(".bank-tier-summary").screenshot({ path: path.join(artifacts, "budget-categories-390.png") });

  await page.locator("[data-bank-overflow]").click();
  await page.locator('[data-bank-tab="edits"]').click();
  await page.locator("[data-bank-spend-cats]").waitFor();
  await shot(page, "[data-bank-spend-cats]", "edits-categories-390.png");
  await page.locator('[data-bank-spend-open="groceries"]').click();
  await page.locator("[data-bank-spend-sheet]").waitFor();
  await shot(page, "[data-bank-spend-sheet]", "edits-category-sheet-390.png");
  await assertNoOverflow(page, "390-category-sheet");
  await page.locator("[data-bank-cat-close]").click();
  await page.locator("[data-bank-spend-sheet]").waitFor({ state: "detached" });

  await page.locator("[data-bank-find]").fill("Corner");
  await page.locator('button[data-bank-tx-open]', { hasText: "Corner Market" }).first().waitFor();
  await shot(page, ".bank-tx-search", "edits-tx-rows-390.png");
  await shot(page, ".bank-tx-search", "edits-category-picker-390.png");
  await assertNoOverflow(page, "390-tx-rows");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await assertNoOverflow(page, "360-tx-rows");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.locator('button[data-bank-tx-open]', { hasText: "Corner Market" }).first().click();
  await page.locator("[data-bank-tx-sheet]").waitFor();
  await shot(page, "[data-bank-tx-sheet]", "edits-tx-sheet-390.png");
  await assertNoOverflow(page, "390-tx-sheet");
  await page.locator("[data-bank-tx-sheet] [data-bank-tx-cat]").selectOption("dining");
  await page.locator("[data-bank-tx-save]").click();
  await page.locator("[data-bank-tx-sheet]").waitFor({ state: "detached" });
  await page.waitForFunction(function () {
    var chips = document.querySelectorAll("[data-bank-tx-chip]");
    var i;
    var dining = 0;
    for (i = 0; i < chips.length; i++) if (/Dining/.test(chips[i].textContent || "")) dining += 1;
    var undo = document.querySelectorAll("[data-bank-spend-undo], [data-bank-tx-undo]");
    return dining > 0 && undo.length === 1;
  });
  const undoCount = await page.locator("[data-bank-spend-undo], [data-bank-tx-undo]").count();
  if (undoCount !== 1) throw new Error("undo count " + undoCount);

  const wideFile = path.join(os.tmpdir(), "category-budget-1280.html");
  fs.writeFileSync(wideFile, pageHtml(docWith(12.34)));
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await wide.goto("file://" + wideFile);
  await wide.locator('[data-bank-cat-row="groceries"]').waitFor();
  await wide.locator("[data-bank-hero]").waitFor();
  const wideHero = await heroFacts(wide);
  if (wideHero.now !== wideHero.sum) throw new Error("wide hero now " + wideHero.now + " != " + wideHero.sum);
  if (wideHero.end !== wideHero.left) throw new Error("wide hero end " + wideHero.end + " != " + wideHero.left);
  await elementShot(wide, "[data-bank-hero]", "banking-hero-1280.png");
  await wide.screenshot({ path: path.join(artifacts, "budget-categories-1280.png"), fullPage: true });
  await wide.locator('[data-bank-cat-row="groceries"]').click();
  await wide.locator(".books-sheet").waitFor();
  await wide.waitForFunction(function () {
    var left = document.querySelector('[data-cat-fig="left"]');
    var bar = document.querySelector("[data-bank-cat-pop] .mix-bar");
    return left && /\$0\.00/.test(left.textContent || "") && bar;
  });
  const wideSheet = await wide.locator(".books-sheet").evaluate(function (node) {
    return Math.round(node.getBoundingClientRect().width);
  });
  console.log("SHEET1280", wideSheet);
  if (wideSheet > 480) throw new Error("desktop sheet " + wideSheet);
  await shot(wide, "[data-bank-cat-pop]", "category-popup-1280.png");
  await browser.close();
  console.log("PLAYWRIGHT_OK");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
