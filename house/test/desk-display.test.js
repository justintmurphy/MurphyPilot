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
    documentElement: { setAttribute: function () {} }
  };
  const location = { hash: "", pathname: "/", search: "" };
  const sandbox = {
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    sessionStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    document: document,
    location: location,
    history: { replaceState: function () {} },
    console: console,
    fetch: function () { return new Promise(function () {}); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    navigator: { userAgent: "node" },
    Intl: Intl,
    Date: Date
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function () {};
  sandbox.removeEventListener = function () {};
  sandbox.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, addListener: function () {} };
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-a.js"), "utf8"), sandbox, { filename: "board-a.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-b.js"), "utf8"), sandbox, { filename: "board-b.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-c.js"), "utf8"), sandbox, { filename: "board-c.js" });
  return sandbox;
}

function setNarrow(ctx, on) {
  ctx.matchMedia = function () {
    return { matches: !!on, addEventListener: function () {}, addListener: function () {} };
  };
}

function names(n) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ symbol: "N" + i, value: 100 - i, qty: 1 });
  return rows;
}

test("close-print stale follows the holdings soft line and stays off when the date is missing", function () {
  const ctx = boot();
  const today = ctx.nyYmdNow();
  assert.equal(ctx.closePrintStale(null), false);
  assert.equal(ctx.closePrintStale(""), false);
  assert.equal(ctx.closePrintStale("—"), false);
  assert.equal(ctx.closePrintStale(today), false);
  assert.equal(ctx.closePrintStale(ctx.ymdAdd(today, -1)), false);
  assert.equal(ctx.closePrintStale(ctx.ymdAdd(today, -2)), true);
  assert.equal(ctx.closePrintStale(new Date(Date.now() - 30 * 60 * 1000).toISOString()), false);
  assert.equal(ctx.closePrintStale(new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()), true);
});

test("cashflow strip marks a stale close print and hides when the print has no figures", function () {
  const ctx = boot();
  const fresh = ctx.cashflowStripHtml({
    cashflow_30d: { asof: ctx.nyYmdNow(), owner_deposits: 12, market_earnings: 3 }
  });
  assert.match(fresh, /cashflow-strip/);
  assert.doesNotMatch(fresh, /awaiting-close/);
  assert.doesNotMatch(fresh, /Close print/);
  assert.doesNotMatch(fresh, /kpi-pulse/);

  const undated = ctx.cashflowStripHtml({ cashflow_30d: { owner_deposits: 5 } });
  assert.match(undated, /Deposits/);
  assert.doesNotMatch(undated, /awaiting-close/);

  const stale = ctx.cashflowStripHtml({
    id: "combined",
    cashflow_30d: {
      asof: "2020-01-01",
      owner_deposits: 12,
      market_earnings: 3,
      by_source: {
        utma: { owner_deposits: 9 },
        "smart income": { owner_deposits: 8 },
        fidelity: { owner_deposits: 4 }
      }
    }
  }, true);
  assert.match(stale, /awaiting-close/);
  assert.match(stale, /Close print/);
  assert.match(stale, /Once a day|Deposits/);
  assert.doesNotMatch(stale, /utma/i);
  assert.doesNotMatch(stale, /smart income/i);
  assert.doesNotMatch(stale, /kpi-pulse/);
  assert.equal(ctx.cashflowStripHtml(null), "");
  assert.equal(ctx.cashflowStripHtml({ cashflow_30d: {} }), "");
});

test("phone book disclosure wraps dense tables and leaves the wide table open", function () {
  const ctx = boot();
  ctx.snap = { accounts: {} };
  ctx.tab = "combined";
  const eight = names(8);

  setNarrow(ctx, false);
  const wide = ctx.tableHtml(eight, true, true);
  assert.match(wide, /<table class="book">/);
  assert.doesNotMatch(wide, /book-more/);
  assert.doesNotMatch(wide, /book-top3/);

  setNarrow(ctx, true);
  const seven = ctx.tableHtml(names(7), true, true);
  assert.match(seven, /<table class="book">/);
  assert.doesNotMatch(seven, /book-more/);

  const dense = ctx.tableHtml(eight, true, true);
  assert.match(dense, /<details class="book-more">/);
  assert.doesNotMatch(dense, /<details class="book-more" open>/);
  assert.match(dense, /Book · 8 names/);
  assert.match(dense, /cf-chev/);
  assert.match(dense, />Show</);
  assert.match(dense, /book-top3/);
  const top = dense.split("<details")[0];
  assert.match(top, /N0/);
  assert.match(top, /N1/);
  assert.match(top, /N2/);
  assert.doesNotMatch(top, /N3/);
  assert.equal((top.match(/book-top3-row/g) || []).length, 3);

  ctx.bookMoreTab = ctx.tab;
  ctx.bookMoreOpen = true;
  const opened = ctx.tableHtml(eight, true, true);
  assert.match(opened, /<details class="book-more" open>/);

  setNarrow(ctx, true);
  const empty = ctx.tableHtml([], false, false);
  assert.doesNotMatch(empty, /book-more/);
  assert.match(empty, /No names/);

  const missingVal = ctx.bookTop3Html([{ symbol: "ZZ", value: null }]);
  assert.match(missingVal, /ZZ/);
  assert.match(missingVal, /\u2014/);
  assert.doesNotMatch(missingVal, /\$0/);
});

