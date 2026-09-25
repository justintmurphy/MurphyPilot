"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const storeKey = "murphyHouseRetirement";

/* Synthetic file. Not the saved retirement.json figures. */
function fileA(over) {
  const o = {
    version: 1,
    ssa62: 1000,
    ssa67: 1500,
    ssa70: 2000,
    salary: 80000,
    salary_year: 2026,
    raise_pct: 1,
    emp_pct: 6,
    match_pct: 6,
    filing: "MFJ",
    partb_people: 2,
    birth_ym: "1980-06",
    state: "PA",
    nominal_return_pct: 5,
    inflation_pct: 2.5
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function boot() {
  const mem = new Map();
  const localStorage = {
    getItem: function (k) { return mem.has(k) ? mem.get(k) : null; },
    setItem: function (k, v) { mem.set(k, String(v)); },
    removeItem: function (k) { mem.delete(k); }
  };
  const location = { hash: "", pathname: "/", search: "" };
  const history = {
    replaceState: function (_s, _t, url) {
      location.hash = "";
      location._url = url;
    }
  };
  const document = {
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    documentElement: { setAttribute: function () {} }
  };
  const sandbox = {
    localStorage: localStorage,
    document: document,
    location: location,
    history: history,
    console: console,
    atob: atob,
    TextDecoder: TextDecoder,
    fetch: function () { return new Promise(function () {}); },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    navigator: { userAgent: "node" }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function () {};
  sandbox.removeEventListener = function () {};
  sandbox.matchMedia = function () {
    return { addEventListener: function () {}, addListener: function () {} };
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-a.js"), "utf8"), sandbox, { filename: "board-a.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "house/js/board-b.js"), "utf8"), sandbox, { filename: "board-b.js" });
  return sandbox;
}

function useFile(ctx, raw) {
  ctx.RET_SAVED = ctx.retParseSaved(raw);
  assert.ok(ctx.RET_SAVED, "fixture file should parse");
}

function stored(ctx) {
  const raw = ctx.localStorage.getItem(storeKey);
  return raw ? JSON.parse(raw) : null;
}

function seed(ctx, obj) {
  ctx.localStorage.setItem(storeKey, JSON.stringify(obj));
}

function fakeCard(vals) {
  const inputs = {};
  Object.keys(vals).forEach(function (k) {
    inputs[k] = { value: String(vals[k]), setAttribute: function () {}, style: {} };
  });
  return {
    querySelector: function (sel) {
      const m = /data-ret-in="([^"]+)"/.exec(sel);
      if (m) return inputs[m[1]] || { value: "" };
      return null;
    },
    querySelectorAll: function () { return []; },
    inputs: inputs
  };
}

function cardFrom(state, over) {
  const vals = {
    nominal: state.nominalPct,
    infl: state.inflPct,
    raise: state.raisePct,
    ee: state.eePct,
    match: state.matchPct,
    extra: state.extraMonthly,
    monthly: "",
    salary: state.salary == null ? "" : state.salary,
    ss62: state.ss62 == null ? "" : state.ss62,
    ss67: state.ss67 == null ? "" : state.ss67,
    ss70: state.ss70 == null ? "" : state.ss70,
    retireAge: state.retireAge,
    filing: state.filing,
    partBPeople: "",
    extra401k: state.extra401kPct || 0
  };
  if (over) Object.keys(over).forEach(function (k) { vals[k] = over[k]; });
  return fakeCard(vals);
}

test("fresh profile fills SS, salary, and totals from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  const d = ctx.retLoad();
  assert.equal(d.salary, 80000);
  assert.equal(d.salaryYear, 2026);
  assert.equal(d.ss62, 1000);
  assert.equal(d.ss67, 1500);
  assert.equal(d.ss70, 2000);
  assert.equal(d.birthMonth, 6);
  assert.equal(d.birthYear, 1980);
  assert.equal(d.filing, "mfj");
  assert.equal(d.nominalPct, 5);
  assert.equal(d.inflPct, 2.5);
  assert.equal(d.partBPeople, null);
  assert.equal(ctx.retPartBCount(d), 2);
  assert.equal(ctx.retSsMonthly(62, d), 1000);
  assert.equal(ctx.retSsMonthly(67, d), 1500);
  assert.equal(ctx.retSsMonthly(70, d), 2000);
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const view = ctx.retView(d);
  const cola = ctx.retYearFactor(ctx.retTodayNy().year, d.birthYear + d.retireAge, d.inflPct);
  assert.ok(Math.abs(view.ss - 1500 * cola) < 0.01);
  assert.ok(view.income != null && isFinite(view.income));
  assert.ok(view.total != null && isFinite(view.total));
  assert.ok(Math.abs(view.total - (view.income + view.ss)) < 0.001);
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  assert.match(ctx.retSavedUrl(), /retirement\.json\?v=20260904bv$/);
});

test("slider touch does not pin salary, so a later file salary shows without Reset", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = { robinhood: { equity: 10000, label: "Robinhood" }, accounts: {}, combined: { cashflow_30d: { owner_deposits: 100 } } };
  let state = ctx.retLoad();
  const card = cardFrom(state, { retireAge: "64", monthly: "100", extra401k: "1.5" });
  state = ctx.retRead(card);
  ctx.retSave(state);
  const saved = stored(ctx);
  assert.ok(saved);
  assert.equal(saved.retireAge, 64);
  assert.equal(saved.extra401kPct, 1.5);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "salary"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "salaryYear"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "ss67"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "birthYear"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(saved, "monthly"), false);
  assert.deepEqual(saved._edited.slice().sort(), ["extra401kPct", "retireAge"]);
  useFile(ctx, fileA({ salary: 90000, salary_year: 2026 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.retireAge, 64);
  assert.equal(state.extra401kPct, 1.5);
  assert.equal(state.ss67, 1500);
});

