"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");

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
      const raw = process.env.FAKE_NOW || "2026-10-16";
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

function mount(ctx, data, opts) {
  const rootEl = {
    innerHTML: "",
    listeners: {},
    addEventListener: function (type, fn) { this.listeners[type] = fn; }
  };
  ctx.bankMount(rootEl, data, opts || {});
  return rootEl;
}

function click(el, closest) {
  return el.listeners.click({
    target: {
      closest: function (sel) { return closest(sel); },
      getAttribute: function () { return null; },
      tagName: "BUTTON"
    },
    preventDefault: function () {}
  });
}

function baseSnap(ctx) {
  const cats = ctx.bankSpendStarters().map(function (row) {
    return { id: row.id, name: row.name, tier: row.tier, budget: 0, merged_into: "" };
  });
  cats.forEach(function (row) {
    if (row.id === "mortgage") row.budget = 40;
    if (row.id === "utilities") row.budget = 10;
    if (row.id === "subscriptions") row.budget = 5;
  });
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: {
      month: "2026-10",
      edits_tx: [],
      recent_tx: [],
      history_tx: [],
      balances: [{ nickname: "Bills", last4: "2222", balance: 100 }]
    },
    history: { months: [] },
    budget: {
      account_funding: [{ nickname: "Bills", last4: "2222", start_balance: 100, current_balance: 100 }],
      account_funding_combined: 100,
      bills: [
        { name: "Rent", bill_id: "rent", cancel_key: "rent", amount: 40, typical_day: 20, cadence: "monthly", tier: "required", category: "mortgage" },
        { name: "Power", bill_id: "power", amount: 10, typical_day: 12, cadence: "monthly", tier: "required", category: "utilities" }
      ],
      subscriptions: [
        { name: "Stream Club", sub_id: "stream", cancel_key: "stream", amount: 5, typical_day: 18, category: "subscriptions" }
      ],
      income_monthly: [{ label: "Payroll", amount: 80, deposits: [{ day: 15, amount: 40 }, { day: 30, amount: 40 }] }],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40 },
        { name: "Stipend", kind: "stipend", date: "2026-10-20", amount: 12.34 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 }
      ]
    },
    tier_doc: { rules: {}, plans: {}, categories: cats, category_rules: {}, category_tx: {}, bill_status: {}, manual_paid: {} }
  };
}

function nums(html) {
  function num(attr) {
    const m = html.match(new RegExp(attr + '="([^"]*)"'));
    return m ? Number(m[1]) : null;
  }
  return {
    now: num("data-bank-hero-now"),
    inn: num("data-bank-hero-in"),
    out: num("data-bank-hero-out"),
    end: num("data-bank-hero-end"),
    left: num("data-fund-left"),
    ledger: num("data-bank-ledger-end")
  };
}

function dueSlice(html) {
  const start = html.indexOf('class="bank-due-month"');
  const end = html.indexOf('class="bank-cal"');
  return html.slice(start, end < 0 ? html.length : end);
}

function nextSlice(html) {
  return html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="funding"'));
}

