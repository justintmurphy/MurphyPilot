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
    { id: "dining", name: "Dining", tier: "wants", budget: 0 },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 0 },
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 0 },
    { id: "shopping", name: "General Shopping", tier: "wants", budget: 12.34 },
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
      if (el.closest && el.closest(".pay-carousel")) continue;
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
  const fold = page.locator("[data-bank-bills-fold]");
  if (await fold.count()) await fold.locator("summary").click();
  await page.locator('[data-bank-plain-cats] [data-bank-cat-row="groceries"]').waitFor();
  await page.locator("[data-bank-hero]").waitFor();
  const before = await heroFacts(page);
  if (before.now !== before.sum) throw new Error("hero now " + before.now + " != account sum " + before.sum);
  if (before.end !== before.left) throw new Error("hero end " + before.end + " != funding left " + before.left);
  if (!(before.order[0] < before.order[1] && before.order[1] < before.order[2])) {
    throw new Error("title, hero, next order " + before.order.join(","));
  }
  await shot(page, "[data-bank-hero]", "banking-hero-390.png");
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

  async function oneLine(label) {
    const lines = await page.evaluate(function () {
      function count(el) { return el ? el.getClientRects().length : 0; }
      var heroLabel = document.querySelector(".ov-hero span");
      var asof = document.querySelector("[data-bank-asof]");
      return { label: count(heroLabel), asof: count(asof) };
    });
    if (lines.label !== 1 || (lines.asof && lines.asof !== 1)) throw new Error(label + " lines " + JSON.stringify(lines));
  }
  await oneLine("390");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await oneLine("360");
  await page.setViewportSize({ width: 390, height: 844 });
  await elementShot(page, ".bank-tier-summary", "tier-summary-390.png");
  const due = page.locator(".bank-due-month");
  await due.evaluate(function (node) {
    var details = node.closest("details");
    if (details) details.open = true;
    node.scrollIntoView({ block: "center" });
  });
  await elementShot(page, ".bank-due-month", "budget-list-390.png");
  const paidCheck = page.locator("[data-bank-paid-month], .bank-bill-check").first();
  if (await paidCheck.count()) {
    await paidCheck.click();
    if (await page.locator("[data-bank-detail-pop]").count()) throw new Error("paid check opened the detail");
  }
  await page.locator('[data-bank-tile="cat"][data-bank-tile-key="groceries"]').click();
  await page.locator("[data-bank-detail-pop]").waitFor();
  await page.locator('[data-bank-detail-tx]').first().waitFor();
  const detailText = await page.locator("[data-bank-detail-pop]").innerText();
  if (!/Corner Market/.test(detailText)) throw new Error("category detail missing transactions");
  if (!/Remaining this month|Over this month/.test(detailText)) throw new Error("category detail missing remaining");
  if (!/Monthly budget/.test(detailText) || !/Spent this month/.test(detailText)) throw new Error("category detail missing budget figures");
  const sheet = await page.locator("[data-bank-detail-pop] .books-sheet").evaluate(function (node) {
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
      height: Math.round(box.height),
      viewH: window.innerHeight
    };
  });
  console.log("DETAIL390", JSON.stringify(sheet));
  if (sheet.align !== "flex-end") throw new Error("phone detail is not a bottom sheet");
  if (sheet.sheet > 390) throw new Error("phone sheet wider than 390");
  if (sheet.bottom < sheet.viewH - 2) throw new Error("phone sheet does not sit on the bottom");
  await shot(page, "[data-bank-detail-pop]", "bills-detail-390.png");
  await assertNoOverflow(page, "390-detail");
  await page.locator("[data-bank-detail-close]").click();
  await page.locator("[data-bank-detail-pop]").waitFor({ state: "detached" });
  await page.locator('[data-bank-tile="bill"]').first().click();
  await page.locator('[data-bank-detail-kind="bill"]').waitFor();
  if (!/Next due|Next due date is not in this print/.test(await page.locator("[data-bank-detail-pop]").innerText())) {
    throw new Error("bill detail missing due");
  }
  await page.keyboard.press("Escape");
  await page.locator("[data-bank-detail-pop]").waitFor({ state: "detached" });
  await page.locator(".bank-tier-summary").screenshot({ path: path.join(artifacts, "budget-categories-390.png") });

  await page.locator("[data-bank-overflow]").click();
  await page.locator("[data-bank-spend-cats]").waitFor();
  await shot(page, "[data-bank-spend-cats]", "edits-categories-390.png");
  await page.locator('[data-bank-cat-jump="groceries"]').click();
  await page.locator("[data-bank-cat-pop] [data-bank-cat-item]").first().waitFor();
  await page.locator('[data-bank-cat-budget="groceries"]').waitFor();
  const last4 = await page.locator("[data-bank-item-meta]").first().innerText();
  if (!/\u00b7\u00b7\d{4}/.test(last4)) throw new Error("item last-4 missing " + last4);
  await shot(page, "[data-bank-cat-pop]", "category-popup-items-390.png");
  await page.locator('[data-bank-cat-budget="groceries"]').fill("12.34");
  await page.locator('[data-bank-cat-save="groceries"]').click();
  await page.waitForFunction(function () {
    var left = document.querySelector('[data-cat-fig="left"]');
    var bar = document.querySelector("[data-bank-cat-pop] .mix-bar");
    return left && /Left/.test(left.textContent) && /\$0\.00/.test(left.textContent) && bar;
  });
  const editorSheet = await page.locator("[data-bank-cat-pop] .books-sheet").evaluate(function (node) {
    return Math.round(node.getBoundingClientRect().width);
  });
  if (editorSheet > 390) throw new Error("phone editor wider than 390");
  await shot(page, "[data-bank-cat-pop]", "category-popup-390.png");
  await page.locator("[data-bank-cat-close]").click();
  await page.locator("[data-bank-cat-pop]").waitFor({ state: "detached" });
  if (await page.locator('[data-bank-spend-edit="groceries"]').count()) {
    await page.locator('[data-bank-spend-edit="groceries"]').click();
    await page.locator("[data-bank-spend-sheet]").waitFor();
    await shot(page, "[data-bank-spend-sheet]", "edits-category-sheet-390.png");
    await assertNoOverflow(page, "390-category-sheet");
    await page.locator("[data-bank-cat-close]").click();
    await page.locator("[data-bank-spend-sheet]").waitFor({ state: "detached" });
  }

  if (await page.locator("[data-bank-find]").count()) {
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
    const txAfter = await page.evaluate(function () {
      var chips = [];
      document.querySelectorAll(".bank-tx-search .fresh-chip, [data-bank-tx-chip]").forEach(function (el) {
        chips.push((el.textContent || "").trim());
      });
      return { chips: chips.slice(0, 12), undo: document.querySelectorAll("[data-bank-spend-undo], [data-bank-tx-undo]").length };
    });
    if (!txAfter.chips.some(function (text) { return /Dining/.test(text); }) || txAfter.undo !== 1) {
      throw new Error("category save " + JSON.stringify(txAfter));
    }
  }

  const wideFile = path.join(os.tmpdir(), "category-budget-1280.html");
  fs.writeFileSync(wideFile, pageHtml(docWith(12.34)));
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await wide.goto("file://" + wideFile);
  await wide.locator('[data-bank-plain-cats] [data-bank-cat-row="groceries"]').waitFor();
  await wide.locator("[data-bank-hero]").waitFor();
  const wideHero = await heroFacts(wide);
  if (wideHero.now !== wideHero.sum) throw new Error("wide hero now " + wideHero.now + " != " + wideHero.sum);
  if (wideHero.end !== wideHero.left) throw new Error("wide hero end " + wideHero.end + " != " + wideHero.left);
  await elementShot(wide, "[data-bank-hero]", "banking-hero-1280.png");
  await wide.screenshot({ path: path.join(artifacts, "budget-categories-1280.png"), fullPage: true });
  await wide.locator('[data-bank-tile="cat"][data-bank-tile-key="groceries"]').click();
  await wide.locator("[data-bank-detail-pop] .books-sheet").waitFor();
  await wide.waitForFunction(function () {
    var left = document.querySelector('[data-bank-detail-fig="left"]');
    var chart = document.querySelector("[data-bank-detail-chart]");
    return left && /\$0\.00/.test(left.textContent || "") && chart;
  });
  const wideSheet = await wide.locator("[data-bank-detail-pop] .books-sheet").evaluate(function (node) {
    var overlay = node.parentNode;
    var box = node.getBoundingClientRect();
    return {
      width: Math.round(box.width),
      align: getComputedStyle(overlay).alignItems,
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      viewH: window.innerHeight
    };
  });
  console.log("DETAIL1280", JSON.stringify(wideSheet));
  if (wideSheet.align !== "center") throw new Error("desktop detail is not centered");
  if (!(wideSheet.top > 8 && wideSheet.bottom < wideSheet.viewH - 8)) throw new Error("desktop detail is not a centered modal");
  if (wideSheet.width > 480) throw new Error("desktop sheet " + wideSheet.width);
  await shot(wide, "[data-bank-detail-pop]", "bills-detail-1280.png");
  await wide.locator("[data-bank-detail-pop]").click({ position: { x: 8, y: 8 } });
  await wide.locator("[data-bank-detail-pop]").waitFor({ state: "detached" });

  const uncat = docWith(0);
  uncat.current.edits_tx.push(
    { date: "2026-10-08", amount: 12.34, flow: "outflow", desc: "Odd Purchase", category: null, category_basis: "spend", tx_key: "u4", last4: "2222" },
    { date: "2026-10-09", amount: 12.34, flow: "outflow", desc: "Another Odd Purchase", category: null, category_basis: "spend", tx_key: "u5", last4: "0831" }
  );
  const uncatFile = path.join(os.tmpdir(), "category-uncat-390.html");
  fs.writeFileSync(uncatFile, pageHtml(uncat));
  const warnPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await warnPage.goto("file://" + uncatFile);
  await warnPage.locator("[data-bank-uncat-warn]").waitFor();
  await elementShot(warnPage, "[data-bank-hero]", "banking-uncat-warning-390.png");
  await warnPage.locator("[data-bank-uncat-warn] button").click();
  await warnPage.locator("[data-bank-uncat-list]").waitFor();
  await elementShot(warnPage, "[data-bank-spend-cats]", "edits-uncategorized-390.png");

  const day = docWith(0);
  day.budget.bills.push({
    name: "Example Household Supply Run For The Month And Another Week",
    amount: 12.34,
    typical_day: 20,
    cadence: "monthly",
    category: "Groceries",
    usual_account: { last4: "2222" }
  });
  day.budget.subscriptions = [{ name: "Stream Club", amount: 12.34, typical_day: 20, usual_account: { last4: "0831" } }];
  const dayFile = path.join(os.tmpdir(), "category-day-390.html");
  fs.writeFileSync(dayFile, pageHtml(day));
  const dayPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await dayPage.goto("file://" + dayFile);
  await dayPage.locator('.bank-day[aria-label^="Oct 20"]').click();
  await dayPage.locator("[data-bank-day-name]").first().waitFor();
  await elementShot(dayPage, ".bank-day-dialog", "calendar-day-popup-390.png");

  const many = docWith(0);
  for (let i = 0; i < 12; i++) {
    many.current.edits_tx.push({
      date: "2026-10-" + String(i + 1).padStart(2, "0"),
      amount: 1,
      flow: "outflow",
      desc: "Corner Market " + i,
      category: "Groceries",
      last4: "2222",
      tx_key: "cap" + i
    });
  }
  const capFile = path.join(os.tmpdir(), "category-cap-390.html");
  fs.writeFileSync(capFile, pageHtml(many));
  const capPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await capPage.goto("file://" + capFile);
  await capPage.locator("[data-bank-overflow]").click();
  await capPage.locator('[data-bank-cat-jump="groceries"]').click();
  await capPage.locator("[data-bank-cat-pop] .list-cap").waitFor();
  const cap = await capPage.locator("[data-bank-cat-pop] .list-cap").evaluate(function (node) {
    var rows = node.querySelectorAll("[data-bank-cat-item]");
    var box = node.getBoundingClientRect();
    var visible = 0;
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i].getBoundingClientRect();
      if (r.top >= box.top - 1 && r.bottom <= box.bottom + 1) visible += 1;
    }
    var sheet = node.parentNode;
    var save = sheet.querySelector("[data-bank-cat-save]");
    var head = sheet.querySelector("h2");
    return {
      visible: visible,
      count: rows.length,
      scroll: node.scrollHeight,
      client: node.clientHeight,
      head: head ? Math.round(head.getBoundingClientRect().top) : 0,
      save: save ? Math.round(save.getBoundingClientRect().top) : 0,
      capTop: Math.round(box.top),
      capBottom: Math.round(box.bottom)
    };
  });
  console.log("CAP", JSON.stringify(cap));
  if (cap.count <= 10) throw new Error("expected more than 10 items");
  if (cap.visible !== 10) throw new Error("visible rows " + cap.visible);
  if (!(cap.scroll > cap.client + 1)) throw new Error("list does not scroll " + cap.scroll + "/" + cap.client);
  if (!(cap.head < cap.capTop && cap.save > cap.capBottom - 2)) throw new Error("header or save scrolled " + JSON.stringify(cap));
  await browser.close();
  console.log("PLAYWRIGHT_OK");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
