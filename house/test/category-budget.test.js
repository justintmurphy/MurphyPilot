"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "banking-ui.json");
const SLUGS = [
  "mortgage",
  "utilities",
  "phone-internet",
  "car-insurance-loans",
  "education",
  "groceries",
  "gas-fuel",
  "dining",
  "subscriptions",
  "kids-activities",
  "shopping",
  "other"
];
const HASH = "h:" + "ab".repeat(16);
const LINES = {
  bad_category: "Check that category and try again.",
  bad_category_id: "That category cannot be saved. Try a simpler name.",
  bad_category_name: "Use a name up to 40 characters.",
  bad_category_tier: "Pick Bills or Category.",
  bad_category_budget: "Enter a budget as a number, from zero on up.",
  duplicate_category_id: "That category is already on the list.",
  bad_merged_into: "Choose a category to merge into.",
  merged_into_cycle: "Those categories cannot fold into each other.",
  bad_category_ref: "Choose a category for that rule.",
  unknown_category: "That category is not on the list.",
  too_many_rules: "There are too many rules. Remove one and try again."
};

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function boot() {
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { setAttribute: function () {}, getAttribute: function () { return "justin"; } }
  };
  const sandbox = {
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    document: document,
    location: { hash: "", pathname: "/", search: "" },
    history: { replaceState: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {},
    console: console,
    fetch: function () { return Promise.reject(new Error("no fetch")); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    Intl: Intl,
    Date: (function () {
      const RealDate = Date;
      const raw = process.env.FAKE_NOW || "2026-10-06T16:00:00.000Z";
      const fixed = new RealDate(raw.length === 10 ? raw + "T16:00:00.000Z" : raw);
      function FixedDate() {
        var args = arguments;
        if (!(this instanceof FixedDate)) return args.length ? RealDate.apply(null, args) : RealDate(fixed);
        if (!args.length) return new RealDate(fixed.getTime());
        var list = [null];
        for (var i = 0; i < args.length; i++) list.push(args[i]);
        return new (Function.prototype.bind.apply(RealDate, list))();
      }
      FixedDate.now = function () { return fixed.getTime(); };
      FixedDate.parse = RealDate.parse;
      FixedDate.UTC = RealDate.UTC;
      FixedDate.prototype = RealDate.prototype;
      return FixedDate;
    })(),
    Promise: Promise,
    isFinite: isFinite,
    Number: Number,
    String: String,
    Object: Object,
    Array: Array,
    Math: Math,
    JSON: JSON
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/list-cap.js"), "utf8"), sandbox, { filename: "list-cap.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/ticker.js"), "utf8"), sandbox, { filename: "ticker.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8"), sandbox, { filename: "banking.js" });
  return sandbox;
}

function bare(ctx) {
  return {
    asof: "2026-10-05T12:00:00-04:00",
    accounts: [],
    current: { month: "2026-10", edits_tx: [], recent_tx: [], history_tx: [], balances: [] },
    history: { months: [] },
    budget: { bills: [], income_monthly: [] },
    tier_doc: {
      rules: {},
      plans: {},
      categories: ctx.bankSpendStarters(),
      category_rules: {},
      category_tx: {}
    }
  };
}

function desk(snap) {
  return {
    innerHTML: "",
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    _bank: {
      data: snap,
      tab: "budget",
      catOpen: "",
      catMonth: "",
      catError: "",
      catDraft: null,
      catUndo: null,
      now: "2026-10-16T12:00:00-04:00"
    }
  };
}

function watch(ctx, respond) {
  const calls = [];
  ctx.fetch = function (url, init) {
    if (String(url).indexOf("/data/banking.json") === 0) {
      return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
    }
    const body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), init: init || {}, body: body });
    return Promise.resolve(respond ? respond(body, calls) : {
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve({ schema: "banking-tiers/v1" }); }
    });
  };
  return calls;
}

function tierSlice(html, tier) {
  const start = html.indexOf('data-tier="' + tier + '"');
  assert.ok(start >= 0, tier);
  const next = html.indexOf('data-tier="', start + 12);
  return html.slice(start, next < 0 ? html.length : next);
}

function sumAttr(html, attr) {
  const re = new RegExp(attr + '="([0-9.]+)"', "g");
  let sum = 0;
  let found = false;
  let match;
  while ((match = re.exec(html))) {
    found = true;
    sum += Number(match[1]);
  }
  return found ? Math.round(sum * 100) / 100 : null;
}

test("starter ids match the slug rule and stay unique", function () {
  const ctx = boot();
  const ids = [];
  ctx.bankSpendStarters().forEach(function (row) { ids.push(String(row.id)); });
  assert.deepEqual(ids, SLUGS);
  const seen = {};
  ctx.bankSpendStarters().forEach(function (row) {
    assert.equal(ctx.bankSpendIdOk(row.id), true, row.id);
    assert.equal(seen[row.id], undefined);
    seen[row.id] = true;
    assert.equal(row.budget, 0);
    assert.equal(typeof row.budget, "number");
  });
  assert.equal(ctx.bankSpendStarters().length <= 30, true);
  assert.equal(ctx.bankSpendById(ctx.bankSpendStarters(), "car-insurance-loans").name, "Car, Insurance & Loans");
  assert.equal(ctx.bankBillGroupId({ name: "Personal loan", category: "Installment", kind: "loan" }), "loans");
  assert.equal(ctx.bankBillGroupId({ name: "Affirm plan", category: "Installment" }), "affirm");
  assert.equal(ctx.bankBillGroupId({ name: "Car payment", category: "Auto" }), "car");
  assert.equal(ctx.bankBillGroupId({ name: "Sample policy", category: "Insurance" }), "insurance");
  assert.equal(ctx.bankBillGroupId({ name: "Sample loan", category: "Car, Insurance & Loans", kind: "loan" }), "loans");
  assert.equal(ctx.bankSpendIdOk("a"), true);
  assert.equal(ctx.bankSpendIdOk("a" + "b".repeat(39)), true);
  assert.equal(ctx.bankSpendIdOk("phone_internet"), true);
  assert.equal(ctx.bankSpendIdOk("a" + "b".repeat(40)), false);
  assert.equal(ctx.bankSpendIdOk(""), false);
  assert.equal(ctx.bankSpendIdOk("Mortgage"), false);
  assert.equal(ctx.bankSpendIdOk("-mortgage"), false);
  assert.equal(ctx.bankSpendIdOk("mort gage"), false);
  assert.equal(ctx.bankSpendIdOk("h:abcd"), false);
});

test("a budget save posts the full category list with numeric budgets", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  const el = desk(snap);
  const calls = watch(ctx);
  const ok = await ctx.bankSpendSaveBudget(el, "groceries", "12.34");
  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  const posted = calls[0];
  assert.equal(posted.url, "/data/banking/tiers.json");
  assert.equal(posted.init.method, "POST");
  assert.equal(posted.init.credentials, "include");
  assert.equal(posted.init.headers.Authorization, undefined);
  assert.equal(JSON.stringify(posted.init.headers).indexOf("Bearer"), -1);
  assert.equal(posted.body.categories.length, SLUGS.length);
  assert.deepEqual(posted.body.categories.map(function (row) { return row.id; }), SLUGS);
  posted.body.categories.forEach(function (row) {
    assert.equal(typeof row.budget, "number");
    assert.equal(row.budget, row.id === "groceries" ? 12.34 : 0);
  });
  assert.equal(Array.isArray(posted.body.categories[0]), false);
  assert.equal(posted.body.category_rules, undefined);
  assert.equal(posted.body.category_tx, undefined);
  assert.equal(el._bank.data.tier_doc.categories.length, SLUGS.length);
});

test("null removes a category rule and a transaction override", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.tier_doc.category_rules = { "corner-market": "groceries" };
  snap.tier_doc.category_tx = {};
  snap.tier_doc.category_tx[HASH] = "dining";
  const el = desk(snap);
  const calls = watch(ctx);
  assert.equal(await ctx.bankSpendSaveRule(el, "corner-market", null), true);
  assert.equal(calls[0].body.category_rules["corner-market"], null);
  assert.equal(calls[0].body.categories.length, SLUGS.length);
  assert.equal(el._bank.data.tier_doc.category_rules["corner-market"], undefined);
  assert.equal(await ctx.bankSpendSaveTx(el, HASH, null), true);
  assert.equal(calls[1].body.category_tx[HASH], null);
  assert.equal(calls[1].body.categories.length, SLUGS.length);
  assert.equal(Object.prototype.hasOwnProperty.call(el._bank.data.tier_doc.category_tx, HASH), false);
  assert.equal(await ctx.bankSpendSaveTx(el, HASH, "groceries"), true);
  assert.equal(calls[2].body.category_tx[HASH], "groceries");
  assert.equal(await ctx.bankSpendUndo(el), true);
  assert.equal(calls[3].body.category_tx[HASH], null);
  assert.deepEqual(calls[3].body.categories.map(function (row) { return row.id; }), SLUGS);
  assert.equal(Object.prototype.hasOwnProperty.call(el._bank.data.tier_doc.category_tx, HASH), false);
});

test("a 400 keeps the edit and shows one plain line per code", async function () {
  const ctx = boot();
  const codes = Object.keys(LINES);
  for (const code of codes) {
    const snap = bare(ctx);
    const el = desk(snap);
    const calls = watch(ctx, function () {
      return {
        ok: false,
        status: 400,
        type: "basic",
        json: function () { return Promise.resolve({ code: code }); }
      };
    });
    const ok = await ctx.bankSpendSaveBudget(el, "groceries", 12.34);
    assert.equal(ok, false, code);
    assert.equal(calls.length, 1, code);
    assert.equal(el._bank.catError, LINES[code], code);
    assert.equal(el._bank.catError.indexOf(code), -1, code);
    assert.equal(el.innerHTML.indexOf(code), -1, code);
    assert.match(el.innerHTML, /Tap a category|Check that category|cannot be saved|40 characters|Bills or Category|from zero|already on the list|merge into|fold into|for that rule|not on the list|too many rules/);
    const saved = el._bank.data.tier_doc.categories.filter(function (row) { return row.id === "groceries"; })[0];
    assert.equal(saved.budget, 12.34, code);
    assert.equal(el._bank.data.tier_doc.categories.length, SLUGS.length, code);
  }
  const shaped = [
    { error: "bad_category_name" },
    { reason: "bad_merged_into" },
    { errors: [{ code: "unknown_category" }] }
  ];
  const expected = [LINES.bad_category_name, LINES.bad_merged_into, LINES.unknown_category];
  for (let i = 0; i < shaped.length; i++) {
    const snap = bare(ctx);
    const el = desk(snap);
    watch(ctx, function () {
      return {
        ok: false,
        status: 400,
        type: "basic",
        json: function () { return Promise.resolve(shaped[i]); }
      };
    });
    await ctx.bankSpendSaveBudget(el, "dining", 12.34);
    assert.equal(el._bank.catError, expected[i]);
    assert.equal(el.innerHTML.indexOf("bad_"), -1);
  }
});

test("a non-numeric budget stays on screen and is not posted", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  const el = desk(snap);
  let calls = 0;
  ctx.fetch = function () { calls += 1; return Promise.resolve({ ok: true, status: 200 }); };
  el._bank.catOpen = "groceries";
  const ok = await ctx.bankSpendSaveBudget(el, "groceries", "nope");
  assert.equal(ok, false);
  assert.equal(calls, 0);
  assert.equal(el._bank.catError, LINES.bad_category_budget);
  assert.equal(el._bank.catDraft.budget, "nope");
  assert.equal(ctx.bankSpendById(el._bank.data.tier_doc.categories, "groceries").budget, 0);
  assert.match(el.innerHTML, /value="nope"/);
  assert.equal(ctx.bankSpendParseBudget(null), null);
  assert.equal(ctx.bankSpendParseBudget("12.34"), 12.34);
  assert.equal(ctx.bankSpendListIssue([{ id: "groceries", name: "Groceries", tier: "needs", budget: "12.34" }]), "bad_category_budget");
  assert.equal(ctx.bankSpendListIssue([{ id: "groceries", name: "Groceries", tier: "needs", budget: null }]), "bad_category_budget");
});