test("an explicit salary edit survives a later file change", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  ctx.retSave(state);
  const saved = stored(ctx);
  assert.equal(saved.salary, 123456);
  assert.equal(saved.salaryYear, null);
  assert.ok(saved._edited.indexOf("salary") >= 0);
  assert.ok(saved._edited.indexOf("salaryYear") >= 0);
  useFile(ctx, fileA({ salary: 90000 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 123456);
  assert.equal(state.salaryYear, null);
  assert.equal(state.ss62, 1000);
});

test("old null blob and old full snapshot both fill from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, { ss62: null, ss67: null, ss70: null, salary: null, monthly: null });
  let state = ctx.retLoad();
  assert.equal(state.ss62, 1000);
  assert.equal(state.ss67, 1500);
  assert.equal(state.ss70, 2000);
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.monthly, null);
  assert.equal(ctx.localStorage.getItem(storeKey), null);

  seed(ctx, {
    realPct: 5, inflPct: 2.5, raisePct: 1, eePct: 6, matchPct: 6,
    extraMonthly: 0, monthly: null, salary: 55555, salaryYear: 2020,
    ss62: null, ss67: null, ss70: null,
    retireAge: 67, birthMonth: 6, birthYear: 1980,
    filing: "mfj", statePct: 0, partBPeople: 2, extra401kPct: 0
  });
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.ss67, 1500);
  assert.equal(state.retireAge, 67);
  assert.equal(state.birthYear, 1980);
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
  assert.equal(ctx.localStorage.getItem(storeKey), null);

  seed(ctx, {
    realPct: 5, inflPct: 2.5, raisePct: 1, eePct: 6, matchPct: 6, statePct: 0,
    extraMonthly: 0, salary: 55555, salaryYear: 2020,
    ss62: 1000, ss67: 1500, ss70: 2000,
    retireAge: 64, birthMonth: 6, birthYear: 1980,
    filing: "mfj", partBPeople: 2, extra401kPct: 0, monthly: null
  });
  state = ctx.retLoad();
  assert.equal(state.retireAge, 64);
  assert.equal(state.salary, 80000);
  assert.equal(state.ss67, 1500);
  let blob = stored(ctx);
  assert.deepEqual(blob._edited, ["retireAge"]);
  useFile(ctx, fileA({ salary: 90000, ssa67: 1600 }));
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.ss67, 1600);
  assert.equal(state.retireAge, 64);

  seed(ctx, {
    salary: 55555, ss67: 3333, ss62: null, ss70: "",
    birthMonth: 7, birthYear: 1971, realPct: 8, real_return_pct: 8
  });
  state = ctx.retLoad();
  assert.equal(state.salary, 90000);
  assert.equal(state.ss67, 3333);
  assert.equal(state.ss62, 1000);
  assert.equal(state.ss70, 2000);
  assert.equal(state.birthMonth, 7);
  assert.equal(state.birthYear, 1971);
  assert.equal(state.nominalPct, 5);
  blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "salary"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "realPct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "real_return_pct"), false);
  assert.ok(blob._edited.indexOf("ss67") >= 0);
  assert.ok(blob._edited.indexOf("birthYear") >= 0);
});

test("legacy single ss field migrates and a numeric override wins", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, { ss: 3333 });
  let state = ctx.retLoad();
  assert.equal(state.ss67, 3333);
  assert.equal(state.ss62, 1000);
  assert.ok(stored(ctx)._edited.indexOf("ss67") >= 0);

  seed(ctx, { ss62: 2222, _edited: ["ss62"] });
  state = ctx.retLoad();
  assert.equal(state.ss62, 2222);
  assert.equal(state.ss67, 1500);
  assert.equal(state.salary, 80000);
});

test("clearing a file-backed input reverts to the default", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = { accounts: {}, combined: {} };
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  ctx.retSave(state);
  const card = cardFrom(ctx.retLoad(), { salary: "" });
  ctx.retCommit(card);
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(card.inputs.salary.value, "80000");
  assert.equal(ctx.localStorage.getItem(storeKey), null);
});

test("Part B follows filing unless this browser set it", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  assert.equal(ctx.retPartBCount(state), 2);
  state.filing = "single";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.filing, "single");
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 1);
  const blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "partBPeople"), false);
  assert.ok(blob._edited.indexOf("filing") >= 0);
  state.partBPeople = 2;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 2);
  assert.equal(ctx.retPartBCount(state), 2);
  useFile(ctx, fileA({ partb_people: 1 }));
  state = ctx.retLoad();
  assert.equal(ctx.retPartBCount(state), 2);

  ctx.retClear();
  useFile(ctx, fileA());
  state = ctx.retLoad();
  state.partBPeople = 1;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  state.filing = "single";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  assert.equal(ctx.retPartBCount(state), 1);
  state.filing = "mfj";
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, 1);
  assert.equal(ctx.retPartBCount(state), 1);
  state.partBPeople = 2;
  ctx.retSave(state);
  state = ctx.retLoad();
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
});

test("Reset to saved clears every override", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  let state = ctx.retLoad();
  state.salary = 123456;
  state.salaryYear = null;
  state.retireAge = 64;
  state.ss62 = 2222;
  state.filing = "single";
  state.partBPeople = 2;
  ctx.retSave(state);
  assert.ok(ctx.localStorage.getItem(storeKey));
  ctx.retClear();
  assert.equal(ctx.localStorage.getItem(storeKey), null);
  state = ctx.retLoad();
  assert.equal(state.salary, 80000);
  assert.equal(state.salaryYear, 2026);
  assert.equal(state.retireAge, 67);
  assert.equal(state.ss62, 1000);
  assert.equal(state.filing, "mfj");
  assert.equal(state.partBPeople, null);
  assert.equal(ctx.retPartBCount(state), 2);
});

test("#ret= prefill merges as explicit overrides and strips the hash", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  seed(ctx, {
    salary: 55555, ss62: null, ss67: null, ss70: null,
    realPct: 5, retireAge: 67, filing: "mfj"
  });
  const payload = Buffer.from(JSON.stringify({
    ssa67: 1800,
    salary: 66000,
    filing: "single",
    birth_ym: "1981-03",
    partb: 2
  })).toString("base64url");
  ctx.location.hash = "#ret=" + payload;
  ctx.retConsumeRetHash();
  assert.equal(ctx.location.hash, "");
  const state = ctx.retLoad();
  assert.equal(state.ss67, 1800);
  assert.equal(state.salary, 66000);
  assert.equal(state.salaryYear, null);
  assert.equal(state.filing, "single");
  assert.equal(state.birthYear, 1981);
  assert.equal(state.birthMonth, 3);
  assert.equal(ctx.retPartBCount(state), 2);
  const blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "ss62"), false);
  assert.ok(blob._edited.indexOf("salary") >= 0);
  assert.equal(blob.retireAge, undefined);
});

/* Small synthetic federal table. Not the shipped brackets. */
function federalFixture(over) {
  const o = {
    tax_year: 2026,
    source: "IRS / CMS",
    checked: "2026-09-25",
    brackets: {
      single: [
        { up_to: 10000, rate: 0.1 },
        { up_to: null, rate: 0.2 }
      ],
      mfj: [
        { up_to: 20000, rate: 0.1 },
        { up_to: null, rate: 0.2 }
      ]
    },
    standard_deduction: { single: 5000, mfj: 10000 },
    additional_deduction_65: { single: 1000, mfj: 800 },
    ss_thresholds: { single: [25000, 34000], mfj: [32000, 44000], unindexed: true },
    part_b_monthly: 100,
    deferral_limit: 20000,
    catchup_50: 5000,
    catchup_60_63: 7000
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function taxRules(over) {
  const o = {
    version: 1,
    tax_year: 2026,
    state: "PA",
    pit_rate: 0.0307,
    retirement_401k_exempt_after_59_5: true,
    ss_exempt: true,
    employee_401k_contrib_state_deductible: false,
    source: "PA Department of Revenue",
    checked: "2026-09-25",
    federal: federalFixture()
  };
  if (over) Object.keys(over).forEach(function (k) { o[k] = over[k]; });
  return o;
}

function textCard() {
  const els = {};
  function el(name) {
    if (!els[name]) {
      els[name] = {
        textContent: "",
        innerHTML: "",
        hidden: false,
        value: "0",
        style: {},
        setAttribute: function (k, v) {
          this[k] = v;
          if (k === "hidden") this.hidden = true;
        },
        removeAttribute: function (k) {
          if (k === "hidden") this.hidden = false;
        },
        getAttribute: function (k) { return this[k]; }
      };
    }
    return els[name];
  }
  return {
    els: els,
    querySelector: function (sel) {
      const named = /data-ret="([^"]+)"/.exec(sel);
      if (named) return el(named[1]);
      const input = /data-ret-in="([^"]+)"/.exec(sel);
      if (input) return el("in:" + input[1]);
      return null;
    },
    querySelectorAll: function () { return []; }
  };
}