test("custodial books, sleeves, and the Truthifi feed use close-print tone without touching the live chip", function () {
  const ctx = boot();
  const today = ctx.nyYmdNow();
  ctx.tab = "fidelity";
  ctx.snap = {
    asof: today + "T15:00:00-04:00",
    truthifiFail: "",
    truthifiHeld: false,
    combined: { equity: 40 },
    tape: {},
    truthifi: {
      holdings_asof: "2020-01-03",
      asof: "2020-01-03",
      scanned_at: "2020-01-03T16:00:00-05:00",
      source: "Truthifi",
      note: "Custodial EOD."
    },
    accounts: {
      fidelity: {
        id: "fidelity",
        asof: "2020-01-03",
        equity: 20,
        cash: 5,
        invested_pct: 50,
        names: [{ symbol: "AA", value: 15, qty: 1, pnl: 1, cost: 14 }]
      },
      voya: {
        id: "voya",
        asof: "2020-01-02",
        equity: 20,
        cash: 1,
        invested_pct: 40,
        names: [{ symbol: "BB", value: 19, qty: 1 }]
      }
    }
  };

  const fid = ctx.custodialStateHtml(ctx.snap.accounts.fidelity, "Fidelity");
  assert.match(fid, /awaiting-close/);
  assert.match(fid, /Once a day/);
  assert.match(fid, /Close print/);
  assert.doesNotMatch(fid, /kpi-pulse/);

  ctx.snap.accounts.fidelity.asof = today;
  ctx.snap.truthifi.holdings_asof = today;
  ctx.snap.truthifi.asof = today;
  const freshFid = ctx.custodialStateHtml(ctx.snap.accounts.fidelity, "Fidelity");
  assert.doesNotMatch(freshFid, /awaiting-close/);
  assert.doesNotMatch(freshFid, /Close print/);

  ctx.snap.accounts.fidelity.live = true;
  ctx.snap.accounts.fidelity.asof = "2020-01-03";
  ctx.snap.truthifi.holdings_asof = "2020-01-03";
  const live = ctx.fidelityLiveStateHtml(ctx.snap.accounts.fidelity, "Fidelity");
  assert.doesNotMatch(live, /awaiting-close/);
  assert.doesNotMatch(live, /Close print/);
  assert.match(live, /live/);
  assert.match(live, /fresh-chip/);

  const chips = ctx.sourceFreshnessChipsHtml();
  assert.match(chips, /live/);
  assert.doesNotMatch(chips, /awaiting-close/);
  assert.doesNotMatch(chips, /Close print/);

  ctx.snap.accounts.fidelity.live = false;
  ctx.snap.truthifi.holdings_asof = "2020-01-03";
  const feed = ctx.truthifiMetaHtml();
  assert.match(feed, /Truthifi feed/);
  assert.match(feed, /awaiting-close/);
  assert.match(feed, /Close print/);
  assert.doesNotMatch(feed, /fresh-chip/);
  assert.doesNotMatch(feed, /\$0\.00/);

  ctx.snap.truthifi = null;
  assert.equal(ctx.truthifiMetaHtml(), "");

  setNarrow(ctx, true);
  ctx.tab = "voya";
  const sleeveNames = [
    { symbol: "AA", value: 15, qty: 1 },
    { symbol: "BB", value: 9, qty: 1 }
  ];
  const narrowBook = ctx.custodialTableHtml(sleeveNames, 24);
  assert.match(narrowBook, /<details class="book-more">/);
  assert.match(narrowBook, /Book · 2 names/);
  assert.match(narrowBook, /custodial/);
  const sleeveTop = narrowBook.split("<details")[0];
  assert.match(sleeveTop, /AA/);
  assert.match(sleeveTop, /BB/);

  setNarrow(ctx, false);
  const wideBook = ctx.custodialTableHtml(sleeveNames, 24);
  assert.doesNotMatch(wideBook, /book-more/);
  assert.match(wideBook, /<table class="book custodial">/);

  setNarrow(ctx, true);
  const noNames = ctx.custodialTableHtml([], 0);
  assert.doesNotMatch(noNames, /book-more/);
  assert.match(noNames, /No names/);

  assert.equal(ctx.bookDisplayLabel("agentic", { label: "Agentic" }), "AI WWIII");
});

function fidelityPrint() {
  return JSON.parse(fs.readFileSync(path.join(root, "house/truthifi-snapshot.json"), "utf8"));
}

function assertEachNameOnce(names, sleeves) {
  names.forEach(function (n) {
    const hits = sleeves.filter(function (s) { return (s.names || []).indexOf(n) >= 0; });
    assert.equal(hits.length, 1);
  });
  const assigned = sleeves.reduce(function (sum, s) { return sum + (s.names || []).length; }, 0);
  assert.equal(assigned, names.length);
}