test("mapping prefers a transaction, then a merchant, then the printed category", function () {
  const ctx = boot();
  const snap = bare(ctx);
  const row = {
    date: "2026-10-05",
    amount: 12.34,
    flow: "outflow",
    desc: "Sample Shop",
    category: "Shopping",
    merchant_key: "sample-shop",
    tx_override_key: HASH,
    bill_id: "education",
    installment: true,
    subscription: true
  };
  function via(extra) {
    const hit = ctx.bankMapSpendCategory(Object.assign({}, row, extra || {}), snap);
    return hit ? String(hit.id) + ":" + String(hit.via) : "";
  }
  snap.tier_doc.category_tx[HASH] = "mortgage";
  snap.tier_doc.category_rules["sample-shop"] = "dining";
  assert.equal(via(), "mortgage:tx");
  delete snap.tier_doc.category_tx[HASH];
  assert.equal(via(), "dining:merchant");
  delete snap.tier_doc.category_rules["sample-shop"];
  assert.equal(via(), "shopping:print");
  delete row.category;
  assert.equal(via(), "education:bill");
  delete row.bill_id;
  assert.equal(via(), "car-insurance-loans:installment");
  row.installment = false;
  assert.equal(via(), "subscriptions:subscription");
  row.subscription = false;
  row.category = "Shopping";
  assert.equal(via(), "shopping:print");
  row.category = "Gifts";
  assert.equal(via(), ":uncategorized");
  row.transfer = true;
  assert.equal(ctx.bankMapSpendCategory(row, snap), null);
  const named = { date: "2026-10-05", amount: 12.34, flow: "outflow", desc: "Corner Market", category: "Groceries" };
  snap.tier_doc.category_rules["corner market"] = "dining";
  const namedHit = ctx.bankMapSpendCategory(named, snap);
  assert.equal(String(namedHit.id) + ":" + String(namedHit.via), "dining:merchant");
  delete snap.tier_doc.category_rules["corner market"];
  const childcare = { date: "2026-10-05", amount: 12.34, flow: "outflow", desc: "Day program", category: "Childcare" };
  const childHit = ctx.bankMapSpendCategory(childcare, snap);
  assert.equal(String(childHit.id) + ":" + String(childHit.via), ":uncategorized");
  assert.equal(ctx.bankPageHtml(snap, { tab: "budget" }).indexOf(">Childcare<"), -1);
});

test("category rows sum to their tier header", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  fx.tier_doc.categories.forEach(function (row) {
    if (row.id === "groceries" || row.id === "gas-fuel") row.budget = 12.34;
  });
  const html = ctx.bankPageHtml(fx, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  const summary = html.slice(html.indexOf("bank-tier-summary"), html.indexOf('data-bank-group-pop'));
  assert.equal((summary.match(/data-bank-group="/g) || []).length, 0);
  assert.match(summary, /<h2>Bills<\/h2>/);
  assert.match(summary, /data-bank-bills="1"/);
  assert.match(summary, /data-bank-cat-row="groceries"[^>]*data-budget="12.34"/);
  assert.match(summary, /data-bank-cat-row="gas-fuel"[^>]*data-budget="12.34"/);
  const pop = html.slice(html.indexOf('data-bank-group-pop="needs"'));
  assert.equal(sumAttr(pop, "data-spent"), 24.68);
  assert.equal(sumAttr(pop, "data-budget"), 24.68);
  assert.match(pop, /data-bank-cat-row="groceries"/);
  assert.match(pop, /data-bank-cat-row="gas-fuel"/);
});

test("rename keeps the id, merge sets merged_into, and delete re-points", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.tier_doc.category_rules["corner-market"] = "shopping";
  snap.tier_doc.category_tx[HASH] = "shopping";
  const el = desk(snap);
  const calls = watch(ctx);
  assert.equal(await ctx.bankSpendSaveRow(el, "groceries", "Market basket", "needs", "12.34"), true);
  const renamed = calls[0].body.categories.filter(function (row) { return row.id === "groceries"; })[0];
  assert.equal(renamed.name, "Market basket");
  assert.equal(renamed.budget, 12.34);
  assert.equal(calls[0].body.categories.length, SLUGS.length);
  assert.equal(await ctx.bankSpendMerge(el, "shopping", "other"), true);
  assert.equal(calls[1].body.categories.some(function (row) { return row.id === "shopping" || row.merged_into; }), false);
  assert.equal(calls[1].body.category_rules["corner-market"], "other");
  assert.equal(calls[1].body.category_tx[HASH], "other");
  assert.equal(calls[1].body.categories.length, SLUGS.length - 1);
  assert.ok(calls[1].body.categories.length <= 30);
  assert.doesNotMatch(el.innerHTML, /data-bank-cat-row="shopping"/);
  assert.equal(await ctx.bankSpendUndo(el), true);
  assert.equal(calls[2].body.category_rules["corner-market"], "shopping");
  assert.equal(calls[2].body.category_tx[HASH], "shopping");
  const restored = calls[2].body.categories.filter(function (row) { return row.id === "shopping"; })[0];
  assert.equal(restored.merged_into, undefined);
  snap.tier_doc.categories.forEach(function (row) {
    if (row.id === "shopping") row.budget = 12.34;
    if (row.id === "other") row.budget = 12.34;
  });
  assert.equal(await ctx.bankSpendDelete(el, "shopping", "other", "add"), true);
  assert.equal(calls[3].body.categories.some(function (row) { return row.id === "shopping"; }), false);
  const other = calls[3].body.categories.filter(function (row) { return row.id === "other"; })[0];
  assert.equal(other.budget, 24.68);
  assert.equal(calls[3].body.category_rules["corner-market"], "other");
  assert.equal(calls[3].body.category_tx[HASH], "other");
});

test("a zero budget with spend shows over", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.edits_tx.push({
    date: "2026-10-05", amount: 12.34, flow: "outflow", desc: "Corner Market", category: "Groceries"
  });
  const html = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  const row = html.match(/<button[^>]*data-bank-cat-row="groceries"[\s\S]*?<\/button>/);
  assert.ok(row);
  assert.match(row[0], /<span>Spent<\/span>[\s\S]{0,40}\$12\.34/);
  assert.match(row[0], /<span>Planned<\/span>[\s\S]{0,40}\$0\.00/);
  assert.match(row[0], /<span>Over<\/span>[\s\S]{0,80}\$12\.34/);
  assert.match(row[0], /data-tone="stop"/);
  assert.match(row[0], /data-budget="0"/);
  snap.tier_doc.categories.forEach(function (item) {
    if (item.id === "groceries") item.budget = 12.34;
  });
  snap.current.edits_tx.push({
    date: "2026-10-06", amount: 12.34, flow: "outflow", desc: "Corner Market", category: "Groceries"
  });
  const over = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  const hot = over.match(/<button[^>]*data-bank-cat-row="groceries"[\s\S]*?<\/button>/);
  assert.match(hot[0], /data-tone="stop"/);
  assert.match(hot[0], /<span>Over<\/span>[\s\S]{0,80}\$12\.34/);
  assert.match(hot[0], /<span>Planned<\/span>[\s\S]{0,40}\$12\.34/);
});

test("the category pop-up uses desk totals for this month and the two before it", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  fx.tier_doc.categories.forEach(function (row) {
    if (row.id === "groceries") row.budget = 24.68;
  });
  const html = ctx.bankPageHtml(fx, {
    tab: "budget",
    now: "2026-10-16T12:00:00-04:00",
    catOpen: "groceries",
    catMonth: "2026-10"
  });
  assert.match(html, /class="books-overlay on sheet-bottom"/);
  assert.match(html, /data-bank-cat-pop="1"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /data-cat-fig="spent"><span>Spent<\/span> <b>\$12\.34<\/b>/);
  assert.match(html, /data-cat-fig="left"><span>Left<\/span> <b>\$12\.34<\/b>/);
  assert.match(html, /data-cat-fig="pct"><span>Used<\/span> <b>50%<\/b>/);
  assert.match(html, /class="mix-bar"/);
  assert.match(html, /data-cat-fig="2026-09"><td>September 2026<\/td><td class="num">\$0\.00<\/td>/);
  assert.match(html, /data-cat-fig="2026-08"><td>August 2026<\/td><td class="num">\$0\.00<\/td>/);
  assert.match(html, /data-bank-cat-item="1"/);
  assert.match(html, /data-last4="\u00b7\u00b70000"/);
  assert.match(html, /class="book-chip"[^>]*data-bank-cat-close/);
  assert.match(html, /Monthly budget for this category\./);
  assert.doesNotMatch(html, /category_rules|category_tx|merged_into/);
  const plain = ctx.bankPageHtml(loadFixture(), { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.doesNotMatch(plain, /data-bank-cat-row/);
});

test("past months use a frozen category budget when one was saved", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  fx.budget.snapshots = { "2026-09": { categories: [{ id: "groceries", name: "Old groceries", budget: 24.68 }] } };
  const frozen = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  assert.match(frozen, /data-bank-cat-row="groceries"[^>]*data-budget="24.68"/);
  assert.match(frozen, /Groceries/);
  assert.doesNotMatch(frozen, /Old groceries/);
  delete fx.budget.snapshots;
  const actual = ctx.bankPageHtml(fx, { tab: "historical", histMonth: "2026-09", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  const row = actual.match(/<button[^>]*data-bank-cat-row="groceries"[\s\S]*?<\/button>/);
  assert.ok(row);
  assert.doesNotMatch(row[0], /data-budget=/);
  assert.doesNotMatch(row[0], /mix-bar/);
  const pop = actual.slice(actual.indexOf('data-bank-group-pop="needs"'));
  assert.match(pop, /Groceries/);
  assert.match(pop, /data-bank-cat-row="groceries"[^>]*data-spent="0"/);
  assert.doesNotMatch(pop, /data-spent="12.34"/);
  assert.doesNotMatch(pop, /No saved budget for this month/);
});

test("a rule must name a real category and the shared cap is 500", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  const el = desk(snap);
  let calls = 0;
  ctx.fetch = function () { calls += 1; return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({}); } }); };
  assert.equal(await ctx.bankSpendSaveRule(el, "corner-market", "not-a-category"), false);
  assert.equal(calls, 0);
  assert.equal(el._bank.catError, LINES.unknown_category);
  const rules = {};
  for (let i = 0; i < 500; i++) rules["m" + i] = "needs";
  snap.tier_doc.rules = rules;
  assert.equal(await ctx.bankSpendSaveRule(el, "corner-market", "groceries"), false);
  assert.equal(calls, 0);
  assert.equal(el._bank.catError, LINES.too_many_rules);
  assert.equal(el.innerHTML.indexOf("too_many_rules"), -1);
  const cycled = ctx.bankSpendStarters();
  cycled.forEach(function (row) {
    if (row.id === "dining") row.merged_into = "shopping";
    if (row.id === "shopping") row.merged_into = "dining";
  });
  assert.equal(ctx.bankSpendListIssue(ctx.bankSpendWire(cycled)), "merged_into_cycle");
  const missing = ctx.bankSpendStarters();
  missing[0].merged_into = "missing-id";
  assert.equal(ctx.bankSpendListIssue(ctx.bankSpendWire(missing)), "bad_merged_into");
});

