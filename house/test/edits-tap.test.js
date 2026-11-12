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

function snap(ctx) {
  return {
    asof: "2026-10-08T15:00:00-04:00",
    accounts: [{ nickname: "Bills", last4: "2222", balance: 100 }],
    current: {
      month: "2026-10",
      edits_tx: [
        {
          date: "2026-10-08", amount: 12.34, flow: "outflow", desc: "Neighborhood Grocer",
          category: "Groceries", category_basis: "spend", tx_id: "tx-1008",
          tx_key: "2026-10-08|acct-check|12.34|Neighborhood Grocer", last4: "2222"
        },
        {
          date: "2026-10-07", amount: 40, flow: "inflow", desc: "Payroll",
          category: "Paycheck/Salary/Wages", category_basis: "not_spend", tx_id: "tx-1007",
          tx_key: "2026-10-07|acct-check|40|Payroll", last4: "2222"
        },
        {
          date: "2026-10-06", amount: 9, flow: "outflow", desc: "One Off Shop",
          category: "Groceries", category_basis: "spend", one_off: true, tx_id: "tx-1006",
          tx_key: "2026-10-06|acct-check|9|One Off Shop", last4: "2222"
        },
        {
          date: "2026-10-04", amount: 12.34, flow: "outflow", desc: "Inside Move",
          category: "", category_basis: "not_spend", tx_id: "tx-1004",
          tx_key: "2026-10-04|acct-check|12.34|Inside Move", last4: "2222"
        }
      ],
      recent_tx: [],
      history_tx: []
    },
    history: { months: [] },
    budget: { bills: [], subscriptions: [], income_monthly: [] },
    tier_doc: {
      rules: {},
      plans: {},
      categories: ctx.bankSpendStarters(),
      category_rules: {},
      category_tx: {}
    }
  };
}

test("a search redraw keeps the row handler, and the open key stays the raw tx_key", function () {
  const ctx = boot();
  const data = snap(ctx);
  const grocer = "2026-10-08|acct-check|12.34|Neighborhood Grocer";
  ctx.bankTxHashCache[grocer] = "h:" + "cd".repeat(16);
  const row = data.current.edits_tx[0];
  assert.equal(ctx.bankTxOpenKey(row), grocer);
  const opened = ctx.bankTxResultsHtml(data, { txQuery: "grocer", txOpen: grocer });
  assert.match(opened, /<button type="button" class="bank-tx-hit" data-bank-tx-open="2026-10-08\|acct-check\|12\.34\|Neighborhood Grocer"/);
  assert.doesNotMatch(opened, /data-bank-tx-sheet/);
  assert.match(opened, /Change \u203a/);
  const page = ctx.bankPageHtml(data, { tab: "edits", txQuery: "grocer", txOpen: grocer });
  assert.match(page, /data-bank-tx-sheet/);
  assert.match(page, /class="book-chip on" data-bank-tx-scope="one"/);
  assert.match(page, /data-bank-tx-key="2026-10-08\|acct-check\|12\.34\|Neighborhood Grocer"/);
  const resultsAt = page.indexOf("data-bank-find-results");
  const results = page.slice(resultsAt, page.indexOf("</section>", resultsAt));
  assert.doesNotMatch(results, /data-bank-tx-sheet/);
  const oneOff = ctx.bankTxResultsHtml(data, { txQuery: "One Off" });
  assert.match(oneOff, /data-bank-tx-open="2026-10-06\|acct-check\|9\|One Off Shop"/);
  const quiet = ctx.bankTxResultsHtml(data, { txQuery: "" });
  function rowHtml(html, name) {
    const at = html.indexOf(name);
    assert.ok(at >= 0, name);
    return html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at));
  }
  const move = rowHtml(quiet, "Inside Move");
  assert.match(move, /data-bank-tx-open=/);
  assert.match(move, /Not a purchase/);
  assert.match(move, /Change \u203a/);
  assert.doesNotMatch(move, /bank-tx-quiet/);
  const payroll = rowHtml(quiet, "Payroll");
  assert.match(payroll, /class="bank-tx-quiet"/);
  assert.match(payroll, /Not a purchase/);
  assert.doesNotMatch(payroll, /data-bank-tx-open/);
  const moveKey = "2026-10-04|acct-check|12.34|Inside Move";
  const movePage = ctx.bankPageHtml(data, { tab: "edits", txOpen: moveKey, txQuery: "payroll" });
  const sheet = movePage.slice(movePage.indexOf("data-bank-tx-sheet"));
  assert.match(sheet, /Not counted as spending now/);
  assert.match(sheet, /value="not-purchase" selected/);
  assert.match(sheet, /Just this one/);
  assert.match(sheet, /tap Save/);
  const moveResults = movePage.slice(movePage.indexOf("data-bank-find-results"), movePage.indexOf("</section>", movePage.indexOf("data-bank-find-results")));
  assert.doesNotMatch(moveResults, /Inside Move/);
  assert.doesNotMatch(moveResults, /data-bank-tx-sheet/);

  const slot = {
    innerHTML: "",
    _bankTxBound: false,
    addEventListener: function (type, fn) { this.listeners[type] = fn; },
    listeners: {}
  };
  const root = {
    innerHTML: "",
    _bank: { data: data, tab: "edits", txQuery: "grocer", txOpen: "", txScope: "" },
    querySelector: function (sel) {
      if (sel === "[data-bank-find-results]") return slot;
      return null;
    }
  };
  ctx.bankPaintTxResults(root);
  const handler = slot.listeners.click;
  assert.equal(typeof handler, "function");
  ctx.bankPaintTxResults(root);
  assert.equal(slot.listeners.click, handler);
  root._bank.txScope = "merchant";
  handler({
    preventDefault: function () {},
    stopPropagation: function () {},
    target: {
      closest: function (sel) {
        if (sel === "[data-bank-tx-open]") {
          return { getAttribute: function () { return grocer; } };
        }
        return null;
      }
    }
  });
  assert.equal(root._bank.txOpen, grocer);
  assert.equal(root._bank.txScope, "one");
  assert.match(root.innerHTML, /data-bank-tx-sheet/);
  assert.match(slot.innerHTML, /Neighborhood Grocer/);
  ctx.bankPaintTxResults(root);
  assert.equal(slot.listeners.click, handler);
  assert.doesNotMatch(slot.innerHTML, /data-bank-tx-sheet/);
  assert.match(root.innerHTML, /data-bank-tx-sheet/);
});

