"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const repo = path.join(__dirname, "..", "..");
const artifacts = "/opt/cursor/artifacts";
function starters() {
  return [
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 40 },
    { id: "utilities", name: "Utilities", tier: "required", budget: 10 },
    { id: "phone-internet", name: "Phone & Internet", tier: "required", budget: 0 },
    { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 0 },
    { id: "education", name: "Education", tier: "required", budget: 0 },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 0 },
    { id: "gas-fuel", name: "Gas/Fuel", tier: "needs", budget: 0 },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 0 },
    { id: "education-needs", name: "Education (Needs)", tier: "needs", budget: 0 },
    { id: "dining", name: "Dining", tier: "wants", budget: 0 },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 5 },
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 0 },
    { id: "shopping", name: "Shopping", tier: "wants", budget: 0 },
    { id: "other", name: "Other", tier: "wants", budget: 0 }
  ];
}

function syntheticDoc() {
  const house = { nickname: "House", last4: "4242" };
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [
        { date: "2026-10-01", amount: 12.34, flow: "outflow", desc: "RENT DRAFT", bill_id: "rent", tx_key: "rentdraft", account_last4: "2222", category: "mortgage" }
      ],
      history_tx: [],
      balances: [{ nickname: "Bills", last4: "2222", balance: 100 }]
    },
    history: { months: [] },
    budget: {
      account_funding: [{ nickname: "Bills", last4: "2222", start_balance: 100, current_balance: 100 }],
      account_funding_combined: 100,
      charged_after_cancel_count: 1,
      bills: [
        {
          name: "Rent",
          bill_id: "rent",
          cancel_key: "rent",
          amount: 40,
          typical_day: 20,
          cadence: "monthly",
          tier: "required",
          category: "mortgage",
          status: "cancelled",
          status_from: "2026-10",
          cancelled_from: "2026-10",
          usual_account: { nickname: "Bills", last4: "2222" }
        },
        {
          name: "Power",
          bill_id: "power",
          amount: 10,
          typical_day: 22,
          cadence: "monthly",
          tier: "required",
          category: "utilities",
          usual_account: { nickname: "Bills", last4: "2222" },
          bank_match: {
            confidence: "high",
            descriptors: ["POWER DRAFT"],
            recent_hits: [{ date: "2026-09-22", amount: 10, description: "POWER DRAFT", account_last4: "2222" }]
          }
        }
      ],
      subscriptions: [
        { name: "Stream Club", sub_id: "stream", cancel_key: "stream", amount: 5, typical_day: 18, category: "subscriptions", usual_account: house }
      ],
      income_monthly: [{ label: "Payroll", amount: 80, deposits: [{ day: 15, amount: 40 }, { day: 30, amount: 40 }] }],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40, account: house },
        { name: "Stipend", kind: "stipend", date: "2026-10-20", amount: 12.34, account: house },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40, account: house }
      ]
    },
    tier_doc: {
      rules: {},
      plans: {},
      categories: starters(),
      category_rules: {},
      category_tx: {},
      bill_status: { rent: { status: "cancelled", from: "2026-10" } },
      manual_paid: {}
    }
  };
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
    "window.__fetches=window.__fetches||[];window.__fetches.push(method+' '+u);" +
    "function answer(body,status){return Promise.resolve({ok:status>=200&&status<300,status:status,type:'basic',json:function(){return Promise.resolve(body);}});}" +
    "if(u.indexOf('/data/banking/tiers.json')>=0&&method==='POST'){return answer({schema:'banking-tiers/v1'},200);}" +
    "if(u.indexOf('/data/banking/tiers.json')>=0)return answer(window.__BANK_DOC.tier_doc,200);" +
    "if(u.indexOf('/data/banking.json')>=0)return answer(window.__BANK_DOC,200);" +
    "if(u.indexOf('categories.json')>=0)return answer({schema:'banking-custom-categories/v1',categories:[]},200);" +
    "if(u.indexOf('mustpay')>=0)return answer({schema:'banking-mustpay-overrides/v1',overrides:{}},200);" +
    "return answer({},404);};</script>" +
    '<script src="' + file("house/js/list-cap.js") + '"></script>' +
    '<script src="' + file("house/js/ticker.js") + '"></script>' +
    '<script src="' + file("house/js/banking.js") + '"></script></body></html>';
}