test("a signed-out 401 json response locks the desk and leaves saved tiers alone", async function () {
  const ctx = boot();
  const el = { innerHTML: "" };
  await ctx.bankLoad(el, function () {
    return Promise.resolve({
      ok: false,
      status: 401,
      type: "basic",
      json: function () { return Promise.resolve({ error: "unauthorized", code: "signed_out" }); }
    });
  });
  assert.match(el.innerHTML, /data-bank-gate="gate"/);
  assert.match(el.innerHTML, /Banking is locked/);
  assert.doesNotMatch(el.innerHTML, /unauthorized|signed_out|\{/);
  const snap = bare(ctx);
  const before = snap.tier_doc.categories.map(function (row) { return row.id; }).join(",");
  const root = desk(snap);
  ctx.fetch = function (url) {
    assert.equal(String(url), "/data/banking/tiers.json");
    return Promise.resolve({
      ok: false,
      status: 401,
      type: "basic",
      json: function () { return Promise.resolve({ error: "unauthorized" }); }
    });
  };
  const loaded = await ctx.bankRehydrateTiers(root);
  assert.equal(loaded, false);
  assert.equal(root._bank.data._tiersGetFailed, false);
  assert.equal(root._bank.data.tier_doc.categories.map(function (row) { return row.id; }).join(","), before);
  assert.doesNotMatch(root.innerHTML, /unauthorized/);
  assert.match(root.innerHTML, /data-bank-bills="1"/);
  assert.match(root.innerHTML, /data-bank-cat-row="groceries"/);
});

test("two taps from a group reach that category's items", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  const opts = { tab: "budget", now: "2026-10-16T12:00:00-04:00" };
  const summary = ctx.bankPageHtml(fx, opts);
  const tier = summary.slice(summary.indexOf("bank-tier-summary"), summary.indexOf('data-bank-part="more"'));
  assert.equal((tier.match(/data-bank-group="/g) || []).length, 0);
  assert.match(tier, /data-bank-bills="1"/);
  assert.match(tier, /data-bank-cat-row="groceries"/);
  assert.doesNotMatch(summary, /data-bank-cat-item=/);
  const group = ctx.bankPageHtml(fx, Object.assign({ groupOpen: "needs" }, opts));
  assert.match(group, /data-bank-group-pop="needs"/);
  assert.match(group, /data-bank-cat-row="groceries"/);
  assert.doesNotMatch(group, /data-bank-cat-item="1"/);
  const cat = ctx.bankPageHtml(fx, Object.assign({ catOpen: "groceries", catMonth: "2026-10" }, opts));
  assert.match(cat, /data-bank-cat-item="1"/);
  assert.match(cat, /data-bank-item-meta="1"[^>]*>[^<]*\u00b7\u00b70000/);
  assert.match(cat, /data-bank-cat-item-open=/);
  assert.doesNotMatch(cat, /data-bank-group-pop=/);
  const edits = ctx.bankPageHtml(fx, { tab: "edits", now: opts.now });
  assert.match(edits, /data-bank-cat-jump="groceries"/);
  const fromEdits = ctx.bankPageHtml(fx, { tab: "edits", now: opts.now, catOpen: "groceries", catMonth: "2026-10" });
  assert.match(fromEdits, /data-bank-cat-pop="1"/);
  assert.match(fromEdits, /data-bank-cat-item="1"/);
});

test("a category item list caps at ten visible rows", function () {
  const ctx = boot();
  const snap = bare(ctx);
  for (let i = 0; i < 12; i++) {
    snap.current.edits_tx.push({
      date: "2026-10-" + String(i + 1).padStart(2, "0"),
      amount: 1,
      flow: "outflow",
      desc: "Corner Market " + i,
      category: "Groceries",
      last4: "2222",
      tx_key: "g" + i
    });
  }
  const html = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", catOpen: "groceries", catMonth: "2026-10" });
  assert.equal((html.match(/data-bank-cat-item="1"/g) || []).length, 12);
  assert.match(html, /class="list-cap"/);
  assert.match(html, /--list-cap-rows:10/);
  assert.match(html, /Showing 10 of 12/);
  assert.equal((html.match(/data-last4="\u00b7\u00b72222"/g) || []).length, 12);
  const head = html.indexOf("<h2>Groceries");
  const cap = html.indexOf('class="list-cap"');
  const save = html.indexOf('data-bank-cat-save="groceries"');
  assert.ok(head >= 0 && head < cap && cap < save);
});

test("items follow their category and a group change moves them", function () {
  const ctx = boot();
  const snap = bare(ctx);
  const row = {
    date: "2026-10-05",
    amount: 12.34,
    flow: "outflow",
    desc: "Sample Shop",
    category: "Shopping",
    tx_override_key: HASH
  };
  snap.tier_doc.category_tx[HASH] = "groceries";
  assert.equal(ctx.bankSpendGroupOf(row, snap), "needs");
  snap.tier_doc.category_tx[HASH] = "dining";
  assert.equal(ctx.bankSpendGroupOf(row, snap), "wants");
  snap.tier_doc.categories.forEach(function (item) {
    if (item.id === "dining") item.tier = "required";
  });
  assert.equal(ctx.bankSpendGroupOf(row, snap), "required");
});

test("group plans equal the printed category sums", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  fx.budget.tiers.by_category = {
    groceries: { plan: 24.68, plan_basis: "category_sum" },
    "gas-fuel": { plan: 12.34, plan_basis: "category_sum" }
  };
  fx.budget.tiers_mtd = { by_category: { groceries: { spent: 12.34 }, "gas-fuel": { spent: 0 } } };
  const html = ctx.bankPageHtml(fx, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  const summary = html.slice(html.indexOf("bank-tier-summary"), html.indexOf("data-bank-group-pop"));
  assert.match(summary, /data-bank-cat-row="groceries"[^>]*data-spent="12.34"[^>]*data-budget="24.68"/);
  assert.match(summary, /data-bank-cat-row="gas-fuel"[^>]*data-spent="0"[^>]*data-budget="12.34"/);
  assert.doesNotMatch(summary, /data-bank-group="/);
  const pop = html.slice(html.indexOf('data-bank-group-pop="needs"'));
  assert.equal(sumAttr(pop, "data-budget"), 37.02);
  assert.equal(sumAttr(pop, "data-spent"), 12.34);
});

test("uncategorized spend warns only in its month", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.month = "2026-10";
  snap.budget.uncategorized_count = 5;
  snap.current.edits_tx = [
    { date: "2026-09-02", amount: 12.34, flow: "outflow", desc: "Mystery Shop", category: null, category_basis: "spend", tx_key: "u1" },
    { date: "2026-09-03", amount: 12.34, flow: "outflow", desc: "Second Shop", category: null, category_basis: "spend", tx_key: "u2" },
    { date: "2026-10-04", amount: 12.34, flow: "inflow", desc: "Paycheck", category: null, category_basis: "not_spend", tx_key: "u3" }
  ];
  const oct = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.doesNotMatch(oct, /data-bank-uncat-warn/);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00" });
  assert.match(edits, /data-bank-uncat-badge="5"/);
  snap.current.edits_tx.push({
    date: "2026-10-08", amount: 12.34, flow: "outflow", desc: "Odd Purchase", category: null, category_basis: "spend", tx_key: "u4"
  });
  snap.current.edits_tx.push({
    date: "2026-10-09", amount: 12.34, flow: "outflow", desc: "Another Odd Purchase", category: null, category_basis: "spend", tx_key: "u5"
  });
  const warn = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.match(warn, /data-bank-uncat-warn="2"/);
  assert.match(warn, /2 items need a category/);
  const open = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", uncatOpen: true });
  assert.match(open, /data-bank-uncat-list="1"/);
  const listAt = open.indexOf('data-bank-uncat-list="1"');
  const list = open.slice(listAt, open.indexOf("</ul>", listAt));
  assert.match(list, /Odd Purchase/);
  assert.doesNotMatch(list, /Paycheck/);
});

test("category mode has no per-item tier picker and no group budget", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.edits_tx.push({
    date: "2026-10-05", amount: 12.34, flow: "outflow", desc: "Corner Market", category: "Groceries", tx_key: "cm", last4: "2222"
  });
  const html = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txQuery: "Corner", txOpen: "cm" });
  assert.doesNotMatch(html, /data-bank-kind=|data-bank-row-tier=|data-bank-tx-pick=|data-bank-plan-tier=/);
  const sheet = ctx.bankTxSheetHtml(snap, snap.current.edits_tx[0]);
  assert.match(sheet, /data-bank-tx-cat=/);
  assert.doesNotMatch(sheet, /data-bank-tx-pick=/);
  assert.match(html, /Any group/);
  const empty = ctx.bankPageHtml(snap, {
    tab: "edits",
    now: "2026-10-16T12:00:00-04:00",
    spendOpen: "new",
    catDraft: { id: "new", name: "Tools", tier: "needs", budget: "" }
  });
  assert.match(empty, /data-bank-spend-add="1" disabled/);
  const junk = ctx.bankPageHtml(snap, {
    tab: "edits",
    now: "2026-10-16T12:00:00-04:00",
    spendOpen: "new",
    catDraft: { id: "new", name: "Tools", tier: "needs", budget: "abc" }
  });
  assert.match(junk, /data-bank-spend-add="1" disabled/);
  const zero = ctx.bankPageHtml(snap, {
    tab: "edits",
    now: "2026-10-16T12:00:00-04:00",
    spendOpen: "new",
    catDraft: { id: "new", name: "Tools", tier: "needs", budget: "0" }
  });
  assert.match(zero, /data-bank-spend-add="1">Save/);
  assert.doesNotMatch(zero, /data-bank-spend-add="1" disabled/);
});

test("a fixture with no categories still balances bank plus in minus to pay", function () {
  const ctx = boot();
  const fx = loadFixture();
  delete fx.tier_doc;
  assert.equal(ctx.bankCategoriesActive(fx), false);
  const html = ctx.bankPageHtml(fx, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  const num = function (attr) { return Number((html.match(new RegExp(attr + '="([^"]*)"')) || [])[1]); };
  const now = num("data-bank-hero-now");
  const inn = num("data-bank-hero-in");
  const out = num("data-bank-hero-out");
  const end = num("data-bank-hero-end");
  const ledger = num("data-bank-ledger-end");
  const left = num("data-fund-left");
  assert.equal(Math.round((now + inn - out) * 100) / 100, end);
  assert.equal(end, left);
  assert.equal(end, ledger);
  assert.equal(now, 24.68);
  const due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('data-bank-part="mtd"', html.indexOf('class="bank-due-month"')));
  assert.doesNotMatch(due, /data-bank-today/);
  assert.match(due, /data-bank-chain-prev="24\.68"[^>]*data-bank-forward="1"/);
  assert.doesNotMatch(due, /sym">Month-end/);
  assert.doesNotMatch(html, /data-bank-hero-toggle/);
  assert.match(html, /data-bank-hero-accounts="1"/);
  assert.doesNotMatch(html, /data-bank-hero-accounts="1"[^>]*hidden/);
  assert.match(html, /To pay &amp; set aside/);
  assert.match(html, /data-bank-uncat-warn="4"/);
});

test("in the bank plus coming in minus to pay equals month-end", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  fx.tier_doc.categories.forEach(function (row) {
    if (row.id === "groceries") row.budget = 24.68;
  });
  const html = ctx.bankPageHtml(fx, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  const num = function (attr) { return Number((html.match(new RegExp(attr + '="([^"]*)"')) || [])[1]); };
  const now = num("data-bank-hero-now");
  const inn = num("data-bank-hero-in");
  const out = num("data-bank-hero-out");
  const end = num("data-bank-hero-end");
  const left = num("data-fund-left");
  const ledger = num("data-bank-ledger-end");
  assert.equal(Math.round((now + inn - out) * 100) / 100, end);
  assert.equal(end, left);
  assert.equal(end, ledger);
  assert.equal(now, 24.68);
  assert.doesNotMatch(html, /data-bank-today/);
  assert.match(html, /data-bank-chain-prev="24\.68"[^>]*data-bank-forward="1"/);
  assert.doesNotMatch(html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('data-bank-part="mtd"', html.indexOf('class="bank-due-month"'))), /sym">Month-end/);
});

test("a paid bill counts in paid and not in to pay", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.budget.account_funding = [{ nickname: "Bills", last4: "2222", start_balance: 100, current_balance: 100 }];
  snap.budget.account_funding_combined = 100;
  snap.budget.paid_status_month = "2026-10";
  snap.budget.bills = [{
    name: "Phone",
    amount: 12.34,
    typical_day: 3,
    cadence: "monthly",
    tier: "required",
    paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-01" }
  }];
  const html = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  const paid = Number((html.match(/data-bank-hero-paid="([^"]*)"/) || [])[1]);
  const out = Number((html.match(/data-bank-hero-out="([^"]*)"/) || [])[1]);
  assert.equal(paid, 12.34);
  assert.equal(out, 0);
  assert.match(html, /Phone[\s\S]{0,240}paid Oct 1/);
});

test("a calendar day row wraps the name and shows category and last-4", function () {
  const ctx = boot();
  const snap = bare(ctx);
  const longName = "Example Household Supply Run For The Month And Another Week";
  snap.budget.bills = [{
    name: longName,
    amount: 12.34,
    typical_day: 20,
    cadence: "monthly",
    tier: "required",
    category: "Groceries",
    usual_account: { last4: "2222" }
  }];
  snap.budget.subscriptions = [{ name: "Stream Club", amount: 12.34, typical_day: 20, usual_account: { last4: "0831" } }];
  const html = ctx.bankDayDialogHtml(snap, { year: 2026, month: 10 }, 20, null);
  assert.match(html, /data-bank-day-name="1">Example Household Supply Run For The Month And Another Week</);
  const name = html.slice(html.indexOf("data-bank-day-name"), html.indexOf("</b>", html.indexOf("data-bank-day-name")));
  assert.doesNotMatch(name, /text-overflow|nowrap|ellipsis/);
  assert.match(html, /data-bank-day-meta="1">[^<]*\u00b7 \u00b7\u00b72222/);
  assert.ok((html.match(/data-bank-day-item="1"/g) || []).length >= 2);
});

test("the transaction sheet defaults to just this one and saves that transaction only", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.edits_tx = [{
    date: "2026-10-05", amount: 12.34, flow: "outflow", desc: "Corner Market", category: "Groceries", tx_key: HASH, last4: "2222"
  }];
  const html = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txOpen: HASH });
  const sheet = html.slice(html.indexOf("data-bank-tx-sheet"));
  const oneAt = sheet.indexOf('data-bank-tx-scope="one"');
  const merchantAt = sheet.indexOf('data-bank-tx-scope="merchant"');
  assert.ok(oneAt >= 0 && oneAt < merchantAt);
  assert.match(sheet, /class="book-chip on"[^>]*data-bank-tx-scope="one"|data-bank-tx-scope="one"[^>]*class="book-chip on"/);
  assert.equal((html.match(/data-bank-spend-undo|data-bank-tx-undo/g) || []).length, 0);
  const calls = watch(ctx);
  const root = {
    innerHTML: "",
    listeners: {},
    addEventListener: function (type, fn) { this.listeners[type] = fn; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  ctx.bankMount(root, snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  root._bank.tab = "edits";
  root._bank.txOpen = HASH;
  ctx.bankPaint(root);
  const sheetNode = {
    querySelectorAll: function () {
      return [{
        classList: { contains: function (name) { return name === "on"; } },
        getAttribute: function (name) {
          if (name === "data-bank-tx-scope") return "one";
          if (name === "aria-pressed") return "true";
          return null;
        },
        value: "one"
      }];
    },
    querySelector: function (sel) {
      if (sel === "[data-bank-tx-cat]") return { value: "groceries" };
      return null;
    }
  };
  await root.listeners.click({
    preventDefault: function () {},
    target: {
      tagName: "BUTTON",
      getAttribute: function () { return null; },
      closest: function (sel) {
        if (sel === "[data-bank-tx-save]") {
          return {
            getAttribute: function (name) {
              if (name === "data-bank-tx-key") return HASH;
              if (name === "data-bank-tx-merchant") return "corner-market";
              return "1";
            },
            closest: function (inner) { return inner === "[data-bank-tx-sheet]" ? sheetNode : null; }
          };
        }
        return null;
      }
    }
  });
  const saves = calls.filter(function (call) { return call.body && call.body.category_tx; });
  assert.equal(saves.length, 1);
  assert.equal(saves[0].body.category_rules, undefined);
  assert.equal(saves[0].body.category_tx[HASH], "groceries");
  assert.equal((root.innerHTML.match(/data-bank-spend-undo/g) || []).length, 1);
});

test("an empty transaction search lists the newest rows and caps the visible list at 10", function () {
  const ctx = boot();
  const snap = bare(ctx);
  const rows = [];
  for (let i = 0; i < 12; i++) {
    rows.push({
      date: "2026-10-" + String(i + 1).padStart(2, "0"),
      amount: i + 1,
      flow: "outflow",
      desc: "Shop " + String(i).padStart(2, "0"),
      category: "Groceries",
      tx_key: "t" + i,
      last4: "2222"
    });
  }
  snap.current.edits_tx = rows;
  const html = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00" });
  const list = html.slice(html.indexOf("data-bank-find-results"), html.indexOf("</section>", html.indexOf("data-bank-find-results")));
  const names = [];
  const re = /data-bank-item-name="1">([^<]+)/g;
  let hit;
  while ((hit = re.exec(list))) names.push(hit[1]);
  assert.equal(names[0], "Shop 11");
  assert.equal(names[1], "Shop 10");
  assert.equal(names.length, 12);
  assert.match(list, /class="list-cap"/);
  assert.match(list, /--list-cap-rows:10/);
  assert.match(list, /Showing 10 of 12, scroll for more/);
  const filtered = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txQuery: "Shop 01" });
  const found = filtered.slice(filtered.indexOf("data-bank-find-results"), filtered.indexOf("</section>", filtered.indexOf("data-bank-find-results")));
  assert.match(found, /Shop 01/);
  assert.doesNotMatch(found, /Shop 11/);
});

