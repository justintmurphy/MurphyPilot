/* tip co — House Banking.
   Live numbers come only from GET /data/banking.json (OTP cookie).
   Category edits POST to /data/banking/overrides.json and sync across seats.
   A null amount stays blank. This file does not embed balances or last-4s. */

var BANK_STALE_MS = 36 * 60 * 60 * 1000;
var BANK_STORE = "murphyHouseBanking";
var BANK_DATA_URL = "/data/banking.json";
var BANK_OVERRIDES_URL = "/data/banking/overrides.json";
var BANK_COLORS = ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
var BANK_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bankEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function bankNum(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && String(v).trim() === "") return null;
  var n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return null;
  return n;
}

function bankMoney(v) {
  var n = bankNum(v);
  if (n == null) return "\u2014";
  var abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-$" : "$") + abs;
}

function bankCount(v) {
  var n = bankNum(v);
  if (n == null) return "\u2014";
  return String(Math.round(n));
}

function bankDay(v) {
  if (v == null || v === "") return null;
  var n = Number(v);
  if (!isFinite(n)) return null;
  n = Math.round(n);
  if (n < 1 || n > 31) return null;
  return n;
}

function bankCatName(name) {
  var s = String(name == null ? "" : name).trim();
  return s || "Other";
}

function bankIsIncomeName(name, incomeObj) {
  if (incomeObj && Object.prototype.hasOwnProperty.call(incomeObj, name)) return true;
  return /^(paycheck\/salary\/wages|cash inflows|investment income)$/i.test(String(name || ""));
}

function bankIsTransferName(name) {
  var s = String(name || "");
  return /transfer/i.test(s) || /creditcardpayment/i.test(s) || /credit card payment/i.test(s);
}

function bankMask(suffix) {
  if (suffix == null || String(suffix).trim() === "") return "";
  var s = String(suffix).replace(/\s/g, "");
  if (s.length > 4) s = s.slice(-4);
  return "\u00b7\u00b7\u00b7" + s;
}

function bankParseTime(asof) {
  var s = String(asof == null ? "" : asof).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s = s + "T12:00:00-04:00";
  var t = Date.parse(s);
  return isFinite(t) ? t : null;
}

function bankNowMs(now) {
  if (now == null) return Date.now();
  if (typeof now === "number" && isFinite(now)) return now;
  var t = bankParseTime(now);
  return t == null ? Date.now() : t;
}

function bankStale(asof, now) {
  var t = bankParseTime(asof);
  if (t == null) return false;
  return (bankNowMs(now) - t) > BANK_STALE_MS;
}

function bankAsofLabel(asof) {
  var t = bankParseTime(asof);
  if (t == null) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(t)) + " ET";
  } catch (e) {
    return String(asof);
  }
}

function bankMonthLabel(ym) {
  var p = String(ym || "").split("-");
  var m = Number(p[1]);
  if (!m || m < 1 || m > 12) return String(ym || "");
  return BANK_MONTHS[m - 1];
}

function bankResolveTab(hash) {
  var h = String(hash || "").replace(/^#/, "");
  if (h === "historical" || h === "budget" || h === "current") return h;
  return "current";
}

function bankClassifyStatus(status) {
  var n = Number(status);
  if (n === 401 || n === 403) return "gate";
  if (n === 404) return "missing";
  return "error";
}

function bankGateHtml(kind) {
  var title = "Banking data did not load";
  var body = "The feed did not answer. This page leaves balances blank.";
  if (kind === "gate") {
    title = "Banking is locked";
    body = "Sign in with the one-time passcode on this site, then reload. Balances stay off this page until the feed answers.";
  } else if (kind === "missing") {
    title = "No banking print";
    body = "The desk did not find banking data. Nothing is filled in.";
  }
  return '<section class="bank-gate" data-bank-gate="' + bankEsc(kind || "error") + '"><h2>' + title + "</h2><p>" + body + "</p></section>";
}

function bankFetchInit(extra) {
  extra = extra || {};
  var headers = { Accept: "application/json" };
  var extraHeaders = extra.headers;
  if (extraHeaders && typeof extraHeaders === "object") {
    Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
  }
  var init = {
    credentials: "include",
    cache: "no-store",
    redirect: "manual",
    headers: headers
  };
  if (extra.method) init.method = extra.method;
  if (extra.body != null) init.body = extra.body;
  return init;
}

function bankIsLockedResponse(res) {
  if (!res) return false;
  if (res.type === "opaqueredirect") return true;
  var n = Number(res.status);
  return n === 401 || n === 403;
}

function bankAccounts(snap) {
  var list = snap && snap.accounts;
  if (!Array.isArray(list)) return [];
  return list.filter(function (a) { return a && typeof a === "object"; });
}

function bankMonths(snap) {
  var list = snap && snap.history && snap.history.months;
  if (!Array.isArray(list)) return [];
  return list.filter(function (m) { return m && m.month; }).slice().sort(function (a, b) {
    var as = String(a.month);
    var bs = String(b.month);
    if (as < bs) return -1;
    if (as > bs) return 1;
    return 0;
  });
}

function bankPairBalances(accounts, balances) {
  accounts = accounts || [];
  balances = balances || [];
  var idCount = {};
  accounts.forEach(function (a) {
    if (a && a.id) idCount[a.id] = (idCount[a.id] || 0) + 1;
  });
  return accounts.map(function (acct, i) {
    var id = acct && acct.id;
    var bal = null;
    if (id && idCount[id] === 1) {
      for (var j = 0; j < balances.length; j++) {
        if (balances[j] && balances[j].id === id) { bal = balances[j]; break; }
      }
    }
    if (!bal && balances[i]) bal = balances[i];
    var value = bal ? bankNum(bal.balance) : null;
    return {
      id: id || "",
      name: (acct && acct.name) || "Account",
      mask: bankMask(acct && acct.suffix),
      balance: value,
      missing: value == null
    };
  });
}

function bankTotalCash(current, tiles) {
  var stated = current && bankNum(current.total_cash);
  if (stated != null) return stated;
  if (!tiles.length) return null;
  var sum = 0;
  for (var i = 0; i < tiles.length; i++) {
    if (tiles[i].balance == null) return null;
    sum += tiles[i].balance;
  }
  return sum;
}

function bankSpendRows(list, incomeObj) {
  var map = {};
  var order = [];
  (list || []).forEach(function (c) {
    if (!c) return;
    var name = bankCatName(c.name || c.category);
    if (bankIsIncomeName(name, incomeObj)) return;
    if (bankIsTransferName(name)) return;
    var amount = bankNum(c.amount);
    if (amount == null || amount <= 0) return;
    if (!Object.prototype.hasOwnProperty.call(map, name)) order.push(name);
    map[name] = (map[name] || 0) + amount;
  });
  return order.map(function (name) { return { name: name, amount: map[name] }; }).sort(function (a, b) {
    return b.amount - a.amount;
  });
}

function bankCatList(month) {
  if (month && Array.isArray(month.categories) && month.categories.length) return month.categories;
  var spend = month && month.spend;
  if (spend && typeof spend === "object") {
    return Object.keys(spend).map(function (k) { return { name: k, amount: spend[k] }; });
  }
  return [];
}

function bankClosedCats(snap) {
  var cur = snap && snap.current && snap.current.last_closed_month_categories;
  if (Array.isArray(cur) && cur.length) return bankSpendRows(cur, null);
  var months = bankMonths(snap);
  for (var i = months.length - 1; i >= 0; i--) {
    if (months[i].closed === false) continue;
    var list = bankCatList(months[i]);
    if (list.length) return bankSpendRows(list, months[i].income);
  }
  return [];
}

function bankSparkSeries(snap) {
  var accounts = bankAccounts(snap);
  var months = bankMonths(snap);
  var seen = {};
  var out = [];
  accounts.forEach(function (acct) {
    if (acct.id && seen[acct.id]) return;
    if (acct.id) seen[acct.id] = true;
    var pts = [];
    months.forEach(function (m) {
      var eb = m.end_balances || {};
      if (!acct.id || !Object.prototype.hasOwnProperty.call(eb, acct.id)) return;
      var v = bankNum(eb[acct.id]);
      if (v == null) return;
      pts.push({ month: m.month, value: v });
    });
    if (!pts.length) return;
    out.push({ id: acct.id || "", name: acct.name || "Account", mask: bankMask(acct.suffix), points: pts });
  });
  return out;
}

/* txKey is date|id|amount|desc. Null and undefined become empty strings. */
function bankTxPart(v) {
  if (v == null) return "";
  return String(v);
}

function bankTxKey(raw) {
  raw = raw || {};
  return [bankTxPart(raw.date), bankTxPart(raw.id), bankTxPart(raw.amount), bankTxPart(raw.desc)].join("|");
}

function bankOverrideMap(snap) {
  var o = snap && snap.category_overrides;
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return o;
}

function bankHasOverrides(snap) {
  var o = bankOverrideMap(snap);
  return Object.keys(o).some(function (k) {
    return o[k] != null && String(o[k]).trim() !== "";
  });
}

function bankTxCategory(raw, overrides) {
  raw = raw || {};
  var key = bankTxKey(raw);
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    var v = overrides[key];
    if (v != null && String(v).trim() !== "") return bankCatName(v);
  }
  return bankCatName(raw.category);
}

