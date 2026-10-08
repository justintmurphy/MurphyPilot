"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const shots = "/opt/cursor/artifacts/screenshots";
const playwrightDir = "/tmp/pw-eq/node_modules";
module.paths.unshift(playwrightDir);
const { chromium } = require("playwright");

function starters() {
  return [
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 0, merged_into: "" },
    { id: "utilities", name: "Utilities", tier: "required", budget: 0, merged_into: "" },
    { id: "phone-internet", name: "Phone & Internet", tier: "required", budget: 0, merged_into: "" },
    { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 0, merged_into: "" },
    { id: "education", name: "Education", tier: "required", budget: 0, merged_into: "" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 0, merged_into: "" },
    { id: "gas-fuel", name: "Gas/Fuel", tier: "needs", budget: 0, merged_into: "" },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 0, merged_into: "" },
    { id: "education-needs", name: "Education (Needs)", tier: "needs", budget: 0, merged_into: "" },
    { id: "dining", name: "Dining", tier: "wants", budget: 0, merged_into: "" },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 0, merged_into: "" },
    { id: "kids-activities", name: "Kids & Activities", tier: "wants", budget: 0, merged_into: "" },
    { id: "shopping", name: "Shopping", tier: "wants", budget: 0, merged_into: "" },
    { id: "other", name: "Other", tier: "wants", budget: 0, merged_into: "" }
  ];
}

function livePaySnap(postedDates) {
  const history = [{
    date: "2026-09-29",
    amount: 40,
    flow: "inflow",
    desc: "Payroll",
    category: "Paycheck/Salary/Wages",
    tx_key: "2026-09-29|acct-check|40|Payroll"
  }];
  (postedDates || []).forEach(function (iso) {
    history.push({
      date: iso,
      amount: 40,
      flow: "inflow",
      desc: "Payroll",
      category: "Paycheck/Salary/Wages",
      tx_key: iso + "|acct-check|40|Payroll"
    });
  });
  return {
    asof: "2026-10-08T15:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [],
      history_tx: [],
      balances: [{ nickname: "Bills", last4: "2222", balance: 100 }]
    },
    history: { months: [{ month: "2026-09", history_tx: history }] },
    budget: {
      account_funding: [{ nickname: "Bills", last4: "2222", start_balance: 100, current_balance: 100 }],
      bills: [{ name: "Rent", amount: 10, typical_day: 20, cadence: "monthly", tier: "required" }],
      subscriptions: [],
      income_monthly: [
        { label: "Payroll", amount: 40, cadence: "semi_monthly", deposits: [{ day: 15, amount: 40 }, { day: "EOM", amount: 40 }] },
        { label: "Fostering per diem stipend", amount: 12.34, cadence: "semi_monthly", deposits: [{ day: 10, amount: 12.34 }, { day: 25, amount: 12.34 }] }
      ],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", pay_date: "2026-10-15", amount: 40 },
        { name: "Payroll", kind: "payroll", date: "2026-10-31", pay_date: "2026-10-30", nominal_date: "2026-10-31", amount: 40, rolled: true, roll_reason: "weekend" },
        { name: "Fostering per diem stipend", kind: "stipend", date: "2026-10-10", pay_date: "2026-10-09", nominal_date: "2026-10-10", amount: 12.34 },
        { name: "Fostering per diem stipend", kind: "stipend", date: "2026-10-25", pay_date: "2026-10-23", nominal_date: "2026-10-25", amount: 12.34 }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: [], category_rules: {}, category_tx: {} }
  };
}