test("transaction search filters by category and matches a category name in the typed query", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.edits_tx = [
    { date: "2026-10-08", amount: 12.34, flow: "outflow", desc: "North Lot", category: "Groceries", tx_key: "g1", last4: "2222" },
    { date: "2026-10-07", amount: 8, flow: "outflow", desc: "City Fuel", category: "Gas", tx_key: "f1", last4: "2222" },
    { date: "2026-09-02", amount: 3, flow: "outflow", desc: "Old Market", category: "Groceries", tx_key: "g0", last4: "2222" },
    { date: "2026-10-06", amount: 4, flow: "outflow", desc: "Zz Sample", category: "", category_basis: "spend", tx_key: "u1", last4: "2222" },
    { date: "2026-10-05", amount: 2, flow: "outflow", desc: "Inside Move", category: "", category_basis: "not_spend", tx_key: "n1", last4: "2222" }
  ];
  const picked = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txCat: "groceries" });
  const catSel = picked.slice(picked.indexOf('aria-label="Category"'), picked.indexOf("</select>", picked.indexOf('aria-label="Category"')));
  assert.match(catSel, /Any category/);
  assert.match(catSel, />Uncategorized</);
  assert.ok(catSel.indexOf(">Dining<") < catSel.indexOf(">Groceries<"));
  assert.doesNotMatch(catSel, /style=/);
  const groceryList = picked.slice(picked.indexOf("data-bank-find-results"), picked.indexOf("</section>", picked.indexOf("data-bank-find-results")));
  assert.match(groceryList, /North Lot/);
  assert.match(groceryList, /Old Market/);
  assert.doesNotMatch(groceryList, /City Fuel|Zz Sample|Inside Move/);
  const both = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txCat: "groceries", txMonth: "2026-10" });
  const bothList = both.slice(both.indexOf("data-bank-find-results"), both.indexOf("</section>", both.indexOf("data-bank-find-results")));
  assert.match(bothList, /North Lot/);
  assert.doesNotMatch(bothList, /Old Market|City Fuel/);
  const typed = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txQuery: "grocer" });
  const typedList = typed.slice(typed.indexOf("data-bank-find-results"), typed.indexOf("</section>", typed.indexOf("data-bank-find-results")));
  assert.match(typedList, /North Lot/);
  assert.doesNotMatch(typedList, /City Fuel|Zz Sample|Inside Move/);
  const open = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txCat: "uncategorized" });
  const openList = open.slice(open.indexOf("data-bank-find-results"), open.indexOf("</section>", open.indexOf("data-bank-find-results")));
  assert.match(openList, /Zz Sample/);
  assert.doesNotMatch(openList, /Inside Move|North Lot|City Fuel|Old Market/);
});

function rowHtml(html, name, nth) {
  let from = 0;
  let at = -1;
  const want = nth || 1;
  for (let i = 0; i < want; i++) {
    at = html.indexOf(name, from);
    assert.ok(at >= 0, name + " #" + (i + 1));
    from = at + name.length;
  }
  return html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at));
}

test("not-purchase rows open a category sheet and stay out of totals until an override", function () {
  const ctx = boot();
  const snap = bare(ctx);
  const loanHash = "h:" + "cd".repeat(16);
  const payHash = "h:" + "ef".repeat(16);
  snap.current.month = "2026-10";
  snap.history.months = [{ month: "2026-09", closed: true }];
  snap.budget.tiers_mtd = { by_category: { groceries: { spent: 12.34 } } };
  snap.current.edits_tx = [
    { date: "2026-10-08", amount: 5, flow: "outflow", desc: "Corner Market", category: "Groceries", tx_key: "cm", last4: "2222" },
    { date: "2026-10-07", amount: 40, flow: "inflow", desc: "Payroll", category: "Paycheck/Salary/Wages", category_basis: "not_spend", tx_override_key: payHash, tx_key: "pay", last4: "2222" },
    { date: "2026-10-06", amount: 3, flow: "inflow", desc: "Corner Market", category_basis: "not_spend", refund: true, tx_key: "rf", last4: "2222" },
    { date: "2026-10-05", amount: 2, flow: "outflow", desc: "Inside Move", category: "", category_basis: "not_spend", tx_override_key: HASH, tx_key: "n1", last4: "2222" },
    { date: "2026-10-04", amount: 4, flow: "outflow", desc: "Cash Withdrawal", category_basis: "not_spend", tx_key: "cw", last4: "2222" },
    { date: "2026-10-03", amount: 6, flow: "outflow", desc: "Loan Payment", transfer: true, tx_override_key: loanHash, tx_key: "lp", last4: "2222" },
    { date: "2026-09-02", amount: 12.34, flow: "outflow", desc: "Rent", category: "Groceries", tx_key: "rent", last4: "2222" }
  ];
  assert.equal(ctx.bankSpendExcluded(snap.current.edits_tx[3], snap), true);
  assert.equal(ctx.bankMapSpendCategory(snap.current.edits_tx[3], snap), null);
  assert.equal(ctx.bankCategoryFigures(snap, "2026-10").groceries.spent, 12.34);
  assert.equal(ctx.bankTxSearchLocked(snap, snap.current.edits_tx[1]), true);
  assert.equal(ctx.bankTxDepositLocked(snap.current.edits_tx[1]), true);
  assert.equal(ctx.bankTxSearchLocked(snap, snap.current.edits_tx[2]), false);
  assert.equal(ctx.bankTxDepositLocked({ flow: "inflow", kind: "refund" }), false);
  assert.equal(ctx.bankTxDepositLocked({ flow: "inflow", desc: "Payroll" }), true);
  assert.equal(ctx.bankTxSearchLocked(snap, snap.current.edits_tx[6]), false);

  const html = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00" });
  const list = html.slice(html.indexOf("data-bank-find-results"), html.indexOf("</section>", html.indexOf("data-bank-find-results")));
  const move = rowHtml(list, "Inside Move");
  assert.match(move, /data-bank-tx-open=/);
  assert.match(move, /Not a purchase/);
  assert.doesNotMatch(move, /bank-tx-quiet/);
  const payroll = rowHtml(list, "Payroll");
  assert.match(payroll, /bank-tx-quiet/);
  assert.match(payroll, /Not a purchase/);
  assert.doesNotMatch(payroll, /data-bank-tx-open/);
  const closed = rowHtml(list, "Rent");
  assert.doesNotMatch(closed, /bank-tx-quiet/);
  assert.doesNotMatch(closed, /Closed month/);
  assert.match(closed, /data-bank-tx-open=/);
  const refund = rowHtml(list, "Corner Market", 2);
  assert.match(refund, /data-bank-tx-open=/);
  assert.match(refund, /Not a purchase/);
  assert.doesNotMatch(refund, /bank-tx-quiet/);

  const sheet = ctx.bankTxSheetHtml(snap, snap.current.edits_tx[3], {});
  assert.match(sheet, /Not counted as spending now/);
  assert.match(sheet, /value="not-purchase" selected/);
  assert.match(sheet, /aria-label="Category"/);
  assert.match(sheet, /class="book-chip on"[^>]*data-bank-tx-scope="one"|data-bank-tx-scope="one"[^>]*class="book-chip on"/);
  assert.match(sheet, /Just this one/);
  assert.equal(ctx.bankTxSheetHtml(snap, snap.current.edits_tx[1], {}), "");
  assert.match(ctx.bankTxSheetHtml(snap, snap.current.edits_tx[6], {}), /Pick a category for this purchase/);
  const grocerySheet = ctx.bankTxSheetHtml(snap, snap.current.edits_tx[0], {});
  assert.match(grocerySheet, /Pick a category for this purchase/);
  assert.doesNotMatch(grocerySheet, /value="not-purchase"/);

  snap.tier_doc.category_tx[HASH] = "groceries";
  snap.tier_doc.category_tx[loanHash] = "car-insurance-loans";
  snap.tier_doc.category_tx[payHash] = "groceries";
  assert.equal(ctx.bankSpendExcluded(snap.current.edits_tx[3], snap), false);
  assert.equal(ctx.bankMapSpendCategory(snap.current.edits_tx[3], snap).id, "groceries");
  assert.equal(ctx.bankSpendExcluded(snap.current.edits_tx[1], snap), true);
  const figs = ctx.bankCategoryFigures(snap, "2026-10");
  assert.equal(figs.groceries.spent, 14.34);
  assert.equal(figs["car-insurance-loans"].spent, 6);
  const budget = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "needs" });
  assert.match(budget, /data-bank-cat-row="groceries"[^>]*data-spent="14.34"/);
  const required = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "required" });
  assert.match(required, /data-bank-cat-row="car-insurance-loans"[^>]*data-spent="6"/);
  const payAfter = ctx.bankTxResultsHtml(snap, { txQuery: "Payroll" });
  const payRow = rowHtml(payAfter, "Payroll");
  assert.match(payRow, /bank-tx-quiet/);
  assert.match(payRow, /Not a purchase/);
  assert.doesNotMatch(payRow, /Groceries/);
  const overridden = ctx.bankTxResultsHtml(snap, { txQuery: "Inside Move" });
  const overriddenRow = rowHtml(overridden, "Inside Move");
  assert.match(overriddenRow, /fresh-chip">Groceries/);
  assert.doesNotMatch(overriddenRow, /Not a purchase/);
  const kept = ctx.bankTxSheetHtml(snap, snap.current.edits_tx[3], {});
  assert.match(kept, /Pick a category for this purchase/);
  assert.doesNotMatch(kept, /Not counted as spending now/);
  assert.match(kept, /value="not-purchase"/);
  assert.match(kept, /value="groceries" selected/);
  const filtered = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00", txCat: "groceries" });
  const groceryList = filtered.slice(filtered.indexOf("data-bank-find-results"), filtered.indexOf("</section>", filtered.indexOf("data-bank-find-results")));
  assert.match(groceryList, /Inside Move/);
  assert.doesNotMatch(groceryList, /Payroll/);

  delete snap.budget.tiers_mtd;
  snap.current.edits_tx = [snap.current.edits_tx[3]];
  assert.equal(ctx.bankCategoryFigures(snap, "2026-10").groceries.spent, 2);
  snap.current.edits_tx[0].date = "2026-09-05";
  assert.equal(ctx.bankCategoryFigures(snap, "2026-09").groceries.spent, 0);
  snap.budget.actuals_by_month = { "2026-09": { categories_spent: { groceries: 2 } } };
  assert.equal(ctx.bankCategoryFigures(snap, "2026-09").groceries.spent, 2);
  delete snap.budget.actuals_by_month;
  delete snap.tier_doc.category_tx[HASH];
  snap.current.edits_tx[0].date = "2026-10-05";
  assert.equal(ctx.bankCategoryFigures(snap, "2026-10").groceries.spent, 0);
  snap.tier_doc.category_rules["cash withdrawal"] = "shopping";
  snap.current.edits_tx = [
    { date: "2026-10-04", amount: 4, flow: "outflow", desc: "Cash Withdrawal", category_basis: "not_spend", tx_key: "cw", last4: "2222" }
  ];
  const cash = ctx.bankTxResultsHtml(snap, { txQuery: "Cash" });
  assert.match(rowHtml(cash, "Cash Withdrawal"), /fresh-chip">General Shopping/);
  assert.equal(ctx.bankCategoryFigures(snap, "2026-10").shopping.spent, 4);
});

