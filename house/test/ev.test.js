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
    setTimeout: function () { return 0; },
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

function moveSnap() {
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [
      { nickname: "Pay", suffix: "1111", name: "Pay" },
      { nickname: "Bills", suffix: "2222", name: "Bills" }
    ],
    current: {
      month: "2026-10",
      recent_tx: [],
      edits_tx: [],
      history_tx: [],
      balances: [
        { nickname: "Pay", suffix: "1111", balance: 300 },
        { nickname: "Bills", suffix: "2222", balance: 10 }
      ]
    },
    history: { months: [], tx: [] },
    budget: {
      tiers: { needs_plan: 0, wants_plan: 0, required_plan: 80 },
      bills: [{
        name: "Power",
        bill_id: "power",
        amount: 80,
        typical_day: 20,
        cadence: "monthly",
        tier: "required",
        usual_account: { nickname: "Bills", last4: "2222" }
      }],
      subscriptions: [],
      income_monthly: [],
      pay_schedule: [
        { name: "Payroll", kind: "payroll", date: "2026-10-15", amount: 100, account: { nickname: "Pay", last4: "1111" } },
        { name: "Payroll", kind: "payroll", date: "2026-10-30", amount: 100, account: { nickname: "Pay", last4: "1111" } }
      ],
      account_funding: [
        { nickname: "Pay", last4: "1111", start_balance: 300, current_balance: 300, start_asof: "2026-10-01" },
        { nickname: "Bills", last4: "2222", start_balance: 10, current_balance: 10, start_asof: "2026-10-01" }
      ]
    },
    tier_doc: { rules: {}, plans: { needs: 0 }, bill_status: {}, manual_paid: {}, bill_account: {}, move_buffer: 0 }
  };
}

const NOW = "2026-10-16T16:00:00Z";

function replay(alloc) {
  const bal = {};
  Object.keys(alloc.opening || {}).forEach(function (k) {
    bal[k] = alloc.opening[k].balance || 0;
  });
  const events = [];
  (alloc.periods || []).forEach(function (period) {
    if (period.depositCounted && period.deposit && period.deposit.suffix) {
      events.push({ date: period.date || "", kind: "dep", suffix: period.deposit.suffix, amount: period.depositAmount || 0 });
    }
    (period.moves || []).forEach(function (mv) {
      events.push({ date: mv.date || "", kind: "move", move: mv });
    });
    (period.bills || []).forEach(function (bill) {
      events.push({ date: bill.due || "", kind: "bill", bill: bill });
    });
  });
  const rank = { dep: 0, move: 1, bill: 2 };
  events.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (rank[a.kind] || 9) - (rank[b.kind] || 9);
  });
  events.forEach(function (ev) {
    if (ev.kind === "dep") {
      bal[ev.suffix] = Math.round(((bal[ev.suffix] || 0) + ev.amount) * 100) / 100;
      return;
    }
    if (ev.kind === "move") {
      bal[ev.move.from] = Math.round(((bal[ev.move.from] || 0) - ev.move.amount) * 100) / 100;
      bal[ev.move.to] = Math.round(((bal[ev.move.to] || 0) + ev.move.amount) * 100) / 100;
      return;
    }
    Object.keys(bal).forEach(function (k) {
      assert.ok(bal[k] >= -0.001, k + " is " + bal[k] + " before " + ev.bill.name);
    });
    const before = bal[ev.bill.suffix] || 0;
    assert.ok(before + 0.001 >= ev.bill.amount, ev.bill.name + " before " + before + " amount " + ev.bill.amount);
    bal[ev.bill.suffix] = Math.round((before - ev.bill.amount) * 100) / 100;
    assert.ok(bal[ev.bill.suffix] + 0.001 >= alloc.buffer, ev.bill.name + " after " + bal[ev.bill.suffix]);
  });
}

function moveFaces(moves) {
  return (moves || []).map(function (mv) {
    return { from: mv.fromLast4 || mv.from, to: mv.toLast4 || mv.to, amount: mv.amount, date: mv.date };
  });
}

test("suggested moves keep every account non-negative before a bill", function () {
  const ctx = boot();
  const opts = { now: NOW, planMonth: "2026-10" };
  const zero = moveSnap();
  const alloc = ctx.bankAllocate(zero, opts);
  assert.equal(alloc.buffer, 0);
  assert.equal(JSON.stringify(moveFaces(alloc.moves)), JSON.stringify([{ from: "1111", to: "2222", amount: 70, date: "2026-10-19" }]));
  replay(alloc);
  alloc.beforeBills.forEach(function (row) {
    assert.ok(row.before + 0.001 >= row.amount);
    assert.ok(row.before - row.amount + 0.001 >= 0);
  });

  const padded = moveSnap();
  padded.tier_doc.move_buffer = 25;
  const withBuffer = ctx.bankAllocate(padded, opts);
  assert.equal(withBuffer.buffer, 25);
  assert.equal(JSON.stringify(moveFaces(withBuffer.moves)), JSON.stringify([{ from: "1111", to: "2222", amount: 95, date: "2026-10-19" }]));
  replay(withBuffer);
  withBuffer.beforeBills.forEach(function (row) {
    assert.ok(row.before + 0.001 >= row.amount);
    assert.ok(row.before - row.amount + 0.001 >= 25);
  });
});