function bankKnownCategories(snap) {
  var seen = {};
  var order = [];
  function add(name) {
    var n = String(name == null ? "" : name).trim();
    if (!n || seen[n]) return;
    seen[n] = true;
    order.push(n);
  }
  function addList(list) {
    (list || []).forEach(function (c) {
      if (!c) return;
      if (typeof c === "string") add(c);
      else add(c.name || c.category);
    });
  }
  var cur = snap && snap.current;
  if (cur) addList(cur.last_closed_month_categories);
  bankMonths(snap).forEach(function (m) { addList(bankCatList(m)); });
  var planned = snap && snap.budget && snap.budget.planned_by_category;
  if (planned && typeof planned === "object") Object.keys(planned).forEach(add);
  var txs = cur && cur.recent_tx;
  if (Array.isArray(txs)) txs.forEach(function (r) { if (r) add(r.category); });
  var ov = bankOverrideMap(snap);
  Object.keys(ov).forEach(function (k) { add(ov[k]); });
  if (seen.Other) order = order.filter(function (n) { return n !== "Other"; });
  order.push("Other");
  return order;
}

function bankRecent(snap) {
  var rows = snap && snap.current && snap.current.recent_tx;
  if (!Array.isArray(rows) || !rows.length) return [];
  var overrides = bankOverrideMap(snap);
  return rows.map(function (raw, i) {
    raw = raw || {};
    return {
      key: bankTxKey(raw),
      date: raw.date || "",
      desc: raw.desc == null ? "" : String(raw.desc),
      amount: bankNum(raw.amount),
      flow: raw.flow || "",
      category: bankTxCategory(raw, overrides),
      i: i
    };
  }).sort(function (a, b) {
    if (a.date === b.date) return b.i - a.i;
    return a.date < b.date ? 1 : -1;
  }).slice(0, 40);
}

/* Bills only. Do not run this on transaction merchants (gasoline, City Fuel). */
function bankFixedBillDay(name) {
  var s = String(name || "");
  if (/mortgage/i.test(s)) return 1;
  if (/t[-\s]?mobile/i.test(s)) return 28;
  if (/\bcar[-\s]?payment\b/i.test(s) || /\bauto[-\s]?loan\b/i.test(s) ||
      /\bauto[-\s]?pay(?:ment)?\b/i.test(s) || /\bvehicle[-\s]?loan\b/i.test(s)) return 15;
  if (/electric/i.test(s) || /\bpower\b/i.test(s) || /duquesne\s+light/i.test(s)) return 15;
  if (/gas\s+bills?\b/i.test(s) || /natural\s+gas/i.test(s) || /columbia\s+gas/i.test(s)) return 15;
  return null;
}

function bankBillNameMatch(name, match) {
  var n = String(name || "").trim().toLowerCase();
  var m = String(match || "").trim().toLowerCase();
  if (!n || !m) return false;
  if (n === m) return true;
  if (n.indexOf(m) === 0) {
    var next = n.charAt(m.length);
    if (!next || next === " " || next === "-" || next === "/") return true;
  }
  if (m.length >= 5 && n.indexOf(m) >= 0) return true;
  return false;
}

function bankBillOverrideDay(budget, row) {
  var list = budget && budget.overrides;
  if (!Array.isArray(list)) return null;
  var found = null;
  list.forEach(function (o) {
    if (!o || typeof o !== "object") return;
    var field = String(o.field || "");
    if (field !== "typical_day" && field !== "due_day") return;
    var match = o.match != null ? o.match : (o.name || o.label || "");
    if (!bankBillNameMatch(row && row.name, match)) return;
    var day = bankDay(o.value);
    if (day == null) return;
    found = day;
  });
  return found;
}