test("saving a not-purchase row posts the category and clearing it posts null", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.month = "2026-10";
  snap.budget.tiers_mtd = { by_category: { groceries: { spent: 12.34 } } };
  snap.current.edits_tx = [{
    date: "2026-10-05", amount: 2, flow: "outflow", desc: "Inside Move",
    category: "", category_basis: "not_spend", tx_key: HASH, last4: "2222"
  }];
  const calls = watch(ctx, function (body) {
    if (!body) return snap.tier_doc;
    return { schema: "banking-tiers/v1" };
  });
  const root = {
    innerHTML: "",
    listeners: {},
    addEventListener: function (type, fn) { this.listeners[type] = fn; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  function sheetNode(scope, value) {
    return {
      querySelectorAll: function () {
        return [{
          classList: { contains: function (name) { return name === "on"; } },
          getAttribute: function (name) {
            if (name === "data-bank-tx-scope") return scope;
            if (name === "aria-pressed") return "true";
            return null;
          },
          value: scope
        }];
      },
      querySelector: function (sel) {
        if (sel === "[data-bank-tx-cat]") return { value: value };
        return null;
      }
    };
  }
  function click(scope, value, merchant) {
    return root.listeners.click({
      preventDefault: function () {},
      target: {
        tagName: "BUTTON",
        getAttribute: function () { return null; },
        closest: function (sel) {
          if (sel === "[data-bank-tx-save]") {
            return {
              getAttribute: function (name) {
                if (name === "data-bank-tx-key") return HASH;
                if (name === "data-bank-tx-merchant") return merchant;
                return "1";
              },
              closest: function (inner) { return inner === "[data-bank-tx-sheet]" ? sheetNode(scope, value) : null; }
            };
          }
          return null;
        }
      }
    });
  }
  ctx.bankMount(root, snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  root._bank.tab = "edits";
  root._bank.txOpen = HASH;
  await click("one", "", "inside move");
  assert.equal(calls.filter(function (call) { return call.body && call.body.category_tx; }).length, 0);
  await click("one", "groceries", "inside move");
  const saves = calls.filter(function (call) { return call.body && call.body.category_tx; });
  assert.equal(saves.length, 1);
  assert.equal(saves[0].body.category_tx[HASH], "groceries");
  assert.equal(saves[0].body.category_rules, undefined);
  assert.equal(ctx.bankCategoryFigures(root._bank.data, "2026-10").groceries.spent, 14.34);
  const savedRow = rowHtml(root.innerHTML, "Inside Move");
  assert.match(savedRow, /fresh-chip">Groceries/);
  assert.doesNotMatch(savedRow, /Not a purchase/);
  await click("one", "not-purchase", "inside move");
  const cleared = calls.filter(function (call) { return call.body && call.body.category_tx; });
  assert.equal(cleared.length, 2);
  assert.equal(cleared[1].body.category_tx[HASH], null);
  assert.equal(root._bank.data.tier_doc.category_tx[HASH], undefined);
  assert.match(rowHtml(root.innerHTML, "Inside Move"), /Not a purchase/);
  assert.equal(ctx.bankCategoryFigures(root._bank.data, "2026-10").groceries.spent, 12.34);
  await click("merchant", "dining", "inside move");
  const rules = calls.filter(function (call) { return call.body && call.body.category_rules; });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].body.category_rules["inside move"], "dining");
  assert.equal(rules[0].body.category_tx, undefined);
  assert.match(rowHtml(root.innerHTML, "Inside Move"), /fresh-chip">Dining/);
});

test("household and health stand alone, including a closed month", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.tier_doc.categories = [
    { id: "shopping", name: "Shopping", tier: "wants", budget: 10, merged_into: "" },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 4, merged_into: "" },
    { id: "health", name: "Health", tier: "needs", budget: 2.5, merged_into: "" },
    { id: "education-needs", name: "Education (Needs)", tier: "needs", budget: 8, merged_into: "" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 1, merged_into: "" }
  ];
  const cats = ctx.bankSpendCategories(snap);
  const shop = ctx.bankSpendById(cats, "shopping");
  assert.equal(shop.name, "General Shopping");
  assert.equal(shop.budget, 10);
  assert.equal(ctx.bankSpendById(cats, "household-health").merged_into, "");
  assert.equal(ctx.bankSpendById(cats, "household-health").budget, 4);
  assert.equal(ctx.bankSpendById(cats, "health").budget, 2.5);
  assert.equal(ctx.bankSpendVisible(cats).some(function (row) { return row.id === "household-health"; }), true);
  assert.equal(ctx.bankSpendVisible(cats).some(function (row) { return row.id === "health"; }), true);
  assert.equal(ctx.bankSpendVisible(cats).some(function (row) { return row.id === "education-needs"; }), false);
  const txHash = "h:" + "cd".repeat(16);
  snap.tier_doc.category_tx[txHash] = "household-health";
  snap.tier_doc.category_rules["corner clinic"] = "health";
  const moved = { date: "2026-10-04", amount: 3, flow: "outflow", desc: "Sample Store", category: "Gifts", tx_override_key: txHash };
  const movedHit = ctx.bankMapSpendCategory(moved, snap);
  assert.equal(movedHit.id, "household-health");
  assert.equal(movedHit.via, "tx");
  const ruled = { date: "2026-10-04", amount: 1, flow: "outflow", desc: "Corner Clinic", merchant_key: "corner clinic", category: "Gifts" };
  const ruledHit = ctx.bankMapSpendCategory(ruled, snap);
  assert.equal(ruledHit.id, "health");
  assert.equal(ruledHit.via, "merchant");
  snap.budget.bills = [{ name: "Education", bill_id: "education", amount: 12.34, category: "Education", typical_day: 5, cadence: "monthly" }];
  const matched = { date: "2026-09-12", amount: 6, flow: "outflow", desc: "Education", category: "Education (Needs)", tx_key: "ed-match" };
  const loose = { date: "2026-09-12", amount: 2, flow: "outflow", desc: "Odd Class", category: "Tuition", tx_key: "ed-loose" };
  snap.current.edits_tx = [matched, loose];
  const matchedHit = ctx.bankMapSpendCategory(matched, snap);
  assert.equal(matchedHit.via, "education-bill");
  assert.equal(matchedHit.id, "");
  const looseHit = ctx.bankMapSpendCategory(loose, snap);
  assert.equal(looseHit.via, "uncategorized");
  assert.equal(ctx.bankUncatItems(snap).some(function (row) { return row.tx_key === "ed-match"; }), false);
  assert.equal(ctx.bankUncatItems(snap).some(function (row) { return row.tx_key === "ed-loose"; }), true);
  snap.budget.snapshots = {
    "2026-09": {
      month: "2026-09",
      closed: true,
      categories: [
        { id: "shopping", name: "Shopping", tier: "wants", budget: 5 },
        { id: "household-health", name: "Household & Health", tier: "needs", budget: 7 },
        { id: "education-needs", name: "Education (Needs)", tier: "needs", budget: 9 }
      ]
    }
  };
  snap.current.month = "2026-10";
  const closed = ctx.bankCategoryFigures(snap, "2026-09");
  assert.equal(closed.shopping.name, "General Shopping");
  assert.equal(closed.shopping.plan, 5);
  assert.equal(closed["household-health"].plan, 7);
  assert.equal(closed["household-health"].name, "Household & Health");
  assert.equal(closed["education-needs"], undefined);
  const visible = ctx.bankSpendVisible(ctx.bankSpendCategories(snap)).map(function (row) { return row.id; });
  assert.ok(visible.indexOf("household-health") >= 0);
  assert.equal(visible.indexOf("education-needs"), -1);
  assert.equal(ctx.bankSpendById(ctx.bankSpendStarters(), "shopping").name, "General Shopping");
});

test("tiers overlay cleans the category list and keeps redacted rules", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.tier_doc.updated_at = "2026-10-01T12:00:00Z";
  snap.tier_doc.categories = [
    { id: "shopping", name: "Shopping", tier: "wants", budget: 10, merged_into: "" },
    { id: "household-health", name: "Household & Health", tier: "needs", budget: 4, merged_into: "" },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 1, merged_into: "" },
    { id: "other", name: "Other", tier: "wants", budget: 3, merged_into: "" },
    { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 8, merged_into: "" }
  ];
  snap.tier_doc.category_rules = {
    "auto policy one": "car-insurance-loans",
    "auto policy two": "car-insurance-loans",
    "cafe": "dining"
  };
  snap.tier_doc.category_tx = { ["h:" + "ef".repeat(16)]: "household-health" };
  snap.budget.category_merge_ids = { "household-health": "shopping" };
  snap.budget.category_deleted = ["other"];
  snap.budget.box_categories = { categories: [{ name: "Pets" }] };
  snap.budget.tiers_overlay = {
    schema: "banking-tiers-overlay/v1",
    updated_at: "2026-10-15T12:00:00Z",
    source: "box",
    privacy_redacted: ["auto policy one", "auto policy two"],
    tiers: {
      categories: [
        { id: "shopping", name: "Shopping", tier: "wants", budget: 2 },
        { id: "household-health", name: "Household & Health", tier: "needs", budget: 9 },
        { id: "groceries", name: "Groceries", tier: "needs", budget: 1 },
        { id: "dining", name: "Dining", tier: "wants", budget: 1 },
        { id: "other", name: "Other", tier: "wants", budget: 3 },
        { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required", budget: 8 }
      ],
      category_rules: { cafe: "groceries", market: "groceries" },
      category_tx: {}
    },
    november_budget: {
      pot: 90,
      guides: { groceries: 20, dining: 15, shopping: 25 }
    }
  };
  const cats = ctx.bankSpendCategories(snap);
  const visible = ctx.bankSpendVisible(cats).map(function (row) { return row.id; });
  assert.equal(visible.indexOf("other"), -1);
  assert.equal(visible.indexOf("household-health"), -1);
  assert.ok(visible.indexOf("pets") >= 0);
  assert.equal(ctx.bankSpendById(cats, "household-health").merged_into, "shopping");
  assert.equal(ctx.bankSpendById(cats, "groceries").budget, 1);
  assert.equal(ctx.bankSpendById(cats, "groceries").in_pot, undefined);
  assert.equal(ctx.bankSpendById(cats, "dining").guide, undefined);
  assert.equal(ctx.bankSpendById(cats, "car-insurance-loans").budget, 8);
  assert.equal(ctx.bankSpendById(cats, "car-insurance-loans").in_pot, undefined);
  const doc = ctx.bankEffectiveCategoryDoc(snap);
  assert.equal(doc.category_rules.cafe, "groceries");
  assert.equal(doc.category_rules.market, "groceries");
  assert.equal(doc.category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(doc.category_rules["auto policy two"], "car-insurance-loans");
  assert.equal(doc.category_tx["h:" + "ef".repeat(16)], "shopping");
  const fit = ctx.bankBudgetFit(snap, "2026-10");
  assert.notEqual(fit.categories, 90);
  assert.equal(ctx.bankSharedPot(snap), null);
  assert.equal(ctx.bankSharedPot(snap, "2026-10"), null);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", now: "2026-10-16T12:00:00-04:00" });
  assert.doesNotMatch(edits, /data-bank-pot="1"/);
  assert.doesNotMatch(edits, /Shared pot/);
  assert.doesNotMatch(edits, /data-bank-guide=/);
  assert.match(edits, /Pets/);
  assert.doesNotMatch(edits, /Household &amp; Health/);
  snap.tier_doc.updated_at = "2026-10-16T18:00:00Z";
  snap.tier_doc.categories.forEach(function (row) {
    if (row.id === "groceries") row.budget = 7;
  });
  snap.tier_doc.categories.push({ id: "tv", name: "TV", tier: "wants", budget: 4, merged_into: "" });
  const saved = ctx.bankSpendCategories(snap);
  const savedIds = ctx.bankSpendVisible(saved).map(function (row) { return row.id; });
  assert.equal(savedIds.indexOf("tv"), -1);
  assert.ok(savedIds.indexOf("pets") >= 0);
  assert.equal(ctx.bankSpendById(saved, "groceries").budget, 1);
  assert.equal(ctx.bankSpendById(saved, "shopping").name, "General Shopping");
  assert.equal(ctx.bankSharedPot(snap), null);
  assert.equal(ctx.bankEffectiveCategoryDoc(snap).category_rules["auto policy one"], "car-insurance-loans");
  assert.equal(ctx.bankEffectiveCategoryDoc(snap).category_rules.cafe, "groceries");
  snap.tier_doc.budgets_updated_at = { groceries: "2026-10-16T18:00:00Z" };
  const stamped = ctx.bankSpendCategories(snap);
  assert.equal(ctx.bankSpendById(stamped, "groceries").budget, 7);
  assert.equal(ctx.bankSpendById(stamped, "dining").budget, 1);
  const november = ctx.bankSpendCategories(snap, "2026-11");
  assert.equal(ctx.bankSpendById(november, "groceries").budget, 7);
  assert.equal(ctx.bankSpendById(november, "dining").budget, 15);
  assert.equal(ctx.bankSpendById(november, "dining").in_pot, true);
  assert.equal(ctx.bankSharedPot(snap, "2026-11").total, 90);
  snap.current.month = "2026-11";
  const stampedFit = ctx.bankBudgetFit(snap, "2026-11");
  assert.notEqual(stampedFit.categories, 90);
  delete snap.tier_doc.budgets_updated_at;
  const guides = ctx.bankSpendCategories(snap, "2026-11");
  assert.equal(ctx.bankSpendById(guides, "groceries").budget, 20);
  assert.equal(ctx.bankSpendById(guides, "groceries").guide, 20);
  const guideFit = ctx.bankBudgetFit(snap, "2026-11");
  assert.notEqual(guideFit.categories, 90);
  assert.ok(guideFit.categories > stampedFit.categories);
  snap.current.month = "2026-10";
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(snap, "2026-10"), "groceries").budget, 1);
  assert.notEqual(ctx.bankBudgetFit(snap, "2026-10").categories, 90);
});