test("pay from defaults to the latest history account and an override wins", function () {
  const ctx = boot();
  const snap = moveSnap();
  snap.accounts.push({ nickname: "House", suffix: "3333", name: "House" });
  const bill = snap.budget.bills[0];
  bill.usual_account = { nickname: "Pay", last4: "1111" };
  bill.bank_match = { recent_hits: [{ date: "2026-08-01", amount: -80, account_last4: "2222", description: "Power" }] };
  snap.current.recent_tx = [{
    date: "2026-10-02",
    amount: -80,
    flow: "outflow",
    bill_id: "power",
    desc: "Power",
    account_last4: "3333"
  }];
  const row = ctx.bankPreparedBills(snap, undefined).filter(function (b) { return b.bill_id === "power"; })[0];
  assert.equal(ctx.bankPayFrom(snap, row).suffix, "3333");
  snap.tier_doc.bill_account = { power: "2222" };
  assert.equal(ctx.bankPayFrom(snap, row).suffix, "2222");
  snap.tier_doc.bill_account = { power: "9999" };
  assert.equal(ctx.bankPayFrom(snap, row).suffix, "3333");
  snap.tier_doc.bill_account = { power: null };
  assert.equal(ctx.bankPayFrom(snap, row).suffix, "3333");

  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: NOW });
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="funding"'));
  assert.match(next, /from ··3333/);
  assert.doesNotMatch(next, /from House|from Bills|from Pay/);
  snap.tier_doc.bill_account = { power: "2222" };
  const over = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: NOW });
  const overNext = over.slice(over.indexOf('class="bank-next"'), over.indexOf('data-bank-part="funding"'));
  assert.match(overNext, /from ··2222/);
});

