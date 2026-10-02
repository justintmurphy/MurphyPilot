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
  const shortBook = ctx.custodialTableHtml(names(2), 24);
  assert.match(shortBook, /<table class="book custodial">/);
  assert.doesNotMatch(shortBook, /book-more/);
  assert.doesNotMatch(shortBook, /book-top3/);
  assert.doesNotMatch(shortBook, /Book ·/);

  const sevenBook = ctx.custodialTableHtml(names(7), 24);
  assert.match(sevenBook, /<table class="book custodial">/);
  assert.doesNotMatch(sevenBook, /book-more/);
  assert.doesNotMatch(sevenBook, /book-top3/);

  const eightBook = ctx.custodialTableHtml(names(8), 24);
  assert.match(eightBook, /<details class="book-more">/);
  assert.match(eightBook, /Book · 8 names/);
  assert.match(eightBook, /custodial/);
  assert.match(eightBook, /book-top3/);
  const sleeveTop = eightBook.split("<details")[0];
  assert.match(sleeveTop, /N0/);
  assert.doesNotMatch(sleeveTop, /<table/);

  setNarrow(ctx, false);
  const wideBook = ctx.custodialTableHtml(names(8), 24);
  assert.doesNotMatch(wideBook, /book-more/);
  assert.doesNotMatch(wideBook, /book-top3/);
  assert.match(wideBook, /<table class="book custodial">/);

  setNarrow(ctx, true);
  const one = ctx.bookPhoneDisclosure("<div class=\"card\">one</div>", names(1), 1);
  assert.match(one, /Book · 1 name</);
  assert.doesNotMatch(one, /1 names/);

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
    const sum = s.names.reduce(function (total, n) {
      if (String(n.kind).toLowerCase() === "cash") return total;
      return total + Number(n.value);
    }, 0);
    assert.ok(Math.abs(Number(s.equity_value) - sum) < 0.02);
  });

  const brokerage = sleeves.find(function (s) { return /brokerage/i.test(s.label); });
  if (brokerage && brokerage.names.length) brokerage.names.forEach(function (n) {
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
  if (brokerage && brokerage.names.length) {
    ctx.tab = "fid-" + brokerage.id;
    const html = ctx.fidelitySleeveDeskHtml();
    brokerage.names.forEach(function (n) { assert.match(html, new RegExp(n.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); });
    assert.match(html, /Holdings/);
    assert.match(html, new RegExp(ctx.money(brokerage.equity_value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, /names not available/);
    assert.doesNotMatch(html, /No names on this sleeve/);
  }

  const cashRow = fid.names.find(function (n) {
    return String(n.kind).toLowerCase() === "cash" && Array.isArray(n.accounts) && n.accounts.length;
  });
  if (!cashRow) return;
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
  assert.ok(Math.abs(Number(cashSleeves[0].equity_value)) < 0.02);
  const cashRowPrint = printSleeveForCard(cashSleeves[0], print.sleeves);
  assert.ok(cashRowPrint && Number.isFinite(Number(cashRowPrint.cash)));
  assert.ok(Math.abs(Number(cashSleeves[0].cash) - Number(cashRowPrint.cash)) < 0.02);
  assert.ok(Math.abs(Number(cashSleeves[0].cash) - cashSum) < 0.02);
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

function printSleeveForCard(card, sleevesMap) {
  const tags = [
    ["espp", /\bespp\b/i],
    ["rsu", /\brsu\b/i],
    ["roth", /\broth\b/i],
    ["trad", /\btrad\b/i],
    ["per", /\bper\b|\bpersonal\b/i],
    ["bny", /\bbny\b|\bbrokerage\b/i]
  ];
  const blob = [card.label, card.key, card.id].filter(Boolean).join(" ");
  let token = "";
  for (let i = 0; i < tags.length; i++) {
    if (tags[i][1].test(blob)) { token = tags[i][0]; break; }
  }
  const entries = Object.keys(sleevesMap || {}).filter(function (k) {
    const row = sleevesMap[k];
    return row && typeof row === "object" && row.cash != null && row.cash !== "" && Number.isFinite(Number(row.cash));
  });
  if (!token) return null;
  const byId = entries.find(function (k) {
    return k.replace(/^fidelity_/, "").replace(/^voya_/, "") === token;
  });
  if (byId) return sleevesMap[byId];
  const byLabel = entries.find(function (k) {
    const row = sleevesMap[k];
    return tags.some(function (t) {
      return t[0] === token && t[1].test(String(row.label || "") + " " + k);
    });
  });
  return byLabel ? sleevesMap[byLabel] : null;
}

function moneyPattern(ctx, n) {
  return new RegExp(ctx.money(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

test("sleeve cash matches the print and holdings plus cash stays within a cent of equity", function () {
  const ctx = boot();
  const print = fidelityPrint();
  const fid = print.accounts.fidelity;
  const voya = print.accounts.voya;
  const sleeves = ctx.buildFidelitySleeves(fid, print);
  assert.ok(sleeves.length > 1);

  sleeves.forEach(function (s) {
    const row = printSleeveForCard(s, print.sleeves);
    assert.ok(row);
    assert.ok(Math.abs(Number(s.cash) - Number(row.cash)) < 0.005);
    const held = s.equity_value == null ? 0 : Number(s.equity_value);
    assert.ok(Math.abs(held + Number(s.cash) - Number(s.equity)) <= 0.01);
    (s.names || []).filter(function (n) { return String(n.kind).toLowerCase() === "cash"; }).forEach(function (n) {
      assert.ok((s.names || []).indexOf(n) >= 0);
    });
  });

  assert.ok(Math.abs(Number(fid.equity_value) + Number(fid.cash) - Number(fid.equity)) <= 0.01);
  assert.ok(Math.abs(Number(voya.equity_value) + Number(voya.cash) - Number(voya.equity)) <= 0.01);

  const fidBare = JSON.parse(JSON.stringify(fid));
  delete fidBare.cash;
  delete fidBare.equity_value;
  const fidFigs = ctx.custodialFigures(fidBare);
  assert.ok(Math.abs(fidFigs.held - Number(fid.equity_value)) <= 0.01);
  assert.ok(Math.abs(fidFigs.cash - Number(fid.cash)) <= 0.01);

  const voyaBare = JSON.parse(JSON.stringify(voya));
  delete voyaBare.cash;
  delete voyaBare.equity_value;
  const voyaFigs = ctx.custodialFigures(voyaBare);
  const voyaCashNames = (voya.names || []).filter(function (n) { return String(n.kind).toLowerCase() === "cash"; });
  if (!voyaCashNames.length) assert.equal(voyaFigs.cash, null);
  else {
    const voyaCashSum = voyaCashNames.reduce(function (total, n) { return total + Number(n.value); }, 0);
    assert.ok(Math.abs(Number(voyaFigs.cash) - voyaCashSum) <= 0.01);
  }
  assert.ok(Math.abs(voyaFigs.held - Number(voya.equity_value)) <= 0.01);

  ctx.snap = {
    truthifi: print,
    tape: {},
    accounts: {
      fidelity: Object.assign({ sleeves: sleeves }, fid),
      voya: voya
    }
  };
  ctx.tab = "fidelity";
  const allHtml = ctx.fidelityDeskHtml();
  assert.match(allHtml, /<span>Cash<\/span>/);
  assert.match(allHtml, /<span>Holdings<\/span>/);
  assert.match(allHtml, moneyPattern(ctx, fid.cash));
  assert.match(allHtml, moneyPattern(ctx, fid.equity_value));
  fid.names.filter(function (n) { return String(n.kind).toLowerCase() === "cash"; }).forEach(function (n) {
    assert.match(allHtml, new RegExp(n.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  ctx.tab = "voya";
  const voyaHtml = ctx.voyaDeskHtml();
  assert.match(voyaHtml, /<span>Cash<\/span>/);
  assert.match(voyaHtml, /<span>Holdings<\/span>/);
  assert.match(voyaHtml, moneyPattern(ctx, voya.cash));
  assert.match(voyaHtml, moneyPattern(ctx, voya.equity_value));

  sleeves.filter(function (s) { return (s.names || []).length; }).forEach(function (s) {
    ctx.tab = "fid-" + s.id;
    const html = ctx.fidelitySleeveDeskHtml();
    assert.match(html, moneyPattern(ctx, s.cash));
    assert.match(html, moneyPattern(ctx, s.equity_value));
    (s.names || []).filter(function (n) { return String(n.kind).toLowerCase() === "cash"; }).forEach(function (n) {
      assert.match(html, new RegExp(n.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  });
});

function costIsMissing(n) {
  return !n || n.cost == null || n.cost === "" || !Number.isFinite(Number(n.cost));
}

function tableRowsHtml(html, symbol) {
  const needle = ("<span class=\"sym\">" + String(symbol) + "</span>").toUpperCase();
  return html.split("<tr").slice(1).filter(function (row) {
    return row.toUpperCase().indexOf(needle) >= 0;
  }).map(function (row) {
    return "<tr" + row.slice(0, row.indexOf("</tr>") + 5);
  });
}

function tableRowHtml(html, symbol) {
  const rows = tableRowsHtml(html, symbol);
  assert.ok(rows.length);
  return rows[0];
}

function tdTexts(row) {
  const out = [];
  const re = /<td\b[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(row))) out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  return out;
}

function assertMissingCostDash(html, symbol) {
  const dashed = tableRowsHtml(html, symbol).map(tdTexts).filter(function (c) {
    return c[4] === "\u2014" && c[8] === "\u2014" && c[9] === "\u2014";
  });
  assert.ok(dashed.length >= 1);
  dashed.forEach(function (c) {
    [4, 8, 9].forEach(function (i) { assert.equal(c[i].indexOf("$0.00"), -1); });
  });
}

function kpiValue(html, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = html.match(new RegExp("<span>" + esc + "</span><b[^>]*>([\\s\\S]*?)</b>"));
  assert.ok(m);
  return m[1].replace(/<[^>]+>/g, "").trim();
}

test("null cost renders a dash and a numeric cost still computes P&L", function () {
  const ctx = boot();
  const print = fidelityPrint();
  const fid = print.accounts.fidelity;
  const voya = print.accounts.voya;
  const sleeves = ctx.buildFidelitySleeves(fid, print);
  const missing = [];
  voya.names.forEach(function (n) { if (costIsMissing(n)) missing.push(n); });
  fid.names.forEach(function (n) { if (costIsMissing(n)) missing.push(n); });
  const voyaAllMissing = voya.names.every(costIsMissing);

  ctx.snap = {
    truthifi: print,
    tape: {},
    accounts: { fidelity: Object.assign({ sleeves: sleeves }, fid), voya: voya }
  };
  ctx.tab = "voya";
  const voyaHtml = ctx.voyaDeskHtml();
  if (voyaAllMissing) {
    assert.equal(kpiValue(voyaHtml, "P&L"), "\u2014");
    assert.doesNotMatch(kpiValue(voyaHtml, "P&L"), /\$0\.00/);
  } else {
    assert.equal(kpiValue(voyaHtml, "P&L"), ctx.pnlKpiText(ctx.nameStats(voya.names)));
  }
  voya.names.filter(costIsMissing).forEach(function (n) { assertMissingCostDash(voyaHtml, n.symbol); });
  const dashed = ctx.custodialTableHtml([{ symbol: "NC", name: "No Cost", kind: "equity", qty: 1, value: 4 }], 4);
  assertMissingCostDash(dashed, "NC");
  assert.doesNotMatch(tdTexts(tableRowHtml(dashed, "NC"))[9], /\$0\.00/);
  assert.match(voyaHtml, /<span>Holdings<\/span>/);
  assert.match(voyaHtml, /<span>Cash<\/span>/);

  ctx.tab = "fidelity";
  const allHtml = ctx.fidelityDeskHtml();
  const allStats = ctx.nameStats(fid.names);
  assert.ok(allStats.pnl != null);
  assert.match(allStats.excl, /^excl\./);
  assert.equal(kpiValue(allHtml, "P&L"), ctx.pnlKpiText(allStats));
  missing.filter(function (n) { return fid.names.indexOf(n) >= 0; }).forEach(function (n) {
    assertMissingCostDash(allHtml, n.symbol);
  });

  sleeves.forEach(function (s) {
    ctx.tab = "fid-" + s.id;
    const html = ctx.fidelitySleeveDeskHtml();
    const names = s.names || [];
    if (!names.length) return;
    const stats = ctx.nameStats(names);
    if (!stats.hasCost) {
      assert.equal(kpiValue(html, "P&L"), "\u2014");
      names.filter(costIsMissing).forEach(function (n) { assertMissingCostDash(html, n.symbol); });
      return;
    }
    assert.ok(stats.pnl != null);
    assert.equal(kpiValue(html, "P&L"), ctx.pnlKpiText(stats));
    const shown = ctx.collapseHouseNames(names);
    const sample = shown.find(function (n) { return n.cost != null && String(n.kind).toLowerCase() !== "cash"; }) || shown[0];
    const cells = tdTexts(tableRowHtml(html, sample.symbol));
    assert.equal(cells[8], ctx.money(sample.cost));
    assert.equal(cells[9], ctx.money(sample.pnl) + " " + ctx.pct(sample.pnl_pct));
  });

  setNarrow(ctx, true);
  const pad = voya.names.concat([{ symbol: "ZZ", name: "Pad", kind: "equity", qty: 1, value: 4, cost: 3 }]);
  const wrapped = ctx.custodialTableHtml(pad, 1);
  assert.match(wrapped, /book-more/);
  assert.match(wrapped, /book-top3/);
  voya.names.forEach(function (n) { assertMissingCostDash(wrapped, n.symbol); });
  const top = wrapped.slice(0, wrapped.indexOf("<details"));
  assert.doesNotMatch(top, /\$0\.00/);

  setNarrow(ctx, false);
  const zeroHtml = ctx.custodialTableHtml([{ symbol: "ZZ", name: "Zero", kind: "equity", qty: 2, value: 5, cost: 0 }], 5);
  const zeroCells = tdTexts(tableRowHtml(zeroHtml, "ZZ"));
  const zeroRow = ctx.collapseHouseNames([{ symbol: "ZZ", name: "Zero", kind: "equity", qty: 2, value: 5, cost: 0 }])[0];
  assert.equal(zeroCells[4], ctx.money(0));
  assert.equal(zeroCells[8], ctx.money(0));
  assert.equal(zeroRow.pnl_pct, null);
  assert.equal(zeroCells[9], ctx.money(zeroRow.pnl) + " \u2014");
  assert.equal(zeroCells[9].indexOf("%"), -1);
});

test("partial cost labels the excluded rows, keeps mixed sleeves apart, and dashes a zero percent", function () {
  const ctx = boot();
  const print = fidelityPrint();
  const fid = print.accounts.fidelity;
  const voya = print.accounts.voya;
  const sleeves = ctx.buildFidelitySleeves(fid, print);
  const bySym = {};
  fid.names.forEach(function (n) {
    const sym = String(n.symbol || "").toUpperCase();
    (bySym[sym] = bySym[sym] || []).push(n);
  });
  const pair = Object.keys(bySym).map(function (sym) { return bySym[sym]; }).find(function (rows) {
    return rows.some(costIsMissing) && rows.some(function (n) { return !costIsMissing(n); });
  });
  const known = pair && pair.find(function (n) { return !costIsMissing(n); });
  const unknown = pair && pair.find(costIsMissing);
  if (known && unknown) {

  ctx.snap = {
    truthifi: print,
    tape: {},
    accounts: { fidelity: Object.assign({ sleeves: sleeves }, fid), voya: voya },
    combined: { names: fid.names.concat(voya.names), cash: 0, buying_power: 0, invested_pct: 0, equity: 0 }
  };
  ctx.tab = "fidelity";
  const allHtml = ctx.fidelityDeskHtml();
  const allStats = ctx.nameStats(fid.names);
  assert.ok(allStats.pnl != null && allStats.partial);
  assert.equal(allStats.excl, "excl. " + ctx.costExcludeTag(unknown));
  assert.equal(kpiValue(allHtml, "P&L"), ctx.pnlKpiText(allStats));
  assert.match(kpiValue(allHtml, "P&L"), /\$/);

  ctx.tab = "voya";
  if (voya.names.every(costIsMissing)) {
    assert.equal(kpiValue(ctx.voyaDeskHtml(), "P&L"), "\u2014");
    assert.equal(ctx.nameStats(voya.names).pnl, null);
  } else {
    assert.equal(kpiValue(ctx.voyaDeskHtml(), "P&L"), ctx.pnlKpiText(ctx.nameStats(voya.names)));
  }

  const shown = ctx.collapseHouseNames(fid.names).filter(function (n) {
    return n.symbol === String(known.symbol).toUpperCase();
  });
  assert.equal(shown.length, 2);
  const knownShown = shown.find(function (n) { return n.cost != null; });
  const unknownShown = shown.find(function (n) { return n.cost == null; });
  assert.ok(knownShown && knownShown.pnl != null);
  assert.equal(unknownShown.pnl, null);
  assert.match(String(knownShown.sleeve), new RegExp(known.sleeve, "i"));
  assert.match(String(unknownShown.sleeve), new RegExp(unknown.sleeve, "i"));

  const fidRows = tableRowsHtml(allHtml, known.symbol).map(tdTexts);
  const fidKnown = fidRows.find(function (c) { return c[1] === ctx.tidySleeveLabel(known.sleeve); });
  const fidUnknown = fidRows.find(function (c) { return c[1] === ctx.tidySleeveLabel(unknown.sleeve); });
  assert.ok(fidKnown && fidUnknown);
  assert.equal(fidKnown[9], ctx.money(knownShown.pnl) + " " + ctx.pnlPctHtml(knownShown.pnl_pct));
  assert.equal(fidUnknown[9], "\u2014");

  ctx.tab = "combined";
  const bookHtml = ctx.tableHtml(fid.names.concat(voya.names), true, true);
  const bookRows = tableRowsHtml(bookHtml, known.symbol).map(tdTexts);
  assert.equal(bookRows.length, 2);
  const bookKnown = bookRows.find(function (c) { return c[1] === ctx.tidySleeveLabel(known.sleeve); });
  const bookUnknown = bookRows.find(function (c) { return c[1] === ctx.tidySleeveLabel(unknown.sleeve); });
  assert.ok(bookKnown && bookUnknown);
  assert.match(bookKnown[6], /\$/);
  assert.notEqual(bookKnown[6], "\u2014");
  assert.equal(bookUnknown[6], "\u2014");

  }
  const houseNames = fid.names.concat(voya.names);
  const houseStats = ctx.nameStats(houseNames);
  const excluded = houseNames.filter(costIsMissing);
  if (excluded.length > 2) assert.equal(houseStats.excl, "excl. " + excluded.length + " names");
  else if (excluded.length) assert.match(houseStats.excl, /^excl\./);
  ctx.snap = ctx.snap || {
    truthifi: print,
    tape: {},
    accounts: { fidelity: Object.assign({ sleeves: sleeves }, fid), voya: voya },
    combined: { names: houseNames, cash: 0, buying_power: 0, invested_pct: 0, equity: 0 }
  };
  const houseHtml = ctx.stateHtml({ names: houseNames, cash: 0, buying_power: 0, invested_pct: 0, equity: 0 }, "House");
  assert.equal(kpiValue(houseHtml, "P&L"), ctx.pnlKpiText(houseStats));
  if (houseStats.pnl != null) assert.match(kpiValue(houseHtml, "P&L"), /\$/);

  const zeroRow = ctx.collapseHouseNames([{ symbol: "ZZ", name: "Zero", kind: "equity", qty: 1, value: 4, cost: 0 }])[0];
  const zeroHtml = ctx.custodialTableHtml([zeroRow], 4);
  const zeroCells = tdTexts(tableRowHtml(zeroHtml, "ZZ"));
  assert.equal(zeroCells[8], ctx.money(0));
  assert.equal(zeroCells[9], ctx.money(zeroRow.pnl) + " \u2014");
});

function housePrint() {
  return JSON.parse(fs.readFileSync(path.join(root, "house/house-snapshot.json"), "utf8"));
}

function sourceLabAttr(rowHtml, attr) {
  const span = rowHtml.match(/<span class="book-src-lab"[^>]*>/);
  assert.ok(span);
  const m = span[0].match(new RegExp("\\s" + attr + '="([^"]*)"'));
  assert.ok(m);
  return m[1]
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function mixCenter(html) {
  const m = String(html || "").match(/mix-center"><b>([^<]*)<\/b>/);
  return m ? m[1] : null;
}

function lotRow(symbol, name, extra) {
  return Object.assign({
    symbol: symbol,
    name: name,
    kind: "equity",
    qty: 1,
    value: 10,
    cost: 8,
    unrealized_pnl: 2
  }, extra || {});
}

function fixtureHouse(books) {
  function book(id, label, names) {
    return { id: id, label: label, equity: 40, cash: 0, names: names || [] };
  }
  return {
    accounts: {
      agentic: book("agentic", "AI WWIII", books.agentic),
      individual: book("individual", "Individual", books.individual),
      auto_grok: book("auto_grok", "Grok", books.auto_grok),
      joint: book("joint", "Deep Seek", books.joint)
    },
    combined: {}
  };
}

function bookCellText(html, symbol) {
  return tableRowsHtml(html, symbol).map(tdTexts);
}

test("cash is taken from cash names and stays null when none are tagged", function () {
  const ctx = boot();
  assert.equal(ctx.custodialFigures({ names: [{ symbol: "AA", kind: "equity", value: 3.004 }] }).cash, null);
  const figs = ctx.custodialFigures({
    names: [
      { symbol: "AA", kind: "equity", value: 3.004 },
      { symbol: "FCASH", kind: "cash", value: 1.004 }
    ]
  });
  assert.equal(figs.cash, 1.004);
  assert.ok(Math.abs(figs.held - 3.004) < 1e-6);

  const cashBook = {
    names: [{ symbol: "FCASH", name: "Cash", kind: "cash", value: 1.25, sleeve: "BNY", accounts: ["9999"] }],
    accounts: [{ name: "Brokerage", suffix: "9999", equity: 1.25 }]
  };
  const sleeves = ctx.buildFidelitySleeves(cashBook, {
    sleeves: { fidelity_bny: { cash: 1.25, equity: 1.25, label: "BNY" } }
  });
  assert.equal(sleeves.length, 1);
  assert.equal(sleeves[0].namesUnavailable, false);
  assert.ok(Math.abs(Number(sleeves[0].equity_value)) < 0.02);
  assert.ok(Math.abs(Number(sleeves[0].cash) - 1.25) < 0.02);
});

test("fixture keeps full-precision P&L, source labels, and a missing average", function () {
  const ctx = boot();
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-d.js"), "utf8"), ctx, { filename: "board-d.js" });
  const house = fixtureHouse({
    agentic: [
      lotRow("AAA", "Alpha", { qty: 1, value: 11.004, cost: 10, avg_cost: 10, unrealized_pnl: 1.004, unrealized_pnl_pct: 10.04 }),
      lotRow("EEE", "Echo", { qty: 2, value: 20, cost: 18, avg_cost: 9, unrealized_pnl: 2 }),
      lotRow("ZZZ", "Zed", { qty: 10, avg: 1.006, avg_cost: 1.006, value: 20, cost: 10.06, unrealized_pnl: 9.94, unrealized_pnl_pct: 98.81 })
    ],
    individual: [
      lotRow("AAA", "Alpha", { value: 11.004, cost: 10, avg_cost: 10, unrealized_pnl: 1.004 }),
      lotRow("BBB", "Bravo", { value: 5, cost: 4, avg_cost: 4, unrealized_pnl: 1 }),
      lotRow("CCC", "Charlie", { value: 8, cost: 7, avg_cost: 7, unrealized_pnl: 1 }),
      lotRow("GGG", "Golf", { qty: 4, value: 40, cost: 30, avg_cost: 7.5, avg: null, unrealized_pnl: 10 })
    ],
    auto_grok: [
      lotRow("CCC", "Charlie", { value: 8, cost: 7, unrealized_pnl: 1 }),
      lotRow("DDD", "Delta", { value: 6, cost: 5, unrealized_pnl: 1 }),
      lotRow("EEE", "Echo", { value: 10, cost: 9, unrealized_pnl: 1 })
    ],
    joint: [
      lotRow("CCC", "Charlie", { value: 8, cost: 7, unrealized_pnl: 1 }),
      lotRow("DDD", "Delta", { value: 6, cost: 5, unrealized_pnl: 1 }),
      lotRow("EEE", "Echo", { value: 10, cost: 9, unrealized_pnl: 1 })
    ]
  });
  const outside = {
    accounts: {
      fidelity: {
        id: "fidelity",
        equity: 30,
        names: [
          lotRow("BBB", "Bravo", { value: 5, cost: 4, sleeve: "BNY" }),
          lotRow("CCC", "Charlie", { value: 8, cost: 7, sleeve: "BNY" }),
          lotRow("DDD", "Delta", { value: 6, cost: 5, sleeve: "PER" }),
          lotRow("FFF", "Foxtrot", { value: 3, cost: 2, sleeve: "RSU" }),
          lotRow("HHH", "Hotel", { value: 4, cost: 3, sleeve: "BNY" }),
          { symbol: "HHH", name: "Hotel", kind: "equity", qty: 1, value: 4, sleeve: "PER" }
        ]
      },
      voya: { id: "voya", equity: 5, names: [{ symbol: "III", name: "India", kind: "equity", qty: 1, value: 5 }] }
    }
  };
  const snap = ctx.merge(house, null, outside);
  ctx.snap = snap;
  ctx.tab = "combined";
  const bookHtml = ctx.tableHtml(snap.combined.names, true);

  function summed(rows, roundAgentic) {
    let pnl = 0;
    let cost = 0;
    rows.forEach(function (n) {
      const copy = Object.assign({}, n);
      if (roundAgentic && n.account === "agentic" && copy.unrealized_pnl != null) copy.unrealized_pnl = ctx.rnd(copy.unrealized_pnl);
      const lot = ctx.lotPnl(copy);
      pnl += lot.pnl;
      cost += lot.cost;
    });
    return ctx.money(pnl) + " " + ctx.pct((pnl / cost) * 100);
  }
  const aaa = [];
  ["agentic", "individual"].forEach(function (id) {
    house.accounts[id].names.filter(function (n) { return n.symbol === "AAA"; }).forEach(function (n) {
      aaa.push(Object.assign({ account: id }, n));
    });
  });
  const full = summed(aaa, false);
  const rounded = summed(aaa, true);
  assert.notEqual(full, rounded);
  assert.equal(bookCellText(bookHtml, "AAA")[0][6], full);

  const zed = house.accounts.agentic.names.find(function (n) { return n.symbol === "ZZZ"; });
  const expectedZ = ctx.money(zed.unrealized_pnl) + " " + ctx.pct(zed.unrealized_pnl_pct);
  const roundedAvg = ctx.rnd(Number(zed.avg));
  const badPnl = Number(zed.value) - Number(zed.qty) * roundedAvg;
  const bad = ctx.money(badPnl) + " " + ctx.pct((badPnl / (Number(zed.qty) * roundedAvg)) * 100);
  assert.notEqual(expectedZ, bad);
  assert.equal(bookCellText(bookHtml, "ZZZ")[0][6], expectedZ);

  function labelOf(symbol) {
    return bookCellText(bookHtml, symbol).map(function (c) { return c[1]; });
  }
  assert.deepEqual(labelOf("BBB"), ["Brokerage · Individual"]);
  assert.deepEqual(labelOf("CCC"), ["Brokerage · Individual +2"]);
  assert.deepEqual(labelOf("DDD"), ["Personal · Grok +1"]);
  assert.deepEqual(labelOf("EEE"), ["AI WWIII · Grok +1"]);
  assert.deepEqual(labelOf("FFF"), ["RSU"]);
  assert.equal(labelOf("FFF")[0].indexOf("·"), -1);
  ["CCC", "DDD", "EEE"].forEach(function (symbol) {
    const row = tableRowHtml(bookHtml, symbol);
    const visible = tdTexts(row)[1];
    const fullTitle = sourceLabAttr(row, "title");
    assert.equal(sourceLabAttr(row, "aria-label"), fullTitle);
    assert.match(visible, /\+\d+$/);
    assert.notEqual(visible, fullTitle);
    assert.equal(visible.indexOf("\u00b7\u00b7\u00b7"), -1);
    assert.equal(fullTitle.indexOf("\u00b7\u00b7\u00b7"), -1);
  });
  assert.equal(sourceLabAttr(tableRowHtml(bookHtml, "CCC"), "title"), "Brokerage · Individual · Grok · Deep Seek");
  assert.equal(sourceLabAttr(tableRowHtml(bookHtml, "DDD"), "title"), "Personal · Grok · Deep Seek");
  assert.equal(sourceLabAttr(tableRowHtml(bookHtml, "EEE"), "title"), "AI WWIII · Grok · Deep Seek");

  const golf = house.accounts.individual.names.find(function (n) { return n.symbol === "GGG"; });
  assert.equal(golf.avg, null);
  assert.equal(Number.isFinite(Number(golf.avg_cost)), true);
  const expectedAvg = ctx.money(ctx.displayAvg(golf));
  assert.notEqual(expectedAvg, "\u2014");
  assert.equal(bookCellText(bookHtml, "GGG")[0][3], expectedAvg);

  const hotel = bookCellText(bookHtml, "HHH");
  assert.equal(hotel.length, 2);
  const hotelKnown = hotel.find(function (c) { return c[1] === "Brokerage"; });
  const hotelMissing = hotel.find(function (c) { return c[1] === "Personal"; });
  assert.ok(hotelKnown && hotelMissing);
  assert.match(hotelKnown[6], /\$/);
  assert.notEqual(hotelKnown[6], "\u2014");
  assert.equal(hotelMissing[6], "\u2014");
  assert.equal(hotelMissing[6].indexOf("$0.00"), -1);
});

test("live rows render the full-precision P&L sum rounded only at display", function () {
  const ctx = boot();
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-d.js"), "utf8"), ctx, { filename: "board-d.js" });
  const house = housePrint();
  const print = fidelityPrint();
  const snap = ctx.merge(house, null, print);
  ctx.snap = snap;
  ctx.tab = "combined";
  const bookHtml = ctx.tableHtml(snap.combined.names, true);

  function contributors(symbol) {
    const rows = [];
    ["agentic", "individual", "auto_grok", "joint"].forEach(function (id) {
      (((house.accounts || {})[id] || {}).names || []).forEach(function (n) {
        if (String(n.symbol || "").toUpperCase() === symbol) rows.push(Object.assign({ account: id }, n));
      });
    });
    ((((print.accounts || {}).fidelity || {}).names) || []).forEach(function (n) {
      if (String(n.symbol || "").toUpperCase() === symbol) rows.push(Object.assign({ account: "fidelity" }, n));
    });
    return rows.filter(function (n) { return ctx.knownRowCost(n) != null; });
  }
  function summed(rows) {
    let pnl = 0;
    let cost = 0;
    rows.forEach(function (n) {
      const lot = ctx.lotPnl(n);
      pnl += lot.pnl;
      cost += lot.cost;
    });
    return ctx.money(pnl) + " " + ctx.pct((pnl / cost) * 100);
  }

  const symbols = {};
  ["agentic", "individual", "auto_grok", "joint"].forEach(function (id) {
    (((house.accounts || {})[id] || {}).names || []).forEach(function (n) {
      symbols[String(n.symbol || "").toUpperCase()] = true;
    });
  });
  ((print.accounts.fidelity || {}).names || []).forEach(function (n) {
    symbols[String(n.symbol || "").toUpperCase()] = true;
  });

  let checked = 0;
  Object.keys(symbols).forEach(function (symbol) {
    const rows = contributors(symbol);
    if (!rows.length) return;
    const shown = bookCellText(bookHtml, symbol);
    if (shown.length !== 1) return;
    assert.equal(shown[0][6], summed(rows));
    checked += 1;
  });
  assert.ok(checked > 0);

  const labs = bookHtml.match(/<span class="book-src-lab"[^>]*>[^<]*<\/span>/g) || [];
  assert.ok(labs.length > 0);
  labs.forEach(function (span) {
    const row = "<tr><td></td><td>" + span + "</td></tr>";
    const title = sourceLabAttr(row, "title");
    const aria = sourceLabAttr(row, "aria-label");
    const visible = span.replace(/<[^>]+>/g, "").trim();
    assert.equal(aria, title);
    if (/\+\d+$/.test(visible)) {
      assert.notEqual(visible, title);
      assert.equal(visible.indexOf("\u00b7\u00b7\u00b7"), -1);
    }
  });
});

test("mix center sums full-precision parts and matches the book equity", function () {
  const ctx = boot();
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-d.js"), "utf8"), ctx, { filename: "board-d.js" });

  function deskFor(outside) {
    const house = fixtureHouse({});
    const snap = ctx.merge(house, null, outside);
    ctx.snap = snap;
    return snap;
  }

  const page = deskFor({
    accounts: {
      fidelity: {
        id: "fidelity",
        equity: 2.008,
        names: [
          { symbol: "AA", name: "A", kind: "equity", qty: 1, value: 1.004, cost: 1, sleeve: "Trad", accounts: ["1111"] },
          { symbol: "BB", name: "B", kind: "equity", qty: 1, value: 1.004, cost: 1, sleeve: "Roth", accounts: ["2222"] }
        ],
        accounts: [
          { name: "Traditional IRA", suffix: "1111", equity: 1.004 },
          { name: "Roth IRA", suffix: "2222", equity: 1.004 }
        ]
      },
      voya: { id: "voya", equity: 0, names: [] }
    }
  });
  ctx.tab = "fidelity";
  const pageHtml = ctx.fidelityDeskHtml();
  const roundedPage = ctx.rnd(1.004) + ctx.rnd(1.004);
  assert.notEqual(ctx.money(roundedPage), ctx.money(2.008));
  assert.equal(mixCenter(pageHtml), ctx.money(2.008));
  assert.equal(mixCenter(pageHtml), kpiValue(pageHtml, "Equity"));
  assert.match(pageHtml, moneyPattern(ctx, ctx.rnd(1.004)));
  assert.equal((page.accounts.fidelity.sleeves || []).length >= 2, true);

  const sleeveSnap = deskFor({
    accounts: {
      fidelity: {
        id: "fidelity",
        equity: 2.008,
        names: [
          { symbol: "QQQ", name: "Q", kind: "equity", qty: 1, value: 1.004, cost: 1, sleeve: "BNY", accounts: ["3333"] },
          { symbol: "CASHX", name: "Cash", kind: "cash", value: 1.004, sleeve: "BNY", accounts: ["3333"] }
        ],
        accounts: [{ name: "Brokerage", suffix: "3333", equity: 2.008 }]
      },
      voya: { id: "voya", equity: 0, names: [] }
    },
    sleeves: { fidelity_bny: { id: "fidelity_bny", label: "BNY", equity: 2.008, cash: 1.004 } }
  });
  const sleeve = (sleeveSnap.accounts.fidelity.sleeves || [])[0];
  assert.ok(sleeve);
  ctx.tab = "fid-" + sleeve.id;
  const sleeveHtml = ctx.fidelitySleeveDeskHtml();
  const roundedSleeve = ctx.rnd(1.004) + ctx.rnd(1.004);
  assert.notEqual(ctx.money(roundedSleeve), ctx.money(2.008));
  assert.equal(mixCenter(sleeveHtml), ctx.money(2.008));
  assert.equal(mixCenter(sleeveHtml), kpiValue(sleeveHtml, "Equity"));
  assert.match(sleeveHtml, moneyPattern(ctx, ctx.rnd(1.004)));
});

test("live mix centers match each book equity to the cent", function () {
  const ctx = boot();
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-d.js"), "utf8"), ctx, { filename: "board-d.js" });
  const snap = ctx.merge(housePrint(), null, fidelityPrint());
  ctx.snap = snap;

  function expectCenter(html, equity) {
    const center = mixCenter(html);
    if (!center) return;
    assert.equal(center, ctx.money(equity));
    const kpi = html.match(/<span>Equity<\/span><b[^>]*>([^<]*)/);
    if (kpi) assert.equal(center, kpi[1]);
  }

  ctx.tab = "combined";
  expectCenter(ctx.mixHtml(snap.combined, "combined"), snap.combined.equity);
  ctx.tab = "robinhood";
  expectCenter(ctx.stateHtml(snap.robinhood, "Robinhood") + ctx.mixHtml(snap.robinhood, "combined"), snap.robinhood.equity);
  ["agentic", "individual", "auto_grok", "joint"].forEach(function (id) {
    ctx.tab = id;
    const book = snap.accounts[id];
    const html = id === "agentic" ? ctx.agenticOnlyHtml() : (ctx.stateHtml(book, id) + ctx.mixHtml(book, id));
    expectCenter(html, book.equity);
  });
  ctx.tab = "fidelity";
  expectCenter(ctx.fidelityDeskHtml(), snap.accounts.fidelity.equity);
  ctx.tab = "voya";
  expectCenter(ctx.voyaDeskHtml(), snap.accounts.voya.equity);
  (snap.accounts.fidelity.sleeves || []).forEach(function (s) {
    if (!(Number(s.equity) > 0.004)) return;
    ctx.tab = "fid-" + s.id;
    expectCenter(ctx.fidelitySleeveDeskHtml(), s.equity);
  });
});