test("mount, tiers GET, and refetch keep one category set and one After budgets figure", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.current.month = "2026-10";
  snap.budget.budget_month = { start: "2026-09-30", end: "2026-10-29", month: "2026-10" };
  snap.tier_doc.updated_at = "2026-10-15T02:01:00Z";
  snap.tier_doc.categories = [
    { id: "groceries", name: "Groceries", tier: "needs", budget: 10, merged_into: "" },
    { id: "tv", name: "TV", tier: "wants", budget: 4, merged_into: "" }
  ];
  snap.budget.category_deleted_ids = ["tv"];
  snap.budget.box_categories = { categories: [{ name: "Pets" }] };
  snap.budget.tiers_overlay = {
    updated_at: "2026-10-15T22:32:00-04:00",
    tiers: {
      categories: [
        { id: "groceries", name: "Groceries", tier: "needs", budget: 40 },
        { id: "dining", name: "Dining", tier: "wants", budget: 12 },
        { id: "tv", name: "TV", tier: "wants", budget: 4 }
      ]
    },
    november_budget: { pot: 200, guides: { groceries: 80, dining: 50 } }
  };
  const printed = JSON.parse(JSON.stringify(snap));
  delete printed.tier_doc;
  function signature(data) {
    return ctx.bankSpendVisible(ctx.bankSpendCategories(data, "2026-10")).map(function (row) {
      return row.id + ":" + row.budget;
    }).join(",");
  }
  function afterLine(data) {
    return ctx.bankCardAfterBudgetsHtml(200, ctx.bankCardCategoryRoom(data, { month: "2026-10" }), [], "now");
  }
  const first = signature(snap);
  const firstLine = afterLine(snap);
  assert.match(first, /groceries:40/);
  assert.match(first, /dining:12/);
  assert.equal(first.indexOf("tv"), -1);
  assert.match(firstLine, /After budgets/);
  assert.notEqual(ctx.bankCardCategoryRoom(snap, { month: "2026-10" }).room, ctx.bankCardCategoryRoom(snap, { month: "2026-11" }).room);
  let paints = 0;
  let firstHtml = "";
  const paint = ctx.bankPaint;
  ctx.bankPaint = function (root) {
    paints += 1;
    const out = paint(root);
    if (paints === 1) firstHtml = root.innerHTML;
    return out;
  };
  ctx.fetch = function (url) {
    const u = String(url);
    if (u.indexOf("/data/banking/tiers.json") === 0) {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () {
          return Promise.resolve({
            schema: "banking-tiers/v1",
            updated_at: "2026-10-16T18:00:00Z",
            categories: [
              { id: "tv", name: "TV", tier: "wants", budget: 4 },
              { id: "cameras", name: "Cameras", tier: "wants", budget: 9 },
              { id: "groceries", name: "Groceries", tier: "needs", budget: 120 },
              { id: "dining", name: "Dining", tier: "wants", budget: 80 }
            ],
            category_rules: {},
            category_tx: {}
          });
        }
      });
    }
    if (u.indexOf("/data/banking.json") === 0) {
      return Promise.resolve({
        ok: true,
        status: 200,
        type: "basic",
        json: function () { return Promise.resolve(JSON.parse(JSON.stringify(printed))); }
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      type: "basic",
      json: function () { return Promise.resolve({ categories: [] }); }
    });
  };
  const root = {
    innerHTML: "",
    addEventListener: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  ctx.bankMount(root, snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.match(firstHtml, /data-bank-fit-pending="1"/);
  assert.match(firstHtml, /Checking budgets/);
  await root._bank.prune;
  assert.equal(paints, 2);
  assert.doesNotMatch(root.innerHTML, /data-bank-fit-pending/);
  assert.equal(signature(root._bank.data), first);
  assert.equal(afterLine(root._bank.data), firstLine);
  assert.equal(signature(root._bank.data).indexOf("cameras"), -1);
  assert.equal(await ctx.bankRefetch(root, { silent: true, force: true }), true);
  assert.equal(root._bank.data._tiersFromGet, true);
  assert.equal(root._bank.data.tier_doc.updated_at, "2026-10-16T18:00:00Z");
  assert.equal(signature(root._bank.data), first);
  assert.equal(afterLine(root._bank.data), firstLine);
  assert.equal(paints, 2);
});

test("a save drops merged rows and stays within 30", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  const list = [];
  let i;
  for (i = 0; i < 26; i++) list.push({ id: "c" + i, name: "Cat " + i, tier: "wants", budget: 1, merged_into: "" });
  for (i = 0; i < 7; i++) list.push({ id: "m" + i, name: "Old " + i, tier: "wants", budget: 1, merged_into: "c0" });
  snap.tier_doc.categories = list;
  const calls = watch(ctx);
  const el = desk(snap);
  assert.equal(await ctx.bankSpendSaveBudget(el, "c1", "4"), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.categories.length, 26);
  assert.ok(calls[0].body.categories.length <= 30);
  assert.equal(calls[0].body.categories.some(function (row) { return row.merged_into; }), false);
  assert.equal(calls[0].body.budgets_updated_at.c1 != null, true);
  assert.equal(calls[0].body.budgets_updated_at.c0, undefined);
});

