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
  "household-health",
  "education-needs",
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
  bad_category_tier: "Pick Required, Needs, or Wants.",
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
    assert.match(el.innerHTML, /Tap a category|Check that category|cannot be saved|40 characters|Required, Needs|from zero|already on the list|merge into|fold into|for that rule|not on the list|too many rules/);
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
  assert.equal(String(childHit.id) + ":" + String(childHit.via), "education-needs:print");
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
  assert.equal((summary.match(/data-bank-group="/g) || []).length, 3);
  const needs = tierSlice(summary, "needs");
  assert.match(needs, /data-spent="24.68"/);
  assert.match(needs, /data-plan="24.68"/);
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
  const merged = calls[1].body.categories.filter(function (row) { return row.id === "shopping"; })[0];
  assert.equal(merged.merged_into, "other");
  assert.equal(calls[1].body.category_rules["corner-market"], "other");
  assert.equal(calls[1].body.category_tx[HASH], "other");
  assert.equal(calls[1].body.categories.length, SLUGS.length);
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
  assert.match(row[0], /\$12\.34 of \$0\.00/);
  assert.match(row[0], /Over \$12\.34/);
  assert.match(row[0], /data-tone="stop"/);
  assert.match(row[0], /class="mix-bar"/);
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
  assert.match(hot[0], /Over \$12\.34/);
  assert.match(hot[0], /class="mix-bar"/);
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
  assert.match(html, /data-cat-fig="2026-09"><td>September 2026<\/td><td class="num">\$12\.34<\/td>/);
  assert.match(html, /data-cat-fig="2026-08"><td>August 2026<\/td><td class="num">\$12\.34<\/td>/);
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
  assert.match(pop, /data-spent="12.34"/);
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
  assert.match(root.innerHTML, /data-bank-group="needs"/);
});

test("two taps from a group reach that category's items", function () {
  const ctx = boot();
  const fx = loadFixture();
  fx.tier_doc = { rules: {}, plans: {}, categories: ctx.bankSpendStarters(), category_rules: {}, category_tx: {} };
  const opts = { tab: "budget", now: "2026-10-16T12:00:00-04:00" };
  const summary = ctx.bankPageHtml(fx, opts);
  const tier = summary.slice(summary.indexOf("bank-tier-summary"), summary.indexOf('data-bank-part="more"'));
  assert.equal((tier.match(/data-bank-group="/g) || []).length, 3);
  assert.doesNotMatch(tier, /data-bank-cat-row=/);
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
  const needs = tierSlice(html.slice(0, html.indexOf("data-bank-group-pop")), "needs");
  assert.match(needs, /data-plan="37.02"/);
  assert.match(needs, /data-spent="12.34"/);
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
  assert.match(open, /Odd Purchase/);
  assert.doesNotMatch(open, /Paycheck/);
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
  const due = html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('class="bank-cal"'));
  const today = due.slice(due.indexOf('data-bank-today="1"'), due.indexOf("</tr>", due.indexOf('data-bank-today="1"')));
  assert.match(today, /\$24\.68/);
  assert.doesNotMatch(due, /sym">Month-end/);
  assert.match(html, /class="book-chip"[^>]*data-bank-hero-toggle/);
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
  const today = html.slice(html.indexOf('data-bank-today="1"'), html.indexOf("</tr>", html.indexOf('data-bank-today="1"')));
  assert.match(today, /\$24\.68/);
  assert.doesNotMatch(html.slice(html.indexOf('class="bank-due-month"'), html.indexOf('class="bank-cal"')), /sym">Month-end/);
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