function serve(fixture, posts) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json"
  };
  const tiers = {
    schema: "banking-tiers/v1",
    rules: {},
    plans: {},
    categories: starters(),
    category_rules: {},
    category_tx: {}
  };
  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "POST" && url.pathname === "/data/banking/tiers.json") {
      const chunks = [];
      req.on("data", function (chunk) { chunks.push(chunk); });
      req.on("end", function () {
        const body = Buffer.concat(chunks).toString("utf8");
        if (posts) posts.push({ method: req.method, body: body });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      });
      return;
    }
    if (url.pathname === "/data/banking.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(fixture));
      return;
    }
    if (url.pathname === "/data/banking/tiers.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tiers));
      return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end("");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise(function (resolve) {
    server.listen(0, "127.0.0.1", function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

async function openBudget(browser, port, when, width, height) {
  const context = await browser.newContext({
    viewport: { width: width, height: height },
    timezoneId: "America/New_York",
    hasTouch: width < 500,
    isMobile: width < 500
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(when) });
  await page.goto("http://127.0.0.1:" + port + "/", { waitUntil: "networkidle" });
  await page.locator("[data-bank-next-card]").first().waitFor();
  return { context: context, page: page };
}

async function carouselState(page) {
  return page.evaluate(function () {
    var track = document.querySelector("[data-bank-next-track]");
    var cards = track ? track.querySelectorAll("[data-bank-next-card]") : [];
    var dots = document.querySelectorAll("[data-bank-next-dot]");
    var current = 0;
    var i;
    for (i = 0; i < dots.length; i++) {
      if (dots[i].getAttribute("aria-current") === "true") current = i;
    }
    var heights = [];
    var widths = [];
    var dates = [];
    for (i = 0; i < cards.length; i++) {
      heights.push(cards[i].offsetHeight);
      widths.push(cards[i].offsetWidth);
      dates.push(cards[i].getAttribute("data-bank-next-date"));
    }
    var card = cards[current];
    return {
      dates: dates,
      heights: heights,
      widths: widths,
      current: current,
      scroll: track ? track.scrollLeft : null,
      left: card ? card.offsetLeft : null,
      gap: card && track ? Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left) : null,
      past: cards[0] ? cards[0].getAttribute("data-bank-past") : ""
    };
  });
}

function sameSize(values, label) {
  assert.ok(values.length >= 2, label);
  values.forEach(function (n) {
    assert.equal(n, values[0], label + " " + values.join(","));
  });
}

test("next pay scrolls to this pay, cards match, and the calendar dialog is centered", { timeout: 90000 }, async function () {
  fs.mkdirSync(shots, { recursive: true });
  const served = await serve(livePaySnap([]));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const phone = await openBudget(browser, served.port, "2026-10-08T16:00:00Z", 390, 844);
    const page = phone.page;
    const at390 = await carouselState(page);
    assert.deepEqual(at390.dates, ["2026-09-30", "2026-10-15", "2026-10-30"]);
    assert.equal(at390.current, 0);
    const align = await page.evaluate(function () {
      var track = document.querySelector("[data-bank-next-track]");
      var card = track.querySelector("[data-bank-next-card]");
      return {
        gap: Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left),
        parent: card.offsetParent ? (card.offsetParent.className || card.offsetParent.tagName) : ""
      };
    });
    assert.ok(align.gap <= 2, JSON.stringify(at390) + " " + JSON.stringify(align));
    sameSize(at390.heights, "390 height");
    sameSize(at390.widths, "390 width");
    await page.locator(".bank-next").screenshot({ path: path.join(shots, "nextpay-carousel-390.png") });
    await page.locator(".bank-next").screenshot({ path: path.join(shots, "nextpay-cards-oct8-390.png") });

    await page.evaluate(function () {
      var track = document.querySelector("[data-bank-next-track]");
      var card = track.querySelectorAll("[data-bank-next-card]")[2];
      track.scrollLeft = card.offsetLeft;
      track.dispatchEvent(new Event("scroll"));
    });
    const swiped = await carouselState(page);
    assert.equal(swiped.current, 2);

    const order = await page.evaluate(function () {
      function top(sel) {
        var el = document.querySelector(sel);
        return el.getBoundingClientRect().top + window.scrollY;
      }
      return { next: top("[data-bank-part=next]"), cal: top("[data-bank-part=calendar]"), fund: top("[data-bank-part=funding]") };
    });
    assert.ok(order.next < order.cal, "next above calendar");
    assert.ok(order.cal < order.fund, "calendar above funding");
    await page.screenshot({ path: path.join(shots, "banking-order-390.png"), fullPage: true });

    await page.setViewportSize({ width: 360, height: 800 });
    const order360 = await page.evaluate(function () {
      function top(sel) {
        var el = document.querySelector(sel);
        return el.getBoundingClientRect().top + window.scrollY;
      }
      return { next: top("[data-bank-part=next]"), cal: top("[data-bank-part=calendar]"), fund: top("[data-bank-part=funding]") };
    });
    assert.ok(order360.next < order360.cal && order360.cal < order360.fund);
    await page.setViewportSize({ width: 390, height: 844 });

    const todayCount = await page.locator('.bank-day[aria-current="date"]').count();
    assert.equal(todayCount, 1);
    assert.match(await page.locator('.bank-day[aria-current="date"]').innerText(), /^8\b/);
    await page.screenshot({ path: path.join(shots, "calendar-today-390.png"), fullPage: true });

    await page.evaluate(function () {
      document.body.style.minHeight = "2400px";
      window.scrollTo(0, 700);
    });
    await page.locator('.bank-day[aria-current="date"]').tap();
    await page.locator(".bank-day-dialog").waitFor();
    const centered = await page.evaluate(function () {
      var box = document.querySelector(".bank-day-dialog").getBoundingClientRect();
      return {
        dx: Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
        dy: Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
        scroll: window.scrollY,
        focused: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest(".bank-day-dialog"))
      };
    });
    assert.ok(centered.scroll > 0);
    assert.ok(centered.dx <= 2, "dx " + centered.dx);
    assert.ok(centered.dy <= 2, "dy " + centered.dy);
    assert.equal(centered.focused, true);
    await page.screenshot({ path: path.join(shots, "calendar-popup-centered-390.png") });
    await page.keyboard.press("Escape");
    await page.locator(".bank-day-dialog").waitFor({ state: "detached" });
    const returned = await page.evaluate(function () {
      return document.activeElement && document.activeElement.getAttribute("aria-current") === "date";
    });
    assert.equal(returned, true);
    await page.locator('.bank-day[aria-current="date"]').tap();
    await page.locator(".bank-day-dialog").waitFor();
    await page.locator("[data-bank-day-scrim]").tap({ position: { x: 8, y: 8 } });
    await page.locator(".bank-day-dialog").waitFor({ state: "detached" });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(function () {
      window.scrollTo(0, 0);
      var track = document.querySelector("[data-bank-next-track]");
      var card = track.querySelector('[data-bank-next-date="2026-09-30"]');
      track.scrollLeft = card.offsetLeft;
      track.dispatchEvent(new Event("scroll"));
    });
    const at1280 = await carouselState(page);
    sameSize(at1280.heights, "1280 height");
    sameSize(at1280.widths, "1280 width");
    assert.ok(at1280.widths[0] > 200);
    await page.locator(".bank-next").screenshot({ path: path.join(shots, "nextpay-carousel-1280.png") });

    await page.evaluate(function () { window.scrollTo(0, 500); });
    await page.locator(".bank-day").first().click();
    await page.locator(".bank-day-dialog").waitFor();
    const wideBox = await page.evaluate(function () {
      var box = document.querySelector(".bank-day-dialog").getBoundingClientRect();
      return {
        dx: Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
        dy: Math.abs(box.top + box.height / 2 - window.innerHeight / 2),
        scroll: window.scrollY
      };
    });
    assert.ok(wideBox.scroll > 0);
    assert.ok(wideBox.dx <= 2 && wideBox.dy <= 2, JSON.stringify(wideBox));
    await page.screenshot({ path: path.join(shots, "calendar-popup-centered-1280.png") });
    await page.keyboard.press("Escape");
    await phone.context.close();

    const midServed = await serve(livePaySnap(["2026-10-15"]));
    const mid = await openBudget(browser, midServed.port, "2026-10-20T16:00:00Z", 390, 844);
    const oct20 = await carouselState(mid.page);
    assert.equal(oct20.dates[0], "2026-09-30");
    assert.equal(oct20.past, "1");
    assert.equal(oct20.dates[oct20.current], "2026-10-15");
    assert.ok(oct20.gap <= 2, "oct20 gap " + oct20.gap + " scroll " + oct20.scroll);
    sameSize(oct20.heights, "oct20 height");
    await mid.context.close();
    midServed.server.close();
  } finally {
    await browser.close();
    served.server.close();
  }
});