test("a cancelled bill and sub leave forecasts and keep the bank identity", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-10";
  snap.budget.bills[0].cancelled_from = "2026-10";
  snap.budget.subscriptions[0].status = "cancelled";
  snap.budget.subscriptions[0].status_from = "2026-10";
  snap.budget.subscriptions[0].cancelled_from = "2026-10";
  const rent = ctx.bankPreparedBills(snap, undefined).filter(function (b) { return b.bill_id === "rent"; })[0];
  const stream = ctx.bankPreparedSubs(snap).filter(function (s) { return s.sub_id === "stream"; })[0];
  assert.equal(ctx.isCancelled(rent, "2026-10"), true);
  assert.equal(ctx.isCancelled(stream, "2026-10"), true);
  assert.equal(ctx.isCancelled(rent, "2026-09"), false);
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const due = dueSlice(html);
  const next = nextSlice(html);
  assert.doesNotMatch(due, /sym">Rent/);
  assert.doesNotMatch(due, /Stream Club/);
  assert.doesNotMatch(next, /sym">Rent/);
  assert.doesNotMatch(next, /Stream Club/);
  assert.match(due, /Power/);
  const fig = nums(html);
  assert.equal(Math.round((fig.now + fig.inn - fig.out) * 100) / 100, fig.end);
  assert.equal(fig.end, fig.left);
  assert.equal(fig.end, fig.ledger);
  const tick = { hidden: true, innerHTML: "", addEventListener: function () {} };
  ctx.MPTicker.render(tick, snap, null, { year: 2026, month: 10, day: 16 });
  assert.doesNotMatch(tick.innerHTML, /Next out[\s\S]{0,80}Rent/);
  assert.match(tick.innerHTML, /Next out/);
});

test("reactivate restores a cancelled bill to next pay, the month list, and the ticker", async function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.tier_doc.bill_status = { rent: { status: "cancelled", from: "2026-10" } };
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), body: init && init.body });
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const hidden = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.doesNotMatch(nextSlice(hidden), /sym">Rent/);
  const el = mount(ctx, JSON.parse(JSON.stringify(snap)), { tab: "edits", planMonth: "2026-10" });
  await click(el, function (sel) {
    return sel === "[data-bank-status-undo]" ? { getAttribute: function () { return "rent"; } } : null;
  });
  const bag = JSON.parse(calls[0].body).bill_status;
  assert.equal(bag.rent, null);
  const back = ctx.bankPageHtml(el._bank.data, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(dueSlice(back), /sym">Rent/);
  assert.match(nextSlice(back), /Rent/);
  const tick = { hidden: true, innerHTML: "", addEventListener: function () {} };
  ctx.MPTicker.render(tick, el._bank.data, null, { year: 2026, month: 10, day: 16 });
  assert.match(tick.innerHTML, /Rent/);
});

test("a from of next month keeps this month's charge", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-11";
  snap.budget.bills[0].cancelled_from = "2026-11";
  const rent = ctx.bankPreparedBills(snap, undefined)[0];
  assert.equal(ctx.isCancelled(rent, "2026-10"), false);
  assert.equal(ctx.isCancelled(rent, "2026-11"), true);
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(dueSlice(html), /sym">Rent/);
  assert.match(nextSlice(html), /Rent/);
});

test("charged after cancel fires on or after the from month and not before", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-10";
  snap.budget.bills[0].cancelled_from = "2026-10";
  const early = { date: "2026-09-30", amount: 12.34, flow: "outflow", desc: "RENT DRAFT", bill_id: "rent", tx_key: "early" };
  const onDay = { date: "2026-10-01", amount: 12.34, flow: "outflow", desc: "RENT DRAFT", bill_id: "rent", tx_key: "onday", account_last4: "2222" };
  assert.equal(ctx.bankTxChargedAfter(snap, early), false);
  assert.equal(ctx.bankTxChargedAfter(snap, onDay), true);
  snap.current.recent_tx = [early];
  const rent = ctx.bankPreparedBills(snap, undefined)[0];
  assert.equal(ctx.bankItemChargedAfter(snap, rent), false);
  snap.current.recent_tx = [early, onDay];
  assert.equal(ctx.bankItemChargedAfter(snap, rent), true);
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(html, /data-bank-charged-alert=/);
  assert.match(html, /Rent charged after cancel \u00b7 Review/);
  const row = ctx.bankSpendItemRowHtml(snap, onDay);
  assert.match(row, /class="fresh-chip fresh-flag"/);
  assert.match(row, /Charged after cancel/);
  const powerTx = { date: "2026-10-12", amount: 10, flow: "outflow", desc: "POWER DRAFT", bill_id: "power", tx_key: "power", account_last4: "4242" };
  const powerRow = ctx.bankSpendItemRowHtml(snap, powerTx);
  assert.doesNotMatch(powerRow, /fresh-flag/);
  assert.doesNotMatch(powerRow, /data-bank-cancel-open/);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(edits, /data-bank-cancel-open="1" data-bank-cancel="power"/);
  assert.match(html, /Rent charged after cancel \u00b7 Review/);
  assert.match(html, /data-bank-hero="1"[\s\S]{0,500}data-bank-charged-alert=/);
  assert.doesNotMatch(html, /<p class="hint tone-stop"[^>]*data-bank-charged-alert/);
  const market = ctx.bankSpendItemRowHtml(snap, { date: "2026-10-04", amount: 4, flow: "outflow", desc: "Market", tx_key: "market", category: "groceries" });
  assert.doesNotMatch(market, /data-bank-cancel-open/);
});