test("a category tap and an uncategorized tap open the page sheet when search does not list the row", function () {
  const ctx = boot();
  const data = snap(ctx);
  data.current.edits_tx.push({
    date: "2026-10-03", amount: 12.34, flow: "outflow", desc: "Odd Purchase",
    category: null, category_basis: "spend", tx_id: "tx-1003",
    tx_key: "odd-purchase", last4: "2222"
  });
  const grocer = "2026-10-08|acct-check|12.34|Neighborhood Grocer";
  const html = ctx.bankPageHtml(data, {
    tab: "edits",
    now: "2026-10-16T16:00:00Z",
    catOpen: "groceries",
    catMonth: "2026-10",
    txOpen: grocer,
    txQuery: "no-such-shop"
  });
  const catAt = html.indexOf('data-bank-cat-save="groceries"');
  const txAt = html.indexOf('data-bank-tx-sheet="1"');
  assert.ok(catAt >= 0 && txAt > catAt);
  const between = html.slice(catAt, txAt);
  assert.match(between, /<\/div><\/div>/);
  assert.equal(between.indexOf("data-bank-tx-sheet"), -1);
  const catPop = html.slice(html.indexOf('<div class="books-overlay on sheet-bottom" data-bank-cat-pop="1">'), txAt);
  assert.doesNotMatch(catPop, /data-bank-tx-sheet/);
  assert.match(catPop, /Neighborhood Grocer/);
  const foundAt = html.indexOf("data-bank-find-results");
  const found = html.slice(foundAt, html.indexOf("</section>", foundAt));
  assert.doesNotMatch(found, /Neighborhood Grocer/);
  assert.doesNotMatch(found, /data-bank-tx-sheet/);
  const sheet = html.slice(txAt);
  assert.match(sheet, /Neighborhood Grocer/);
  assert.match(sheet, /tap Save/);
  assert.match(sheet, /data-bank-tx-save="1"/);
  assert.match(sheet, /z-index:46/);

  const uncat = ctx.bankPageHtml(data, {
    tab: "edits",
    now: "2026-10-16T16:00:00Z",
    uncatOpen: true,
    txOpen: "odd-purchase",
    txQuery: "grocer"
  });
  const listAt = uncat.indexOf('data-bank-uncat-list="1"');
  const list = uncat.slice(listAt, uncat.indexOf("</ul>", listAt));
  assert.match(list, /data-bank-cat-item-open="odd-purchase"/);
  assert.match(list, /Odd Purchase/);
  assert.doesNotMatch(list, /data-bank-tx-sheet/);
  const uncatFoundAt = uncat.indexOf("data-bank-find-results");
  const uncatFound = uncat.slice(uncatFoundAt, uncat.indexOf("</section>", uncatFoundAt));
  assert.match(uncatFound, /Neighborhood Grocer/);
  assert.doesNotMatch(uncatFound, /Odd Purchase/);
  assert.doesNotMatch(uncatFound, /data-bank-tx-sheet/);
  const uncatSheet = uncat.slice(uncat.indexOf('data-bank-tx-sheet="1"'));
  assert.match(uncatSheet, /Odd Purchase/);
  assert.match(uncatSheet, /aria-label="Category"/);
  assert.match(uncatSheet, /data-bank-tx-save="1"/);
  assert.match(uncatSheet, /tap Save/);
});