test("retirement draw at 67 and Social Security are state-tax exempt", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const parsed = ctx.retParseTax(taxRules());
  assert.ok(parsed);
  ctx.RET_TAX = parsed;
  const summary = ctx.retTaxSummary();
  assert.equal(summary.line, "PA 3.07% (retirement income exempt)");
  assert.equal(summary.asof, "checked 2026-09-25");
  assert.match(ctx.retTaxUrl(), /tax-rules\.json\?v=20260904bv$/);
  assert.match(String(ctx.retFetchJson), /no-store/);

  const state = ctx.retLoad();
  const draw = 2000;
  const ss = 800;
  const years = 15;
  const exempt = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.equal(ctx.retStateTax(draw * 12, ss * 12, 67), 0);

  ctx.RET_TAX = ctx.retParseTax(taxRules({ retirement_401k_exempt_after_59_5: false }));
  const taxedDraw = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.ok(Math.abs((exempt - taxedDraw) - draw * parsed.pitRate) < 0.02);

  ctx.RET_TAX = ctx.retParseTax(taxRules({ ss_exempt: false }));
  const taxedSs = ctx.retTakeHome(draw, ss, state, years, 67);
  assert.ok(Math.abs((exempt - taxedSs) - ss * parsed.pitRate) < 0.02);

  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const youngTax = ctx.retStateTax(draw * 12, 0, 55);
  assert.ok(Math.abs(youngTax - draw * 12 * parsed.pitRate) < 0.02);
});

test("extra 401k cost keeps the state rate when contributions are not deductible", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const state = ctx.retLoad();
  state.extra401kPct = 2;
  state.retireAge = 67;
  const view = ctx.retView(state);
  const parsed = ctx.retParseTax(taxRules());
  ctx.RET_TAX = parsed;
  const plain = ctx.retExtra401k(state, view);
  ctx.RET_TAX = ctx.retParseTax(taxRules({ employee_401k_contrib_state_deductible: true }));
  const ded = ctx.retExtra401k(state, view);
  const salary = ctx.retSalaryNow(state);
  const limit = ctx.retDeferralLimit(state.birthYear, ctx.retTodayNy().year);
  const extraPct = plain.extraPct;
  const baseEmp = Math.min(salary * (state.eePct / 100), limit);
  const withEmp = Math.min(salary * ((state.eePct + extraPct) / 100), limit);
  const extraAnnual = Math.max(0, withEmp - baseEmp);
  const marginal = ctx.retMarginalRate(salary - parsed.federal.standardDeduction.mfj, "mfj");
  const federalOnly = extraAnnual / 12 * (1 - marginal);
  const reduced = extraAnnual / 12 * Math.max(0, 1 - marginal - parsed.pitRate);
  assert.ok(extraAnnual > 0);
  assert.ok(Math.abs(plain.cost - federalOnly) < 0.05);
  assert.ok(Math.abs(ded.cost - reduced) < 0.05);
  assert.ok(Math.abs((plain.cost - ded.cost) - (extraAnnual / 12 * parsed.pitRate)) < 0.05);
});

test("missing or malformed tax rules add no state tax and no line", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.retParseTax(null), null);
  assert.equal(ctx.retParseTax({ version: 2, state: "PA", pit_rate: 0.0307, retirement_401k_exempt_after_59_5: true, ss_exempt: true, employee_401k_contrib_state_deductible: false }), null);
  assert.equal(ctx.retParseTax({ version: 1, state: "PA" }), null);
  ctx.RET_TAX = null;
  assert.equal(ctx.retTaxSummary(), null);
  const state = ctx.retLoad();
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
  assert.equal(ctx.retStateTax(24000, 9600, 67), 0);
  assert.equal(ctx.retFederalRulesLine(), "");
});

test("old state percent blobs are dropped", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const state = ctx.retLoad();
  const before = ctx.retTakeHome(2000, 800, state, 15, 67);
  seed(ctx, { statePct: 8, state_pct: 8, _edited: ["statePct", "state_pct", "retireAge"], retireAge: 64 });
  const loaded = ctx.retLoad();
  assert.equal(loaded.retireAge, 64);
  const blob = stored(ctx);
  assert.ok(blob);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "statePct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "state_pct"), false);
  assert.deepEqual(blob._edited, ["retireAge"]);
  assert.equal(ctx.retTakeHome(2000, 800, loaded, 15, 67), before);
  seed(ctx, { statePct: 8, state_pct: 5, salary: null, ss62: null, ss67: null, ss70: null });
  const again = ctx.retLoad();
  assert.equal(again.salary, 80000);
  assert.equal(ctx.localStorage.getItem(storeKey), null);
});

test("brackets and the standard deduction come from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const state = ctx.retLoad();
  state.inflPct = 0;
  function take(federal) {
    ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: federal }));
    return ctx.retTakeHome(5000, 0, state, 0, 60);
  }
  const baseFed = federalFixture();
  const base = take(baseFed);
  const wider = federalFixture();
  wider.standard_deduction = { single: 5000, mfj: 40000 };
  const withWider = take(wider);
  const steeper = federalFixture();
  steeper.brackets = {
    single: baseFed.brackets.single,
    mfj: [
      { up_to: 20000, rate: 0.1 },
      { up_to: null, rate: 0.5 }
    ]
  };
  const withSteeper = take(steeper);
  assert.ok(base > 0 && withWider > base);
  assert.ok(withSteeper < base);
  const shipped = ctx.retParseTax(JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8")));
  assert.equal(shipped.federal.standardDeduction.single, 16100);
  assert.equal(shipped.federal.standardDeduction.mfj, 32200);
  assert.equal(shipped.federal.brackets.single.length, 7);
  assert.equal(shipped.federal.brackets.mfj[6].upTo, null);
  assert.equal(shipped.federal.brackets.mfj[6].rate, 0.37);
  ctx.RET_TAX = shipped;
  assert.equal(ctx.retFederalRulesLine(), "Tax rules: 2026 (checked Sep 25)");
});