test("this month shows each figure once and tucks the extra cards", function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.asof_data_through = "2026-10-04";
  snap.asof = "2026-10-12T16:00:00-04:00";
  snap.budget.account_funding = [{
    nickname: "Bills",
    last4: "2222",
    subType: "checking",
    start_balance: 40,
    current_balance: 40,
    pending_unposted: 3.5
  }];
  snap.budget.account_funding_combined = 40;
  snap.budget.bills = [
    { name: "Rent", amount: 10, category: "Rent/Mortgage", typical_day: 2, cadence: "monthly" },
    { name: "Auto loan", amount: 8, category: "Loans", typical_day: 3, cadence: "monthly" },
    { name: "Car payment", amount: 7, category: "Auto", typical_day: 4, cadence: "monthly" },
    { name: "Sample insurance", amount: 6, category: "Insurance", typical_day: 5, cadence: "monthly" },
    { name: "Education", bill_id: "education", amount: 12.34, category: "Education", typical_day: 6, cadence: "monthly" },
    { name: "Affirm plan", amount: 4, category: "Installment", typical_day: 7, cadence: "monthly" }
  ];
  snap.budget.income_monthly = [{ label: "Payroll", amount: 20, monthly_amount: 20, cadence: "monthly", typical_day: 15 }];
  snap.budget.tiers = { required_plan: 30, needs_plan: 0, wants_plan: 0, plan_total_tiers: 50, left_after_tiers: -30 };
  snap.budget.plan_dedupe = [{ name: "Groceries", deducted: 1.25 }];
  snap.current.edits_tx = [{ date: "2026-10-08", amount: 1, flow: "outflow", desc: "Odd Purchase", category: null, category_basis: "spend", tx_key: "once" }];
  const html = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00", groupOpen: "wants" });
  const heroAt = html.indexOf('data-bank-hero="1"');
  const hero = html.slice(heroAt, html.indexOf("</section>", heroAt));
  assert.ok(hero.indexOf("In the bank now") >= 0);
  assert.ok(hero.indexOf("In the bank now") < hero.indexOf("data-bank-hero-now"));
  assert.equal((html.match(/\(includes \$/g) || []).length, 1);
  assert.match(html, /\(includes \$3\.50 pending\)/);
  assert.equal((html.match(/data-bank-uncat-warn=/g) || []).length, 1);
  assert.equal((html.match(/Data through /g) || []).length, 1);
  assert.match(html, /Data through Oct 4/);
  assert.doesNotMatch(html, /as of Oct/);
  assert.doesNotMatch(html, /Paid \$[\d,.]+ of \$[\d,.]+ planned/);
  assert.doesNotMatch(html, /data-bank-hero-bar|data-bank-hero-split|Bills stay together/);
  const moreAt = html.indexOf('data-bank-part="more"');
  assert.ok(moreAt >= 0);
  assert.ok(html.indexOf('data-bank-part="funding"') > moreAt);
  assert.ok(html.indexOf('data-bank-part="mtd"') > moreAt);
  assert.ok(html.indexOf('class="bank-income"') > moreAt);
  assert.ok(html.indexOf("<h2>Insights</h2>") < 0 || html.indexOf("<h2>Insights</h2>") > moreAt);
  assert.ok(html.indexOf("bank-tier-summary") < moreAt);
  assert.match(html, /data-bank-income-line="1"/);
  assert.match(html, /data-bank-income-line="1"[^>]*data-budget="0"/);
  assert.match(html, /data-bank-income-line="1"[^>]*data-over="0"/);
  assert.match(html, /data-bank-fit-budgeted="0"/);
  assert.match(html, /data-bank-trim="1"/);
  assert.match(html, /Already counted in Groceries \$1\.25/);
  assert.doesNotMatch(html, /Overlap/);
  assert.match(html, /tone-stop/);
  ["housing", "loans", "car-insurance", "education", "affirm", "categories"].forEach(function (id) {
    assert.match(html, new RegExp('data-bank-bill-group="' + id + '"'));
  });
  assert.match(html, /Housing\/Utilities/);
  assert.match(html, /Car &amp; Insurance/);
  assert.match(html, /Affirm plans/);
  assert.match(html, /data-bank-scale="income"/);
  assert.match(html, /<span>Income<\/span>/);
  assert.match(html, /<span>Budgeted<\/span>/);
  assert.match(html, /<span>Left<\/span>/);
  assert.match(html, /General Shopping/);
  const under = JSON.parse(JSON.stringify(snap));
  under.budget.tiers.plan_total_tiers = 10;
  under.budget.tiers.left_after_tiers = 10;
  under.budget.plan_dedupe = [{ name: "Overlap", deducted: 1.25 }];
  under.budget.bills.forEach(function (row) { row.amount = 1; });
  const quiet = ctx.bankPageHtml(under, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.match(quiet, /data-over="0"/);
  assert.match(quiet, /<span>Left<\/span>/);
  assert.doesNotMatch(quiet, /data-bank-trim="1"/);
  assert.doesNotMatch(quiet, /Overlap/);
  const stray = JSON.parse(JSON.stringify(snap));
  stray.budget.plan_dedupe = [{ name: "Overlap", deducted: 1.25 }];
  const strayHtml = ctx.bankPageHtml(stray, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  assert.doesNotMatch(strayHtml, /Overlap|data-bank-trim="1"/);
});

test("bill names stay whole and categories are spending lines", function () {
  const ctx = boot();
  const css = fs.readFileSync(path.join(root, "house/banking.css"), "utf8");
  const nameRule = css.slice(css.indexOf(".bank-bill-tile .mix-leg-name"));
  const nameBlock = nameRule.slice(0, nameRule.indexOf("}"));
  assert.match(nameBlock, /font-size: 13px/);
  assert.match(nameBlock, /white-space: normal/);
  assert.match(nameBlock, /text-overflow: clip/);
  assert.doesNotMatch(nameBlock, /ellipsis/);
  assert.match(css, /\.bank-bill-grid \{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  const wide = css.slice(css.indexOf("@media (min-width: 900px)"));
  assert.match(wide, /\.bank-bill-grid \{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(wide, /\.bank-panel\[data-panel="budget"\] > \[data-bank-part="tiers"\] \{[^}]*grid-column:\s*1 \/ -1/);

  const snap = bare(ctx);
  snap.tier_doc.categories = ctx.bankSpendStarters().concat([
    { id: "required", name: "Required", tier: "required", budget: 0, merged_into: "" },
    { id: "needs", name: "Needs", tier: "needs", budget: 0, merged_into: "" },
    { id: "wants", name: "Wants", tier: "wants", budget: 0, merged_into: "" }
  ]);
  snap.tier_doc.categories.forEach(function (row) {
    if (row.id === "groceries") row.budget = 30;
    if (row.id === "gas-fuel") row.budget = 20;
    if (row.id === "shopping") row.budget = 15;
    if (row.id === "subscriptions") row.budget = 12;
  });
  const names = [
    ["Harbor View Housing Cooperative", "Rent/Mortgage", "housing", "Housing/Utilities"],
    ["Regional Student Loan Servicer", "Loans", "loans", "Loans"],
    ["Family Highway Transport Note", "Auto", "car-insurance", "Car &amp; Insurance"],
    ["Northwind Protection Plan", "Insurance", "car-insurance", "Car &amp; Insurance"],
    ["Continuing Studies Program", "Education", "education", "Education"],
    ["Household Installment Schedule", "Installment", "affirm", "Affirm plans"]
  ];
  snap.budget.bills = names.map(function (row, i) {
    return {
      name: row[0],
      amount: 10 + i,
      category: row[1],
      typical_day: i + 2,
      cadence: "monthly",
      bill_id: row[1] === "Education" ? "education" : ""
    };
  });
  snap.budget.income_monthly = [{ label: "Payroll", amount: 80, monthly_amount: 80, cadence: "monthly", typical_day: 15 }];
  snap.current.edits_tx = [
    { date: "2026-10-04", amount: 8, flow: "outflow", desc: "Corner Market", category: "Groceries", tx_key: "groc-1" }
  ];
  const html = ctx.bankPageHtml(snap, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  const cardAt = html.indexOf('data-bank-plan-card="1"');
  assert.ok(cardAt >= 0);
  const card = html.slice(cardAt, html.indexOf('data-bank-part="more"', cardAt));
  assert.doesNotMatch(card, />Required<|>Needs<|>Wants</);
  assert.doesNotMatch(card, /mix-leg-name">(?:Required|Needs|Wants)</);
  const tableAt = card.indexOf('data-bank-bill-groups="1"');
  const table = card.slice(tableAt, card.indexOf("<h3>Categories</h3>", tableAt));
  const found = [];
  const re = /<span class="mix-leg-name">([^<]*)<\/span>/g;
  let hit;
  while ((hit = re.exec(table))) found.push(hit[1]);
  assert.equal(found.length, names.length);
  found.forEach(function (name) {
    assert.ok(name.length > 1, name);
    assert.doesNotMatch(name, /^[A-Za-z]\.?$/);
    assert.doesNotMatch(name, /^(?:\u2026|\.{3})$/);
    assert.equal(name.indexOf("\u2026"), -1);
  });
  names.forEach(function (row) {
    assert.ok(found.indexOf(row[0]) >= 0, row[0]);
    assert.match(table, new RegExp("<h3>" + row[3].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</h3>"));
    assert.match(table, new RegExp('data-bank-bill-group="' + row[2] + '"'));
    assert.match(table, /data-bank-scale="spent"/);
    assert.match(table, /class="bank-bill-grid"/);
  });
  assert.doesNotMatch(table, /mix-leg-name">[A-Za-z]\.<\/span>/);
  const cats = card.slice(card.indexOf("<h3>Categories</h3>"));
  ["General Shopping", "Groceries", "Gas/Fuel", "Subscriptions"].forEach(function (label) {
    assert.match(cats, new RegExp("mix-leg-name\">" + label + "</span>"));
  });
  assert.match(cats, /<span>Spent<\/span>/);
  assert.match(cats, /<span>Planned<\/span>/);
  assert.match(cats, /<span>Left<\/span>/);
  assert.doesNotMatch(cats, /mix-leg-name">(?:Required|Needs|Wants|Mortgage|Utilities)</);

  const onlyTiers = bare(ctx);
  onlyTiers.tier_doc.categories = [
    { id: "required", name: "Required", tier: "required", budget: 0, merged_into: "" },
    { id: "needs", name: "Needs", tier: "needs", budget: 0, merged_into: "" },
    { id: "wants", name: "Wants", tier: "wants", budget: 0, merged_into: "" }
  ];
  const tierHtml = ctx.bankPageHtml(onlyTiers, { tab: "budget", now: "2026-10-16T12:00:00-04:00" });
  const tierAt = tierHtml.indexOf('data-bank-plan-card="1"');
  const tierCard = tierHtml.slice(tierAt, tierHtml.indexOf('data-bank-part="more"', tierAt));
  assert.doesNotMatch(tierCard, />Required<|>Needs<|>Wants</);
  assert.match(tierCard, /General Shopping/);
  assert.match(tierCard, /Groceries/);
  assert.match(tierCard, /Gas\/Fuel/);
  assert.doesNotMatch(tierCard, /Subscriptions/);
});

test("edits bills use the printed category and dated groups", () => {
  const ctx = boot();
  const now = "2026-10-16T12:00:00-04:00";
  const snap = bare(ctx);
  snap.current.month = "2026-10";
  snap.budget.box_categories = [
    { id: "mortgage", name: "Mortgage", tier: "required", budget: 3500 },
    { id: "utilities", name: "Utilities", tier: "required", budget: 540 },
    { id: "phone-internet", name: "Phone & Internet", tier: "required", budget: 500 },
    { id: "car-insurance-loans", name: "Car/Insurance & Loans", tier: "required", budget: 1700 },
    { id: "education", name: "Education", tier: "needs", budget: 760 },
    { id: "streaming-entertainment", name: "Streaming & Entertainment", tier: "wants", budget: 80 },
    { id: "music-subscription", name: "Music Subscription", tier: "wants", budget: 0, merged_into: "streaming-entertainment" },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 40 },
    { id: "shopping-subscription", name: "Shopping Subscription", tier: "wants", budget: 0, merged_into: "subscriptions" },
    { id: "kids-activities", name: "Kids & Activities", tier: "needs", budget: 120 },
    { id: "memberships", name: "Memberships", tier: "wants", budget: 0, merged_into: "kids-activities" }
  ];
  snap.budget.category_merge_ids = {
    "music-subscription": "streaming-entertainment",
    "shopping-subscription": "subscriptions",
    memberships: "kids-activities"
  };
  snap.budget.bills = [
    { bill_id: "b-comcast", name: "Comcast", amount: 160, category: "phone-internet", due_day: 5 },
    { bill_id: "b-garbage", name: "Garbage", amount: 50, category: "utilities", due_day: 8 },
    { bill_id: "b-onemain", name: "OneMain", amount: 520, category: "car-insurance-loans", due_day: 12 },
    { bill_id: "b-affirm", name: "Affirm plan 1", amount: 15, category: "car-insurance-loans", due_day: 14 },
    { bill_id: "b-electric", name: "Electric", amount: 150, category: "phone-internet", category_id: "utilities", due_day: 3 },
    { bill_id: "b-guess", name: "Electric Co", amount: 40, due_day: 20 },
    { bill_id: "b-held", name: "Electric Held", amount: 11, category: "not-a-category", due_day: 21 }
  ];
  const comcast = snap.budget.bills.find((b) => b.name === "Comcast");
  const garbage = snap.budget.bills.find((b) => b.name === "Garbage");
  const onemain = snap.budget.bills.find((b) => b.name === "OneMain");
  const affirm = snap.budget.bills.find((b) => b.name === "Affirm plan 1");
  const electric = snap.budget.bills.find((b) => b.name === "Electric");
  const guess = snap.budget.bills.find((b) => b.name === "Electric Co");
  const cats = snap.budget.box_categories;
  assert.equal(ctx.bankSpendBillCategory(comcast, cats, snap), "phone-internet");
  assert.equal(ctx.bankSpendBillCategory(garbage, cats, snap), "utilities");
  assert.equal(ctx.bankSpendBillCategory(onemain, cats, snap), "car-insurance-loans");
  assert.equal(ctx.bankSpendBillCategory(affirm, cats, snap), "car-insurance-loans");
  assert.equal(ctx.bankSpendBillCategory(electric, cats, snap), "utilities");
  assert.equal(ctx.bankSpendBillCategory(guess, cats, snap), "utilities");
  const held = snap.budget.bills.find((b) => b.name === "Electric Held");
  assert.equal(ctx.bankSpendBillCategory(held, cats, snap), "");

  const page = ctx.bankPageHtml(snap, { tab: "edits", now: now });
  const billsAt = page.indexOf("<h2>Bills</h2>");
  const billsEnd = page.indexOf("<h2>", billsAt + 4);
  const bills = page.slice(billsAt, billsEnd < 0 ? page.length : billsEnd);
  assert.doesNotMatch(bills, /Music Subscription|Memberships|Shopping Subscription/);
  const picker = (name, id) => {
    const label = `aria-label="Category for ${name}"`;
    const at = bills.indexOf(label);
    assert.ok(at > 0, name);
    const select = bills.slice(at, bills.indexOf("</select>", at));
    assert.match(select, new RegExp(`<option value="${id}" selected>`));
  };
  picker("Comcast", "phone-internet");
  picker("Garbage", "utilities");
  picker("OneMain", "car-insurance-loans");
  picker("Affirm plan 1", "car-insurance-loans");
  picker("Electric", "utilities");

  const group = (id) => {
    const at = bills.indexOf(`data-bank-edit-group="${id}"`);
    assert.ok(at > 0, id);
    return bills.slice(at, bills.indexOf("</section>", at));
  };
  const util = group("utilities");
  assert.match(util, /data-bank-group-total="240"/);
  assert.match(util, /data-bank-group-budget="540"/);
  assert.match(util, /data-bank-group-diff="1"/);
  assert.match(util, /Doesn't match/);
  const phone = group("phone-internet");
  assert.match(phone, /data-bank-group-total="160"/);
  assert.match(phone, /data-bank-group-budget="500"/);
  assert.match(phone, />Comcast</);
  assert.doesNotMatch(phone, />Electric</);

  snap.budget.subscriptions = [
    { sub_id: "s-music", name: "Tune Box", amount: 12, category: "music-subscription", next_date: "2026-10-20" },
    { sub_id: "s-shop", name: "Club Box", amount: 10, category: "shopping-subscription", next_date: "2026-10-22" },
    { sub_id: "s-kids", name: "Play Club", amount: 30, category: "memberships", next_date: "2026-10-18" },
    { sub_id: "s-gone", name: "Old Stream", amount: 99, category: "streaming-entertainment", status: "cancelled", status_from: "2026-10", next_date: "2026-10-01" }
  ];
  const again = ctx.bankPageHtml(snap, { tab: "edits", now: now });
  const subsAt = again.indexOf("<h2>Subscriptions</h2>");
  const subs = again.slice(subsAt, again.indexOf("<h2>Income</h2>", subsAt));
  assert.doesNotMatch(subs, /Music Subscription|Memberships|Shopping Subscription/);
  const stream = subs.slice(subs.indexOf('data-bank-edit-group="streaming-entertainment"'), subs.indexOf("</section>", subs.indexOf('data-bank-edit-group="streaming-entertainment"')));
  assert.match(stream, /data-bank-group-total="12"/);
  assert.match(stream, />Tune Box</);
  assert.doesNotMatch(stream, /Old Stream/);
  const shop = subs.slice(subs.indexOf('data-bank-edit-group="subscriptions"'), subs.indexOf("</section>", subs.indexOf('data-bank-edit-group="subscriptions"')));
  assert.match(shop, /data-bank-group-total="10"/);
  assert.match(shop, />Club Box</);
  const kids = subs.slice(subs.indexOf('data-bank-edit-group="kids-activities"'), subs.indexOf("</section>", subs.indexOf('data-bank-edit-group="kids-activities"')));
  assert.match(kids, /data-bank-group-total="30"/);
  assert.match(kids, />Play Club</);
  const matchSnap = bare(ctx);
  matchSnap.current.month = "2026-10";
  matchSnap.budget.box_categories = [{ id: "utilities", name: "Utilities", tier: "required", budget: 50 }];
  matchSnap.budget.bills = [{ bill_id: "b-water", name: "Water", amount: 50, category: "utilities", due_day: 4 }];
  const matchPage = ctx.bankPageHtml(matchSnap, { tab: "edits", now: now });
  const matchBills = matchPage.slice(matchPage.indexOf("<h2>Bills</h2>"), matchPage.indexOf("<h2>Subscriptions</h2>"));
  const matchGroup = matchBills.slice(matchBills.indexOf('data-bank-edit-group="utilities"'), matchBills.indexOf("</section>", matchBills.indexOf('data-bank-edit-group="utilities"')));
  assert.match(matchGroup, /data-bank-group-diff="0"/);
  assert.doesNotMatch(matchGroup, /Doesn't match/);
});

test("a saved budget wins everywhere and survives reload", async function () {
  const ctx = boot();
  const now = "2026-10-16T12:00:00-04:00";
  const snap = bare(ctx);
  snap.current.month = "2026-11";
  snap.budget.budget_month = { start: "2026-10-30", end: "2026-11-29", month: "2026-11" };
  snap.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-11-13", amount: 1000 },
    { name: "Stipend", kind: "stipend", date: "2026-11-25", amount: 200 }
  ];
  snap.budget.box_categories = [
    { id: "utilities", name: "Utilities", tier: "required", budget: 540 },
    { id: "groceries", name: "Groceries", tier: "needs", budget: 80 },
    { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 40 },
    { id: "dining", name: "Dining", tier: "wants", budget: 10 }
  ];
  snap.budget.tiers = { by_category: { groceries: { plan: 80 }, utilities: { plan: 540 } } };
  snap.budget.tiers_overlay = {
    updated_at: "2026-11-20T12:00:00Z",
    tiers: {
      categories: [
        { id: "utilities", name: "Utilities", tier: "required", budget: 540 },
        { id: "groceries", name: "Groceries", tier: "needs", budget: 80 },
        { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 40 },
        { id: "dining", name: "Dining", tier: "wants", budget: 10 }
      ]
    },
    november_budget: { pot: 900, guides: { groceries: 80, dining: 50, subscriptions: 40 } }
  };
  snap.budget.bills = [
    { bill_id: "b-power", name: "Power", amount: 200, category: "utilities", due_day: 6, paid_current_month: { month: "2026-11", status: "paid", source: "manual" } },
    { bill_id: "b-water", name: "City Water", amount: 100, category: "utilities", due_day: 9 }
  ];
  snap.budget.subscriptions = [
    { sub_id: "s-club", name: "Shop Club", amount: 15, category: "subscriptions", next_date: "2026-11-04" },
    { sub_id: "s-old", name: "Old Stream", amount: 99, category: "subscriptions", status: "cancelled", status_from: "2026-11", next_date: "2026-11-01" }
  ];
  snap.tier_doc.categories = snap.budget.box_categories.map(function (row) {
    return { id: row.id, name: row.name, tier: row.tier, budget: row.budget, merged_into: "" };
  });
  const calls = watch(ctx);
  const el = desk(snap);
  el._bank.tab = "edits";
  el._bank.planMonth = "2026-11";
  assert.equal(await ctx.bankSpendSaveBudget(el, "groceries", "25"), true);
  assert.equal(await ctx.bankSpendSaveBudget(el, "dining", "0"), true);
  assert.equal(calls[calls.length - 1].body.budgets_updated_at.dining != null, true);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(el._bank.data, "2026-11"), "groceries").budget, 25);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(el._bank.data, "2026-11"), "dining").budget, 0);
  assert.equal(ctx.bankSavedCategoryBudget(el._bank.data, "groceries"), 25);
  const parts = ctx.bankBudgetParts(el._bank.data, "2026-11", null);
  assert.equal(parts.spend, 25);
  assert.equal(parts.subs, 40);
  assert.equal(parts.bills, 540);
  const verdict = ctx.bankFitVerdict(el._bank.data, "2026-11", null);
  assert.equal(verdict.income, 1200);
  assert.equal(verdict.bills, 540);
  assert.equal(verdict.subs, 40);
  assert.equal(verdict.pot, 25);
  assert.equal(verdict.budgeted, 605);
  assert.equal(verdict.spare, 595);
  assert.match(verdict.text, /Fits: /);
  const drafted = ctx.bankFitVerdict(el._bank.data, "2026-11", { id: "groceries", budget: 2000 });
  assert.equal(drafted.pot, 2000);
  assert.equal(drafted.budgeted, 2580);
  assert.equal(drafted.over, true);
  assert.match(drafted.text, /Over by /);
  const nodes = [{ textContent: "", className: "", setAttribute: function () {} }];
  el.querySelectorAll = function (sel) {
    if (String(sel).indexOf("spare-break") >= 0) return [];
    return nodes;
  };
  ctx.bankSyncFitVerdict(el, "groceries", "2000");
  assert.match(nodes[0].textContent, /Over by /);
  assert.equal(await ctx.bankSpendSaveBudget(el, "groceries", "2000"), true);
  const page = ctx.bankPageHtml(el._bank.data, { tab: "budget", planMonth: "2026-11", now: now });
  const heroAt = page.indexOf('data-bank-hero="1"');
  const hero = page.slice(heroAt, page.indexOf("fills-more", heroAt));
  assert.match(hero, /data-bank-bar="income"/);
  assert.match(hero, /data-bank-bar-over="1"/);
  assert.match(hero, /Over by /);
  assert.ok(hero.indexOf('data-bank-bar="income"') < hero.indexOf('data-bank-card-bars="1"'));
  assert.match(hero, /data-bank-bar="spend"/);
  const billsAt = page.indexOf('data-bank-bill-groups="1"');
  const bills = page.slice(billsAt, page.indexOf('data-bank-plain-cats="1"', billsAt));
  assert.match(bills, /data-bank-bill-group="utilities"/);
  assert.match(bills, /data-bank-group-budget="540"/);
  assert.match(bills, /data-bank-bill-cat="utilities"/);
  assert.match(bills, />Power</);
  assert.match(bills, /data-bank-bill-status="paid"/);
  assert.match(bills, />Water</);
  assert.match(bills, /data-bank-bill-status="unpaid"/);
  assert.match(bills, /data-bank-bill-group="subscriptions"/);
  assert.match(bills, />Shop Club</);
  assert.doesNotMatch(bills, /Old Stream/);
  const cats = page.slice(page.indexOf('data-bank-plain-cats="1"'), page.indexOf("</section>", page.indexOf('data-bank-plain-cats="1"')));
  assert.match(cats, /data-bank-cat-row="groceries"[^>]*data-budget="2000"/);
  assert.match(cats, /data-bank-cat-row="dining"[^>]*data-budget="0"/);
  const printed = JSON.parse(JSON.stringify(el._bank.data));
  printed.budget.box_categories.forEach(function (row) { row.budget = 999; });
  delete printed.tier_doc;
  const kept = el._bank.data.tier_doc;
  ctx.bankAdoptSnapshot(el._bank, JSON.parse(JSON.stringify(printed)));
  assert.equal(el._bank.data.tier_doc, kept);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(el._bank.data, "2026-11"), "groceries").budget, 2000);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(el._bank.data, "2026-11"), "dining").budget, 0);
  el._bank.data.tier_doc = {
    schema: "banking-tiers/v1",
    updated_at: "2026-11-16T18:00:00Z",
    categories: [
      { id: "utilities", name: "Utilities", tier: "required", budget: 540 },
      { id: "groceries", name: "Groceries", tier: "needs", budget: 2000 },
      { id: "subscriptions", name: "Subscriptions", tier: "wants", budget: 40 },
      { id: "dining", name: "Dining", tier: "wants", budget: 0 }
    ],
    budgets_updated_at: kept.budgets_updated_at,
    category_rules: {},
    category_tx: {}
  };
  el._bank.data._tiersFromGet = true;
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(el._bank.data, "2026-11"), "groceries").budget, 2000);
  assert.equal(ctx.bankCategoryFigures(el._bank.data, "2026-11").groceries.plan, 2000);
  const edits = ctx.bankPageHtml(el._bank.data, { tab: "edits", planMonth: "2026-11", now: now });
  assert.match(edits, /<h3>Budget fit<\/h3>/);
  assert.match(edits, /data-bank-fit-verdict="1"/);
  assert.match(edits, /Over by /);
});

function mountRoot() {
  return {
    innerHTML: "",
    addEventListener: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

test("a newer tiers cache is the first paint and a matching GET does not repaint", async function () {
  const ctx = boot();
  const bag = {};
  ctx.localStorage.getItem = function (key) { return bag[key] == null ? null : bag[key]; };
  ctx.localStorage.setItem = function (key, value) { bag[key] = String(value); };
  const snap = bare(ctx);
  snap.budget.justin_saved_budgets = { groceries: "2026-10-15T12:00:00Z", other: "2026-10-15T12:00:00Z" };
  snap.budget.tiers_overlay = {
    updated_at: "2026-10-15T12:00:00Z",
    tiers: { categories: [
      { id: "groceries", name: "Groceries", tier: "needs", budget: 70 },
      { id: "other", name: "Other", tier: "wants", budget: 31 }
    ] }
  };
  const cached = {
    schema: "banking-tiers/v1",
    updated_at: "2026-10-16T18:00:00Z",
    categories: [
      { id: "groceries", name: "Groceries", tier: "needs", budget: 0, merged_into: "" },
      { id: "other", name: "Other", tier: "wants", budget: 0, merged_into: "" }
    ],
    budgets_updated_at: { groceries: "2026-10-16T18:00:00Z", other: "2026-10-16T18:00:00Z" },
    category_rules: {},
    category_tx: {}
  };
  bag["bank.tiersDoc"] = JSON.stringify(cached);
  let paints = 0;
  const paint = ctx.bankPaint;
  ctx.bankPaint = function (root) {
    paints += 1;
    return paint(root);
  };
  ctx.fetch = function (url) {
    if (String(url).indexOf("/data/banking/tiers.json") === 0) {
      return Promise.resolve({
        ok: true, status: 200, type: "basic",
        json: function () { return Promise.resolve(JSON.parse(JSON.stringify(cached))); }
      });
    }
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({ categories: [] }); } });
  };
  const root = mountRoot();
  ctx.bankMount(root, snap, { tab: "budget", now: "2026-10-16T16:00:00Z" });
  assert.equal(root._bank.data._tiersPending, false);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(root._bank.data, "2026-10"), "groceries").budget, 0);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(root._bank.data, "2026-10"), "other").budget, 0);
  assert.doesNotMatch(root.innerHTML, /data-bank-fit-pending/);
  await root._bank.prune;
  assert.equal(paints, 1);
  assert.equal(JSON.parse(bag["bank.tiersDoc"]).budgets_updated_at.groceries, "2026-10-16T18:00:00Z");
});