test("subscription cancel posts sub_id and the sheet explains it stays local", async function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push({ url: String(url), body: init && init.body });
    return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({}); } });
  };
  const el = mount(ctx, snap, { tab: "budget", planMonth: "2026-10" });
  await el._bank.prune;
  calls.length = 0;
  await click(el, function (sel) {
    return sel === "[data-bank-cancel-open]" ? { getAttribute: function (name) { return name === "data-bank-cancel" ? "stream" : null; } } : null;
  });
  assert.match(el.innerHTML, /data-bank-cancel-sheet="1"/);
  assert.match(el.innerHTML, /Marks it cancelled here; it doesn.t cancel with the company/);
  assert.match(el.innerHTML, /Stop from/);
  assert.match(el.innerHTML, /class="book-chip on" data-bank-cancel-from="this" aria-pressed="true"/);
  assert.match(el.innerHTML, /data-bank-cancel-from="next" aria-pressed="false"/);
  assert.match(el.innerHTML, /data-bank-cancel-go="1"/);
  assert.equal(calls.length, 0);
  await click(el, function (sel) {
    return sel === "[data-bank-cancel-go]" ? { getAttribute: function () { return null; } } : null;
  });
  const bag = JSON.parse(calls[0].body).bill_status;
  assert.deepEqual(bag.stream, { status: "cancelled", from: "2026-10" });
  assert.equal(bag["Stream Club"], null);
  const stream = ctx.bankPreparedSubs(el._bank.data).filter(function (s) { return s.sub_id === "stream"; })[0];
  assert.equal(ctx.isCancelled(stream, "2026-10"), true);
  assert.match(el.innerHTML, /data-bank-cancel-toast="1"/);
  const edits = ctx.bankPageHtml(el._bank.data, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /data-bank-cancelled="1"/);
  assert.doesNotMatch(edits, />Reactivate</);
  const sheet = ctx.bankCancelSheetHtml(el._bank.data, { planMonth: "2026-10", cancelSheet: { key: "stream", name: "Stream Club" } });
  assert.match(sheet, />Reactivate</);
  assert.doesNotMatch(sheet, /Stop from/);
});

test("print cancel fields agree with isCancelled and the charged flag", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-10";
  snap.budget.bills[0].cancelled_from = "2026-10";
  snap.budget.bills[0].cancel_note = "stopped";
  snap.budget.charged_after_cancel_count = 1;
  snap.current.recent_tx = [{
    date: "2026-10-03",
    amount: 24.68,
    flow: "outflow",
    desc: "RENT DRAFT",
    bill_id: "rent",
    charged_after_cancel: true,
    charged_after_cancel_date: "2026-10-03",
    charged_after_cancel_amount: 24.68,
    charged_after_cancel_last4: "2222",
    charged_after_cancel_from: "2026-10",
    account_last4: "2222",
    tx_key: "printflag"
  }];
  const rent = ctx.bankPreparedBills(snap, undefined)[0];
  assert.equal(rent.cancel_key, "rent");
  assert.equal(ctx.isCancelled(rent, "2026-10"), true);
  assert.equal(ctx.bankItemChargedAfter(snap, rent), true);
  assert.equal(ctx.bankTxChargedAfter(snap, snap.current.recent_tx[0]), true);
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.match(html, /Rent charged after cancel \u00b7 Review/);
  assert.doesNotMatch(dueSlice(html), /sym">Rent/);
});