test("super catch-up applies at age 61", function () {
  const ctx = boot();
  const raw = JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8"));
  ctx.RET_TAX = ctx.retParseTax(raw);
  const fed = ctx.RET_TAX.federal;
  const year = 2026;
  assert.equal(fed.catchup6063, 11250);
  assert.equal(ctx.retDeferralLimit(year - 61, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 60, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 63, year), fed.deferralLimit + fed.catchup6063);
  assert.equal(ctx.retDeferralLimit(year - 59, year), fed.deferralLimit + fed.catchup50);
  assert.equal(ctx.retDeferralLimit(year - 64, year), fed.deferralLimit + fed.catchup50);
  assert.equal(ctx.retDeferralLimit(year - 49, year), fed.deferralLimit);
  raw.federal.catchup_60_63 = 11111;
  ctx.RET_TAX = ctx.retParseTax(raw);
  assert.equal(ctx.retDeferralLimit(year - 61, year), raw.federal.deferral_limit + 11111);
});

test("a missing federal block dashes take-home, extra 401k cost, and the cap", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const rules = taxRules();
  delete rules.federal;
  ctx.RET_TAX = ctx.retParseTax(rules);
  assert.ok(ctx.RET_TAX);
  assert.equal(ctx.RET_TAX.federal, null);
  assert.equal(ctx.retTaxSummary().line, "PA 3.07% (retirement income exempt)");
  const state = ctx.retLoad();
  state.extra401kPct = 2;
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
  assert.equal(ctx.retDeferralLimit(state.birthYear, 2026), null);
  const view = ctx.retView(state);
  assert.equal(view.take, null);
  const extra = ctx.retExtra401k(state, view);
  assert.equal(extra.cost, null);
  assert.equal(extra.capKnown, false);
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els.take.textContent, "\u2014");
  assert.equal(card.els["extra401k-cap"].textContent, "\u2014");
  assert.equal(card.els["extra401k-cap"].hidden, false);
  assert.match(card.els["extra401k-stats"].innerHTML, /Paycheck cost <b>\u2014\/mo<\/b>/);
  assert.equal(card.els["tax-rules"].textContent, "");
  assert.equal(card.els["tax-rules"].hidden, true);
  assert.equal(card.els["partb-hint"].textContent.indexOf("$"), -1);
  const broken = taxRules({ federal: { tax_year: 2026 } });
  ctx.RET_TAX = ctx.retParseTax(broken);
  assert.equal(ctx.RET_TAX.federal, null);
  assert.equal(ctx.retTakeHome(2000, 800, state, 15, 67), null);
});

test("Social Security thresholds come from the file", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const state = ctx.retLoad();
  state.inflPct = 0;
  function taxable(thresholds) {
    const federal = federalFixture({
      ss_thresholds: {
        single: thresholds,
        mfj: thresholds,
        unindexed: true
      }
    });
    ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: federal }));
    return ctx.retTaxableSs(30000, 10000, "mfj", 1);
  }
  assert.equal(taxable([900000, 950000]), 0);
  assert.ok(taxable([1000, 2000]) > 0);
  ctx.RET_TAX = ctx.retParseTax(taxRules({
    federal: federalFixture({
      ss_thresholds: { single: [900000, 950000], mfj: [900000, 950000], unindexed: true }
    })
  }));
  const highTake = ctx.retTakeHome(2000, 1000, state, 0, 60);
  ctx.RET_TAX = ctx.retParseTax(taxRules({
    federal: federalFixture({
      ss_thresholds: { single: [1, 2], mfj: [1, 2], unindexed: true }
    })
  }));
  const lowTake = ctx.retTakeHome(2000, 1000, state, 0, 60);
  assert.ok(highTake > lowTake);
});

test("indexed brackets raise take-home and unindexed Social Security thresholds stay statutory", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  const state = ctx.retLoad();
  state.birthYear = 1980;
  state.retireAge = 67;
  state.inflPct = 2.5;
  const draw = 8000;
  const ss = 3000;
  function fed(flags) {
    return federalFixture(Object.assign({
      brackets_indexed: false,
      std_deduction_indexed: false,
      age65_addon_indexed: false,
      part_b_indexed: false,
      ss_thresholds_indexed: false
    }, flags));
  }
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed({
    brackets_indexed: true,
    std_deduction_indexed: true,
    age65_addon_indexed: true
  }) }));
  const indexed = ctx.retTakeHome(draw, ss, state, 21, 67);
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed({}) }));
  const flat = ctx.retTakeHome(draw, ss, state, 21, 67);
  assert.ok(indexed > flat);
  state.inflPct = 0;
  const flatZero = ctx.retTakeHome(draw, ss, state, 21, 67);
  state.inflPct = 10;
  const flatHigh = ctx.retTakeHome(draw, ss, state, 21, 67);
  assert.equal(flatZero, flatHigh);
  const scale = ctx.retYearFactor(2026, 2047, 2.5);
  assert.ok(scale > 1);
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed({}) }));
  const statutory = ctx.retTaxableSs(30000, 18000, "mfj", 1);
  const grownBases = ctx.retTaxableSs(30000, 18000, "mfj", scale);
  assert.ok(statutory > 0);
  assert.equal(grownBases, 0);
  state.inflPct = 2.5;
  const modestDraw = 2500;
  const modestSs = 1500;
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed({ ss_thresholds_indexed: true }) }));
  assert.equal(ctx.RET_TAX.federal.ssThresholds.indexed, true);
  const takeIndexedSs = ctx.retTakeHome(modestDraw, modestSs, state, 21, 67);
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed({ ss_thresholds_indexed: false }) }));
  assert.equal(ctx.RET_TAX.federal.ssThresholds.indexed, false);
  const takeStatutory = ctx.retTakeHome(modestDraw, modestSs, state, 21, 67);
  assert.ok(takeIndexedSs > takeStatutory);
  const shipped = ctx.retParseTax(JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8")));
  assert.equal(shipped.federal.bracketsIndexed, true);
  assert.equal(shipped.federal.stdIndexed, true);
  assert.equal(shipped.federal.age65Indexed, true);
  assert.equal(shipped.federal.partBIndexed, true);
  assert.equal(shipped.federal.ssThresholds.indexed, false);
});

test("an old raise without an edit marker does not override the file", function () {
  const ctx = boot();
  useFile(ctx, fileA({ raise_pct: 4 }));
  seed(ctx, { raisePct: 1, raise_pct: 9, salary: 55555, realPct: 8, inflPct: 3 });
  let state = ctx.retLoad();
  assert.equal(state.raisePct, 4);
  assert.equal(state.salary, 80000);
  assert.equal(state.nominalPct, 5);
  assert.equal(state.inflPct, 3);
  let blob = stored(ctx);
  assert.ok(blob);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "raisePct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "raise_pct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "realPct"), false);
  assert.deepEqual(blob._edited, ["inflPct"]);

  seed(ctx, { raisePct: 7, _edited: ["raisePct"] });
  useFile(ctx, fileA({ raise_pct: 4 }));
  state = ctx.retLoad();
  assert.equal(state.raisePct, 7);
  blob = stored(ctx);
  assert.equal(blob.raisePct, 7);
});