test("a cold load waits on the tiers GET, and a failed GET is marked as the snapshot", async function () {
  const ctx = boot();
  const snap = bare(ctx);
  snap.budget.tiers_overlay = {
    updated_at: "2026-10-15T12:00:00Z",
    tiers: { categories: [
      { id: "groceries", name: "Groceries", tier: "needs", budget: 70 },
      { id: "other", name: "Other", tier: "wants", budget: 31 }
    ] }
  };
  const kv = {
    schema: "banking-tiers/v1",
    updated_at: "2026-10-16T18:00:00Z",
    categories: [
      { id: "groceries", name: "Groceries", tier: "needs", budget: 0, merged_into: "" },
      { id: "other", name: "Other", tier: "wants", budget: 0, merged_into: "" }
    ],
    budgets_updated_at: { groceries: "2026-10-16T18:00:00Z", other: "2026-10-16T18:00:00Z" },
    category_rules: {},
    category_tx: {}
  };
  let mode = "ok";
  ctx.fetch = function (url) {
    if (String(url).indexOf("/data/banking/tiers.json") === 0) {
      if (mode === "fail") return Promise.resolve({ ok: false, status: 500, type: "basic", json: function () { return Promise.resolve({}); } });
      return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve(JSON.parse(JSON.stringify(kv))); } });
    }
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({ categories: [] }); } });
  };
  const failedSnap = JSON.parse(JSON.stringify(snap));
  const root = mountRoot();
  ctx.bankMount(root, snap, { tab: "budget", now: "2026-10-16T16:00:00Z" });
  assert.match(root.innerHTML, /data-bank-fit-pending="1"/);
  assert.match(root.innerHTML, /Checking budgets/);
  assert.doesNotMatch(root.innerHTML, /Over by|Fits:/);
  await root._bank.prune;
  assert.equal(root._bank.data._tiersPending, false);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(root._bank.data, "2026-10"), "groceries").budget, 0);
  assert.doesNotMatch(root.innerHTML, /data-bank-fit-pending/);
  mode = "fail";
  const failed = mountRoot();
  ctx.bankMount(failed, failedSnap, { tab: "budget", now: "2026-10-16T16:00:00Z" });
  await failed._bank.prune;
  assert.equal(failed._bank.data._tiersGetFailed, true);
  assert.equal(ctx.bankSpendById(ctx.bankSpendCategories(failed._bank.data, "2026-10"), "groceries").budget, 70);
  assert.match(failed.innerHTML, /data-bank-fit-source="snapshot"/);
  assert.match(failed.innerHTML, /Saved snapshot/);
  assert.doesNotMatch(failed.innerHTML, /data-bank-fit-pending/);
});

test("an Edits save updates the tier doc stamps and rewrites the tiers cache", async function () {
  const ctx = boot();
  const bag = {};
  ctx.localStorage.getItem = function (key) { return bag[key] == null ? null : bag[key]; };
  ctx.localStorage.setItem = function (key, value) { bag[key] = String(value); };
  const snap = bare(ctx);
  const calls = watch(ctx);
  const el = desk(snap);
  assert.equal(await ctx.bankSpendSaveBudget(el, "groceries", "4"), true);
  assert.equal(calls.length >= 1, true);
  assert.equal(el._bank.data.tier_doc.budgets_updated_at.groceries != null, true);
  assert.equal(el._bank.data._tiersFromGet, true);
  const saved = JSON.parse(bag["bank.tiersDoc"]);
  assert.equal(saved.budgets_updated_at.groceries, el._bank.data.tier_doc.budgets_updated_at.groceries);
  assert.equal(ctx.bankSpendById(saved.categories, "groceries").budget, 4);
});