test("status errors refuse a bad month, a long note, and a 201st entry", async function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  assert.equal(ctx.bankValidateStatus(snap, "rent", { status: "later", from: "2026-10" }), "bad_status");
  assert.equal(ctx.bankValidateStatus(snap, "rent", { status: "cancelled", from: "October" }), "bad_month");
  assert.equal(ctx.bankValidateStatus(snap, "rent", { status: "cancelled", from: "2026-10", note: "n".repeat(201) }), "bad_note");
  const bag = {};
  let n = 0;
  for (let a = 0; a < 26 && n < 200; a++) {
    for (let b = 0; b < 26 && n < 200; b++) {
      bag[String.fromCharCode(97 + a) + String.fromCharCode(97 + b)] = { status: "cancelled", from: "2026-10" };
      n += 1;
    }
  }
  snap.tier_doc.bill_status = bag;
  assert.equal(ctx.bankValidateStatus(snap, "rent", { status: "cancelled", from: "2026-10" }), "too_many_status");
  const calls = [];
  ctx.fetch = function (url, init) {
    calls.push(init && init.body);
    return Promise.resolve({
      ok: false,
      status: 400,
      type: "basic",
      json: function () { return Promise.resolve({ code: "bad_note" }); }
    });
  };
  const fresh = baseSnap(ctx);
  const el = mount(ctx, fresh, { tab: "edits", planMonth: "2026-10" });
  await el._bank.prune;
  calls.length = 0;
  await ctx.bankSaveBillStatus(el, "rent", { status: "cancelled", from: "2026-10", note: "n".repeat(201) });
  assert.equal(calls.length, 0);
  assert.match(el.innerHTML, /Shorten the note and try again/);
  calls.length = 0;
  await ctx.bankSaveBillStatus(el, "rent", { status: "cancelled", from: "2026-10" });
  assert.equal(calls.length, 1);
  assert.match(el.innerHTML, /Shorten the note and try again/);
});

test("next pay cards cover the month, share left after, and hide paid or cancelled rows", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills.push({
    name: "Paid Off Item",
    bill_id: "paiditem",
    amount: 8,
    typical_day: 18,
    cadence: "monthly",
    tier: "required",
    paid_current_month: { month: "2026-10", status: "paid", source: "manual", paid_date: "2026-10-18" }
  });
  snap.budget.paid_status_month = "2026-10";
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-10";
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const html = ctx.bankPageHtml(snap, opts);
  const next = nextSlice(html);
  const count = Number((next.match(/data-bank-next-count="(\d+)"/) || [])[1]);
  assert.ok(count >= 2);
  assert.match(next, /aria-roledescription="carousel"/);
  assert.match(next, /class="pay-carousel" tabindex="0"/);
  assert.match(next, /class="book-chip on" data-bank-next-dot="0" aria-current="true"/);
  assert.match(next, /data-bank-also-in="12.34"/);
  assert.equal((next.match(/<p class="hint">/g) || []).length, 1);
  assert.doesNotMatch(next, /sym">Rent/);
  assert.doesNotMatch(next.slice(0, next.indexOf('data-bank-next-card="3"')), /Paid Off Item/);
  const periods = ctx.bankPayPeriods(snap, opts);
  assert.equal(periods.length, count);
  const cards = next.split('data-bank-next-card="').slice(1);
  assert.equal(cards.length, count);
  let monthEndCovered = false;
  cards.forEach(function (chunk, i) {
    const date = (chunk.match(/data-bank-next-date="([^"]+)"/) || [])[1];
    const check = (chunk.match(/data-bank-check-left="([^"]*)"/) || [])[1];
    const shared = (chunk.match(/data-bank-left-after="([^"]*)"/) || [])[1];
    const period = periods[i];
    const math = ctx.bankPeriodMath(snap, opts, period);
    assert.equal(date, period.focus.date);
    assert.equal(Number(check), math.left);
    assert.equal(math.left, ctx.bankLeftAfter(math.deposit, { kind: "out", amount: math.aside, counted: true, pending: false }));
    const ledger = ctx.bankLedgerLeftOn(snap, date);
    if (date.slice(0, 7) === "2026-10" && ledger != null) {
      assert.equal(Number(shared), ledger);
      monthEndCovered = true;
    }
  });
  assert.equal(monthEndCovered, true);
  const last = periods[periods.length - 1].focus.date;
  assert.ok(last >= "2026-10-30");
});

test("late October shows next month's first check as card 2", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.pay_schedule = [
    { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40 },
    { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 }
  ];
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-30T16:00:00Z" };
  const html = ctx.bankPageHtml(snap, opts);
  const next = nextSlice(html);
  const count = Number((next.match(/data-bank-next-count="(\d+)"/) || [])[1]);
  assert.ok(count >= 2);
  const dates = [];
  const re = /data-bank-next-date="([^"]+)"/g;
  let m;
  while ((m = re.exec(next))) dates.push(m[1]);
  assert.equal(dates[0], "2026-10-30");
  assert.ok(dates[1] >= "2026-11-01");
  assert.match(dates[1], /^2026-11-/);
});