test("growth hint is the after-inflation rate", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  assert.equal(ctx.retAfterInflationHint(5, 2.5), "\u2248 2.4% after inflation");
  assert.equal(ctx.retAfterInflationHint(6, 2.5), "\u2248 3.4% after inflation");
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const html = ctx.retirementHtml();
  assert.match(html, /Growth %\/yr \(before inflation\)/);
  assert.equal(html.indexOf("Growth after inflation"), -1);
  assert.equal(html.indexOf("today\u2019s dollars"), -1);
  assert.equal(html.indexOf("Nominal in"), -1);
  const state = ctx.retLoad();
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["growth-hint"].textContent, "\u2248 2.4% after inflation");
  state.nominalPct = 6;
  state.inflPct = 2.5;
  ctx.retFill(card, state);
  assert.equal(card.els["growth-hint"].textContent, "\u2248 3.4% after inflation");
  state.inflPct = 0;
  ctx.retFill(card, state);
  assert.equal(card.els["growth-hint"].textContent, "\u2248 6% after inflation");
});

test("migration drops real_return_pct even when it was edited", function () {
  const ctx = boot();
  const stale = fileA();
  delete stale.nominal_return_pct;
  stale.real_return_pct = 9;
  assert.equal(ctx.retParseSaved(stale), null);
  useFile(ctx, fileA({ nominal_return_pct: 5, real_return_pct: 9 }));
  assert.equal(ctx.RET_SAVED.nominalPct, 5);
  assert.equal(ctx.RET_SAVED.realPct, undefined);
  seed(ctx, {
    realPct: 8, real_return_pct: 9, inflPct: 3,
    _edited: ["realPct", "real_return_pct", "inflPct"]
  });
  let state = ctx.retLoad();
  assert.equal(state.nominalPct, 5);
  assert.equal(state.inflPct, 3);
  let blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "realPct"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "real_return_pct"), false);
  assert.deepEqual(blob._edited, ["inflPct"]);
  seed(ctx, { nominalPct: 8, _edited: ["nominalPct"] });
  useFile(ctx, fileA({ nominal_return_pct: 4 }));
  state = ctx.retLoad();
  assert.equal(state.nominalPct, 8);
  blob = stored(ctx);
  assert.equal(blob.nominalPct, 8);
});

test("the range band sits one point around nominal growth", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  const around = ctx.retBandRates(5);
  assert.equal(around.low, 4);
  assert.equal(around.high, 6);
  const floored = ctx.retBandRates(0.4);
  assert.equal(floored.low, 0);
  assert.equal(floored.high, 1.4);
  const state = ctx.retLoad();
  state.nominalPct = 5;
  state.retireAge = 67;
  const view = ctx.retView(state);
  assert.equal(view.band.low, 4);
  assert.equal(view.band.high, 6);
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["low-lab"].textContent, "Low 4%");
  assert.equal(card.els["high-lab"].textContent, "High 6%");
  state.nominalPct = 7;
  ctx.retFill(card, state);
  assert.equal(card.els["low-lab"].textContent, "Low 6%");
  assert.equal(card.els["high-lab"].textContent, "High 8%");
  const html = ctx.retirementHtml();
  assert.equal(html.indexOf("Low 4%"), -1);
  assert.equal(html.indexOf("High 6%"), -1);
});

test("loan remaining balance counts payments since asof", function () {
  const ctx = boot();
  const loan = ctx.retParseLoan({
    balance: 1000, payment: 100, payments_per_year: 24, asof: "2026-03-01"
  });
  assert.ok(loan);
  const year = 365.2425 * 86400000;
  const at = ctx.retLoanStatus(loan, loan.asofMs);
  assert.equal(at.remaining, 1000);
  const one = ctx.retLoanStatus(loan, loan.asofMs + year / 24);
  assert.ok(Math.abs(one.remaining - 900) < 0.001);
  const five = ctx.retLoanStatus(loan, loan.asofMs + (5 * year) / 24);
  assert.ok(Math.abs(five.remaining - 500) < 0.001);
  const before = ctx.retLoanStatus(loan, loan.asofMs - year);
  assert.equal(before.remaining, 1000);
  assert.equal(ctx.retLoanStatus(loan, loan.asofMs + (10 * year) / 24), null);
  const partial = ctx.retParseLoan({
    balance: 250, payment: 100, payments_per_year: 12, asof: "2026-01-15"
  });
  const open = ctx.retLoanStatus(partial, partial.asofMs);
  assert.equal(open.slots, 3);
  assert.ok(Math.abs(open.lastAmt - 50) < 0.001);
});

test("loan payoff month is the last scheduled payment", function () {
  const ctx = boot();
  const loan = ctx.retParseLoan({
    balance: 240, payment: 100, payments_per_year: 12, asof: "2026-01-15"
  });
  const status = ctx.retLoanStatus(loan, loan.asofMs);
  assert.match(ctx.retLoanCopy(status), /^Loan repay: \$240\.00 left · paid off ~Apr 2026$/);
});

test("loan repayments add principal with no match and do not change the deferral cap", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const loan = ctx.retParseLoan({
    balance: 1200, payment: 100, payments_per_year: 12, asof: "2026-01-15"
  });
  const state = ctx.retLoad();
  state.retireAge = 67;
  state.extra401kPct = 2;
  function nest(match) {
    state.matchPct = match;
    ctx.RET_SAVED.loan = null;
    const plain = ctx.retView(state).mid.today;
    ctx.RET_SAVED.loan = loan;
    const withLoan = ctx.retView(state).mid.today;
    return withLoan - plain;
  }
  const unmatched = nest(0);
  const matched = nest(20);
  assert.ok(unmatched > 100);
  assert.ok(Math.abs(unmatched - matched) < 0.05);
  const view = ctx.retView(state);
  const cap = ctx.retDeferralLimit(state.birthYear, ctx.retTodayNy().year);
  const costWith = ctx.retExtra401k(state, view).cost;
  ctx.RET_SAVED.loan = null;
  const costWithout = ctx.retExtra401k(state, view).cost;
  assert.equal(ctx.retDeferralLimit(state.birthYear, ctx.retTodayNy().year), cap);
  assert.ok(Math.abs(costWith - costWithout) < 0.001);
  const tiny = federalFixture();
  tiny.deferral_limit = 1000;
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: tiny }));
  ctx.RET_SAVED.loan = null;
  const cappedPlain = ctx.retView(state).mid.today;
  ctx.RET_SAVED.loan = loan;
  const cappedLoan = ctx.retView(state).mid.today;
  assert.ok(Math.abs((cappedLoan - cappedPlain) - matched) < 0.05);
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["loan-line"].hidden, false);
  assert.match(card.els["loan-line"].textContent, /^Loan repay: /);
  const shown = ctx.retView(state).mid.monthlyShown;
  assert.equal(card.els["save-split"].hidden, false);
  assert.equal(card.els["save-split"].textContent, ctx.money(shown) + " savings + " + ctx.money(100) + " loan repay");
});

