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
    Date: Date,
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

function tx() {
  return {
    date: "2026-10-04",
    id: "t1",
    tx_key: "tx-corner",
    desc: "TST GROCER 100",
    description: "TST GROCER 100",
    amount: 12,
    flow: "out",
    name_override: "Corner market"
  };
}

function snap() {
  const row = tx();
  delete row.tx_key;
  return {
    asof: "2026-10-16T12:00:00-04:00",
    accounts: [
      { id: "chk", nickname: "Checking", name: "Checking", last4: "1111", suffix: "1111", subType: "checking" }
    ],
    current: {
      month: "2026-10",
      edits_tx: [row],
      recent_tx: [row]
    },
    history: { months: [] },
    budget: {
      bills: [],
      pay_periods: [],
      calendar: [
        { day: 4, items: [{ name: "TST GROCER 100", desc: "TST GROCER 100", name_override: "Corner market" }, "Sample item"] },
        { day: 9, items: [{ name: "ACCT MOBILE 9", name_override: "Family mobile" }] },
        { day: 11, items: [{ name: "Plain store", name_override: "   " }] }
      ]
    },
    tier_doc: {
      categories: [{ id: "groceries", name: "Groceries", tier: "wants", budget: 40 }],
      rules: { "TST GROCER 100": { tier: "wants" } },
      plans: {}
    }
  };
}

test("name_override is the face and the raw description stays the match key", function () {
  const sandbox = boot();
  const row = tx();
  const view = snap();
  assert.equal(sandbox.bankTxNameOverride({ name_override: "  " }), "");
  assert.equal(sandbox.bankTxDisplayName(view, row), "Corner market");
  assert.equal(sandbox.bankTxDisplayName(view, { desc: "TST GROCER 100", name_override: " \n " }), "TST GROCER 100");
  assert.equal(sandbox.bankTxMerchantName(row), "TST GROCER 100");
  assert.equal(sandbox.bankTxRawDetail(row, "Corner market"), "TST GROCER 100");
  assert.equal(sandbox.bankTxKey({ date: "2026-10-04", id: "t1", amount: 12, desc: "TST GROCER 100", name_override: "Corner market" }), "2026-10-04|t1|12|TST GROCER 100");
  assert.equal(sandbox.bankSpendMerchantKey(row), "tst grocer 100");
  assert.equal(sandbox.bankTxDisplayName(view, { desc: "ONLINE TRANSFER", name_override: "Move to pad", internal: true, transfer: true, flow: "out" }), "Move to pad");

  const mapped = sandbox.bankMapTx(row, 0, {}, view);
  assert.equal(mapped.name_override, "Corner market");
  assert.equal(mapped.desc, "TST GROCER 100");
  assert.equal(mapped.key, "tx-corner");

  const src = fs.readFileSync(path.join(root, "house/js/banking.js"), "utf8");
  const merchantFn = src.slice(src.indexOf("function bankTxMerchantName"), src.indexOf("function bankTxRows"));
  assert.doesNotMatch(merchantFn, /name_override/);
  assert.doesNotMatch(src, /4925/);
});

test("lists, search, and categories show the override and keep the raw description in details", function () {
  const sandbox = boot();
  const view = snap();
  const row = view.current.edits_tx[0];

  const tape = sandbox.bankTapeHtml([row], view);
  assert.match(tape, /class="bank-merchant">Corner market</);
  assert.doesNotMatch(tape, /class="bank-merchant">TST GROCER/);

  const edits = sandbox.bankEditTxListHtml(sandbox.bankEditRows(view), ["Other"], "Other", null);
  assert.match(edits, /class="bank-merchant">Corner market</);
  assert.doesNotMatch(edits, /class="bank-merchant">TST GROCER/);

  assert.equal(sandbox.bankTxQueryHit(row, "corner", view), true);
  assert.equal(sandbox.bankTxQueryHit(row, "grocer", view), true);
  assert.equal(sandbox.bankTxQueryHit(row, "nomatch", view), false);

  const byName = sandbox.bankTxResultsHtml(view, { txQuery: "corner" });
  const byRaw = sandbox.bankTxResultsHtml(view, { txQuery: "grocer" });
  assert.match(byName, /data-bank-item-name="1">Corner market</);
  assert.match(byRaw, /data-bank-item-name="1">Corner market</);
  assert.doesNotMatch(byName, /data-bank-item-name="1">TST GROCER/);

  const sheet = sandbox.bankTxSheetHtml(view, row, {});
  assert.match(sheet, /<h2>Corner market<\/h2>/);
  assert.match(sheet, /data-bank-tx-raw="1">TST GROCER 100</);
  assert.match(sheet, /data-bank-tx-merchant="tst grocer 100"/);

  const item = sandbox.bankSpendItemRowHtml(view, row);
  assert.match(item, /data-bank-item-name="1">Corner market</);
  assert.equal(sandbox.bankMapSpendCategory(row, view).id, "groceries");

  const detail = sandbox.bankDetailPopupHtml(view, { detailOpen: { kind: "cat", key: "groceries" }, detailMonth: "2026-10" });
  assert.match(detail, /class="bank-detail-desc">Corner market</);
  assert.match(detail, /data-bank-tx-raw="1">TST GROCER 100</);

  const groups = sandbox.bankCollectTierRows(view, { year: 2026, month: 10 }, null, true);
  const merchants = [].concat(groups.required, groups.needs, groups.wants).filter(function (entry) { return entry && entry.merchant; });
  assert.ok(merchants.some(function (entry) { return entry.name === "Corner market"; }));
  assert.ok(!merchants.some(function (entry) { return entry.name === "TST GROCER 100" || entry.name === "Corner market" && entry.key === "Corner market"; }));
});

test("calendar chips use name_override and the day details keep the raw description", function () {
  const sandbox = boot();
  const view = snap();
  const month = { year: 2026, month: 10 };
  const cal = sandbox.bankRenderCalendar(view, { now: "2026-10-16T16:00:00Z" }, "plan", month, false);
  assert.match(cal, /Corner market/);
  assert.match(cal, /Family mobile/);
  assert.match(cal, /Sample item/);
  assert.match(cal, /Plain store/);
  assert.doesNotMatch(cal, />Phone</);

  const market = sandbox.bankDayDialogHtml(view, month, 4, null);
  assert.match(market, /data-bank-day-name="1">Corner market</);
  assert.match(market, /data-bank-tx-raw="1">TST GROCER 100</);
  assert.match(market, /data-bank-day-name="1">Sample item</);
  const sampleAt = market.indexOf("data-bank-day-name=\"1\">Sample item");
  const sampleLi = market.slice(Math.max(0, sampleAt - 20), sampleAt + 180);
  assert.doesNotMatch(sampleLi, /data-bank-tx-raw/);

  const mobile = sandbox.bankDayDialogHtml(view, month, 9, null);
  assert.match(mobile, /data-bank-day-name="1">Family mobile</);
  assert.match(mobile, /data-bank-tx-raw="1">ACCT MOBILE 9</);
  assert.doesNotMatch(mobile, /data-bank-day-name="1">Phone</);

  const bill = {
    name: "Groceries",
    bank_match: {
      confidence: "high",
      recent_hits: [{ date: "2026-10-04", amount: 12, description: "TST GROCER 100", name_override: "Corner market", account_last4: "1111" }]
    }
  };
  const hits = sandbox.bankBillMatchHtml(bill, view);
  assert.match(hits, /Corner market/);
  assert.match(hits, /data-bank-tx-raw="1">TST GROCER 100</);
  assert.match(sandbox.bankConfirmSentence(bill, "paid_off", view), /Last payment: Corner market/);
});