function ledgerRows(due) {
  const rows = [];
  const re = /<tr([^>]*)>/g;
  let m;
  while ((m = re.exec(due))) {
    const attrs = m[1];
    function attr(name) {
      const hit = attrs.match(new RegExp(name + '="([^"]*)"'));
      return hit ? hit[1] : "";
    }
    if (!/data-bank-row-date|data-bank-today/.test(attrs)) continue;
    rows.push({
      date: attr("data-bank-row-date"),
      kind: attr("data-bank-row-kind"),
      left: attr("data-bank-row-left") === "" ? null : Number(attr("data-bank-row-left")),
      expected: /data-bank-expected="1"/.test(attrs),
      today: /data-bank-today="1"/.test(attrs)
    });
  }
  return rows;
}

test("cancel lives on edits rows, category names stay whole, and an empty rules card stays hidden", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.tier_doc.categories.push({
    id: "longcat",
    name: "Household Supply Run For The Whole Month",
    tier: "needs",
    budget: 12.34,
    merged_into: ""
  });
  const budget = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  assert.doesNotMatch(dueSlice(budget), /data-bank-cancel-open/);
  assert.doesNotMatch(dueSlice(budget), />Cancel</);
  const edits = ctx.bankPageHtml(snap, { tab: "edits", planMonth: "2026-10" });
  assert.match(edits, /data-bank-cancel-open="1" data-bank-cancel="power"/);
  assert.match(edits, /data-bank-cancel-open="1" data-bank-cancel="stream"/);
  assert.doesNotMatch(edits, />Cancel</);
  assert.doesNotMatch(edits, />Edit</);
  const cats = edits.slice(edits.indexOf('data-bank-spend-cats="1"'), edits.indexOf("<h2>Bills</h2>"));
  assert.match(cats, /class="mix-leg wrap" data-bank-cat-jump="longcat"/);
  assert.match(cats, /class="mix-leg-name">Household Supply Run For The Whole Month<\/span><span class="fresh-chip">Needs<\/span>/);
  assert.match(cats, /data-bank-cat-jump="groceries"/);
  assert.doesNotMatch(edits, /<h2>Rules<\/h2>/);
});

test("stop-from preselects this month until a charge posts, then next month", function () {
  const ctx = boot();
  const quiet = ctx.bankCancelSheetHtml(baseSnap(ctx), { planMonth: "2026-10", cancelSheet: { key: "power", name: "Power" } });
  assert.match(quiet, /class="book-chip on" data-bank-cancel-from="this" aria-pressed="true"/);
  assert.match(quiet, /data-bank-cancel-from="next" aria-pressed="false"/);
  const snap = baseSnap(ctx);
  snap.current.recent_tx = [{
    date: "2026-10-12",
    amount: 10,
    flow: "outflow",
    desc: "POWER DRAFT",
    bill_id: "power",
    tx_key: "pow",
    account_last4: "2222"
  }];
  const charged = ctx.bankCancelSheetHtml(snap, { planMonth: "2026-10", cancelSheet: { key: "power", name: "Power" } });
  assert.match(charged, /class="book-chip on" data-bank-cancel-from="next" aria-pressed="true"/);
  assert.match(charged, /data-bank-cancel-from="this" aria-pressed="false"/);
});