function bankNormalizeBills(budget) {
  budget = budget || {};
  var byName = {};
  var order = [];
  var manualDays = {};
  function add(raw, fromMonthly) {
    if (!raw || typeof raw !== "object") return;
    var name = String((fromMonthly ? (raw.label || raw.name) : (raw.name || raw.label)) || "").trim() || "Other";
    var dayRaw = fromMonthly
      ? (raw.due_day != null && raw.due_day !== "" ? raw.due_day : raw.typical_day)
      : (raw.typical_day != null && raw.typical_day !== "" ? raw.typical_day : raw.due_day);
    var day = bankDay(dayRaw);
    var amount = bankNum(raw.amount);
    var row = byName[name];
    if (!row) {
      row = {
        name: name,
        amount: amount,
        typical_day: day,
        cadence: raw.cadence || null,
        category: raw.category || "",
        source: raw.source || (fromMonthly ? "bills_monthly" : "bills")
      };
      byName[name] = row;
      order.push(name);
    } else {
      if (row.amount == null && amount != null) row.amount = amount;
      if (row.typical_day == null && day != null) row.typical_day = day;
      if (!row.cadence && raw.cadence) row.cadence = raw.cadence;
      if (!row.category && raw.category) row.category = raw.category;
      if (raw.source === "manual") row.source = "manual";
    }
    if (raw.source === "manual" && day != null) {
      row.source = "manual";
      row.typical_day = day;
      manualDays[name] = day;
    }
  }
  var primary = Array.isArray(budget.bills) ? budget.bills : [];
  var alias = Array.isArray(budget.bills_monthly) ? budget.bills_monthly : [];
  if (primary.length) {
    primary.forEach(function (raw) { add(raw, false); });
    alias.forEach(function (raw) { add(raw, true); });
  } else {
    alias.forEach(function (raw) { add(raw, true); });
  }
  return order.map(function (name) {
    var row = byName[name];
    var overrideDay = bankBillOverrideDay(budget, row);
    if (overrideDay != null) {
      row.typical_day = overrideDay;
      row.due_day = overrideDay;
      row.source = "manual";
      return row;
    }
    if (Object.prototype.hasOwnProperty.call(manualDays, name)) {
      row.typical_day = manualDays[name];
      row.due_day = manualDays[name];
      row.source = "manual";
      return row;
    }
    var fixed = bankFixedBillDay(row.name);
    if (fixed != null) {
      row.typical_day = fixed;
      row.due_day = fixed;
      return row;
    }
    if (row.typical_day != null) row.due_day = row.typical_day;
    return row;
  });
}

function bankNormalizeIncome(budget) {
  var list = budget && budget.income_monthly;
  if (!Array.isArray(list)) return [];
  return list.map(function (raw) {
    raw = raw || {};
    return {
      label: String(raw.label || raw.name || "Paycheck"),
      amount: bankNum(raw.amount),
      cadence: raw.cadence || null,
      typical_day: bankDay(raw.typical_day),
      source: raw.source || ""
    };
  });
}

function bankApplyEdits(bills, incomes, edits) {
  edits = edits || {};
  var billEd = edits.bills || {};
  var incEd = edits.income || {};
  bills.forEach(function (b) {
    if (!Object.prototype.hasOwnProperty.call(billEd, b.name)) return;
    b.typical_day = bankDay(billEd[b.name]);
    b.source = "manual";
  });
  incomes.forEach(function (inc) {
    if (!Object.prototype.hasOwnProperty.call(incEd, inc.label)) return;
    inc.typical_day = bankDay(incEd[inc.label]);
    inc.source = "manual";
  });
}

function bankNormalizeInsights(budget) {
  var list = budget && budget.insights;
  if (!Array.isArray(list)) return [];
  return list.map(function (raw) {
    raw = raw || {};
    var sev = raw.severity === "red" || raw.severity === "amber" ? raw.severity : "";
    var delta = raw.delta != null && raw.delta !== "" ? bankNum(raw.delta) : bankNum(raw.delta_vs_3mo_avg);
    return {
      kind: raw.kind || "",
      name: bankCatName(raw.name || raw.category),
      delta: delta,
      amount: bankNum(raw.amount),
      typical_day: bankDay(raw.typical_day),
      severity: sev,
      message: String(raw.message || raw.text || "").trim()
    };
  });
}

function bankInsightText(row) {
  if (row.message) return row.message;
  if (row.delta != null) {
    var sign = row.delta > 0 ? "+" : "";
    return row.name + " " + sign + bankMoney(row.delta) + " vs 3-mo avg";
  }
  if (row.typical_day != null) return row.name + " \u00b7 day " + row.typical_day;
  return row.name;
}

function bankBudgetBars(budget) {
  var planned = (budget && budget.planned_by_category) || {};
  var mtd = (budget && budget.mtd_actual_by_category) || {};
  var names = [];
  function pushName(k) { if (names.indexOf(k) < 0) names.push(k); }
  Object.keys(planned).forEach(pushName);
  Object.keys(mtd).forEach(pushName);
  var rows = [];
  names.forEach(function (name) {
    var target = Object.prototype.hasOwnProperty.call(planned, name) ? bankNum(planned[name]) : null;
    var actual = Object.prototype.hasOwnProperty.call(mtd, name) ? bankNum(mtd[name]) : null;
    if (target == null && actual == null) return;
    rows.push({
      name: bankCatName(name),
      target: target,
      actual: actual,
      over: target != null && actual != null && actual > target
    });
  });
  rows.sort(function (a, b) {
    var av = a.actual == null ? -1 : a.actual;
    var bv = b.actual == null ? -1 : b.actual;
    return bv - av;
  });
  return rows;
}

function bankCheckGroups(bills, incomes) {
  var days = [];
  var labels = {};
  (incomes || []).forEach(function (inc) {
    var d = bankDay(inc.typical_day);
    if (d == null) return;
    if (days.indexOf(d) < 0) days.push(d);
    labels[d] = inc.label || "Paycheck";
  });
  days.sort(function (a, b) { return a - b; });
  if (!days.length) return [];
  var dated = (bills || []).filter(function (b) { return bankDay(b.typical_day) != null; });
  return days.map(function (p, i) {
    var next = days[(i + 1) % days.length];
    var covered = dated.filter(function (b) {
      var d = bankDay(b.typical_day);
      if (days.length === 1) return true;
      if (p < next) return d >= p && d < next;
      return d >= p || d < next;
    });
    return { day: p, label: labels[p] || "Paycheck", bills: covered };
  });
}

function bankDayCells(bills, incomes, calendar) {
  var days = [];
  var d;
  for (d = 1; d <= 31; d++) days.push({ day: d, pays: [], bills: [], items: [] });
  (incomes || []).forEach(function (inc) {
    var day = bankDay(inc.typical_day);
    if (day == null) return;
    days[day - 1].pays.push(inc.label || "Paycheck");
  });
  (bills || []).forEach(function (b) {
    var day = bankDay(b.typical_day);
    if (day == null) return;
    days[day - 1].bills.push(b.name || "Bill");
  });
  (calendar || []).forEach(function (c) {
    if (!c) return;
    var day = bankDay(c.day);
    if (day == null) return;
    (c.items || []).forEach(function (item) {
      var label = typeof item === "string" ? item : (item && (item.name || item.label)) || "Item";
      days[day - 1].items.push(String(label));
    });
  });
  return days;
}

function bankHasDueDays(cells) {
  return (cells || []).some(function (c) { return c.pays.length || c.bills.length || c.items.length; });
}

function bankOpenMonth(month) {
  return !!(month && month.closed === false);
}

function bankHistSelection(months, year, month) {
  var years = [];
  (months || []).forEach(function (m) {
    var y = String(m.month || "").slice(0, 4);
    if (y && years.indexOf(y) < 0) years.push(y);
  });
  years.sort();
  var y = year && years.indexOf(String(year)) >= 0 ? String(year) : (years.length ? years[years.length - 1] : "");
  var inYear = (months || []).filter(function (m) { return String(m.month || "").slice(0, 4) === y; });
  var picked = month;
  if (picked !== "year" && !inYear.some(function (row) { return row.month === picked; })) {
    picked = inYear.length ? inYear[inYear.length - 1].month : "year";
  }
  return { years: years, year: y, month: picked, inYear: inYear };
}