test("a search result, a filter, and the initial list open the category sheet", { timeout: 90000 }, async function () {
  fs.mkdirSync(shots, { recursive: true });
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "banking-ui.json"), "utf8"));
  fixture.tier_doc = { rules: {}, plans: {}, categories: starters(), category_rules: {}, category_tx: {} };
  const posts = [];
  const served = await serve(fixture, posts);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: "America/New_York",
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:" + served.port + "/#edits", { waitUntil: "networkidle" });
    await page.locator("[data-bank-tx-open]").first().waitFor();

    async function openFirst(label) {
      const row = page.locator("[data-bank-tx-open]").first();
      await row.waitFor();
      const key = await row.getAttribute("data-bank-tx-open");
      assert.ok(key && key.indexOf("|") >= 0, label + " key " + key);
      await row.tap();
      await page.locator("[data-bank-tx-sheet]").waitFor();
      const scope = await page.locator('[data-bank-tx-scope="one"]').getAttribute("aria-pressed");
      assert.equal(scope, "true", label + " scope");
      return key;
    }

    await page.locator("[data-bank-find]").click();
    await page.locator("[data-bank-find]").fill("grocer");
    await page.waitForFunction(function () {
      var box = document.querySelector("[data-bank-find-results]");
      var text = box ? box.innerText : "";
      var input = document.querySelector("[data-bank-find]");
      return input && input.value === "grocer" && text.indexOf("Neighborhood Grocer") >= 0 && text.indexOf("City Fuel") < 0;
    });
    const grocerKey = await openFirst("search");
    assert.match(await page.locator("[data-bank-find-results]").innerText(), /Neighborhood Grocer/);
    assert.doesNotMatch(await page.locator("[data-bank-find-results]").innerText(), /City Fuel/);
    await page.screenshot({ path: path.join(shots, "edits-search-sheet-390.png") });
    await page.locator("[data-bank-tx-cat]").selectOption("dining");
    await page.locator("[data-bank-tx-save]").tap();
    await page.locator("[data-bank-tx-sheet]").waitFor({ state: "detached" });
    await page.locator("[data-bank-find]").fill(grocerKey.split("|").pop());
    await page.waitForTimeout(500);
    const savedRow = page.locator("[data-bank-tx-open]").filter({ hasText: grocerKey.split("|").pop() }).first();
    const saved = await savedRow.innerText();
    assert.match(saved, /Dining/);
    assert.match(saved, /Change/);
    await page.locator("[data-bank-spend-undo]").waitFor();
    await savedRow.screenshot({ path: path.join(shots, "edits-search-saved-390.png") });
    assert.ok(posts.length >= 1);
    const body = JSON.parse(posts[posts.length - 1].body);
    assert.equal(posts[posts.length - 1].method, "POST");
    assert.ok(body.category_tx);
    assert.ok(Object.keys(body.category_tx).some(function (key) { return body.category_tx[key] === "dining"; }));

    await page.locator("[data-bank-find]").fill("");
    await page.waitForFunction(function () {
      var input = document.querySelector("[data-bank-find]");
      return input && input.value === "" && document.querySelector("[data-bank-tx-open]");
    });
    await page.locator('[data-bank-find-filter="order"]').selectOption("asc");
    await page.locator("[data-bank-tx-open]").first().waitFor();
    const filtered = await openFirst("filter");
    assert.notEqual(filtered, grocerKey);
    await page.locator("[data-bank-cat-close]").tap();
    await page.locator("[data-bank-tx-sheet]").waitFor({ state: "detached" });

    await page.locator('[data-bank-find-filter="order"]').selectOption("desc");
    await page.waitForFunction(function () {
      var input = document.querySelector("[data-bank-find]");
      var row = document.querySelector("[data-bank-tx-open]");
      return input && input.value === "" && row;
    });
    const initial = await openFirst("initial");
    assert.ok(initial.indexOf("2026-10") === 0 || initial.indexOf("2026-") === 0);
    await page.locator("[data-bank-cat-close]").tap();
    await context.close();
  } finally {
    await browser.close();
    served.server.close();
  }
});