async function settle(page) {
  await page.waitForFunction(function () {
    var fetches = window.__fetches || [];
    var tiers = false;
    var i;
    for (i = 0; i < fetches.length; i++) if (fetches[i].indexOf("tiers.json") >= 0) tiers = true;
    return tiers && document.querySelector("[data-bank-charged-alert]") && document.querySelector("[data-bank-next-card]");
  });
  await page.waitForTimeout(150);
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(artifacts, file) });
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
      if (el.closest && el.closest(".pay-carousel")) continue;
      var st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > vw + 1.5 && r.left < vw - 1) {
        var name = (el.getAttribute && (el.getAttribute("data-bank-hero") || el.getAttribute("class") || el.getAttribute("data-bank-next-card"))) || el.tagName;
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

async function privacy(page, label) {
  const text = await page.locator("body").innerText();
  if (text.indexOf(String.fromCharCode(64)) >= 0) throw new Error(label + " privacy hit");
}

async function carouselFacts(page) {
  return page.evaluate(function () {
    var track = document.querySelector(".pay-carousel");
    var cards = document.querySelectorAll("[data-bank-next-card]");
    var dots = document.querySelector(".pay-dots");
    var section = document.querySelector(".bank-next");
    var t = track.getBoundingClientRect();
    var a = cards[0] ? cards[0].getBoundingClientRect() : null;
    var b = cards[1] ? cards[1].getBoundingClientRect() : null;
    var dotStyle = dots ? getComputedStyle(dots).display : "";
    return {
      count: cards.length,
      role: section ? section.getAttribute("aria-roledescription") : "",
      tab: track ? track.getAttribute("tabindex") : "",
      ratio: a && t.width ? Math.round((a.width / t.width) * 1000) / 1000 : 0,
      peek: a && b ? Math.round(t.right - b.left) : 0,
      card2Left: b ? Math.round(b.left) : null,
      trackLeft: Math.round(t.left),
      trackRight: Math.round(t.right),
      card1Right: a ? Math.round(a.right) : null,
      dots: dotStyle,
      dates: Array.prototype.map.call(cards, function (card) { return card.getAttribute("data-bank-next-date"); }),
      heights: Array.prototype.map.call(cards, function (card) { return Math.round(card.getBoundingClientRect().height); }),
      also: (document.querySelector("[data-bank-also-in]") || {}).textContent || "",
      title: (document.querySelector("#bank-next-title") || {}).textContent || "",
      text: section ? section.textContent : ""
    };
  });
}

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const htmlPath = path.join(os.tmpdir(), "es-et-synthetic.html");
  fs.writeFileSync(htmlPath, pageHtml(syntheticDoc()));
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("file://" + htmlPath);
  await settle(page);
  await privacy(page, "390");

  const first = await carouselFacts(page);
  console.log("CAROUSEL390", JSON.stringify(first));
  if (first.count < 2) throw new Error("card count " + first.count);
  if (first.role !== "carousel") throw new Error("role " + first.role);
  if (first.ratio < 0.84 || first.ratio > 0.9) throw new Error("peek ratio " + first.ratio);
  if (!(first.peek > 8 && first.peek < first.trackRight * 0.2)) throw new Error("peek px " + first.peek);
  if (!/Also in/.test(first.also)) throw new Error("also in missing");
  if (/Rent/.test(first.text)) throw new Error("cancelled rent on carousel");
  if (first.dates[0] !== "2026-10-15") throw new Error("card 1 " + first.dates[0]);
  if (!/Next pay/.test(first.title) || /Oct/.test(first.title)) throw new Error("title " + first.title);
  if (!/Stream Club/.test(first.text) || !/−\$15\.00/.test(first.text) || !/\+\$25\.00/.test(first.text)) {
    throw new Error("card math " + first.text);
  }
  if (first.heights[1] >= first.heights[0]) throw new Error("card heights " + first.heights.join(","));

  const alert = await page.locator("[data-bank-hero] [data-bank-charged-alert]").innerText();
  if (!/Rent charged after cancel/.test(alert) || !/Review/.test(alert)) throw new Error("alert " + alert);
  await page.locator("[data-bank-hero] [data-bank-charged-alert]").evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await shot(page, "es-charged-after-cancel-390.png");

  await page.locator(".bank-next").evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await page.waitForTimeout(80);
  await shot(page, "nextpay-carousel-390.png");

  await page.locator('[data-bank-next-dot="1"]').click();
  console.log("DOT", JSON.stringify(await page.evaluate(function () {
    var track = document.querySelector(".pay-carousel");
    var card = document.querySelector('[data-bank-next-card="2"]');
    var current = document.querySelector("[aria-current]");
    return {
      scroll: track ? track.scrollLeft : null,
      current: current ? current.getAttribute("data-bank-next-dot") : null,
      gap: card && track ? Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left) : null
    };
  })));
  await page.waitForFunction(function () {
    var card = document.querySelector('[data-bank-next-card="2"]');
    var track = document.querySelector(".pay-carousel");
    if (!card || !track) return false;
    var gap = Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left);
    var current = document.querySelector('[data-bank-next-dot="1"]');
    return gap < 8 && current && current.getAttribute("aria-current") === "true" && current.classList.contains("on");
  }, null, { timeout: 3000 });
  const second = await carouselFacts(page);
  console.log("CAROUSEL390B", JSON.stringify({ dates: second.dates, card2Left: second.card2Left, trackLeft: second.trackLeft }));
  if (second.dates[1] !== "2026-10-30") throw new Error("card 2 " + second.dates[1]);
  await shot(page, "nextpay-carousel-390-card2.png");

  await page.locator("[data-bank-overflow]").click();
  await page.locator('#bankOverflowMenu [data-bank-tab="edits"]').click();
  await page.locator('details[data-bank-cancel="power"] > summary').click();
  await page.locator("[data-bank-cancel-sheet]").waitFor();
  const sheetText = await page.locator("[data-bank-cancel-sheet]").innerText();
  console.log("SHEET", JSON.stringify(sheetText));
  if (!/power/i.test(sheetText)) throw new Error("sheet name " + sheetText);
  if (!/POWER DRAFT/.test(sheetText)) throw new Error("sheet descriptor");
  if (!/2222/.test(sheetText)) throw new Error("sheet last4");
  if (!/Stop from/.test(sheetText)) throw new Error("sheet stop");
  if (!/This month/.test(sheetText) || !/Next month/.test(sheetText) || !/Confirm/.test(sheetText)) throw new Error("sheet actions");
  const pressed = await page.locator('[data-bank-cancel-from="this"]').getAttribute("aria-pressed");
  const pressedClass = await page.locator('[data-bank-cancel-from="this"]').getAttribute("class");
  if (pressed !== "true" || String(pressedClass || "").split(/\s+/).indexOf("on") < 0) throw new Error("preselect " + pressed + " " + pressedClass);
  if (!/doesn.t cancel with the company/.test(sheetText)) throw new Error("sheet disclaimer");
  await privacy(page, "sheet");
  await shot(page, "es-cancel-sheet-390.png");
  await assertNoOverflow(page, "390-sheet");
  await page.locator("[data-bank-cancel-close]").click();
  await page.locator("[data-bank-cancel-sheet]").waitFor({ state: "detached" });

  await assertNoOverflow(page, "390-budget");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await assertNoOverflow(page, "360-budget");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.locator("[data-bank-spend-cats]").evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  const names = await page.evaluate(function () {
    var bad = [];
    document.querySelectorAll("[data-bank-spend-cats] .mix-leg-name").forEach(function (el) {
      var text = (el.textContent || "").replace(/\s+/g, " ").trim();
      var cs = getComputedStyle(el);
      if (cs.whiteSpace === "nowrap" || cs.textOverflow === "ellipsis") bad.push("clip " + text);
      if (el.scrollWidth > el.clientWidth + 2) bad.push("overflow " + text + " " + el.scrollWidth + "/" + el.clientWidth);
    });
    var rules = false;
    document.querySelectorAll("h2").forEach(function (h) { if ((h.textContent || "") === "Rules") rules = true; });
    return { bad: bad, rules: rules, sample: (document.querySelector('[data-bank-cat-jump="car-insurance-loans"] .mix-leg-name') || {}).textContent || "" };
  });
  console.log("CATS", JSON.stringify(names));
  if (names.bad.length) throw new Error("category names " + names.bad.join(" | "));
  if (names.rules) throw new Error("empty rules card is visible");
  if (names.sample.indexOf("Car, Insurance") < 0) throw new Error("sample " + names.sample);
  await shot(page, "edits-categories-390.png");

  await page.locator("[data-bank-cancelled] summary").first().click();
  const cancelled = await page.locator("[data-bank-cancelled]").innerText();
  if (!/Rent/.test(cancelled) || !/Charged after cancel/.test(cancelled) || /Reactivate/.test(cancelled)) {
    throw new Error("cancelled list " + cancelled);
  }
  if (!/Stream Club/.test(await page.locator("body").innerText())) throw new Error("sub row missing");
  await page.locator("[data-bank-cancelled]").evaluate(function (node) {
    node.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await privacy(page, "edits");
  await shot(page, "es-cancelled-list-390.png");
  await assertNoOverflow(page, "390-edits");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(100);
  await assertNoOverflow(page, "360-edits");

  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await wide.goto("file://" + htmlPath);
  await settle(wide);
  await privacy(wide, "1280");
  const wideFacts = await carouselFacts(wide);
  console.log("CAROUSEL1280", JSON.stringify(wideFacts));
  if (wideFacts.dots !== "none") throw new Error("dots " + wideFacts.dots);
  if (wideFacts.count < 2) throw new Error("wide cards " + wideFacts.count);
  if (!(wideFacts.card2Left > wideFacts.trackLeft + 40)) throw new Error("cards not side by side");
  if (!(wideFacts.ratio > 0.45 && wideFacts.ratio < 0.55)) throw new Error("wide ratio " + wideFacts.ratio);
  if (!(wideFacts.heights[1] < wideFacts.heights[0])) throw new Error("wide heights " + wideFacts.heights.join(","));
  await wide.screenshot({ path: path.join(artifacts, "es-budget-1280.png"), fullPage: true });
  await wide.locator(".bank-next").evaluate(function (node) {
    node.scrollIntoView({ block: "start", inline: "nearest" });
  });
  await shot(wide, "nextpay-carousel-1280.png");
  await wide.locator("[data-bank-overflow]").click();
  await wide.locator('#bankOverflowMenu [data-bank-tab="edits"]').click();
  await wide.locator("[data-bank-cancelled]").waitFor();
  await privacy(wide, "edits-1280");
  await wide.screenshot({ path: path.join(artifacts, "es-edits-1280.png"), fullPage: true });

  await browser.close();
  console.log("ES_ET_SHOTS_OK");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