test("a missing or repaid loan adds nothing and is not stored", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  assert.equal(ctx.retParseLoan(null), null);
  assert.equal(ctx.retParseLoan({ balance: 100 }), null);
  assert.equal(ctx.RET_SAVED.loan, null);
  const state = ctx.retLoad();
  state.retireAge = 67;
  const plain = ctx.retView(state).mid.today;
  assert.equal(ctx.retLoanLine(), "");
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["loan-line"].textContent, "");
  assert.equal(card.els["loan-line"].hidden, true);
  assert.equal(card.els["save-split"].textContent, "");
  assert.equal(card.els["save-split"].hidden, true);
  const repaid = ctx.retParseLoan({
    balance: 100, payment: 100, payments_per_year: 12, asof: "2020-01-01"
  });
  ctx.RET_SAVED.loan = repaid;
  assert.equal(ctx.retLoanLine(), "");
  assert.equal(ctx.retView(state).mid.today, plain);
  ctx.RET_SAVED.loan = null;
  seed(ctx, { loan: { balance: 50, payment: 10 }, retireAge: 64, _edited: ["loan", "retireAge"] });
  const loaded = ctx.retLoad();
  assert.equal(loaded.retireAge, 64);
  const blob = stored(ctx);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "loan"), false);
  assert.deepEqual(blob._edited, ["retireAge"]);
  state.loan = { balance: 50 };
  ctx.retSave(state);
  const again = stored(ctx);
  if (again) assert.equal(Object.prototype.hasOwnProperty.call(again, "loan"), false);
});

test("total line says stocks plus 401k plus Social Security", function () {
  const ctx = boot();
  const both = ctx.retTotalCopy(1000, 250);
  assert.equal(both.sub, "stocks + 401k + SS");
  assert.equal(both.split, "$1,000.00 savings + $250.00 SS");
  const nestOnly = ctx.retTotalCopy(1000, null);
  assert.equal(nestOnly.sub, "stocks + 401k");
  assert.equal(nestOnly.split, "");
});

test("displayed nest and draw are nominal for the retirement year", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 0 } }
  };
  const state = ctx.retLoad();
  state.eePct = 0;
  state.matchPct = 0;
  state.extraMonthly = 0;
  state.nominalPct = 5;
  state.raisePct = 0;
  const years = 10;
  state.inflPct = 2.5;
  const withInfl = ctx.retProject(10000, state, years);
  state.inflPct = 0;
  const noInfl = ctx.retProject(10000, state, years);
  const grown = 10000 * Math.pow(1.05, years);
  assert.ok(Math.abs(withInfl.nominal - grown) < 0.05);
  assert.ok(Math.abs(noInfl.nominal - grown) < 0.05);
  assert.ok(Math.abs(withInfl.today - grown / Math.pow(1.025, years)) < 0.05);
  assert.ok(Math.abs(noInfl.today - grown) < 0.05);
  assert.ok(Math.abs(ctx.retIncome(withInfl.nominal) - grown * 0.04 / 12) < 0.001);
  state.inflPct = 2.5;
  state.salary = null;
  state.monthly = 0;
  const level = ctx.retProject(10000, state, years);
  assert.ok(Math.abs(level.nominal - grown) < 0.05);
  assert.ok(Math.abs(level.today - level.nominal / Math.pow(1.025, years)) < 0.05);
  const view = ctx.retView(state);
  assert.ok(Math.abs(view.income - view.mid.nominal * 0.04 / 12) < 0.001);
  assert.ok(view.low.nominal < view.mid.nominal && view.mid.nominal < view.high.nominal);
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els.nest.textContent, ctx.money(view.mid.nominal));
  assert.equal(card.els.income.textContent, ctx.money(view.income));
  assert.equal(card.els.low.textContent, ctx.money(view.low.nominal));
  assert.equal(card.els.high.textContent, ctx.money(view.high.nominal));
  assert.equal(card.els["today-line"].textContent, "about " + ctx.money(view.mid.today) + " in today\u2019s dollars");
  assert.equal(card.els["today-line"].hidden, false);
});

test("Social Security COLA compounds inflation to the retirement year", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const factor = ctx.retYearFactor(2026, 2046, 2.5);
  assert.ok(Math.abs(factor - Math.pow(1.025, 20)) < 1e-9);
  assert.equal(ctx.retYearFactor(2046, 2026, 2.5), 1);
  const state = ctx.retLoad();
  const todayY = ctx.retTodayNy().year;
  state.birthYear = todayY - 40;
  state.birthMonth = 1;
  state.retireAge = 67;
  const gap = (state.birthYear + state.retireAge) - todayY;
  const view = ctx.retView(state);
  assert.equal(ctx.retSsMonthly(67, state), 1500);
  assert.ok(Math.abs(view.ss - 1500 * Math.pow(1 + state.inflPct / 100, gap)) < 0.02);
  assert.ok(Math.abs(view.total - (view.income + view.ss)) < 0.001);
});

test("the dollar year follows the retirement age slider", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const state = ctx.retLoad();
  state.extra401kPct = 1;
  state.retireAge = 67;
  const card = textCard();
  ctx.retFill(card, state);
  assert.equal(card.els["nest-year"].textContent, "in 2047 dollars");
  assert.equal(card.els["total-year"].textContent, "in 2047 dollars");
  assert.equal(card.els["take-year"].textContent, "in 2047 dollars");
  assert.match(card.els["extra401k-stats"].innerHTML, /Paycheck cost <b>.+<\/b> today/);
  assert.equal(card.els["extra401k-stats"].innerHTML.indexOf("today\u2019s dollars"), -1);
  state.retireAge = 70;
  ctx.retFill(card, state);
  assert.equal(card.els["nest-year"].textContent, "in 2050 dollars");
  assert.equal(card.els["total-year"].textContent, "in 2050 dollars");
  assert.equal(card.els["take-year"].textContent, "in 2050 dollars");
});

test("stored extra 401k percent survives a reload and stays in the projection", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  seed(ctx, { extra401kPct: 2, _edited: ["extra401kPct"] });
  let state = ctx.retLoad();
  assert.equal(state.extra401kPct, 2);
  assert.equal(stored(ctx).extra401kPct, 2);
  const html = ctx.retirementHtml();
  assert.match(html, /id="ret-extra401k"[^>]*min="0" max="2" step="0.1" value="2"/);
  assert.equal(html.indexOf('max="0"'), -1);

  const card = cardFrom(state, { extra401k: "0" });
  const range = card.inputs.extra401k;
  range.max = "0";
  range.getAttribute = function (name) {
    if (name === "max") return "0";
    return null;
  };
  range.removeAttribute = function () {};
  ctx.retCommit(card);
  state = ctx.retLoad();
  assert.equal(state.extra401kPct, 2);
  assert.equal(stored(ctx).extra401kPct, 2);
  const withExtra = ctx.retView(state).mid.nominal;
  state.extra401kPct = 0;
  const plain = ctx.retView(state).mid.nominal;
  assert.ok(withExtra > plain);

  const capped = cardFrom(ctx.retLoad());
  const el = capped.inputs.extra401k;
  el.value = "9";
  el.max = "3.5";
  el.getAttribute = function (name) {
    if (name === "data-ret-cap") return "1";
    if (name === "max") return "3.5";
    return null;
  };
  assert.equal(ctx.retRead(capped).extra401kPct, 3.5);
});