function bankSumField(months, key) {
  var any = false;
  var sum = 0;
  var missing = false;
  (months || []).forEach(function (m) {
    var n = bankNum(m[key]);
    if (n == null) { missing = true; return; }
    any = true;
    sum += n;
  });
  return { value: any ? sum : null, partial: !!(any && missing) };
}

function bankEndChips(month, accounts) {
  var eb = (month && month.end_balances) || {};
  return (accounts || []).map(function (acct) {
    var has = !!(acct.id && Object.prototype.hasOwnProperty.call(eb, acct.id));
    var v = has ? bankNum(eb[acct.id]) : null;
    return { name: acct.name || "Account", mask: bankMask(acct.suffix), value: v, missing: v == null };
  });
}

function bankLatestEnds(months, accounts) {
  for (var i = months.length - 1; i >= 0; i--) {
    var chips = bankEndChips(months[i], accounts);
    if (chips.some(function (c) { return !c.missing; })) return { month: months[i].month, chips: chips };
  }
  return { month: "", chips: bankEndChips(null, accounts) };
}

function bankDonutPath(cx, cy, r0, r1, a0, a1) {
  var large = (a1 - a0) > Math.PI ? 1 : 0;
  function pt(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  var p0 = pt(r1, a0), p1 = pt(r1, a1), p2 = pt(r0, a1), p3 = pt(r0, a0);
  return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) +
    " A" + r1 + " " + r1 + " 0 " + large + " 1 " + p1[0].toFixed(2) + " " + p1[1].toFixed(2) +
    " L" + p2[0].toFixed(2) + " " + p2[1].toFixed(2) +
    " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p3[0].toFixed(2) + " " + p3[1].toFixed(2) + " Z";
}

function bankPieHtml(rows) {
  rows = rows || [];
  if (!rows.length) return '<p class="bank-empty">No spend categories in this print.</p>';
  var total = 0;
  rows.forEach(function (r) { total += r.amount; });
  if (!(total > 0)) return '<p class="bank-empty">No spend categories in this print.</p>';
  var paths = [];
  var a = -Math.PI / 2;
  rows.forEach(function (r, i) {
    var sweep = (r.amount / total) * Math.PI * 2;
    var a1 = a + Math.max(sweep, 0.001);
    if (rows.length === 1) a1 = a + Math.PI * 2 - 0.001;
    paths.push('<path d="' + bankDonutPath(70, 70, 40, 64, a, a1) + '" fill="' + BANK_COLORS[i % BANK_COLORS.length] + '"></path>');
    a = a1;
  });
  var top = rows[0];
  var pct = Math.round((top.amount / total) * 100);
  var label = top.name.length > 14 ? top.name.slice(0, 13) + "\u2026" : top.name;
  return '<div class="bank-pie" role="img" aria-label="Spend by category"><svg viewBox="0 0 140 140" aria-hidden="true">' +
    paths.join("") + '</svg><div class="bank-pie-mid"><b>' + pct + '%</b><span>' + bankEsc(label) + "</span></div></div>";
}

function bankRankHtml(rows) {
  if (!rows || !rows.length) return "";
  var total = 0;
  rows.forEach(function (r) { total += r.amount; });
  return '<ol class="bank-rank">' + rows.map(function (r) {
    var pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
    return "<li><span>" + bankEsc(r.name) + "</span><b>" + bankMoney(r.amount) + "</b><i>" + pct + "%</i></li>";
  }).join("") + "</ol>";
}

function bankPieBlock(rows, heading) {
  return '<section class="bank-pie-block"><h3>' + bankEsc(heading || "Spend") + '</h3><div class="bank-split">' +
    bankPieHtml(rows) + bankRankHtml(rows) + "</div></section>";
}

function bankSparkHtml(series) {
  if (!series || !series.length) return "";
  var months = [];
  series.forEach(function (s) {
    s.points.forEach(function (p) {
      if (months.indexOf(p.month) < 0) months.push(p.month);
    });
  });
  months.sort();
  var vals = [];
  series.forEach(function (s) { s.points.forEach(function (p) { vals.push(p.value); }); });
  var min = Math.min.apply(null, vals);
  var max = Math.max.apply(null, vals);
  if (max === min) {
    var padY = Math.max(Math.abs(max) * 0.02, 0.5);
    min -= padY;
    max += padY;
  }
  var w = 640, h = 112, pL = 8, pR = 8, pT = 10, pB = 8;
  function xOf(month) {
    var i = months.indexOf(month);
    return pL + (months.length === 1 ? (w - pL - pR) / 2 : i * (w - pL - pR) / (months.length - 1));
  }
  function yOf(v) {
    return pT + (h - pT - pB) * (1 - (v - min) / (max - min || 1));
  }
  var marks = series.map(function (s, si) {
    var color = BANK_COLORS[si % BANK_COLORS.length];
    var runs = [];
    var run = [];
    var prev = -1;
    s.points.forEach(function (p) {
      var i = months.indexOf(p.month);
      if (prev >= 0 && i > prev + 1 && run.length) {
        runs.push(run);
        run = [];
      }
      run.push(p);
      prev = i;
    });
    if (run.length) runs.push(run);
    return runs.map(function (pts) {
      if (pts.length === 1) {
        return '<circle cx="' + xOf(pts[0].month).toFixed(1) + '" cy="' + yOf(pts[0].value).toFixed(1) + '" r="3.5" fill="' + color + '"></circle>';
      }
      var flat = pts.map(function (p) { return xOf(p.month).toFixed(1) + "," + yOf(p.value).toFixed(1); }).join(" ");
      return '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + flat + '"></polyline>';
    }).join("");
  }).join("");
  var legend = '<ul class="bank-legend">' + series.map(function (s, si) {
    return '<li><i style="background:' + BANK_COLORS[si % BANK_COLORS.length] + '"></i>' + bankEsc(s.name) + "</li>";
  }).join("") + "</ul>";
  return '<section class="bank-spark-block"><h3>Month-end balances</h3><svg class="bank-spark" viewBox="0 0 ' + w + " " + h +
    '" role="img" aria-label="Month-end balances">' + marks + "</svg>" + legend + "</section>";
}