test("next pay includes every active window bill, and left plus also-in is the period change", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.budget.bills[0].status = "cancelled";
  snap.budget.bills[0].status_from = "2026-10";
  snap.budget.bills[1].typical_day = 22;
  const opts = { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" };
  const html = ctx.bankPageHtml(snap, opts);
  const next = nextSlice(html);
  const card = next.slice(next.indexOf('data-bank-next-card="1"'), next.indexOf('data-bank-next-card="2"'));
  assert.match(card, /Stream Club/);
  assert.match(card, /Power/);
  assert.doesNotMatch(card, /sym">Rent/);
  assert.match(card, /Set aside[\s\S]{0,40}−\$15\.00/);
  assert.match(card, /data-bank-check-left="25"/);
  assert.match(card, /Left from this check[\s\S]{0,80}\+\$25\.00/);
  assert.match(card, /Needs \(groceries, etc\.\)[\s\S]{0,40}\$0\.00/);
  assert.doesNotMatch(card, /Needs \(groceries, etc\.\)[\s\S]{0,40}<span class="sub">—/);
  assert.ok(card.indexOf("Also in this period") > card.indexOf("Left from this check"));
  assert.match(card, /Also in this period \+\$12\.34/);
  const rows = ledgerRows(dueSlice(html));
  const todayIdx = rows.findIndex(function (row) { return row.today; });
  const payIdx = rows.findIndex(function (row) { return row.kind === "in" && row.date === "2026-10-15"; });
  assert.ok(todayIdx >= 0 && payIdx > todayIdx);
  assert.equal(rows[payIdx].expected, true);
  rows.slice(0, todayIdx).forEach(function (row) { assert.equal(row.expected, false); });
  const nextPay = rows.findIndex(function (row, i) { return i > payIdx && row.kind === "in" && row.date === "2026-10-30"; });
  assert.ok(nextPay > payIdx);
  const change = Math.round((rows[nextPay - 1].left - rows[payIdx - 1].left) * 100) / 100;
  assert.equal(change, Math.round((25 + 12.34) * 100) / 100);
  const fig = nums(html);
  assert.equal(Math.round((fig.now + fig.inn - fig.out) * 100) / 100, fig.end);
  assert.equal(fig.end, fig.left);
  assert.equal(fig.end, fig.ledger);

  snap.budget.subscriptions[0].status = "cancelled";
  snap.budget.subscriptions[0].status_from = "2026-10";
  const gone = nextSlice(ctx.bankPageHtml(snap, opts));
  const goneCard = gone.slice(gone.indexOf('data-bank-next-card="1"'), gone.indexOf('data-bank-next-card="2"'));
  assert.doesNotMatch(gone, /Stream Club/);
  assert.match(goneCard, /Set aside[\s\S]{0,40}−\$10\.00/);
  assert.match(goneCard, /data-bank-check-left="30"/);
  assert.doesNotMatch(dueSlice(ctx.bankPageHtml(snap, opts)), /Stream Club/);
});

test("a posted early payroll stays above today, and a zero plan prints $0.00", function () {
  const ctx = boot();
  const snap = baseSnap(ctx);
  snap.current.recent_tx = [{
    date: "2026-10-15",
    amount: 40,
    flow: "inflow",
    desc: "Payroll",
    category: "Payroll",
    tx_key: "pay"
  }];
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" });
  const rows = ledgerRows(dueSlice(html));
  const todayIdx = rows.findIndex(function (row) { return row.today; });
  const payIdx = rows.findIndex(function (row) { return row.kind === "in" && row.date === "2026-10-15"; });
  assert.ok(payIdx >= 0 && payIdx < todayIdx);
  assert.equal(rows[payIdx].expected, false);
  assert.equal(rows[payIdx].left, nums(html).now);
  rows.slice(0, todayIdx).forEach(function (row) { assert.equal(row.expected, false); });

  const bare = {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: { month: "2026-10", recent_tx: [], edits_tx: [], history_tx: [] },
    budget: {
      bills: [],
      subscriptions: [],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 40 },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 40 }
      ]
    }
  };
  const dashed = nextSlice(ctx.bankPageHtml(bare, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" }));
  assert.match(dashed, /Needs \(groceries, etc\.\)[\s\S]{0,40}<span class="sub">—/);
  assert.match(dashed, /Set aside[\s\S]{0,40}<span class="sub">—/);
  bare.budget.tiers = { needs_plan: 0, wants_plan: 0 };
  const zero = nextSlice(ctx.bankPageHtml(bare, { tab: "budget", planMonth: "2026-10", now: "2026-10-16T16:00:00Z" }));
  zero.split('data-bank-next-card="').slice(1).forEach(function (chunk) {
    assert.match(chunk, /Needs \(groceries, etc\.\)[\s\S]{0,40}\$0\.00/);
    assert.match(chunk, /Set aside[\s\S]{0,40}\$0\.00/);
  });
});