test("next pay moves match by account and the hero identity holds", function () {
  const ctx = boot();
  const snap = moveSnap();
  snap.budget.bills[0].name = "Neighborhood Electric Cooperative";
  const html = ctx.bankPageHtml(snap, { tab: "budget", planMonth: "2026-10", now: NOW, cancelSheet: { key: "power", name: "Neighborhood Electric Cooperative" } });
  function listed(chunk) {
    const out = [];
    const re = /data-bank-move="1"[^>]*data-bank-move-amount="([^"]*)"[^>]*data-bank-move-from="([^"]*)"[^>]*data-bank-move-to="([^"]*)"[^>]*data-bank-move-date="([^"]*)"/g;
    let m;
    while ((m = re.exec(chunk))) out.push(m[1] + "|" + m[2] + "|" + m[3] + "|" + m[4]);
    return out;
  }
  const next = html.slice(html.indexOf('class="bank-next"'), html.indexOf('data-bank-part="funding"'));
  const byAt = html.indexOf('fills-sum">By account');
  assert.ok(byAt >= 0);
  const by = html.slice(byAt, html.indexOf("</details>", byAt));
  const cardMoves = listed(next);
  const byMoves = listed(by);
  assert.ok(cardMoves.length >= 1);
  assert.equal(JSON.stringify(cardMoves), JSON.stringify(byMoves));
  assert.match(next, /Move \$70\.00 ··1111 → ··2222 by Oct 19/);
  assert.match(next, /to Pay ··1111/);
  function num(attr) {
    const m = html.match(new RegExp(attr + '="([^"]*)"'));
    return m ? Number(m[1]) : null;
  }
  const now = num("data-bank-hero-now");
  const inn = num("data-bank-hero-in");
  const out = num("data-bank-hero-out");
  const end = num("data-bank-hero-end");
  const ledger = num("data-bank-ledger-end");
  assert.equal(Math.round((now + inn - out) * 100) / 100, end);
  assert.equal(end, ledger);
  assert.equal(num("data-bank-alloc-total"), 70);
  assert.match(html, /data-bank-left-after="/);
  const moveRow = (next.match(/<p class="mix-leg wrap" data-bank-move="1"[\s\S]*?<\/p>/) || [""])[0];
  const sheet = html.slice(html.indexOf('data-bank-cancel-sheet="1"'));
  assert.match(moveRow, /mix-leg-name">Neighborhood Electric Cooperative</);
  assert.match(sheet, /data-bank-payfrom-row="1"[\s\S]*mix-leg-name">Neighborhood Electric Cooperative</);
  assert.match(sheet, /aria-label="Pay from"/);
  assert.match(sheet, /Default \(history\)/);
  assert.doesNotMatch(moveRow + sheet.slice(0, 800), /…|\.\.\.|hellip/);
  const css = fs.readFileSync(path.join(root, "house/house.css"), "utf8");
  assert.match(css, /\.mix-leg\.wrap \.mix-leg-name[\s\S]{0,160}text-overflow:\s*unset/);
});

test("bill account save is a POST merge and null clears", async function () {
  const ctx = boot();
  const snap = moveSnap();
  snap.tier_doc.bill_account = { power: "2222" };
  const calls = [];
  let postMode = "ok";
  ctx.fetch = function (url, init) {
    const method = init && init.method ? String(init.method).toUpperCase() : "GET";
    calls.push({ url: String(url), method: method, body: init && init.body });
    const u = String(url);
    if (method === "PUT") {
      return Promise.resolve({ ok: false, status: 405, type: "basic", json: function () { return Promise.resolve({}); } });
    }
    if (u.indexOf("/data/banking/tiers.json") >= 0 && method === "GET") {
      return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve(snap.tier_doc); } });
    }
    if (u.indexOf("/data/banking/tiers.json") >= 0 && method === "POST") {
      if (postMode === "bad_account") {
        return Promise.resolve({
          ok: false,
          status: 400,
          type: "basic",
          json: function () { return Promise.resolve({ code: "bad_account", detail: "unknown_account" }); }
        });
      }
      return Promise.resolve({ ok: true, status: 200, type: "basic", json: function () { return Promise.resolve({ ok: true }); } });
    }
    return Promise.resolve({ ok: false, status: 404, type: "basic", json: function () { return Promise.resolve(null); } });
  };
  const el = mount(ctx, snap, { tab: "budget", planMonth: "2026-10", now: NOW });
  await el._bank.prune;
  el._bank.cancelSheet = { key: "power", name: "Power" };
  function change(value) {
    return el.listeners.change({
      target: {
        value: value,
        getAttribute: function (name) { return name === "data-bank-payfrom" ? "power" : null; },
        hasAttribute: function () { return false; }
      }
    });
  }
  calls.length = 0;
  await change("1111");
  const posts = calls.filter(function (c) { return c.method === "POST"; });
  assert.equal(calls.filter(function (c) { return c.method === "PUT"; }).length, 0);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "/data/banking/tiers.json");
  const body = JSON.parse(posts[0].body);
  assert.equal(JSON.stringify(Object.keys(body)), JSON.stringify(["bill_account"]));
  assert.equal(JSON.stringify(body.bill_account), JSON.stringify({ power: "1111" }));
  assert.equal(el._bank.data.tier_doc.bill_account.power, "1111");
  assert.match(el.innerHTML, /data-bank-cancel-sheet="1"/);
  assert.match(el.innerHTML, /data-bank-payfrom="power"/);
  assert.doesNotMatch(el.innerHTML, /data-bank-payfrom-error/);

  calls.length = 0;
  await change("");
  const cleared = calls.filter(function (c) { return c.method === "POST"; });
  assert.equal(cleared.length, 1);
  assert.equal(calls.filter(function (c) { return c.method === "PUT"; }).length, 0);
  const clearBody = JSON.parse(cleared[0].body);
  assert.equal(JSON.stringify(Object.keys(clearBody)), JSON.stringify(["bill_account"]));
  assert.equal(clearBody.bill_account.power, null);
  assert.equal(Object.prototype.hasOwnProperty.call(el._bank.data.tier_doc.bill_account, "power"), false);

  calls.length = 0;
  await change("9999");
  assert.equal(calls.filter(function (c) { return c.method === "POST"; }).length, 0);
  assert.match(el.innerHTML, /data-bank-payfrom-error="1">bad_account</);
  assert.match(el.innerHTML, /data-bank-cancel-sheet="1"/);

  postMode = "bad_account";
  el._bank.data.tier_doc.bill_account.power = "2222";
  calls.length = 0;
  await change("1111");
  assert.equal(calls.filter(function (c) { return c.method === "POST"; }).length, 1);
  assert.equal(calls.filter(function (c) { return c.method === "PUT"; }).length, 0);
  assert.equal(el._bank.data.tier_doc.bill_account.power, "2222");
  assert.match(el.innerHTML, /data-bank-payfrom-error="1">bad_account</);

  postMode = "ok";
  const bag = {};
  let i;
  for (i = 0; i < 200; i++) bag["bill" + i] = "1111";
  el._bank.data.tier_doc.bill_account = bag;
  calls.length = 0;
  await change("2222");
  assert.equal(calls.filter(function (c) { return c.method === "POST"; }).length, 0);
  assert.equal(calls.filter(function (c) { return c.method === "PUT"; }).length, 0);
  assert.match(el.innerHTML, /data-bank-payfrom-error="1">too_many_accounts</);
  assert.match(el.innerHTML, /data-bank-cancel-sheet="1"/);
});