function bankYearSvg(months) {
  var rows = (months || []).map(function (m) {
    return {
      label: bankMonthLabel(m.month),
      income: bankNum(m.income_total),
      spend: bankNum(m.spend_total),
      net: bankNum(m.net),
      open: bankOpenMonth(m)
    };
  });
  if (!rows.length) return '<p class="bank-empty">No months in this year.</p>';
  var nums = [];
  rows.forEach(function (r) {
    if (r.income != null) nums.push(r.income);
    if (r.spend != null) nums.push(r.spend);
    if (r.net != null) nums.push(r.net);
  });
  if (!nums.length) return '<p class="bank-empty">No income or spend totals for this year.</p>';
  var minV = Math.min(0, Math.min.apply(null, nums));
  var maxV = Math.max(0, Math.max.apply(null, nums));
  if (maxV === minV) maxV = minV + 1;
  var padL = 8, padR = 8, padT = 12, padB = 22, slot = 52;
  var w = padL + padR + rows.length * slot;
  var h = 168;
  var innerH = h - padT - padB;
  function y(v) { return padT + innerH * (1 - (v - minV) / (maxV - minV)); }
  var zero = y(0);
  var parts = ['<line x1="' + padL + '" y1="' + zero.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + zero.toFixed(1) + '" stroke="var(--chart-grid)"></line>'];
  var netRun = [];
  function flushNet() {
    if (netRun.length >= 2) {
      parts.push('<polyline fill="none" stroke="var(--ink)" stroke-width="1.5" points="' + netRun.join(" ") + '"></polyline>');
    } else if (netRun.length === 1) {
      var xy = netRun[0].split(",");
      parts.push('<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="2.5" fill="var(--ink)"></circle>');
    }
    netRun = [];
  }
  rows.forEach(function (r, i) {
    var x = padL + i * slot;
    function bar(val, dx, color) {
      if (val == null) return;
      var y1 = y(val);
      var top = Math.min(y1, zero);
      var bh = Math.abs(y1 - zero);
      if (val === 0) bh = 1;
      else bh = Math.max(bh, 1);
      parts.push('<rect x="' + (x + dx).toFixed(1) + '" y="' + top.toFixed(1) + '" width="14" height="' + bh.toFixed(1) + '" fill="' + color + '"></rect>');
    }
    bar(r.income, 8, "var(--brand-fg)");
    bar(r.spend, 26, "var(--mix-c)");
    if (r.net != null) netRun.push((x + slot / 2).toFixed(1) + "," + y(r.net).toFixed(1));
    else flushNet();
    parts.push('<text x="' + (x + slot / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" fill="var(--ink-soft)" font-size="10">' + bankEsc(r.label) + "</text>");
  });
  flushNet();
  return '<div class="bank-year-scroll"><svg class="bank-year" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Income and spend by month">' +
    parts.join("") + '</svg></div><ul class="bank-legend"><li><i style="background:var(--brand-fg)"></i>Income</li><li><i style="background:var(--mix-c)"></i>Spend</li><li><i style="background:var(--ink)"></i>Net</li></ul>';
}

function bankCatTable(list) {
  var rows = list || [];
  if (!rows.length) return '<p class="bank-empty">No category rows.</p>';
  return '<table class="bank-table"><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>' +
    rows.map(function (c) {
      var name = bankCatName(c && (c.name || c.category));
      var amount = c ? bankNum(c.amount) : null;
      return "<tr><td>" + bankEsc(name) + "</td><td>" + (amount == null ? "\u2014" : bankMoney(amount)) + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function bankKpi(key, label, value, missing, partial) {
  return '<div data-k="' + key + '" data-missing="' + (missing ? "1" : "0") + '"><span>' + bankEsc(label) +
    "</span><b>" + value + "</b>" + (partial ? '<i class="partial">partial</i>' : "") + "</div>";
}

function bankEndHtml(chips, caption) {
  if (!chips || !chips.length) return "";
  return '<div class="bank-ends"><span>' + bankEsc(caption || "End balances") + "</span>" + chips.map(function (c) {
    return '<b data-end="' + bankEsc(c.name) + '" data-missing="' + (c.missing ? "1" : "0") + '">' +
      bankEsc(c.name) + (c.mask ? " " + bankEsc(c.mask) : "") + " " + bankMoney(c.missing ? null : c.value) + "</b>";
  }).join("") + "</div>";
}

function bankTabsHtml(tab) {
  var items = [["historical", "Historical"], ["current", "Current"], ["budget", "Budget"]];
  return '<div class="bank-tabs" role="tablist" aria-label="Banking">' + items.map(function (it) {
    var on = it[0] === tab;
    return '<button type="button" role="tab" data-bank-tab="' + it[0] + '" class="' + (on ? "on" : "") + '" aria-selected="' +
      (on ? "true" : "false") + '">' + it[1] + "</button>";
  }).join("") + "</div>";
}

function bankChipOptions(categories, current) {
  var list = (categories || []).slice();
  if (current && list.indexOf(current) < 0) list.unshift(current);
  return list.map(function (name) {
    var sel = name === current ? " selected" : "";
    return '<option value="' + bankEsc(name) + '"' + sel + ">" + bankEsc(name) + "</option>";
  }).join("");
}

function bankTapeHtml(rows, opts) {
  if (!rows || !rows.length) return "";
  opts = opts || {};
  var note = opts.sync ? '<p class="hint bank-sync">Category edits sync across your seats</p>' : "";
  var err = opts.error ? '<p class="bank-override-err" role="status">' + bankEsc(opts.error) + "</p>" : "";
  return '<section class="bank-tape-block"><h3>Recent</h3>' + note + err + '<table class="bank-tape"><tbody>' +
    rows.map(function (r) {
      var label = r.desc ? r.desc : (r.category || "Other");
      var flow = r.flow ? '<i class="bank-flow">' + bankEsc(r.flow) + "</i>" : "";
      return "<tr><td>" + bankEsc(r.date) + '</td><td><div class="bank-tx-main"><span class="bank-merchant">' +
        bankEsc(label) + '</span><select class="bank-chip" data-bank-tx="' + bankEsc(r.key) +
        '" aria-label="Category for ' + bankEsc(label) + '">' + bankChipOptions(opts.categories, r.category) +
        "</select>" + flow + "</div></td><td>" + bankMoney(r.amount) + "</td></tr>";
    }).join("") + "</tbody></table></section>";
}

function bankTilesHtml(tiles, total) {
  if (!tiles.length) return '<p class="bank-empty">No accounts in this print.</p>';
  var cards = tiles.map(function (t) {
    return '<article class="bank-tile" data-acct="' + bankEsc(t.name) + '" data-balance="' + (t.missing ? "missing" : String(t.balance)) + '">' +
      '<span class="k">' + bankEsc(t.name) + "</span>" +
      (t.mask ? '<i class="mask">' + bankEsc(t.mask) + "</i>" : "") +
      "<b>" + bankMoney(t.missing ? null : t.balance) + "</b></article>";
  }).join("");
  var totalMissing = total == null;
  cards += '<article class="bank-tile bank-total" data-total="' + (totalMissing ? "missing" : "set") + '"><span class="k">Total cash</span><b>' +
    bankMoney(totalMissing ? null : total) + "</b></article>";
  return '<div class="bank-tiles">' + cards + "</div>";
}

function bankCurrentHtml(snap, opts) {
  opts = opts || {};
  var tiles = bankPairBalances(bankAccounts(snap), (snap.current && snap.current.balances) || []);
  var total = bankTotalCash(snap.current, tiles);
  var stale = bankStale(snap.asof, opts.now);
  var asof = bankAsofLabel(snap.asof);
  var head = '<p class="bank-asof">' + (asof ? "As of " + bankEsc(asof) : "As of \u2014") +
    (stale ? ' <span class="bank-stale">Stale \u00b7 older than 36h</span>' : "") + "</p>";
  var cats = bankClosedCats(snap);
  /* Last-closed-month pie stays on Forge totals. Overrides retitle recent_tx until the feed republishes. */
  return head + bankTilesHtml(tiles, total) + bankSparkHtml(bankSparkSeries(snap)) +
    bankPieBlock(cats, "Last closed month") + bankTapeHtml(bankRecent(snap), {
      categories: bankKnownCategories(snap),
      sync: bankHasOverrides(snap),
      error: opts.overrideError || ""
    });
}

function bankMonthHeader(month, accounts) {
  var open = bankOpenMonth(month);
  return '<div class="bank-month-head"><h3>' + bankEsc(month.month) +
    (open ? ' <i class="bank-open">in progress</i>' : "") + "</h3>" +
    '<div class="bank-kpi">' +
    bankKpi("income", "Income", bankMoney(month.income_total), bankNum(month.income_total) == null, false) +
    bankKpi("spend", "Spend", bankMoney(month.spend_total), bankNum(month.spend_total) == null, false) +
    bankKpi("net", "Net", bankMoney(month.net), bankNum(month.net) == null, false) +
    bankKpi("tx", "Transactions", bankCount(month.tx_count), bankNum(month.tx_count) == null, false) +
    "</div>" + bankEndHtml(bankEndChips(month, accounts), "End balances") + "</div>";
}

function bankYearHeader(months, accounts) {
  var income = bankSumField(months, "income_total");
  var spend = bankSumField(months, "spend_total");
  var net = bankSumField(months, "net");
  var tx = bankSumField(months, "tx_count");
  var ends = bankLatestEnds(months, accounts);
  var cap = ends.month ? "End balances \u00b7 " + ends.month : "End balances";
  return '<div class="bank-month-head"><h3>Year</h3><div class="bank-kpi">' +
    bankKpi("income", "Income", bankMoney(income.value), income.value == null, income.partial) +
    bankKpi("spend", "Spend", bankMoney(spend.value), spend.value == null, spend.partial) +
    bankKpi("net", "Net", bankMoney(net.value), net.value == null, net.partial) +
    bankKpi("tx", "Transactions", tx.value == null ? "\u2014" : bankCount(tx.value), tx.value == null, tx.partial) +
    "</div>" + bankEndHtml(ends.chips, cap) + "</div>";
}

function bankYearTable(months) {
  if (!months.length) return "";
  return '<table class="bank-table"><thead><tr><th>Month</th><th>Income</th><th>Spend</th><th>Net</th><th>Tx</th></tr></thead><tbody>' +
    months.map(function (m) {
      return "<tr><td>" + bankEsc(m.month) + (bankOpenMonth(m) ? " · in progress" : "") + "</td><td>" +
        bankMoney(m.income_total) + "</td><td>" + bankMoney(m.spend_total) + "</td><td>" + bankMoney(m.net) +
        "</td><td>" + bankCount(m.tx_count) + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function bankHistHtml(snap, opts) {
  opts = opts || {};
  var accounts = bankAccounts(snap);
  var months = bankMonths(snap);
  var sel = bankHistSelection(months, opts.year, opts.month);
  if (!months.length) return '<p class="bank-empty">No history in this print.</p>';
  var yearOpts = sel.years.map(function (y) {
    return '<option value="' + bankEsc(y) + '"' + (y === sel.year ? " selected" : "") + ">" + bankEsc(y) + "</option>";
  }).join("");
  var strip = '<div class="bank-months" role="tablist" aria-label="Months">' +
    '<button type="button" data-bank-month="year" class="' + (sel.month === "year" ? "on" : "") + '">Year</button>' +
    sel.inYear.map(function (m) {
      var on = m.month === sel.month;
      return '<button type="button" data-bank-month="' + bankEsc(m.month) + '" class="' + (on ? "on" : "") + '">' +
        bankEsc(bankMonthLabel(m.month)) + (bankOpenMonth(m) ? ' <i class="bank-open">in progress</i>' : "") + "</button>";
    }).join("") + "</div>";
  var controls = '<div class="bank-hist-controls"><label>Year <select data-bank-year>' + yearOpts + "</select></label>" + strip + "</div>";
  var body;
  if (sel.month === "year") {
    body = bankYearHeader(sel.inYear, accounts) + bankYearSvg(sel.inYear) +
      '<details class="bank-more"><summary>Month table</summary>' + bankYearTable(sel.inYear) + "</details>";
  } else {
    var month = null;
    sel.inYear.forEach(function (m) { if (m.month === sel.month) month = m; });
    if (!month) return controls + '<p class="bank-empty">That month is not in this print.</p>';
    var rows = bankSpendRows(bankCatList(month), month.income);
    body = bankMonthHeader(month, accounts) + bankPieBlock(rows, "Categories") +
      '<details class="bank-more"><summary>Category table</summary>' + bankCatTable(bankCatList(month)) + "</details>";
  }
  return controls + body;
}

function bankMtdCaption(asof) {
  var m = String(asof || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "Month to date";
  var dim = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return "Month to date \u00b7 day " + Number(m[3]) + " of " + dim;
}

function bankBarsHtml(rows) {
  if (!rows.length) return '<p class="bank-empty">No category plan in this print.</p>';
  var max = 0;
  rows.forEach(function (r) {
    if (r.target != null) max = Math.max(max, r.target);
    if (r.actual != null) max = Math.max(max, r.actual);
  });
  return rows.map(function (r) {
    var pct = r.actual == null || !(max > 0) ? 0 : Math.max(0, Math.min(100, (r.actual / max) * 100));
    var tick = r.target == null || !(max > 0) ? null : Math.max(0, Math.min(100, (r.target / max) * 100));
    var fill = r.actual == null ? "" : '<span class="fill" style="width:' + pct.toFixed(1) + '%"></span>';
    var mark = tick == null ? "" : '<i class="tick" style="left:' + tick.toFixed(1) + '%"></i>';
    return '<div class="bank-bar' + (r.over ? " over" : "") + '" data-bar="' + bankEsc(r.name) + '">' +
      '<div class="bank-bar-k"><span>' + bankEsc(r.name) + "</span><b>MTD " + bankMoney(r.actual) +
      "</b><i>target " + bankMoney(r.target) + "</i></div>" +
      '<div class="bank-bar-track" aria-hidden="true">' + fill + mark + "</div></div>";
  }).join("");
}

function bankCalendarHtml(cells, hasDays) {
  if (!hasDays) return '<p class="bank-empty">Due days need more history</p>';
  return '<div class="bank-days">' + cells.map(function (c) {
    var bits = [];
    c.pays.forEach(function (name) { bits.push('<em class="pay">' + bankEsc(name) + "</em>"); });
    c.bills.forEach(function (name) { bits.push("<span>" + bankEsc(name) + "</span>"); });
    c.items.forEach(function (name) {
      if (c.bills.indexOf(name) >= 0) return;
      bits.push("<span>" + bankEsc(name) + "</span>");
    });
    return '<div class="bank-day' + (bits.length ? " has" : "") + '"><b>' + c.day + "</b>" + bits.join("") + "</div>";
  }).join("") + "</div>";
}

function bankCoversHtml(groups) {
  if (!groups.length) return "";
  return '<ul class="bank-covers">' + groups.map(function (g) {
    var names = g.bills.map(function (b) { return bankEsc(b.name); });
    return "<li><b>This check (" + bankEsc(g.label) + ", day " + g.day + ") covers:</b> " +
      (names.length ? names.join(", ") : "no dated bills") + "</li>";
  }).join("") + "</ul>";
}

function bankBillListHtml(bills) {
  if (!bills.length) return "";
  return '<ul class="bank-bill-list">' + bills.map(function (b) {
    var day = b.typical_day == null ? "\u2014" : String(b.typical_day);
    return "<li><span>" + bankEsc(b.name) + "</span><b>" + bankMoney(b.amount) + "</b><i>day " + day + "</i></li>";
  }).join("") + "</ul>";
}

function bankEditsHtml(bills, incomes, edits, open) {
  if (!bills.length && !incomes.length) return "";
  var billEd = (edits && edits.bills) || {};
  var incEd = (edits && edits.income) || {};
  function field(kind, name, stored) {
    var val = Object.prototype.hasOwnProperty.call(stored, name) && bankDay(stored[name]) != null ? String(bankDay(stored[name])) : "";
    return '<label>' + bankEsc(name) + ' <input type="number" min="1" max="31" inputmode="numeric" placeholder="day" data-bank-edit="' +
      kind + '" data-bank-name="' + bankEsc(name) + '" value="' + bankEsc(val) + '"></label>';
  }
  var fields = incomes.map(function (inc) { return field("income", inc.label, incEd); }).join("") +
    bills.map(function (b) { return field("bill", b.name, billEd); }).join("");
  return '<details class="bank-edits"' + (open ? " open" : "") + "><summary>Due days on this browser</summary>" +
    '<p class="hint">Saved only in this browser. A blank day leaves the feed value, or blank when the feed has none.</p>' +
    '<div class="bank-edit-grid">' + fields + "</div></details>";
}

function bankBudgetHtml(snap, opts) {
  opts = opts || {};
  var budget = (snap && snap.budget) || {};
  var bills = bankNormalizeBills(budget);
  var incomes = bankNormalizeIncome(budget);
  bankApplyEdits(bills, incomes, opts.edits);
  var insights = bankNormalizeInsights(budget);
  var cells = bankDayCells(bills, incomes, Array.isArray(budget.calendar) ? budget.calendar : []);
  var hasDays = bankHasDueDays(cells);
  var insightHtml = insights.length
    ? '<ul class="bank-insights">' + insights.map(function (row) {
      var cls = "bank-insight" + (row.severity ? " sev-" + row.severity : "");
      return '<li class="' + cls + '">' + bankEsc(bankInsightText(row)) + "</li>";
    }).join("") + "</ul>"
    : '<p class="bank-empty">No insights in this print.</p>';
  var bars = bankBudgetBars(budget);
  return '<div class="bank-budget-top"><section class="bank-insight-block"><h3>Insights</h3>' + insightHtml +
    '</section><section class="bank-cal"><h3>Bill calendar</h3>' + bankCalendarHtml(cells, hasDays) +
    bankCoversHtml(bankCheckGroups(bills, incomes)) + "</section></div>" +
    bankBillListHtml(bills) +
    '<section class="bank-bars"><h3>' + bankEsc(bankMtdCaption(snap && snap.asof)) + "</h3>" + bankBarsHtml(bars) + "</section>" +
    bankEditsHtml(bills, incomes, opts.edits, !!opts.editsOpen);
}

function bankPageHtml(snap, opts) {
  opts = opts || {};
  var tab = bankResolveTab(opts.tab || "current");
  var panel = "";
  if (tab === "historical") panel = bankHistHtml(snap || {}, opts);
  else if (tab === "budget") panel = bankBudgetHtml(snap || {}, opts);
  else panel = bankCurrentHtml(snap || {}, opts);
  return bankTabsHtml(tab) + '<div class="bank-panel" data-panel="' + tab + '" role="tabpanel">' + panel +
    '<p class="hint bank-src">From the one-time passcode feed. Blank means the print omitted that figure.</p></div>';
}

function bankReadStore() {
  try {
    if (typeof localStorage === "undefined" || !localStorage.getItem) return { bills: {}, income: {} };
    var raw = localStorage.getItem(BANK_STORE);
    var o = raw ? JSON.parse(raw) : null;
    if (!o || typeof o !== "object") return { bills: {}, income: {} };
    return { bills: o.bills && typeof o.bills === "object" ? o.bills : {}, income: o.income && typeof o.income === "object" ? o.income : {} };
  } catch (e) {
    return { bills: {}, income: {} };
  }
}

function bankWriteStore(store) {
  try {
    if (typeof localStorage === "undefined" || !localStorage.setItem) return;
    localStorage.setItem(BANK_STORE, JSON.stringify(store || { bills: {}, income: {} }));
  } catch (e) {}
}

function bankPaint(root) {
  if (!root || !root._bank) return;
  var st = root._bank;
  var sel = bankHistSelection(bankMonths(st.data), st.year, st.month);
  st.year = sel.year;
  st.month = sel.month;
  root.innerHTML = bankPageHtml(st.data, {
    tab: st.tab,
    year: st.year,
    month: st.month,
    now: st.now,
    edits: st.edits || bankReadStore(),
    editsOpen: !!st.editsOpen,
    overrideError: st.overrideError || ""
  });
}

function bankActivate(root, tab) {
  if (!root || !root._bank) return;
  root._bank.tab = bankResolveTab(tab);
  try {
    if (typeof history !== "undefined" && history.replaceState && typeof location !== "undefined") {
      var h = root._bank.tab === "current" ? "" : "#" + root._bank.tab;
      history.replaceState(null, "", (location.pathname || "") + (location.search || "") + h);
    }
  } catch (e) {}
  bankPaint(root);
}

function bankActivateMonth(root, month) {
  if (!root || !root._bank) return;
  root._bank.tab = "historical";
  root._bank.month = month || "year";
  bankPaint(root);
}

function bankSaveEdit(root, input) {
  if (!root || !root._bank || !input || !input.getAttribute) return;
  var kind = input.getAttribute("data-bank-edit") === "income" ? "income" : "bills";
  var name = input.getAttribute("data-bank-name") || "";
  if (!name) return;
  var store = bankReadStore();
  if (!store[kind]) store[kind] = {};
  var raw = String(input.value == null ? "" : input.value).trim();
  if (!raw) delete store[kind][name];
  else {
    var d = bankDay(raw);
    if (d == null) return;
    store[kind][name] = d;
  }
  bankWriteStore(store);
  root._bank.edits = bankReadStore();
  root._bank.editsOpen = true;
  bankPaint(root);
}

function bankReadJson(res) {
  if (!res || typeof res.json !== "function") return Promise.resolve(null);
  try {
    return Promise.resolve(res.json()).then(function (data) { return data; }, function () { return null; });
  } catch (e) {
    return Promise.resolve(null);
  }
}

function bankRememberOverride(snap, key, category) {
  var map = {};
  var prev = bankOverrideMap(snap);
  Object.keys(prev).forEach(function (k) { map[k] = prev[k]; });
  var cat = category == null ? "" : String(category).trim();
  if (!cat) delete map[key];
  else map[key] = cat;
  snap.category_overrides = map;
}

function bankRefetch(root) {
  return fetch(BANK_DATA_URL, bankFetchInit()).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") return false;
    return bankReadJson(res).then(function (data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      root._bank.data = data;
      root._bank.overrideError = "";
      bankPaint(root);
      return true;
    });
  }).catch(function () { return false; });
}

function bankTakeOverrideResponse(root, payload, key, category) {
  var st = root._bank;
  if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    st.data = payload;
    st.overrideError = "";
    bankPaint(root);
    return Promise.resolve();
  }
  if (payload && payload.overrides && typeof payload.overrides === "object" && !Array.isArray(payload.overrides)) {
    if (!st.data || typeof st.data !== "object") st.data = {};
    st.data.category_overrides = payload.overrides;
    st.overrideError = "";
    bankPaint(root);
    return Promise.resolve();
  }
  return bankRefetch(root).then(function (ok) {
    if (ok) return;
    if (key && st.data) bankRememberOverride(st.data, key, category);
    st.overrideError = "";
    bankPaint(root);
  });
}

function bankOverrideErrorText(res) {
  if (bankIsLockedResponse(res)) return "Sign in again to save a category edit.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Category edits are not on the feed yet. Nothing was saved.";
  return "Category edit did not save. Nothing was changed.";
}

function bankSaveCategory(root, key, category) {
  if (!root || !root._bank || !key) return Promise.resolve();
  var next = category == null ? "" : String(category).trim();
  if (!next) return Promise.resolve();
  var same = false;
  bankRecent(root._bank.data).forEach(function (r) {
    if (r.key === key && r.category === next) same = true;
  });
  if (same) return Promise.resolve();
  root._bank.overrideError = "";
  return fetch(BANK_OVERRIDES_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key, category: next })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.overrideError = bankOverrideErrorText(res);
      bankPaint(root);
      return;
    }
    return bankReadJson(res).then(function (payload) {
      return bankTakeOverrideResponse(root, payload, key, next);
    });
  }).catch(function () {
    root._bank.overrideError = "Category edit did not save. Nothing was changed.";
    bankPaint(root);
  });
}

function bankMount(root, data, opts) {
  if (!root) return;
  opts = opts || {};
  var tab = opts.tab ? bankResolveTab(opts.tab) : bankResolveTab(typeof location !== "undefined" ? location.hash : "");
  root._bank = {
    data: data || {},
    tab: tab,
    year: opts.year || null,
    month: opts.month || null,
    now: opts.now,
    edits: opts.edits || bankReadStore(),
    editsOpen: !!opts.editsOpen,
    overrideError: opts.overrideError || ""
  };
  bankPaint(root);
  if (root._bankBound || !root.addEventListener) return;
  root._bankBound = true;
  root.addEventListener("click", function (e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var tabBtn = t.closest("[data-bank-tab]");
    if (tabBtn && tabBtn.getAttribute) {
      bankActivate(root, tabBtn.getAttribute("data-bank-tab"));
      return;
    }
    var monthBtn = t.closest("[data-bank-month]");
    if (monthBtn && monthBtn.getAttribute) bankActivateMonth(root, monthBtn.getAttribute("data-bank-month"));
  });
  root.addEventListener("change", function (e) {
    var el = e && e.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute("data-bank-tx")) {
      return bankSaveCategory(root, el.getAttribute("data-bank-tx"), el.value);
    }
    if (el.hasAttribute && el.hasAttribute("data-bank-year")) {
      root._bank.year = el.value;
      root._bank.month = "year";
      root._bank.tab = "historical";
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-edit")) bankSaveEdit(root, el);
  });
  root.addEventListener("toggle", function (e) {
    var el = e && e.target;
    if (!el || !el.classList || !el.classList.contains("bank-edits")) return;
    if (root._bank) root._bank.editsOpen = !!el.open;
  });
}

function bankLoad(root, fetcher) {
  var run = fetcher || function () {
    return fetch(BANK_DATA_URL, bankFetchInit());
  };
  return Promise.resolve().then(run).then(function (res) {
    if (!res || res.ok !== true) {
      var kind = bankIsLockedResponse(res) ? "gate" : bankClassifyStatus(res && res.status);
      root.innerHTML = bankGateHtml(kind);
      return;
    }
    return Promise.resolve(res.json()).then(function (data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        root.innerHTML = bankGateHtml("missing");
        return;
      }
      bankMount(root, data);
    });
  }).catch(function () {
    if (root) root.innerHTML = bankGateHtml("error");
  });
}

function bankApplyTheme(choice) {
  var t = choice || "justin";
  if (t === "nina" || t === "purple") t = "nina";
  else t = "justin";
  try { document.documentElement.setAttribute("data-theme", t); } catch (e) {}
  try { localStorage.setItem("murphyPilotTheme", t); } catch (e2) {}
  try {
    document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-theme-choice") === t);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "nina" ? "#1A0A24" : "#08090B");
  } catch (e3) {}
}

function bankTickClock() {
  var el;
  try { el = document.getElementById("clock"); } catch (e) { return; }
  if (!el) return;
  var tEl = el.querySelector ? el.querySelector(".t") : null;
  var dEl = el.querySelector ? el.querySelector(".d") : null;
  var now = new Date();
  var clock = "";
  var date = "";
  try {
    clock = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now) + " ET";
    date = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(now);
  } catch (e2) {
    clock = "--:--:-- ET";
  }
  if (tEl) tEl.textContent = clock;
  if (dEl) dEl.textContent = date;
}

function bankBoot() {
  var root = null;
  try { root = document.getElementById("bankDesk"); } catch (e) { return; }
  if (!root) return;
  try {
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest("[data-theme-choice]");
      if (!b) return;
      bankApplyTheme(b.getAttribute("data-theme-choice"));
    });
  } catch (e1) {}
  bankTickClock();
  try { setInterval(bankTickClock, 1000); } catch (e2) {}
  bankLoad(root);
}

function bankStart() {
  try {
    if (typeof document === "undefined" || !document.getElementById) return;
    if (!document.getElementById("bankDesk")) return;
    bankBoot();
  } catch (e) {}
}
bankStart();