test("legacy monthly without an edit marker is dropped", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 80 } }
  };
  seed(ctx, { monthly: 9000, inflPct: 3 });
  let state = ctx.retLoad();
  assert.equal(state.monthly, null);
  assert.equal(state.inflPct, 3);
  const blob = stored(ctx);
  assert.ok(blob);
  assert.equal(Object.prototype.hasOwnProperty.call(blob, "monthly"), false);
  assert.deepEqual(blob._edited, ["inflPct"]);
  state.salary = null;
  assert.equal(ctx.retSavingsMeta(state).monthly, 80);
  const open = ctx.retProject(10000, state, 10).nominal;
  const pinned = ctx.retClone(state);
  pinned.monthly = 9000;
  const old = ctx.retProject(10000, pinned, 10).nominal;
  assert.ok(open < old);
  seed(ctx, { monthly: 9000, _edited: ["monthly"] });
  state = ctx.retLoad();
  assert.equal(state.monthly, 9000);
});

test("dollar year is the current year once age has reached the slider", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const state = ctx.retLoad();
  const todayY = ctx.retTodayNy().year;
  state.birthYear = todayY - 80;
  state.birthMonth = 1;
  state.retireAge = 62;
  state.inflPct = 2.5;
  const h = ctx.retHorizon(state);
  assert.ok(h.age >= state.retireAge);
  assert.equal(h.years, 0);
  assert.equal(h.year, todayY);
  assert.equal(ctx.retYearFactor(todayY, state.birthYear + state.retireAge, state.inflPct), 1);
  const view = ctx.retView(state);
  assert.equal(view.horizon.year, todayY);
  assert.ok(Math.abs(view.mid.nominal - view.mid.today) < 0.001);
  assert.ok(Math.abs(view.ss - 1000) < 0.02);
  const card = textCard();
  ctx.retFill(card, state);
  const label = "in " + todayY + " dollars";
  assert.equal(card.els["nest-year"].textContent, label);
  assert.equal(card.els["total-year"].textContent, label);
  assert.equal(card.els["take-year"].textContent, label);
});

test("headline projection caps employee deferral at the IRS limit plus catch-up", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 0, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const state = ctx.retLoad();
  const year = ctx.retTodayNy().year;
  state.salary = 200000;
  state.salaryYear = year;
  state.raisePct = 0;
  state.eePct = 100;
  state.matchPct = 0;
  state.extraMonthly = 0;
  state.extra401kPct = 0;
  state.nominalPct = 0;
  state.inflPct = 0;
  state.birthMonth = 1;
  state.birthYear = year - 40;
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const young = ctx.retProject(0, state, 1);
  const youngCap = ctx.retDeferralLimit(year - 40, year);
  state.birthYear = year - 61;
  const older = ctx.retProject(0, state, 1);
  const olderCap = ctx.retDeferralLimit(year - 61, year);
  assert.equal(youngCap, 20000);
  assert.equal(olderCap, 27000);
  assert.equal(young.clamped, true);
  assert.equal(older.clamped, true);
  assert.ok(older.nominal > young.nominal);
  const open = federalFixture();
  open.deferral_limit = 1000000;
  open.catchup_50 = 0;
  open.catchup_60_63 = 0;
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: open }));
  state.birthYear = year - 40;
  const loose = ctx.retProject(0, state, 1);
  assert.equal(loose.clamped, false);
  assert.ok(loose.nominal > young.nominal);
});

/* Public SSA formula kept in the test so a move into tax-rules.json cannot drift. */
function legacySsFactor(age) {
  const fromFra = Number(age) - 67;
  if (fromFra >= 0) return 1 + 0.08 * fromFra;
  const earlyMonths = Math.round(-fromFra * 12);
  const first = Math.min(earlyMonths, 36);
  const rest = Math.max(0, earlyMonths - 36);
  const reduction = first * (5 / 9) * 0.01 + rest * (5 / 12) * 0.01;
  const factor = 1 - reduction;
  return factor > 0 ? factor : 0;
}
function legacyPia(salary) {
  const aime = Math.min(salary, 184500) / 12;
  const pia = 0.9 * Math.min(aime, 1286)
    + 0.32 * Math.min(Math.max(aime - 1286, 0), 7749 - 1286)
    + 0.15 * Math.max(aime - 7749, 0);
  return Math.floor(pia * 10) / 10;
}

test("Social Security factors come from the ssa block", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const shipped = ctx.retParseTax(JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8")));
  assert.equal(shipped.federal.partBMonthly, 202.9);
  assert.equal(shipped.ssa.source, "SSA");
  assert.equal(shipped.ssa.checked, "2026-09-25");
  assert.equal(shipped.ssa.bend1, 1286);
  assert.equal(shipped.ssa.bend2, 7749);
  assert.equal(shipped.ssa.wageBase, 184500);
  assert.equal(shipped.ssa.fraAge, 67);
  ctx.RET_TAX = shipped;
  assert.match(ctx.retPartBHint(), /\$202\.90/);
  assert.equal(ctx.retRoughPia(60000), legacyPia(60000));
  let age;
  for (age = 62; age <= 70; age++) assert.equal(ctx.retSsFactor(age), legacySsFactor(age));
  const state = ctx.retLoad();
  state.retireAge = 64;
  const estimated = ctx.retSsMonthly(64, state);
  assert.ok(estimated > state.ss62 && estimated < state.ss67);
  const withRules = ctx.retView(state);
  assert.ok(withRules.ss != null && isFinite(withRules.ss));
  assert.ok(withRules.take != null && isFinite(withRules.take));

  ctx.RET_TAX = ctx.retParseTax(taxRules());
  assert.equal(ctx.RET_TAX.ssa, null);
  assert.equal(ctx.retRoughPia(60000), null);
  assert.equal(ctx.retSsFactor(64), null);
  assert.equal(ctx.retSsMonthly(64, state), null);
  const dashed = ctx.retView(state);
  assert.equal(dashed.ss, null);
  assert.equal(dashed.take, null);
  const card = textCard();
  ctx.retFill(card, state);
  assert.match(card.els.pia.innerHTML, /Rough estimate \u2014\/mo/);
  assert.equal(card.els["ss-mo"].textContent, "\u2014");
  assert.equal(card.els.take.textContent, "\u2014");

  state.retireAge = 67;
  const exact = ctx.retView(state);
  assert.ok(exact.ss != null && isFinite(exact.ss));
  assert.ok(exact.take != null && isFinite(exact.take));
  ctx.retFill(card, state);
  assert.equal(card.els["ss-mo"].textContent, ctx.money(exact.ss));
  assert.equal(card.els.take.textContent, ctx.money(exact.take));
});