test("each Fidelity print name lands in exactly one sleeve", function () {
  const ctx = boot();
  const print = fidelityPrint();
  const fid = print.accounts.fidelity;
  const sleeves = ctx.buildFidelitySleeves(fid, print);
  assert.ok(sleeves.length > 1);
  assertEachNameOnce(fid.names, sleeves);

  sleeves.forEach(function (s) {
    if (!(s.names || []).length) {
      assert.equal(s.namesUnavailable, true);
      assert.equal(s.equity_value, null);
      return;
    }
    const sum = s.names.reduce(function (total, n) { return total + Number(n.value); }, 0);
    assert.ok(Math.abs(Number(s.equity_value) - sum) < 0.02);
  });

  const brokerage = sleeves.find(function (s) { return /brokerage/i.test(s.label); });
  assert.ok(brokerage && brokerage.names.length > 0);
  brokerage.names.forEach(function (n) {
    const token = ctx.fidNameToken(n);
    const suffixes = ctx.fidNameSuffixes(n);
    const onSuffix = suffixes.indexOf(String(brokerage.suffix).toLowerCase()) >= 0;
    assert.ok(token === "bny" || onSuffix);
  });

  const bySuffix = JSON.parse(JSON.stringify(fid));
  bySuffix.names.forEach(function (n) { delete n.sleeve; delete n.account_name; });
  assertEachNameOnce(bySuffix.names, ctx.buildFidelitySleeves(bySuffix, print));

  const bySleeve = JSON.parse(JSON.stringify(fid));
  bySleeve.names.forEach(function (n) {
    if (n.sleeve) n.sleeve = String(n.sleeve).toLowerCase();
    delete n.accounts;
    delete n.suffix;
  });
  assertEachNameOnce(bySleeve.names, ctx.buildFidelitySleeves(bySleeve, print));

  ctx.snap = { truthifi: print, tape: {}, accounts: { fidelity: Object.assign({ sleeves: sleeves }, fid) } };
  ctx.tab = "fid-" + brokerage.id;
  const html = ctx.fidelitySleeveDeskHtml();
  brokerage.names.forEach(function (n) { assert.match(html, new RegExp(n.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); });
  assert.match(html, /Holdings/);
  assert.match(html, new RegExp(ctx.money(brokerage.equity_value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(html, /names not available/);
  assert.doesNotMatch(html, /No names on this sleeve/);

  const cashRow = fid.names.find(function (n) {
    return String(n.kind).toLowerCase() === "cash" && Array.isArray(n.accounts) && n.accounts.length;
  });
  assert.ok(cashRow);
  const suffix = String(cashRow.accounts[0]);
  const account = fid.accounts.find(function (a) { return String(a.suffix) === suffix; });
  const onlyCash = fid.names.filter(function (n) {
    return String(n.kind).toLowerCase() === "cash" && (n.accounts || []).map(String).indexOf(suffix) >= 0;
  });
  const cashSum = onlyCash.reduce(function (total, n) { return total + Number(n.value); }, 0);
  const cashBook = {
    names: onlyCash,
    accounts: [{ name: account.name, suffix: account.suffix, equity: cashSum, cash: cashSum }]
  };
  const cashSleeves = ctx.buildFidelitySleeves(cashBook, print);
  assert.equal(cashSleeves.length, 1);
  assert.equal(cashSleeves[0].names.length, onlyCash.length);
  assert.ok(Math.abs(Number(cashSleeves[0].equity_value) - cashSum) < 0.02);
  assert.equal(cashSleeves[0].namesUnavailable, false);
  ctx.snap.accounts.fidelity = Object.assign({ sleeves: cashSleeves }, cashBook);
  ctx.tab = "fid-" + cashSleeves[0].id;
  const cashHtml = ctx.fidelitySleeveDeskHtml();
  onlyCash.forEach(function (n) { assert.match(cashHtml, new RegExp(n.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); });
  assert.match(cashHtml, /Holdings/);
  assert.doesNotMatch(cashHtml, /names not available/);
});

test("a sleeve with no tagged names hides holdings and does not invent $0.00", function () {
  const ctx = boot();
  const print = fidelityPrint();
  const fid = JSON.parse(JSON.stringify(print.accounts.fidelity));
  fid.accounts.push({ name: "Unlabeled sleeve" });
  const sleeves = ctx.buildFidelitySleeves(fid, print);
  const miss = sleeves.find(function (s) { return /unlabeled/i.test(s.label); });
  assert.ok(miss);
  assert.equal(miss.names.length, 0);
  assert.equal(miss.namesUnavailable, true);
  assert.equal(miss.equity_value, null);
  assert.equal(miss.cash, null);
  ctx.snap = {
    truthifi: { holdings_asof: "2020-01-02", asof: "2020-01-02", source: "Truthifi" },
    tape: {},
    accounts: { fidelity: Object.assign({ sleeves: sleeves }, fid) }
  };
  ctx.tab = "fid-" + miss.id;
  const html = ctx.fidelitySleeveDeskHtml();
  assert.match(html, /names not available/);
  assert.doesNotMatch(html, /No names on this sleeve/);
  assert.doesNotMatch(html, /\$0\.00/);
  assert.doesNotMatch(html, /<span>Holdings<\/span>/);
});