test("extra 401k stats match the headline at the current extra", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: { cashflow_30d: { owner_deposits: 100 } }
  };
  ctx.RET_TAX = ctx.retParseTax(taxRules());
  const state = ctx.retLoad();
  state.extra401kPct = 2;
  state.retireAge = 67;
  const view = ctx.retView(state);
  const stats = ctx.retExtra401k(state, view);
  assert.equal(stats.newTotal, view.total);
  assert.equal(stats.newTake, view.take);
  const zero = ctx.retClone(state);
  zero.extra401kPct = 0;
  const base = ctx.retView(zero);
  assert.ok(view.mid.nominal > base.mid.nominal);
  assert.ok(Math.abs(stats.addedNest - (view.mid.nominal - base.mid.nominal)) < 0.05);
  assert.ok(Math.abs(stats.addedIncome - (view.income - base.income)) < 0.001);
  const card = textCard();
  ctx.retFill(card, state);
  const html = card.els["extra401k-stats"].innerHTML;
  assert.ok(html.indexOf("Total <b>" + ctx.money(view.total) + "</b>") >= 0);
  assert.ok(html.indexOf("Take-home <b>" + ctx.money(view.take) + "</b>") >= 0);
});

test("stored extra 401k percent clamps to the slider max", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const fed = federalFixture();
  fed.deferral_limit = 8000;
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed }));
  seed(ctx, { extra401kPct: 20, _edited: ["extra401kPct"] });
  const state = ctx.retLoad();
  assert.ok(Math.abs(state.extra401kPct - 4) < 1e-6);
  assert.ok(Math.abs(stored(ctx).extra401kPct - 4) < 1e-6);
  const over = ctx.retClone(state);
  over.extra401kPct = 20;
  const atMax = ctx.retClone(state);
  atMax.extra401kPct = 4;
  const years = ctx.retHorizon(state).years;
  const high = ctx.retProject(10000, over, years).nominal;
  const capped = ctx.retProject(10000, atMax, years).nominal;
  assert.ok(Math.abs(high - capped) < 0.05);
  const card = textCard();
  ctx.retFill(card, state);
  const range = card.els["in:extra401k"];
  assert.ok(Math.abs(Number(range.max) - 4) < 1e-6);
  assert.ok(Number(range.value) <= Number(range.max) + 1e-6);
  const headline = ctx.retView(state).mid.nominal;
  assert.ok(Math.abs(headline - capped) < 0.05);
});

test("401k plus match includes the extra and respects the deferral and compensation caps", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 0, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const year = ctx.retTodayNy().year;
  const state = ctx.retLoad();
  state.salaryYear = year;
  state.raisePct = 0;
  state.matchPct = 0;
  state.extraMonthly = 0;
  state.nominalPct = 0;
  state.inflPct = 0;
  state.birthMonth = 1;
  state.birthYear = year - 40;
  ctx.RET_TAX = ctx.retParseTax(taxRules());

  state.salary = 80000;
  state.eePct = 6;
  state.extra401kPct = 2;
  assert.equal(ctx.retSavingsMeta(state).year1Annual, 6400);
  state.extra401kPct = 0;
  assert.equal(ctx.retSavingsMeta(state).year1Annual, 4800);

  state.salary = 200000;
  state.eePct = 100;
  state.extra401kPct = 2;
  assert.equal(ctx.retSavingsMeta(state).year1Annual, 20000);
  assert.ok(Math.abs(ctx.retProject(0, state, 1).nominal - 20000) < 0.05);

  const fed = federalFixture({ comp_limit: 100000, comp_limit_indexed: true });
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed }));
  state.salary = 400000;
  state.eePct = 0;
  state.extra401kPct = 0;
  state.matchPct = 10;
  state.inflPct = 0;
  assert.equal(ctx.retCompLimit(state, year), 100000);
  assert.equal(ctx.retSavingsMeta(state).year1Annual, 10000);
  assert.ok(Math.abs(ctx.retProject(0, state, 1).nominal - 10000) < 0.05);
  const open = federalFixture();
  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: open }));
  assert.equal(ctx.retCompLimit(state, year), null);
  assert.equal(ctx.retSavingsMeta(state).year1Annual, 40000);

  ctx.RET_TAX = ctx.retParseTax(taxRules({ federal: fed }));
  state.inflPct = 10;
  const later = ctx.retCompLimit(state, year + 10);
  assert.ok(Math.abs(later - 100000 * Math.pow(1.1, 10)) < 0.05);
  const shipped = ctx.retParseTax(JSON.parse(fs.readFileSync(path.join(root, "house/tax-rules.json"), "utf8")));
  assert.equal(shipped.federal.compLimit, 360000);
  assert.equal(shipped.federal.compLimitIndexed, true);
  assert.equal(ctx.retParseTax(taxRules({ federal: federalFixture({ comp_limit: 0 }) })).federal, null);
});

test("loan repay on the save split cannot exceed the remaining balance", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const today = ctx.retTodayNy();
  const ymd = today.year + "-" + String(today.month).padStart(2, "0") + "-" + String(today.day).padStart(2, "0");
  const loan = ctx.retParseLoan({
    balance: 40, payment: 100, payments_per_year: 12, asof: ymd
  });
  ctx.RET_SAVED.loan = loan;
  const model = ctx.retLoanActive();
  assert.ok(model);
  assert.ok(Math.abs(model.remaining - 40) < 0.001);
  assert.equal(ctx.retLoanMonthPay(model), 40);
  const state = ctx.retLoad();
  const card = textCard();
  ctx.retFill(card, state);
  const shown = ctx.retView(state).mid.monthlyShown;
  assert.equal(card.els["save-split"].textContent, ctx.money(shown) + " savings + " + ctx.money(40) + " loan repay");
  assert.equal(card.els["save-split"].textContent.indexOf(ctx.money(100)), -1);
});

test("nest egg line splits savings and loan while the loan contributes", function () {
  const ctx = boot();
  useFile(ctx, fileA());
  ctx.snap = {
    robinhood: { equity: 10000, label: "Robinhood" },
    accounts: {},
    combined: {}
  };
  const loan = ctx.retParseLoan({
    balance: 1200, payment: 100, payments_per_year: 12, asof: "2026-01-15"
  });
  ctx.RET_SAVED.loan = loan;
  const state = ctx.retLoad();
  state.retireAge = 67;
  const view = ctx.retView(state);
  const add = ctx.retLoanFuture(view.horizon.years, state.nominalPct / 100, state.inflPct / 100);
  assert.ok(add.nominal > 0.005);
  const card = textCard();
  ctx.retFill(card, state);
  const expected = "savings " + ctx.money(view.mid.nominal - add.nominal) + " + loan " + ctx.money(add.nominal);
  assert.equal(card.els["nest-split"].textContent, expected);
  assert.equal(card.els["nest-split"].hidden, false);
  assert.match(card.els["nest-split"].textContent, /^savings \$[\d,]+\.\d{2} \+ loan \$[\d,]+\.\d{2}$/);
  ctx.RET_SAVED.loan = null;
  ctx.retFill(card, state);
  assert.equal(card.els["nest-split"].textContent, "");
  assert.equal(card.els["nest-split"].hidden, true);
});
