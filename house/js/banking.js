/* tip ds — House Banking.
   The main tabs run Budget, Current, Historical. An empty or unknown hash still opens Current.
   Current is the live print. Budget is the plan, the due map, and progress against limits.
   Month-end balances stay off Current.
   The recent tape keeps its print window and scrolls inside a pane about ten rows tall.
   Bill, Optional, and Savings meters compare month-to-date print spend with a limit from the print.
   A missing Savings limit stays pending. This tip does not draw a meter per category.
   The in/out bar sums this month's inflows and outflows and leaves out transfers between linked accounts.
   A move is internal when the print flags it, when both account ids are on the user's accounts, or when the flow or category is a transfer on a linked account and no outside account is named.
   The live spent-versus-income block sits on Current. Historical keeps its own labels.
   Edits is not a main tab. A gear menu beside Budget, Current, and Historical opens it.
   #edits still resolves through bankResolveTab and bankActivate.
   A tab click writes that hash with pushState so back and forward can return to it.
   hashchange and popstate read the hash and call bankActivate with fromHistory set.
   Budget stacks the bill calendar above Insights. Covers stay under the calendar.
   Live numbers come only from GET /data/banking.json (OTP cookie).
   Category edits POST to /data/banking/overrides.json.
   Custom categories POST to /data/banking/categories.json.
   Mount and Edits also GET categories.json and merge that list into the dropdowns.
   A failed categories read keeps names already on the banking snap and does not post a removal.
   An empty categories list does not wipe a custom that any override still names.
   A just-added custom stays in every Edits dropdown while it is still empty (draft or keptEmpty).
   Entering or refreshing Edits paints the lists, then reloads categories.json. It does not post a removal.
   The last-merchant reassign path still posts a removal when that custom is unused everywhere.
   A custom that is any category_overrides value stays, including history_tx outside the edits window.
   Feed categories stay when they were never in custom_categories.
   A merchant row add posts the category, then that row's override. The assign is not skipped when the feed body is stale.
   Due days POST to /data/banking/dueday-overrides.json.
   Bill versus Optional posts to /data/banking/mustpay-overrides.json.
   Stored kinds are must_pay (shown as Bill) and elective (shown as Optional).
   An unmarked name is Bill when it is a normalized bill or it has a due day.
   Any other unmarked spend category is Optional. An override always wins.
   Budget and Edits show a display name. Keys stay on the raw category or bill name.
   A bill or budget category that contains the word mobile displays as Phone, except when another word begins with home, deposit, bank, transfer, al, bay, water, electric, gas, power, utility (including utilities), or check. A skipped mobile name stays the full label, including when it ends in a generic tail. Matching keys stay on the raw name, the same way a leading provider is stripped only on screen.
   A car policy displays as Car Insurance. A home, life, renters, or pet policy displays as Home Insurance, Life Insurance, Renters Insurance, or Pet Insurance. The bare bill name Insurance is a category-average filler and stays off the bill list, calendar, covers, and Edits due-day list. The Insurance spend category stays in the Edits category list.
   budget.exclusions entries, matched by label without case, are not Bills. A health-insurance name displays as Health Insurance and is treated the same way when it shows up as a bill. Neither becomes Bill or Optional from the must-pay default.
   A bill may carry prev_key or alias. Due-day and must-pay lookups also read that older key. Saves stay on the raw name.
   income_monthly rows show on Budget. A row with editable true can take an amount and a day in Edits. A blank stays blank. An amount below zero is saved as 0. An amount above 10000000 is saved as 10000000. Text that is not a number is ignored.
   Edits lists current.edits_tx (the long window) plus history tx arrays.
   A present edits_tx does not hide a merchant that lives only on history.
   The Current tape stays on recent_tx. The merchant line and the category chip stay the feed strings. A known category with no rows still reads "No items in this category."
   A transaction key prefers tx_key, otherwise date|id|amount|desc.
   Due-day precedence: user KV, then snapshot manual, then a feed day, then a generic filler only when the feed day is null.
   Custom categories and both edits sync across seats. A null balance stays blank.
   A bill prefers typical_amount, then amount, and reads "amount pending" when both are blank.
   The Bill list is those budget bills and due-day items from the print. Those names share the spend-category name space when Bill or Optional is tagged. It is not a second category system.
   The bill calendar is a Sun–Sat month grid for the as-of date in ET.
   Each pay or bill label keeps its full display name on title and aria-label.
   A day with two or more labels shows the first name and a +N chip at narrow widths, and two names on a wide screen. The full list stays on the day title and in the bill list.
   Budget Income and Bills are separate sections.
   The Budget month-to-date block shows spent so far and income received, with a bar for spend as a share of income. It does not invent income from income_monthly.
   Budget pies, the ranked lists under those pies, and month-to-date category bars list a category only when its month-to-date spend is positive.
   A plan, a missing amount, or a zero or non-positive amount does not keep that category on those surfaces, and it does not invent spend.
   Edits still lists those empty categories so Bill versus Optional can be tagged.
   This file does not embed balances, last-4s, or named utilities. */

var BANK_STALE_MS = 36 * 60 * 60 * 1000;
var BANK_STORE = "murphyHouseBanking";
var BANK_DATA_URL = "/data/banking.json";
var BANK_OVERRIDES_URL = "/data/banking/overrides.json";
var BANK_DUEDAY_URL = "/data/banking/dueday-overrides.json";
var BANK_MUSTPAY_URL = "/data/banking/mustpay-overrides.json";
var BANK_CATEGORIES_URL = "/data/banking/categories.json";
/* Generic bill tails only. A leading provider is hidden at display time (Acme Mortgage shows as Mortgage).
   The word mobile is not a tail. bankBillDisplayName shows that word as Phone on bill and budget category labels, except a home, deposit, bank, transfer, al, bay, water, electric, gas, power, utility, or check name. The utility prefix also covers utilities. */
var BANK_DISPLAY_TAILS = [
  "gas (utility)",
  "natural gas",
  "car payment",
  "auto loan",
  "auto payment",
  "vehicle loan",
  "mortgage payment",
  "utilities/bills",
  "electricity",
  "childcare",
  "insurance",
  "internet",
  "mortgage",
  "utilities",
  "tuition",
  "electric",
  "phone",
  "water",
  "sewer",
  "power",
  "cable",
  "trash",
  "rent",
  "gas",
  "hoa",
  "bills"
];
var BANK_CAT_MAX = 64;
var BANK_INCOME_MAX = 1e7;
/* A mobile name stays off the Phone label when another word begins with one of these.
   utilit covers both utility and utilities. */
var BANK_PHONE_SKIP = /\b(?:home|deposit|bank|transfer|al|bay|water|electric|gas|power|utilit|check)/i;
var BANK_ROW_ADD = "__add_category__";
var BANK_COLORS = ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--mix-f)"];
var BANK_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var BANK_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/* Display only. Matching keys (overrides, mustpay, dueday, categories, dig-in, POST bodies) stay on the raw name.
   A leading provider is hidden. Bill and budget labels use bankBillDisplayName when the word mobile should read as Phone. A skipped mobile name stays the full label. */
function bankDisplayName(name) {
  var raw = String(name == null ? "" : name).trim().replace(/\s+/g, " ");
  if (!raw) return "";
  var lower = raw.toLowerCase();
  var i;
  for (i = 0; i < BANK_DISPLAY_TAILS.length; i++) {
    if (lower === BANK_DISPLAY_TAILS[i]) return raw;
  }
  var best = "";
  for (i = 0; i < BANK_DISPLAY_TAILS.length; i++) {
    var tail = BANK_DISPLAY_TAILS[i];
    var needle = " " + tail;
    if (lower.length > needle.length && lower.lastIndexOf(needle) === lower.length - needle.length) {
      if (tail.length > best.length) best = tail;
    }
  }
  if (!best) return raw;
  return raw.slice(raw.length - best.length);
}

/* Bill and budget category labels. The word mobile displays as Phone unless another word
   begins with home, deposit, bank, transfer, al, bay, water, electric, gas, power, utility, or check.
   The utility prefix is spelled utilit so utilities matches too.
   Those skipped names stay raw, so a utility tail is not stripped. A car policy displays as Car Insurance.
   Home, life, renters, and pet policies keep that type. The Current tape does not use this. */
function bankBillDisplayName(name) {
  var raw = String(name == null ? "" : name).trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (/\bmobile\b/i.test(raw) && !BANK_PHONE_SKIP.test(raw)) return "Phone";
  var policy = bankInsuranceDisplayLabel(raw);
  if (policy) return policy;
  if (/\bmobile\b/i.test(raw)) return raw;
  return bankDisplayName(raw);
}

function bankFoldName(name) {
  return String(name == null ? "" : name).trim().replace(/\s+/g, " ").toLowerCase();
}

function bankIsBareInsuranceName(name) {
  return bankFoldName(name) === "insurance";
}

/* A health policy is a paycheck deduction, not a car policy and not a bill. */
function bankIsHealthInsuranceName(name) {
  var s = bankFoldName(name);
  return /\bhealth\b/.test(s) && /\binsurance\b/.test(s);
}

/* Provider plus insurance, or car / auto / vehicle plus insurance. Not health, home, life, renters, pet, or a bare Insurance filler. */
function bankIsCarPolicyName(name) {
  var s = bankFoldName(name);
  if (!s || !/\binsurance\b/.test(s) || s === "insurance") return false;
  if (/\b(health|home|life|renters|renter|pet|dental|vision|medical)\b/.test(s)) return false;
  return true;
}

/* Title-case policy labels. The bare Insurance filler is not one of these. */
function bankTypedInsuranceLabel(name) {
  var s = bankFoldName(name);
  if (!s || s === "insurance" || !/\binsurance\b/.test(s)) return "";
  if (/\bhome\b/.test(s)) return "Home Insurance";
  if (/\blife\b/.test(s)) return "Life Insurance";
  if (/\b(?:renters|renter)\b/.test(s)) return "Renters Insurance";
  if (/\bpet\b/.test(s)) return "Pet Insurance";
  return "";
}

function bankInsuranceDisplayLabel(name) {
  if (bankIsHealthInsuranceName(name)) return "Health Insurance";
  if (bankIsCarPolicyName(name)) return "Car Insurance";
  return bankTypedInsuranceLabel(name);
}

function bankExclusionLabels(budget) {
  var list = budget && budget.exclusions;
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function (row) {
    var label = typeof row === "string" ? row : (row && (row.label || row.name));
    var key = bankFoldName(label);
    if (!key || out.indexOf(key) >= 0) return;
    out.push(key);
  });
  return out;
}

function bankIsExcludedName(name, budget) {
  var key = bankFoldName(name);
  if (!key) return false;
  return bankExclusionLabels(budget).indexOf(key) >= 0;
}

function bankIncomeLabels(budget) {
  var list = budget && budget.income_monthly;
  var out = [];
  if (!Array.isArray(list)) return out;
  list.forEach(function (raw) {
    var label = bankFoldName(raw && (raw.label || raw.name));
    if (!label || out.indexOf(label) >= 0) return;
    out.push(label);
  });
  return out;
}

function bankIsListedIncome(name, budget) {
  var key = bankFoldName(name);
  if (!key) return false;
  return bankIncomeLabels(budget).indexOf(key) >= 0;
}

/* Bill surfaces only. A bare Insurance spend category is not hidden here. */
function bankIsHiddenBillName(name, budget) {
  if (bankIsBareInsuranceName(name)) return true;
  if (bankIsHealthInsuranceName(name)) return true;
  if (bankIsExcludedName(name, budget)) return true;
  if (bankIsListedIncome(name, budget)) return true;
  return false;
}

function bankSurfaceBills(bills, budget) {
  return (bills || []).filter(function (b) {
    return b && !bankIsHiddenBillName(b.name, budget);
  });
}

/* Paycheck deductions stay out of Bill and Optional. */
function bankSkipKindName(name, snap) {
  var budget = (snap && snap.budget) || {};
  if (bankIsHealthInsuranceName(name)) return true;
  if (bankIsExcludedName(name, budget)) return true;
  if (bankIsListedIncome(name, budget)) return true;
  return false;
}

function bankCollectAliasKeys(raw) {
  var keys = [];
  function add(v) {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach(add);
      return;
    }
    var k = bankBillKey(v);
    if (!k || keys.indexOf(k) >= 0) return;
    keys.push(k);
  }
  if (!raw || typeof raw !== "object") return keys;
  add(raw.prev_key);
  add(raw.prev_keys);
  add(raw.alias);
  add(raw.aliases);
  return keys;
}

function bankRememberAliases(row, raw) {
  if (!row.alias_keys) row.alias_keys = [];
  var selfKey = bankBillKey(row.name);
  bankCollectAliasKeys(raw).forEach(function (k) {
    if (!k || k === selfKey || row.alias_keys.indexOf(k) >= 0) return;
    row.alias_keys.push(k);
  });
}

/* An older key on a renamed bill is not its own budget row. */
function bankIsAliasOnlyName(name, budget) {
  var key = bankBillKey(name);
  if (!key) return false;
  var rows = [];
  if (budget && Array.isArray(budget.bills)) rows = rows.concat(budget.bills);
  if (budget && Array.isArray(budget.bills_monthly)) rows = rows.concat(budget.bills_monthly);
  var aliasHit = false;
  var self = false;
  rows.forEach(function (raw) {
    if (!raw || typeof raw !== "object") return;
    if (bankBillKey(raw.name || raw.label) === key) self = true;
    bankCollectAliasKeys(raw).forEach(function (ak) {
      if (ak === key) aliasHit = true;
    });
  });
  return aliasHit && !self;
}

function bankAliasKeysForName(budget, name) {
  var want = bankBillKey(name);
  var keys = [];
  function take(raw) {
    if (!raw || typeof raw !== "object") return;
    var n = String(raw.name || raw.label || "").trim();
    if (bankBillKey(n) !== want) return;
    bankCollectAliasKeys(raw).forEach(function (k) {
      if (!k || k === want || keys.indexOf(k) >= 0) return;
      keys.push(k);
    });
  }
  var bills = budget && budget.bills;
  var monthly = budget && budget.bills_monthly;
  if (Array.isArray(bills)) bills.forEach(take);
  if (Array.isArray(monthly)) monthly.forEach(take);
  return keys;
}

function bankDueMapEntry(dueMap, key) {
  if (!dueMap || key == null || key === "") return null;
  if (Object.prototype.hasOwnProperty.call(dueMap, key)) return { value: dueMap[key] };
  var want = String(key).trim().toLowerCase();
  var entry = null;
  Object.keys(dueMap).forEach(function (k) {
    if (entry) return;
    if (String(k).trim().toLowerCase() !== want) return;
    entry = { value: dueMap[k] };
  });
  return entry;
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
  if (h === "historical" || h === "budget" || h === "current" || h === "edits") return h;
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
  if (raw.tx_key != null && String(raw.tx_key).trim() !== "") return String(raw.tx_key);
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

function bankClipCategory(name) {
  if (typeof name !== "string") return "";
  var n = name.trim();
  if (!n) return "";
  if (n.length > BANK_CAT_MAX) n = n.slice(0, BANK_CAT_MAX).trim();
  return n;
}

function bankCustomCategories(snap) {
  var raw = snap && snap.custom_categories;
  if (!Array.isArray(raw)) return [];
  var seen = {};
  var out = [];
  raw.forEach(function (name) {
    var n = bankClipCategory(name);
    if (!n || seen[n]) return;
    seen[n] = true;
    out.push(n);
  });
  return out;
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
  bankEditSourceLists(snap).forEach(function (list) {
    list.forEach(function (r) { if (r) add(r.category); });
  });
  var ov = bankOverrideMap(snap);
  Object.keys(ov).forEach(function (k) { add(ov[k]); });
  /* A custom with no transactions still belongs in both Edits dropdowns. */
  bankCustomCategories(snap).forEach(add);
  if (seen.Other) order = order.filter(function (n) { return n !== "Other"; });
  order.push("Other");
  return order;
}

function bankMapTx(raw, i, overrides) {
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
}

function bankSortTx(rows) {
  return rows.sort(function (a, b) {
    if (a.date === b.date) return b.i - a.i;
    return a.date < b.date ? 1 : -1;
  });
}

function bankTxList(v) {
  return Array.isArray(v) && v.length ? v : null;
}

function bankPushTxList(out, v) {
  var list = bankTxList(v);
  if (list) out.push(list);
}

function bankHistoryTxLists(snap) {
  var out = [];
  var cur = snap && snap.current;
  bankPushTxList(out, cur && cur.history_tx);
  var hist = snap && snap.history;
  if (hist && typeof hist === "object" && !Array.isArray(hist)) {
    bankPushTxList(out, hist.history_tx);
    bankPushTxList(out, hist.tx);
    bankPushTxList(out, hist.transactions);
  }
  bankMonths(snap).forEach(function (m) {
    bankPushTxList(out, m.tx);
    bankPushTxList(out, m.txs);
    bankPushTxList(out, m.transactions);
    bankPushTxList(out, m.history_tx);
    bankPushTxList(out, m.recent_tx);
  });
  return out;
}

/* edits_tx plus the history lists bankHistoryTxLists collects, when the feed sent edits_tx.
   Missing or empty edits_tx falls back to recent_tx plus those same history lists.
   Lists are deduped by identity. bankEditRows dedupes rows by tx key.
   Recent tape rows stay off this list while edits_tx is present. */
function bankEditSourceLists(snap) {
  var cur = snap && snap.current;
  var edits = bankTxList(cur && cur.edits_tx);
  var out = [];
  var seen = [];
  function push(list) {
    if (!list || seen.indexOf(list) >= 0) return;
    seen.push(list);
    out.push(list);
  }
  if (edits) push(edits);
  else push(bankTxList(cur && cur.recent_tx));
  bankHistoryTxLists(snap).forEach(push);
  return out;
}

/* Rows that can still be using a custom: the edits window, the tape, and every history_tx list. */
function bankCategorySourceLists(snap) {
  var out = [];
  var seen = [];
  function push(list) {
    if (!list || seen.indexOf(list) >= 0) return;
    seen.push(list);
    out.push(list);
  }
  bankEditSourceLists(snap).forEach(push);
  var cur = snap && snap.current;
  push(bankTxList(cur && cur.recent_tx));
  push(bankTxList(cur && cur.history_tx));
  bankHistoryTxLists(snap).forEach(push);
  return out;
}

function bankEditRows(snap) {
  var overrides = bankOverrideMap(snap);
  var seen = {};
  var out = [];
  var n = 0;
  bankEditSourceLists(snap).forEach(function (list) {
    list.forEach(function (raw) {
      var row = bankMapTx(raw, n, overrides);
      n += 1;
      if (seen[row.key]) return;
      seen[row.key] = true;
      out.push(row);
    });
  });
  return bankSortTx(out);
}

/* Current tape only. Edits uses bankEditRows and does not clip this window. */
function bankRecent(snap) {
  var rows = snap && snap.current && snap.current.recent_tx;
  if (!Array.isArray(rows) || !rows.length) return [];
  var overrides = bankOverrideMap(snap);
  return bankSortTx(rows.map(function (raw, i) {
    return bankMapTx(raw, i, overrides);
  })).slice(0, 40);
}

/* Bills only. Generic fillers when the feed day is null. Do not match merchants (gasoline, City Fuel). */
function bankFixedBillDay(name) {
  var s = String(name || "");
  if (/mortgage/i.test(s)) return 1;
  if (/\bmobile\b/i.test(s)) return 28;
  if (/\bcar[-\s]?payment\b/i.test(s) || /\bauto[-\s]?loan\b/i.test(s) ||
      /\bauto[-\s]?pay(?:ment)?\b/i.test(s) || /\bvehicle[-\s]?loan\b/i.test(s)) return 15;
  if (/electric/i.test(s) || /\bpower\b/i.test(s)) return 15;
  if (/gas\s+bills?\b/i.test(s) || /natural\s+gas/i.test(s) || /gas\s+utility/i.test(s) || /gas\s*\(\s*utility\s*\)/i.test(s)) return 15;
  return null;
}

function bankBillKey(name) {
  return String(name || "").trim().toLowerCase();
}

function bankDueMap(snap) {
  var o = snap && snap.dueday_overrides;
  if ((!o || typeof o !== "object" || Array.isArray(o)) && snap && snap.budget) o = snap.budget.dueday_overrides;
  if (!o || typeof o !== "object" || Array.isArray(o)) return undefined;
  return o;
}

function bankHasDueMap(snap) {
  if (!snap || typeof snap !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(snap, "dueday_overrides")) {
    return !!(snap.dueday_overrides && typeof snap.dueday_overrides === "object" && !Array.isArray(snap.dueday_overrides));
  }
  var budget = snap.budget;
  return !!(budget && Object.prototype.hasOwnProperty.call(budget, "dueday_overrides") && budget.dueday_overrides &&
    typeof budget.dueday_overrides === "object" && !Array.isArray(budget.dueday_overrides));
}

/* KV kinds stay must_pay and elective. Screens say Bill and Optional. */
function bankMustPayKind(raw) {
  var s = String(raw == null ? "" : raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "must_pay" || s === "bill") return "must_pay";
  if (s === "elective" || s === "optional") return "elective";
  return null;
}

function bankMustPayMap(snap) {
  var o = snap && snap.mustpay_overrides;
  if ((!o || typeof o !== "object" || Array.isArray(o)) && snap && snap.budget) o = snap.budget.mustpay_overrides;
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  return o;
}

function bankMustPayFromMap(map, key) {
  if (!map || key == null || String(key).trim() === "") return null;
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    var exact = bankMustPayKind(map[key]);
    if (exact) return exact;
  }
  var want = String(key).trim().toLowerCase();
  var found = null;
  Object.keys(map).forEach(function (k) {
    if (String(k).trim().toLowerCase() !== want) return;
    var kind = bankMustPayKind(map[k]);
    if (kind) found = kind;
  });
  return found;
}

function bankMustPayOverride(snap, name) {
  var map = bankMustPayMap(snap);
  var raw = String(name == null ? "" : name).trim();
  if (!raw) return null;
  var direct = bankMustPayFromMap(map, raw);
  if (direct) return direct;
  var aliases = bankAliasKeysForName((snap && snap.budget) || {}, raw);
  var found = null;
  aliases.forEach(function (ak) {
    if (found) return;
    found = bankMustPayFromMap(map, ak);
  });
  return found;
}

function bankKindContext(snap) {
  var budget = (snap && snap.budget) || {};
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var bills = bankNormalizeBills(budget, dueArg);
  var cells = bankDayCells(bills, bankNormalizeIncome(budget), Array.isArray(budget.calendar) ? budget.calendar : []);
  return { bills: bills, cells: cells };
}

function bankItemIsBillName(name, bills) {
  var key = bankBillKey(name);
  if (!key) return false;
  return (bills || []).some(function (b) { return bankBillKey(b.name) === key; });
}

function bankItemHasDueDay(name, snap, bills, cells) {
  var key = bankBillKey(name);
  if (!key) return false;
  var map = bankDueMap(snap);
  if (map) {
    var hit = false;
    Object.keys(map).forEach(function (k) {
      if (bankBillKey(k) === key && bankDay(map[k]) != null) hit = true;
    });
    if (hit) return true;
  }
  if ((bills || []).some(function (b) { return bankBillKey(b.name) === key && bankDay(b.typical_day) != null; })) return true;
  return (cells || []).some(function (c) {
    if (!c) return false;
    var names = (c.pays || []).concat(c.bills || []).concat(c.items || []);
    return names.some(function (n) { return bankBillKey(n) === key; });
  });
}

/* Override wins. Else Bill when the name is a normalized bill or it has a due day. Else Optional.
   A paycheck deduction or an income row does not default to Bill. */
function bankResolveKind(name, snap, ctx) {
  if (bankSkipKindName(name, snap)) return "elective";
  var over = bankMustPayOverride(snap, name);
  if (over) return over;
  ctx = ctx || bankKindContext(snap);
  if (bankItemIsBillName(name, ctx.bills)) return "must_pay";
  if (bankItemHasDueDay(name, snap, ctx.bills, ctx.cells)) return "must_pay";
  return "elective";
}

/* Positive month-to-date spend. Missing, blank, zero, and non-positive amounts are empty. A fraction of a cent is empty too. */
function bankMtdAmount(v) {
  var n = bankNum(v);
  if (n == null || !(n > 0)) return null;
  if (Math.round(n * 100) <= 0) return null;
  return n;
}

function bankMtdSpendRows(budget) {
  var mtd = budget && budget.mtd_actual_by_category;
  if (!mtd || typeof mtd !== "object" || Array.isArray(mtd)) return [];
  var list = [];
  Object.keys(mtd).forEach(function (name) {
    var n = bankMtdAmount(mtd[name]);
    if (n == null) return;
    if (bankIsHealthInsuranceName(name) || bankIsExcludedName(name, budget) || bankIsListedIncome(name, budget)) return;
    list.push({ name: name, amount: n });
  });
  return bankSpendRows(list, null);
}

function bankKindPies(snap) {
  var ctx = bankKindContext(snap);
  var must = [];
  var optional = [];
  var optionalSum = 0;
  bankMtdSpendRows((snap && snap.budget) || {}).forEach(function (r) {
    if (bankSkipKindName(r.name, snap)) return;
    var row = { name: bankBillDisplayName(r.name), amount: r.amount, raw: r.name };
    if (bankResolveKind(r.name, snap, ctx) === "must_pay") must.push(row);
    else {
      optional.push(row);
      optionalSum += r.amount;
    }
  });
  var bills = must.slice();
  if (optionalSum > 0) bills.push({ name: "Optional", amount: optionalSum });
  return { bills: bills, optional: optional };
}

function bankKindTargets(snap) {
  var seen = {};
  var out = [];
  function add(name) {
    var raw = String(name == null ? "" : name).trim();
    if (!raw) return;
    if (bankIsIncomeName(raw, null) || bankIsTransferName(raw) || bankSkipKindName(raw, snap)) return;
    if (bankIsAliasOnlyName(raw, (snap && snap.budget) || {})) return;
    var key = raw.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(raw);
  }
  var ctx = bankKindContext(snap);
  ctx.bills.forEach(function (b) { add(b.name); });
  bankMtdSpendRows((snap && snap.budget) || {}).forEach(function (r) { add(r.name); });
  var mtd = (snap && snap.budget && snap.budget.mtd_actual_by_category) || {};
  if (mtd && typeof mtd === "object" && !Array.isArray(mtd)) Object.keys(mtd).forEach(add);
  var planned = (snap && snap.budget && snap.budget.planned_by_category) || {};
  Object.keys(planned).forEach(add);
  ctx.cells.forEach(function (c) {
    (c.bills || []).forEach(add);
    (c.items || []).forEach(add);
  });
  Object.keys(bankMustPayMap(snap)).forEach(add);
  return out;
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

function bankNormalizeBills(budget, dueMap) {
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
    var typical = bankNum(raw.typical_amount);
    var row = byName[name];
    if (!row) {
      row = {
        name: name,
        amount: amount,
        typical_amount: typical,
        typical_day: day,
        cadence: raw.cadence || null,
        category: raw.category || "",
        source: raw.source || (fromMonthly ? "bills_monthly" : "bills")
      };
      byName[name] = row;
      order.push(name);
    } else {
      if (row.amount == null && amount != null) row.amount = amount;
      if (row.typical_amount == null && typical != null) row.typical_amount = typical;
      if (row.typical_day == null && day != null) row.typical_day = day;
      if (!row.cadence && raw.cadence) row.cadence = raw.cadence;
      if (!row.category && raw.category) row.category = raw.category;
      if (raw.source === "manual") row.source = "manual";
      bankRememberAliases(row, raw);
    }
    if (!row.alias_keys) bankRememberAliases(row, raw);
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
  var mapGiven = arguments.length > 1 && dueMap && typeof dueMap === "object" && !Array.isArray(dueMap);
  return order.map(function (name) {
    var row = byName[name];
    var feedSource = row.source;
    var feedDay = row.typical_day;
    var forgeDay = bankBillOverrideDay(budget, row);
    var baseDay = null;
    var baseSource = feedSource === "user" ? "bills" : (feedSource || "bills");
    if (forgeDay != null) {
      baseDay = forgeDay;
      baseSource = "manual";
    } else if (Object.prototype.hasOwnProperty.call(manualDays, name)) {
      baseDay = manualDays[name];
      baseSource = "manual";
    } else if (feedDay != null && feedSource !== "user") {
      baseDay = feedDay;
      baseSource = feedSource || "bills";
    } else {
      var fixed = bankFixedBillDay(row.name);
      if (fixed != null) {
        baseDay = fixed;
        baseSource = "bills";
      }
    }
    function put(day, source) {
      row.typical_day = day;
      row.due_day = day;
      row.source = source;
      return row;
    }
    var key = bankBillKey(row.name);
    if (mapGiven) {
      var entry = bankDueMapEntry(dueMap, key);
      if (!entry && row.alias_keys) {
        row.alias_keys.forEach(function (ak) {
          if (entry) return;
          entry = bankDueMapEntry(dueMap, ak);
        });
      }
      if (entry) {
        var chosen = bankDay(entry.value);
        if (chosen != null) return put(chosen, "user");
        return put(baseDay, baseSource);
      }
      return put(baseDay, baseSource);
    }
    if (feedSource === "user" && bankDay(feedDay) != null) return put(bankDay(feedDay), "user");
    return put(baseDay, baseSource);
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
      source: raw.source || "",
      editable: raw.editable === true
    };
  });
}

function bankIncomeEditMap(edits) {
  var inc = edits && edits.income;
  if (!inc || typeof inc !== "object" || Array.isArray(inc)) return {};
  return inc;
}

/* Local amount and day for rows the print marked editable. A missing field stays on the print value. */
function bankApplyIncomeEdits(incomes, edits) {
  var map = bankIncomeEditMap(edits);
  (incomes || []).forEach(function (inc) {
    if (!inc || !inc.editable) return;
    var raw = null;
    var labelKey = bankFoldName(inc.label);
    if (Object.prototype.hasOwnProperty.call(map, inc.label)) raw = map[inc.label];
    if (raw == null) {
      Object.keys(map).forEach(function (k) {
        if (raw != null) return;
        if (bankFoldName(k) !== labelKey) return;
        raw = map[k];
      });
    }
    if (raw == null) return;
    if (typeof raw === "number") {
      var dayOnly = bankDay(raw);
      if (dayOnly != null) inc.typical_day = dayOnly;
      return;
    }
    if (typeof raw !== "object" || Array.isArray(raw)) return;
    if (Object.prototype.hasOwnProperty.call(raw, "amount")) inc.amount = bankNum(raw.amount);
    if (Object.prototype.hasOwnProperty.call(raw, "typical_day")) inc.typical_day = bankDay(raw.typical_day);
  });
  return incomes;
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
  var name = bankBillDisplayName(row.name);
  if (row.delta != null) {
    var sign = row.delta > 0 ? "+" : "";
    return name + " " + sign + bankMoney(row.delta) + " vs 3-mo avg";
  }
  if (row.typical_day != null) return name + " \u00b7 day " + row.typical_day;
  return name;
}

function bankBudgetBars(budget) {
  var planned = (budget && budget.planned_by_category) || {};
  var targets = {};
  if (planned && typeof planned === "object" && !Array.isArray(planned)) {
    Object.keys(planned).forEach(function (name) {
      targets[bankCatName(name)] = bankNum(planned[name]);
    });
  }
  return bankMtdSpendRows(budget).map(function (r) {
    var has = Object.prototype.hasOwnProperty.call(targets, r.name);
    var target = has ? targets[r.name] : null;
    return {
      name: r.name,
      target: target,
      actual: r.amount,
      over: target != null && r.amount > target
    };
  });
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

function bankCalendarForBills(calendar, budget) {
  if (!Array.isArray(calendar)) return [];
  return calendar.map(function (c) {
    if (!c || typeof c !== "object") return c;
    var items = [];
    (c.items || []).forEach(function (item) {
      var label = typeof item === "string" ? item : (item && (item.name || item.label)) || "";
      if (bankIsHiddenBillName(label, budget)) return;
      items.push(item);
    });
    return { day: c.day, items: items };
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

function bankPieHtml(rows, opts) {
  rows = rows || [];
  opts = opts || {};
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
  var pct = opts.midPct != null ? opts.midPct : Math.round((top.amount / total) * 100);
  var mid = opts.midText != null ? String(opts.midText) : (String(pct) + "%");
  var label = String(opts.midLabel || top.name);
  if (!opts.midLabel && label.length > 14) label = label.slice(0, 13) + "\u2026";
  var aria = opts.aria || "Spend by category";
  return '<div class="bank-pie" role="img" aria-label="' + bankEsc(aria) + '"><svg viewBox="0 0 140 140" aria-hidden="true">' +
    paths.join("") + '</svg><div class="bank-pie-mid"><b>' + bankEsc(mid) + '</b><span>' + bankEsc(label) + "</span></div></div>";
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

function bankGearSvg() {
  return '<svg class="bank-gear-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/>' +
    "</svg>";
}

function bankTabsHtml(tab) {
  var items = [["budget", "Budget"], ["current", "Current"], ["historical", "Historical"]];
  return '<div class="bank-tabs" role="tablist" aria-label="Banking">' + items.map(function (it) {
    var on = it[0] === tab;
    return '<button type="button" role="tab" data-bank-tab="' + it[0] + '" class="' + (on ? "on" : "") + '" aria-selected="' +
      (on ? "true" : "false") + '">' + it[1] + "</button>";
  }).join("") + "</div>";
}

function bankOverflowHtml(tab, menuOpen) {
  var onEdits = tab === "edits";
  var open = !!menuOpen;
  return '<div class="bank-overflow"><button type="button" class="bank-gear' + (onEdits ? " on" : "") +
    '" data-bank-overflow="1" aria-label="Edits" title="Edits" aria-haspopup="menu" aria-expanded="' +
    (open ? "true" : "false") + '" aria-controls="bankOverflowMenu"' +
    (onEdits ? ' aria-current="true"' : "") + ">" + bankGearSvg() +
    (onEdits ? '<i class="bank-gear-mark" aria-hidden="true"></i>' : "") +
    '</button><div class="bank-overflow-menu" id="bankOverflowMenu" role="menu" aria-label="More"' +
    (open ? "" : " hidden") + '><button type="button" role="menuitem" data-bank-tab="edits"' +
    (onEdits ? ' class="on" aria-current="true"' : "") + ">Edits</button></div></div>";
}

function bankNavHtml(tab, menuOpen) {
  return '<div class="bank-nav">' + bankTabsHtml(tab) + bankOverflowHtml(tab, menuOpen) + "</div>";
}

function bankChipOptions(categories, current) {
  var list = (categories || []).slice();
  if (current && list.indexOf(current) < 0) list.unshift(current);
  return list.map(function (name) {
    var sel = name === current ? " selected" : "";
    return '<option value="' + bankEsc(name) + '"' + sel + ">" + bankEsc(bankBillDisplayName(name)) + "</option>";
  }).join("");
}

function bankRowAddOption() {
  return '<option value="' + bankEsc(BANK_ROW_ADD) + '">Add category\u2026</option>';
}

function bankRowAddHtml(row, draft) {
  var label = bankItemLabel(row.desc);
  var key = bankEsc(row.key);
  var value = bankEsc(draft == null ? "" : String(draft));
  return '<span class="bank-row-add"><input type="text" maxlength="' + BANK_CAT_MAX +
    '" autocomplete="off" data-bank-row-cat="' + key + '" aria-label="New category for ' + bankEsc(label) +
    '" value="' + value + '"><button type="button" data-bank-row-ok="' + key +
    '">Add</button><button type="button" data-bank-row-cancel="' + key + '">Cancel</button></span>';
}

function bankItemLabel(desc) {
  var s = desc == null ? "" : String(desc).trim();
  return s || "No description";
}

function bankTapeHtml(rows) {
  if (!rows || !rows.length) {
    return '<section class="bank-tape-block"><h3>Recent \u00b7 actual</h3><p class="bank-empty">No recent activity in this print.</p></section>';
  }
  return '<section class="bank-tape-block"><h3>Recent \u00b7 actual</h3><div class="bank-tape-scroll"><table class="bank-tape"><tbody>' +
    rows.map(function (r) {
      var label = bankItemLabel(r.desc);
      var flow = r.flow ? '<i class="bank-flow">' + bankEsc(r.flow) + "</i>" : "";
      return "<tr><td>" + bankEsc(r.date) + '</td><td><div class="bank-tx-main"><span class="bank-merchant">' +
        bankEsc(label) + '</span><span class="bank-chip">' + bankEsc(r.category) + "</span>" + flow +
        "</div></td><td>" + bankMoney(r.amount) + "</td></tr>";
    }).join("") + "</tbody></table></div></section>";
}

function bankAccountIdSet(snap) {
  var set = {};
  bankAccounts(snap).forEach(function (acct) {
    if (acct && acct.id != null && String(acct.id).trim() !== "") set[String(acct.id)] = true;
  });
  return set;
}

function bankTxAccountId(raw) {
  raw = raw || {};
  if (raw.account_id != null && String(raw.account_id).trim() !== "") return String(raw.account_id).trim();
  if (raw.account && typeof raw.account === "object" && raw.account.id != null && String(raw.account.id).trim() !== "") {
    return String(raw.account.id).trim();
  }
  if (typeof raw.account === "string" && raw.account.trim() !== "") return raw.account.trim();
  if (raw.id != null && String(raw.id).trim() !== "") return String(raw.id).trim();
  return "";
}

function bankCounterpartyId(raw) {
  raw = raw || {};
  var keys = [
    "counterparty_id", "counterparty_account_id", "other_account_id", "other_id",
    "transfer_account_id", "peer_account_id", "peer_id", "to_account_id", "from_account_id",
    "to_id", "from_id", "dest_id", "source_id"
  ];
  var i;
  for (i = 0; i < keys.length; i++) {
    var v = raw[keys[i]];
    if (v && typeof v === "object") v = v.id;
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function bankTruthyFlag(v) {
  if (v === true || v === 1) return true;
  var s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1";
}

function bankTransferKind(raw) {
  raw = raw || {};
  return String(raw.transfer_kind || raw.transfer_type || raw.xfer || "").trim().toLowerCase();
}

function bankIsExternalTransfer(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (bankTruthyFlag(raw.external) || bankTruthyFlag(raw.external_transfer)) return true;
  var kind = bankTransferKind(raw);
  return kind === "external" || kind === "outside";
}

/* Linked-account moves only. A transfer category or flow on one of the user's accounts counts
   unless the print names an account that is not linked, or marks the row external. */
function bankIsInternalTransfer(raw, accountSet, category) {
  raw = raw || {};
  if (bankIsExternalTransfer(raw)) return false;
  var flags = ["internal", "internal_transfer", "is_internal", "linked_transfer", "own_account", "own_accounts", "between_accounts"];
  var i;
  for (i = 0; i < flags.length; i++) {
    if (bankTruthyFlag(raw[flags[i]])) return true;
  }
  var kind = bankTransferKind(raw);
  if (kind === "internal" || kind === "linked" || kind === "own" || kind === "account" || kind === "between") return true;
  accountSet = accountSet || {};
  var id = bankTxAccountId(raw);
  var other = bankCounterpartyId(raw);
  if (id && other && accountSet[id] && accountSet[other] && id !== other) return true;
  if (other && !accountSet[other]) return false;
  var flow = String(raw.flow || "").trim().toLowerCase();
  var transferFlow = flow === "transfer" || flow === "xfer";
  var transferCat = /\btransfers?\b/i.test(String(category == null ? "" : category));
  var onBook = !id || !!accountSet[id];
  if ((transferFlow || transferCat) && onBook) return true;
  return false;
}

function bankFlowSide(raw) {
  var flow = String((raw && (raw.flow || raw.direction)) || "").trim().toLowerCase();
  if (flow === "inflow" || flow === "in" || flow === "incoming" || flow === "credit") return "in";
  if (flow === "outflow" || flow === "out" || flow === "outgoing" || flow === "debit") return "out";
  return "";
}

/* This month's inflows and outflows from the print. Internal moves between linked accounts are left out. */
function bankMonthFlow(snap) {
  var ym = bankCalendarMonth(snap);
  var key = bankYm(ym.year, ym.month);
  var accounts = bankAccountIdSet(snap);
  var overrides = bankOverrideMap(snap);
  var seen = {};
  var inSum = 0;
  var outSum = 0;
  var any = false;
  bankMtdTxLists(snap, key).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      if (String(raw.date || "").slice(0, 7) !== key) return;
      var txKey = bankTxKey(raw);
      if (seen[txKey]) return;
      seen[txKey] = true;
      var cat = bankTxCategory(raw, overrides);
      if (bankIsInternalTransfer(raw, accounts, cat)) return;
      var side = bankFlowSide(raw);
      if (!side) return;
      var n = bankNum(raw.amount);
      if (n == null || n === 0) return;
      any = true;
      var abs = Math.abs(n);
      if (side === "in") inSum += abs;
      else outSum += abs;
    });
  });
  return { inSum: any ? inSum : null, outSum: any ? outSum : null, any: any };
}

function bankIoHtml(flow) {
  var head = "<h3>In / out \u00b7 this month</h3>";
  if (!flow || !flow.any) {
    return '<section class="bank-io">' + head + '<p class="bank-empty">No incoming or outgoing in this print.</p></section>';
  }
  var inn = flow.inSum || 0;
  var out = flow.outSum || 0;
  var max = Math.max(inn, out, 0);
  function width(n) {
    if (!(max > 0)) return "0";
    return Math.max(0, Math.min(100, (n / max) * 100)).toFixed(1);
  }
  var label = "Incoming " + bankMoney(inn) + ", outgoing " + bankMoney(out);
  function row(side, title, amount) {
    return '<div class="bank-io-row"><div class="bank-io-k"><span>' + title + "</span><b>" + bankMoney(amount) +
      '</b></div><div class="bank-io-track" aria-hidden="true"><span class="bank-io-fill bank-io-' + side +
      '" style="width:' + width(amount) + '%"></span></div></div>';
  }
  return '<section class="bank-io">' + head + '<div class="bank-io-rows" role="img" aria-label="' + bankEsc(label) + '">' +
    row("in", "In", inn) + row("out", "Out", out) + "</div></section>";
}

function bankIsSavingsName(name) {
  return /\bsavings?\b/i.test(String(name || ""));
}

function bankFirstOwnNum(obj, keys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  var i;
  for (i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(obj, keys[i])) continue;
    var v = obj[keys[i]];
    if (v && typeof v === "object") continue;
    var n = bankNum(v);
    if (n == null || n < 0) continue;
    return n;
  }
  return null;
}

var BANK_LIMIT_BAGS = ["caps", "limits", "budgets", "targets", "group_budgets", "group_limits"];
var BANK_BILL_LIMIT_KEYS = ["must_pay", "must_pay_budget", "must_pay_limit", "bill_budget", "bill_limit", "bills_budget", "bills_limit"];
var BANK_OPTIONAL_LIMIT_KEYS = ["elective", "elective_budget", "elective_limit", "optional", "optional_budget", "optional_limit"];
var BANK_SAVINGS_LIMIT_KEYS = ["savings_budget", "savings_limit", "savings_target", "savings_cap"];

function bankGroupLimit(budget, keys) {
  if (!budget || typeof budget !== "object") return null;
  var n = bankFirstOwnNum(budget, keys);
  if (n != null) return n;
  var i;
  for (i = 0; i < BANK_LIMIT_BAGS.length; i++) {
    n = bankFirstOwnNum(budget[BANK_LIMIT_BAGS[i]], keys);
    if (n != null) return n;
  }
  return null;
}

function bankIsGroupLimitKey(name) {
  var key = String(name || "").trim().toLowerCase();
  var all = BANK_BILL_LIMIT_KEYS.concat(BANK_OPTIONAL_LIMIT_KEYS, BANK_SAVINGS_LIMIT_KEYS, ["savings"]);
  return all.indexOf(key) >= 0;
}

function bankCategoryTargetMap(budget) {
  var out = {};
  function put(name, value, overwrite, skipGroups) {
    if (skipGroups && bankIsGroupLimitKey(name)) return;
    var n = bankNum(value);
    if (n == null || n < 0) return;
    var key = bankCatName(name);
    if (!key) return;
    if (!overwrite && Object.prototype.hasOwnProperty.call(out, key)) return;
    out[key] = n;
  }
  var planned = budget && budget.planned_by_category;
  if (planned && typeof planned === "object" && !Array.isArray(planned)) {
    Object.keys(planned).forEach(function (name) { put(name, planned[name], true, false); });
  }
  ["caps", "limits", "category_limits", "targets"].forEach(function (bagName) {
    var bag = budget && budget[bagName];
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) return;
    Object.keys(bag).forEach(function (name) { put(name, bag[name], false, true); });
  });
  return out;
}

function bankSavingsExplicit(budget) {
  var limit = bankGroupLimit(budget, BANK_SAVINGS_LIMIT_KEYS);
  var actual = bankFirstOwnNum(budget, ["mtd_savings", "savings_mtd", "savings_actual", "savings_spent"]);
  var bag = budget && budget.savings;
  if (bag && typeof bag === "object" && !Array.isArray(bag)) {
    if (limit == null) limit = bankFirstOwnNum(bag, ["limit", "target", "cap", "budget", "amount"]);
    if (actual == null) actual = bankFirstOwnNum(bag, ["actual", "mtd", "spent", "spend"]);
  }
  var nested = bankFirstOwnNum(budget && budget.caps, ["savings"]);
  if (limit == null && nested != null) limit = nested;
  nested = bankFirstOwnNum(budget && budget.limits, ["savings"]);
  if (limit == null && nested != null) limit = nested;
  nested = bankFirstOwnNum(budget && budget.budgets, ["savings"]);
  if (limit == null && nested != null) limit = nested;
  if (limit == null && budget && budget.savings != null && typeof budget.savings !== "object") {
    var direct = bankNum(budget.savings);
    if (direct != null && direct >= 0) limit = direct;
  }
  return { limit: limit, actual: actual };
}

function bankSumTargets(map, snap, ctx, kind) {
  var any = false;
  var sum = 0;
  Object.keys(map || {}).forEach(function (name) {
    var savings = bankIsSavingsName(name);
    if (kind === "savings") {
      if (!savings) return;
    } else if (savings) return;
    else if (bankSkipKindName(name, snap) || bankIsTransferName(name) || bankIsIncomeName(name, null)) return;
    else {
      var resolved = bankResolveKind(name, snap, ctx);
      if (kind === "bill" && resolved !== "must_pay") return;
      if (kind === "optional" && resolved !== "elective") return;
    }
    any = true;
    sum += map[name];
  });
  return any ? sum : null;
}

/* Actuals are month-to-date print spend. Limits are a group budget when the print has one, else category targets.
   Bill amounts and income_monthly are the plan, so they are not the meter. */
function bankCapRows(snap) {
  var budget = (snap && snap.budget) || {};
  var ctx = bankKindContext(snap);
  var targets = bankCategoryTargetMap(budget);
  var mtd = budget.mtd_actual_by_category;
  var hasMtd = !!(mtd && typeof mtd === "object" && !Array.isArray(mtd));
  var sums = { bill: 0, optional: 0, savings: 0 };
  var saw = { bill: false, optional: false, savings: false };
  if (hasMtd) {
    bankMtdSpendRows(budget).forEach(function (r) {
      if (bankIsSavingsName(r.name)) {
        sums.savings += r.amount;
        saw.savings = true;
        return;
      }
      if (bankSkipKindName(r.name, snap)) return;
      if (bankResolveKind(r.name, snap, ctx) === "must_pay") {
        sums.bill += r.amount;
        saw.bill = true;
      } else {
        sums.optional += r.amount;
        saw.optional = true;
      }
    });
  }
  var savingsEx = bankSavingsExplicit(budget);
  var limits = {
    bill: bankGroupLimit(budget, BANK_BILL_LIMIT_KEYS),
    optional: bankGroupLimit(budget, BANK_OPTIONAL_LIMIT_KEYS),
    savings: savingsEx.limit
  };
  if (limits.bill == null) limits.bill = bankSumTargets(targets, snap, ctx, "bill");
  if (limits.optional == null) limits.optional = bankSumTargets(targets, snap, ctx, "optional");
  if (limits.savings == null) limits.savings = bankSumTargets(targets, snap, ctx, "savings");
  function actualFor(kind) {
    if (kind === "savings" && savingsEx.actual != null) return savingsEx.actual;
    if (!hasMtd) return null;
    if (!saw[kind] && limits[kind] == null) return null;
    return sums[kind];
  }
  return [
    { key: "bill", label: "Bill", actual: actualFor("bill"), limit: limits.bill },
    { key: "optional", label: "Optional", actual: actualFor("optional"), limit: limits.optional },
    { key: "savings", label: "Savings", actual: actualFor("savings"), limit: limits.savings }
  ];
}

function bankCapMeterHtml(row) {
  var pending = row.limit == null || row.actual == null;
  var over = !pending && row.actual > row.limit;
  var cls = "bank-cap " + (pending ? "pending" : (over ? "over" : "under"));
  var actualText = "Actual " + (row.actual == null ? "\u2014" : bankMoney(row.actual));
  var limitText = row.limit == null ? "Limit pending" : ("Limit " + bankMoney(row.limit));
  var track = '<div class="bank-cap-track"';
  if (!pending) {
    var pct = 0;
    if (row.limit > 0) pct = Math.max(0, Math.min(100, (row.actual / row.limit) * 100));
    else if (row.actual > 0) pct = 100;
    var now = Math.round(pct);
    var text = actualText + ", " + limitText;
    track += ' role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + now +
      '" aria-valuetext="' + bankEsc(text) + '" aria-label="' + bankEsc(row.label + " " + text) + '">' +
      '<span class="fill" style="width:' + pct.toFixed(1) + '%"></span>';
  } else {
    track += ' aria-label="' + bankEsc(row.label + " " + actualText + ", " + limitText) + '">';
  }
  track += "</div>";
  return '<div class="' + cls + '" data-cap="' + row.key + '"><div class="bank-cap-k"><span>' + bankEsc(row.label) +
    "</span><b>" + bankEsc(actualText) + "</b><i>" + bankEsc(limitText) + "</i></div>" + track + "</div>";
}

function bankCapMetersHtml(snap) {
  var rows = bankCapRows(snap);
  return '<section class="bank-caps-block"><h3>Spent so far \u00b7 actual</h3>' +
    '<p class="bank-cap-note">From the live print \u2014 not the plan.</p><div class="bank-caps">' +
    rows.map(bankCapMeterHtml).join("") + "</div></section>";
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
  /* Last-closed-month pie stays on Forge totals. Overrides retitle recent_tx until the feed republishes.
     Month-end balances stay off this panel. */
  return head + bankTilesHtml(tiles, total) + bankIoHtml(bankMonthFlow(snap)) + bankCapMetersHtml(snap) +
    bankMtdBlock(snap) + bankPieBlock(cats, "Last closed \u00b7 actual") + bankTapeHtml(bankRecent(snap));
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

/* America/New_York year, month, and day from bankEtYmd, then days in that month. */
function bankMtdCaption(asof) {
  var et = bankEtYmd(asof);
  if (!et || !(et.day >= 1)) return "Month to date";
  return "Month to date \u00b7 day " + et.day + " of " + bankMonthDim(et.year, et.month);
}

function bankBarsHtml(rows) {
  if (!rows.length) return '<p class="bank-empty">No category limits in this print.</p>';
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
      '<div class="bank-bar-k"><span>' + bankEsc(bankBillDisplayName(r.name)) + "</span><b>Actual " + bankMoney(r.actual) +
      "</b><i>Limit " + bankMoney(r.target) + "</i></div>" +
      '<div class="bank-bar-track" aria-hidden="true">' + fill + mark + "</div></div>";
  }).join("");
}

function bankEtYmd(asof) {
  var t = bankParseTime(asof);
  if (t == null) return null;
  try {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(t));
    var y = "", m = "", d = "";
    parts.forEach(function (p) {
      if (p.type === "year") y = p.value;
      if (p.type === "month") m = p.value;
      if (p.type === "day") d = p.value;
    });
    if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m)) return null;
    return { year: Number(y), month: Number(m), day: Number(d) };
  } catch (e) {
    return null;
  }
}

function bankParseYm(ym) {
  var p = String(ym || "").match(/^(\d{4})-(\d{2})$/);
  if (!p) return null;
  var month = Number(p[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(p[1]), month: month };
}

function bankYm(year, month) {
  return String(year) + "-" + (month < 10 ? "0" : "") + String(month);
}

function bankMonthTitle(year, month) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  } catch (e) {
    return BANK_MONTHS[month - 1] + " " + year;
  }
}

/* asof in ET, else the latest open history month, else the latest history month, else today local. */
function bankCalendarMonth(snap) {
  var et = bankEtYmd(snap && snap.asof);
  if (et) return { year: et.year, month: et.month };
  var open = null;
  var latest = null;
  bankMonths(snap).forEach(function (m) {
    var parsed = bankParseYm(m.month);
    if (!parsed) return;
    latest = parsed;
    if (bankOpenMonth(m)) open = parsed;
  });
  if (open) return open;
  if (latest) return latest;
  var now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function bankMonthDim(year, month) {
  return new Date(year, month, 0).getDate();
}

function bankOrdinal(n) {
  var mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return n + "th";
  var mod10 = n % 10;
  if (mod10 === 1) return n + "st";
  if (mod10 === 2) return n + "nd";
  if (mod10 === 3) return n + "rd";
  return n + "th";
}

/* A 31st (or 29th/30th) has no cell in a shorter month. Park it on the last day and mark the real due day. */
function bankClampDayLabel(name, due, dim) {
  var shown = bankBillDisplayName(name);
  if (due > dim) return shown + " (" + bankOrdinal(due) + ")";
  return shown;
}

function bankCalendarByDay(cells, dim) {
  var byDay = {};
  function slot(day) {
    if (!byDay[day]) byDay[day] = { day: day, pays: [], bills: [], items: [] };
    return byDay[day];
  }
  (cells || []).forEach(function (c) {
    if (!c || !c.day) return;
    var due = c.day;
    var place = due > dim ? dim : due;
    if (place < 1) return;
    var dest = slot(place);
    (c.pays || []).forEach(function (name) { dest.pays.push(bankClampDayLabel(name, due, dim)); });
    (c.bills || []).forEach(function (name) { dest.bills.push(bankClampDayLabel(name, due, dim)); });
    (c.items || []).forEach(function (name) { dest.items.push(bankClampDayLabel(name, due, dim)); });
  });
  return byDay;
}

function bankDayLabels(c) {
  var labels = [];
  (c.pays || []).forEach(function (name) { labels.push({ kind: "pay", name: name }); });
  (c.bills || []).forEach(function (name) { labels.push({ kind: "bill", name: name }); });
  (c.items || []).forEach(function (name) {
    if ((c.bills || []).indexOf(name) >= 0) return;
    labels.push({ kind: "bill", name: name });
  });
  return labels;
}

function bankDayLabelHtml(kind, name, extraClass) {
  var esc = bankEsc(name);
  var cls = kind === "pay" ? "pay" : "";
  if (extraClass) cls = cls ? cls + " " + extraClass : extraClass;
  var tag = kind === "pay" ? "em" : "span";
  var classAttr = cls ? ' class="' + cls + '"' : "";
  return "<" + tag + classAttr + ' title="' + esc + '" aria-label="' + esc + '">' + esc + "</" + tag + ">";
}

function bankDayMoreHtml(list, count, wide) {
  var n = wide ? count - 2 : count - 1;
  var which = wide ? "bank-day-more-wide" : "bank-day-more-narrow";
  return '<i class="bank-day-more ' + which + '" title="' + bankEsc(list) + '" aria-hidden="true">+' + n + "</i>";
}

function bankDayCellHtml(c) {
  var labels = bankDayLabels(c);
  if (!labels.length) return '<div class="bank-day"><b>' + c.day + "</b></div>";
  var list = labels.map(function (lab) { return lab.name; }).join(", ");
  var bits = labels.map(function (lab, i) {
    var extra = i === 1 ? "bank-day-second" : (i >= 2 ? "bank-day-rest" : "");
    return bankDayLabelHtml(lab.kind, lab.name, extra);
  }).join("");
  var multi = labels.length >= 2;
  var head = "<b>" + c.day + "</b>";
  if (multi) {
    var chips = bankDayMoreHtml(list, labels.length, false);
    if (labels.length >= 3) chips += bankDayMoreHtml(list, labels.length, true);
    head = '<span class="bank-day-top">' + head + chips + "</span>";
  }
  var attrs = multi
    ? ' title="' + bankEsc(list) + '" aria-label="' + bankEsc("Day " + c.day + ": " + list) + '"'
    : "";
  return '<div class="bank-day has' + (multi ? " multi" : "") + '"' + attrs + ">" + head + bits + "</div>";
}

function bankCalendarHtml(cells, hasDays, ym) {
  if (!hasDays) return '<p class="bank-empty">Due days need more history</p>';
  ym = ym || {};
  var year = ym.year;
  var month = ym.month;
  if (!year || !month) {
    var now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  var dim = bankMonthDim(year, month);
  var start = new Date(year, month - 1, 1).getDay();
  var byDay = bankCalendarByDay(cells, dim);
  var heads = BANK_DOW.map(function (name) {
    return '<span role="columnheader">' + name + "</span>";
  }).join("");
  var slots = [];
  var i;
  for (i = 0; i < start; i++) slots.push(null);
  for (i = 1; i <= dim; i++) slots.push(byDay[i] || { day: i, pays: [], bills: [], items: [] });
  while (slots.length % 7) slots.push(null);
  var weeks = "";
  for (i = 0; i < slots.length; i += 7) {
    var row = "";
    for (var j = 0; j < 7; j++) {
      var slot = slots[i + j];
      row += slot ? bankDayCellHtml(slot) : '<div class="bank-cal-pad" aria-hidden="true"></div>';
    }
    weeks += '<div class="bank-cal-week" role="row">' + row + "</div>";
  }
  var title = bankMonthTitle(year, month);
  return '<p class="bank-cal-label">' + bankEsc(title) + '</p><div class="bank-cal-grid" role="grid" aria-label="' +
    bankEsc(title) + '"><div class="bank-cal-dow" role="row">' + heads + "</div>" + weeks + "</div>";
}

function bankMtdSpend(budget) {
  var rows = bankMtdSpendRows(budget);
  if (!rows.length) return null;
  var sum = 0;
  rows.forEach(function (r) { sum += r.amount; });
  return sum;
}

function bankMtdTxLists(snap, ym) {
  var lists = [];
  var cur = snap && snap.current;
  if (cur) {
    if (Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
    if (Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  }
  bankMonths(snap).forEach(function (m) {
    if (String(m.month) !== ym || !bankOpenMonth(m)) return;
    [m.tx, m.txs, m.transactions, m.history_tx, m.recent_tx].forEach(function (list) {
      if (Array.isArray(list)) lists.push(list);
    });
  });
  return lists;
}

function bankMtdIncomeObj(snap, ym) {
  var found = null;
  bankMonths(snap).forEach(function (m) {
    if (String(m.month) !== ym) return;
    if (m.income && typeof m.income === "object" && !Array.isArray(m.income)) found = m.income;
  });
  return found;
}

/* In-month income txs, else an open history row's income_total. Never income_monthly. */
function bankMtdIncome(snap, ym) {
  var overrides = bankOverrideMap(snap);
  var incomeObj = bankMtdIncomeObj(snap, ym);
  var seen = {};
  var sum = 0;
  var any = false;
  bankMtdTxLists(snap, ym).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      if (String(raw.date || "").slice(0, 7) !== ym) return;
      var key = bankTxKey(raw);
      if (seen[key]) return;
      var cat = bankTxCategory(raw, overrides);
      if (!bankIsIncomeName(cat, incomeObj) || bankIsTransferName(cat)) return;
      var n = bankNum(raw.amount);
      if (n == null || n === 0) return;
      seen[key] = true;
      any = true;
      sum += Math.abs(n);
    });
  });
  if (any) return sum;
  var months = bankMonths(snap);
  for (var i = 0; i < months.length; i++) {
    var m = months[i];
    if (String(m.month) !== ym || !bankOpenMonth(m)) continue;
    var total = bankNum(m.income_total);
    if (total != null) return Math.abs(total);
  }
  return null;
}

function bankMtdEmptyHtml(spend, income) {
  var spendOk = spend != null && spend > 0;
  var incomeOk = income != null && income > 0;
  if (spendOk && income == null) {
    return '<p class="bank-empty">Spent so far ' + bankMoney(spend) + ". Income for this month is not in the print.</p>";
  }
  if (spendOk && income === 0) {
    return '<p class="bank-empty">Spent so far ' + bankMoney(spend) + ". Income received this month is zero.</p>";
  }
  if (incomeOk) {
    return '<p class="bank-empty">Income received ' + bankMoney(income) + ". No month-to-date spend in this print.</p>";
  }
  return '<p class="bank-empty">No month-to-date spend or income in this print.</p>';
}

function bankMtdOfIncomePct(spend, income) {
  var pct = Math.round((spend / income) * 100);
  if (!isFinite(pct) || pct < 0) return 0;
  return pct;
}

/* Real percent through 999, then 999%+. Zero or missing income stays finite. */
function bankMtdOfIncomeText(spend, income) {
  var pct = bankMtdOfIncomePct(spend, income);
  if (pct > 999) return "999%+";
  return pct + "%";
}

function bankMtdMeterHtml(spend, income) {
  var label = bankMtdOfIncomeText(spend, income) + " of income";
  var pct = bankMtdOfIncomePct(spend, income);
  var fill = pct > 100 ? 100 : pct;
  return '<div class="bank-mtd-meter">' +
    '<div class="bank-mtd-figs">' +
    '<div class="bank-mtd-fig"><span>Spent so far</span><b>' + bankMoney(spend) + "</b></div>" +
    '<div class="bank-mtd-fig"><span>Income received</span><b>' + bankMoney(income) + "</b></div>" +
    "</div>" +
    '<p class="bank-mtd-of">' + bankEsc(label) + "</p>" +
    '<div class="bank-mtd-track' + (pct > 100 ? " over" : "") + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
    fill + '" aria-valuetext="' + bankEsc(label) + '" aria-label="' + bankEsc(label) + '">' +
    '<span class="fill" style="width:' + fill + '%"></span></div></div>';
}

function bankMtdSplitHtml(spend, income) {
  if (!(spend > 0) || !(income > 0)) return bankMtdEmptyHtml(spend, income);
  return bankMtdMeterHtml(spend, income);
}

function bankMtdBlock(snap) {
  var ym = bankCalendarMonth(snap);
  var spend = bankMtdSpend(snap && snap.budget);
  var income = bankMtdIncome(snap, bankYm(ym.year, ym.month));
  var cap = bankMtdCaption(snap && snap.asof);
  return '<section class="bank-pie-block bank-mtd"><h3>' + bankEsc(cap) +
    '</h3><p class="bank-mtd-sub">Spent so far as a share of income received.</p>' +
    bankMtdSplitHtml(spend, income) + "</section>";
}

function bankKindPieHtml(rows, heading, empty, key) {
  var title = bankEsc(heading);
  var pieKey = key || String(heading || "").toLowerCase();
  if (!rows || !rows.length) {
    return '<section class="bank-pie-block bank-kind" data-bank-pie="' + bankEsc(pieKey) + '"><h3>' + title +
      '</h3><p class="bank-empty">' + bankEsc(empty) + "</p></section>";
  }
  return '<section class="bank-pie-block bank-kind" data-bank-pie="' + bankEsc(pieKey) + '"><h3>' + title +
    '</h3><div class="bank-split">' + bankPieHtml(rows, { aria: heading }) + bankRankHtml(rows) + "</div></section>";
}

function bankKindBlocks(snap) {
  var pies = bankKindPies(snap);
  return '<div class="bank-kind-pies">' +
    bankKindPieHtml(pies.bills, "Bill vs optional \u00b7 plan", "No bill spending this month.", "bills") +
    bankKindPieHtml(pies.optional, "Optional split \u00b7 plan", "No optional spending this month.", "optional") +
    "</div>";
}

function bankCoversHtml(groups) {
  if (!groups.length) return "";
  return '<ul class="bank-covers">' + groups.map(function (g) {
    var names = g.bills.map(function (b) { return bankEsc(bankBillDisplayName(b.name)); });
    return "<li><b>This check (" + bankEsc(g.label) + ", day " + g.day + ") covers:</b> " +
      (names.length ? names.join(", ") : "no dated bills") + "</li>";
  }).join("") + "</ul>";
}

function bankBillShownAmount(row) {
  var typical = bankNum(row && row.typical_amount);
  if (typical != null) return typical;
  return bankNum(row && row.amount);
}

function bankBillAmount(v) {
  if (bankNum(v) == null) return "amount pending";
  return bankMoney(v);
}

function bankDayOptions(current, emptyLabel) {
  var blank = emptyLabel || "Default";
  var html = '<option value=""' + (current == null ? " selected" : "") + ">" + bankEsc(blank) + "</option>";
  var d;
  for (d = 1; d <= 31; d++) {
    html += '<option value="' + d + '"' + (current === d ? " selected" : "") + ">" + d + "</option>";
  }
  return html;
}

/* Print bills and due-day items. The name is a spend category when Bill or Optional is tagged, not a separate taxonomy. */
function bankBillListHtml(bills) {
  if (!bills.length) return "";
  return '<section class="bank-bills"><h3>Bills \u00b7 plan</h3><ul class="bank-bill-list">' + bills.map(function (b) {
    var day = b.typical_day == null ? "\u2014" : String(b.typical_day);
    var shown = bankBillShownAmount(b);
    var pending = shown == null;
    return "<li><span>" + bankEsc(bankBillDisplayName(b.name)) + "</span><b" + (pending ? ' class="bank-pending"' : "") + ">" +
      bankEsc(bankBillAmount(shown)) + "</b><i>day " + day + "</i></li>";
  }).join("") + "</ul></section>";
}

function bankIncomeListHtml(incomes) {
  if (!incomes || !incomes.length) return "";
  return '<section class="bank-income"><h3>Expected income \u00b7 plan</h3><ul class="bank-income-list">' + incomes.map(function (inc) {
    var shown = bankNum(inc.amount);
    var pending = shown == null;
    var day = inc.typical_day == null ? "\u2014" : String(inc.typical_day);
    return "<li><span>" + bankEsc(inc.label || "Income") + "</span><b" + (pending ? ' class="bank-pending"' : "") + ">" +
      bankEsc(bankBillAmount(shown)) + "</b><i>day " + day + "</i></li>";
  }).join("") + "</ul></section>";
}

function bankEditIncomeHtml(incomes) {
  if (!incomes || !incomes.length) return '<p class="bank-empty">No income in this print.</p>';
  return '<ul class="bank-edit-list">' + incomes.map(function (inc) {
    var label = inc.label || "Income";
    var shown = bankNum(inc.amount);
    var pending = shown == null;
    if (!inc.editable) {
      return "<li><span class=\"bank-merchant\">" + bankEsc(label) + '</span><span class="bank-edit-side"><b' +
        (pending ? ' class="bank-pending"' : "") + ">" + bankEsc(bankBillAmount(shown)) +
        "</b><i>day " + (inc.typical_day == null ? "\u2014" : String(inc.typical_day)) + "</i></span></li>";
    }
    var amtVal = shown == null ? "" : String(shown);
    return "<li><span class=\"bank-merchant\">" + bankEsc(label) + '</span><span class="bank-edit-side">' +
      '<input class="bank-income-amt" type="text" inputmode="decimal" autocomplete="off" data-bank-income="' +
      bankEsc(label) + '" data-bank-income-field="amount" aria-label="Amount for ' + bankEsc(label) +
      '" value="' + bankEsc(amtVal) + '">' +
      '<select class="bank-chip" data-bank-income="' + bankEsc(label) +
      '" data-bank-income-field="day" aria-label="Day for ' + bankEsc(label) + '">' +
      bankDayOptions(inc.typical_day, "Day") + "</select></span></li>";
  }).join("") + "</ul>";
}

function bankBudgetHtml(snap, opts) {
  opts = opts || {};
  var budget = (snap && snap.budget) || {};
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var bills = bankSurfaceBills(bankNormalizeBills(budget, dueArg), budget);
  var incomes = bankApplyIncomeEdits(bankNormalizeIncome(budget), opts.edits);
  var insights = bankNormalizeInsights(budget);
  var cells = bankDayCells(bills, incomes, bankCalendarForBills(Array.isArray(budget.calendar) ? budget.calendar : [], budget));
  var hasDays = bankHasDueDays(cells);
  var insightHtml = insights.length
    ? '<ul class="bank-insights">' + insights.map(function (row) {
      var cls = "bank-insight" + (row.severity ? " sev-" + row.severity : "");
      return '<li class="' + cls + '">' + bankEsc(bankInsightText(row)) + "</li>";
    }).join("") + "</ul>"
    : '<p class="bank-empty">No insights in this print.</p>';
  var bars = bankBudgetBars(budget);
  var ym = bankCalendarMonth(snap);
  return '<div class="bank-budget-top"><section class="bank-cal"><h3>Due calendar \u00b7 plan</h3>' +
    bankCalendarHtml(cells, hasDays, ym) + bankCoversHtml(bankCheckGroups(bills, incomes)) +
    '</section><section class="bank-insight-block"><h3>Insights</h3>' + insightHtml + "</section></div>" +
    bankKindBlocks(snap) +
    bankIncomeListHtml(incomes) +
    bankBillListHtml(bills) +
    '<section class="bank-bars"><h3>Progress vs limits</h3>' + bankBarsHtml(bars) + "</section>";
}

function bankHasDueNote(snap) {
  var map = bankDueMap(snap);
  if (!map) return false;
  return Object.keys(map).some(function (k) { return bankDay(map[k]) != null; });
}

function bankCategoriesInUse(rows, known) {
  var have = {};
  (rows || []).forEach(function (r) {
    if (r && r.category) have[r.category] = true;
  });
  var out = [];
  (known || []).forEach(function (name) {
    if (have[name]) out.push(name);
  });
  Object.keys(have).forEach(function (name) {
    if (out.indexOf(name) < 0) out.push(name);
  });
  return out;
}

function bankResolveEditCat(inUse, known, requested) {
  var req = requested == null ? "" : String(requested);
  if (req && ((inUse && inUse.indexOf(req) >= 0) || (known && known.indexOf(req) >= 0))) return req;
  if (inUse && inUse.length) return inUse[0];
  if (known && known.length) return known[0];
  return "";
}

function bankAddCategoryHtml() {
  return '<div class="bank-add-cat"><label>Add category <input type="text" maxlength="' + BANK_CAT_MAX +
    '" autocomplete="off" data-bank-new-cat aria-label="New category"></label>' +
    '<button type="button" data-bank-add-cat>Add</button></div>';
}

function bankEditTxHtml(rows, known, picked, rowAdd) {
  var assignCats = known || [];
  var addingKey = rowAdd && rowAdd.key ? String(rowAdd.key) : "";
  var picker = '<label class="bank-cat-pick">Category <select data-bank-cat aria-label="Category">' +
    bankChipOptions(assignCats, picked) + "</select></label>";
  if (!rows || !rows.length) return picker + '<p class="bank-empty">No transactions in this print.</p>';
  var mine = rows.filter(function (r) { return r.category === picked; });
  if (!mine.length) return picker + '<p class="bank-empty">No items in this category.</p>';
  return picker + '<ul class="bank-edit-list">' + mine.map(function (r) {
    var label = bankItemLabel(r.desc);
    var date = r.date ? String(r.date) : "\u2014";
    var control = addingKey && r.key === addingKey
      ? bankRowAddHtml(r, rowAdd.draft)
      : '<select class="bank-chip" data-bank-tx="' + bankEsc(r.key) + '" aria-label="Category for ' + bankEsc(label) + '">' +
        bankChipOptions(assignCats, r.category) + bankRowAddOption() + "</select>";
    return "<li><span class=\"bank-edit-id\"><span class=\"bank-merchant\">" + bankEsc(label) +
      '</span><span class="bank-edit-meta">' + bankEsc(date) +
      '</span></span><span class="bank-edit-side">' + control +
      "<b>" + bankMoney(r.amount) + "</b></span></li>";
  }).join("") + "</ul>";
}

function bankEditBillHtml(bills) {
  if (!bills || !bills.length) return '<p class="bank-empty">No bills in this print.</p>';
  return '<ul class="bank-edit-list">' + bills.map(function (b) {
    var key = bankBillKey(b.name);
    var label = bankBillDisplayName(b.name);
    var shown = bankBillShownAmount(b);
    var pending = shown == null;
    return "<li><span class=\"bank-merchant\">" + bankEsc(label) + '</span><span class="bank-edit-side"><select class="bank-chip" data-bank-due="' +
      bankEsc(key) + '" aria-label="Due day for ' + bankEsc(label) + '">' + bankDayOptions(b.typical_day) +
      '</select><b' + (pending ? ' class="bank-pending"' : "") + ">" + bankEsc(bankBillAmount(shown)) + "</b></span></li>";
  }).join("") + "</ul>";
}

function bankKindOptions(kind) {
  var bill = kind === "must_pay" ? " selected" : "";
  var optional = kind === "elective" ? " selected" : "";
  return '<option value="must_pay"' + bill + ">Bill</option>" +
    '<option value="elective"' + optional + ">Optional</option>";
}

function bankHasMustPayNote(snap) {
  var map = bankMustPayMap(snap);
  return Object.keys(map).some(function (k) { return bankMustPayKind(map[k]) != null; });
}

function bankKindEditHtml(snap) {
  var names = bankKindTargets(snap);
  if (!names.length) return '<p class="bank-empty">No budget categories in this print.</p>';
  var ctx = bankKindContext(snap);
  return '<ul class="bank-edit-list">' + names.map(function (name) {
    var label = bankBillDisplayName(name);
    var kind = bankResolveKind(name, snap, ctx);
    return "<li><span class=\"bank-kind-name\">" + bankEsc(label) + '</span><span class="bank-edit-side"><select class="bank-chip" data-bank-kind="' +
      bankEsc(name) + '" aria-label="Bill or Optional for ' + bankEsc(label) + '">' + bankKindOptions(kind) +
      "</select></span></li>";
  }).join("") + "</ul>";
}

function bankEditsPanelHtml(snap, opts) {
  opts = opts || {};
  var budget = (snap && snap.budget) || {};
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var bills = bankSurfaceBills(bankNormalizeBills(budget, dueArg), budget);
  var incomes = bankApplyIncomeEdits(bankNormalizeIncome(budget), opts.edits);
  var rows = bankEditRows(snap);
  var known = bankKnownCategories(snap);
  var inUse = bankCategoriesInUse(rows, known);
  var picked = bankResolveEditCat(inUse, known, opts.editCat);
  var catSync = '<p class="hint bank-sync">Categories sync across your seats</p>';
  var dueNote = bankHasDueNote(snap) ? '<p class="hint bank-sync">Due day edits sync across your seats</p>' : "";
  var kindNote = bankHasMustPayNote(snap) ? '<p class="hint bank-sync">Bill or Optional edits sync across your seats.</p>' : "";
  var catErr = opts.overrideError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.overrideError) + "</p>" : "";
  var addErr = opts.categoryError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.categoryError) + "</p>" : "";
  var dueErr = opts.dueError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.dueError) + "</p>" : "";
  var kindErr = opts.kindError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.kindError) + "</p>" : "";
  return '<section class="bank-edit-block"><h3>Transactions</h3>' + catSync + catErr + addErr +
    bankAddCategoryHtml() +
    bankEditTxHtml(rows, known, picked, opts.rowAdd) + '</section><section class="bank-edit-block"><h3>Bills</h3>' +
    dueNote + dueErr + bankEditBillHtml(bills) + '</section><section class="bank-edit-block"><h3>Income</h3>' +
    '<p class="hint">Enter an amount and a day when the print left them blank. A blank stays blank.</p>' +
    bankEditIncomeHtml(incomes) + '</section><section class="bank-edit-block"><h3>Bill or Optional</h3>' +
    '<p class="hint">Bills and anything with a due day start as Bill. Everything else starts as Optional. A choice here is saved.</p>' +
    kindNote + kindErr + bankKindEditHtml(snap) + "</section>";
}

function bankTabHint(tab) {
  if (tab === "current") return "Live balances, in/out, recent";
  if (tab === "budget") return "Plan, dues, progress vs limits";
  return "";
}

function bankSrcLine(tab) {
  if (tab === "current") return "What\u2019s in the print right now.";
  if (tab === "budget") return "What you planned \u2014 and how actuals track the limits.";
  return "From the one-time passcode feed. Blank means the print omitted that figure.";
}

function bankPageHtml(snap, opts) {
  opts = opts || {};
  var tab = bankResolveTab(opts.tab || "current");
  var panel = "";
  if (tab === "historical") panel = bankHistHtml(snap || {}, opts);
  else if (tab === "budget") panel = bankBudgetHtml(snap || {}, opts);
  else if (tab === "edits") panel = bankEditsPanelHtml(snap || {}, opts);
  else panel = bankCurrentHtml(snap || {}, opts);
  var hint = bankTabHint(tab);
  var hintHtml = hint ? '<p class="bank-tab-hint">' + bankEsc(hint) + "</p>" : "";
  return bankNavHtml(tab, opts.menuOpen) + '<div class="bank-panel" data-panel="' + tab + '" role="tabpanel">' +
    hintHtml + panel + '<p class="hint bank-src">' + bankSrcLine(tab) + "</p></div>";
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

function bankPaint(root, paintOpts) {
  if (!root || !root._bank) return;
  paintOpts = paintOpts || {};
  var st = root._bank;
  if (!paintOpts.keepMenu) st.menuOpen = false;
  var sel = bankHistSelection(bankMonths(st.data), st.year, st.month);
  st.year = sel.year;
  st.month = sel.month;
  if (st.tab === "edits") {
    var known = bankKnownCategories(st.data);
    st.editCat = bankResolveEditCat(bankCategoriesInUse(bankEditRows(st.data), known), known, st.editCat);
  }
  root.innerHTML = bankPageHtml(st.data, {
    tab: st.tab,
    year: st.year,
    month: st.month,
    now: st.now,
    edits: st.edits || bankReadStore(),
    editsOpen: !!st.editsOpen,
    overrideError: st.overrideError || "",
    dueError: st.dueError || "",
    kindError: st.kindError || "",
    categoryError: st.categoryError || "",
    billKey: st.billKey || "",
    editCat: st.editCat || "",
    rowAdd: st.rowAdd || null,
    menuOpen: !!st.menuOpen
  });
}

function bankFocusGear(root) {
  var el = root && root.querySelector && root.querySelector("[data-bank-overflow]");
  if (el && el.focus) {
    try { el.focus(); } catch (e) {}
  }
}

function bankFocusOverflowItem(root) {
  var el = root && root.querySelector && root.querySelector("#bankOverflowMenu [data-bank-tab]");
  if (el && el.focus) {
    try { el.focus(); } catch (e) {}
  }
}

var bankNavRoot = null;
var bankNavBound = false;
var bankNavLock = false;

function bankWriteTabHistory(tab) {
  if (bankNavLock) return;
  try {
    if (typeof history === "undefined" || typeof location === "undefined") return;
    var h = tab === "current" ? "" : "#" + tab;
    var url = (location.pathname || "") + (location.search || "") + h;
    var now = (location.pathname || "") + (location.search || "") + (location.hash || "");
    if (url === now) return;
    bankNavLock = true;
    try {
      if (history.pushState) history.pushState({ bankTab: tab }, "", url);
      else if (history.replaceState) history.replaceState({ bankTab: tab }, "", url);
    } finally {
      bankNavLock = false;
    }
  } catch (e) {
    bankNavLock = false;
  }
}

/* Back, forward, and a hash edit already updated location. Activating again must not push. */
function bankActivateFromHistory() {
  if (bankNavLock) return;
  var root = bankNavRoot;
  if (!root || !root._bank) return;
  var tab = bankResolveTab(typeof location !== "undefined" ? location.hash : "");
  if (root._bank.tab === tab) return;
  bankActivate(root, tab, { fromHistory: true });
}

function bankBindHistory(root) {
  if (root) bankNavRoot = root;
  if (bankNavBound) return;
  var target = typeof window !== "undefined" ? window : null;
  if (!target || !target.addEventListener) return;
  bankNavBound = true;
  target.addEventListener("hashchange", bankActivateFromHistory);
  target.addEventListener("popstate", bankActivateFromHistory);
}

function bankActivate(root, tab, opts) {
  if (!root || !root._bank) return;
  opts = opts || {};
  var prevTab = root._bank.tab;
  var next = bankResolveTab(tab);
  root._bank.tab = next;
  root._bank.rowAdd = null;
  if (!opts.fromHistory) bankWriteTabHistory(next);
  if (root._bank.tab === "edits" && prevTab !== "edits") return bankRefreshEmptyCustoms(root);
  bankPaint(root);
}

function bankActivateMonth(root, month) {
  if (!root || !root._bank) return;
  root._bank.tab = "historical";
  root._bank.month = month || "year";
  root._bank.rowAdd = null;
  bankPaint(root);
}

function bankCopyMap(src) {
  var out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  Object.keys(src).forEach(function (k) { out[k] = src[k]; });
  return out;
}

function bankSaveIncomeEdit(root, label, field, value) {
  if (!root || !root._bank || !label) return;
  var budget = (root._bank.data && root._bank.data.budget) || {};
  var incomes = bankNormalizeIncome(budget);
  var row = null;
  incomes.forEach(function (inc) {
    if (inc.label === label) row = inc;
  });
  if (!row || !row.editable) return;
  var base = root._bank.edits || bankReadStore();
  var store = { bills: bankCopyMap(base.bills), income: bankCopyMap(base.income) };
  var prev = store.income[label];
  var next = {};
  if (typeof prev === "number") next.typical_day = prev;
  else if (prev && typeof prev === "object" && !Array.isArray(prev)) {
    if (Object.prototype.hasOwnProperty.call(prev, "amount")) next.amount = prev.amount;
    if (Object.prototype.hasOwnProperty.call(prev, "typical_day")) next.typical_day = prev.typical_day;
  }
  if (field === "amount") {
    if (value == null || String(value).trim() === "") delete next.amount;
    else {
      var n = bankNum(value);
      if (n == null) return;
      if (n < 0) n = 0;
      if (n > BANK_INCOME_MAX) n = BANK_INCOME_MAX;
      next.amount = n;
    }
  } else if (field === "day") {
    if (value == null || String(value).trim() === "") delete next.typical_day;
    else {
      var d = bankDay(value);
      if (d == null) return;
      next.typical_day = d;
    }
  } else return;
  if (!Object.prototype.hasOwnProperty.call(next, "amount") && !Object.prototype.hasOwnProperty.call(next, "typical_day")) {
    delete store.income[label];
  } else store.income[label] = next;
  bankWriteStore(store);
  root._bank.edits = store;
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

function bankRefetch(root, opts) {
  opts = opts || {};
  return fetch(BANK_DATA_URL, bankFetchInit()).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") return false;
    return bankReadJson(res).then(function (data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      /* A stale print can omit a custom that this seat just added. Keep those labels. */
      bankAdoptSnapshot(root._bank, data);
      root._bank.overrideError = "";
      root._bank.dueError = "";
      root._bank.kindError = "";
      if (!opts.silent) bankPaint(root);
      return true;
    });
  }).catch(function () { return false; });
}

/* A 200 body can be a stale snapshot or an empty ack. The row must show the category that just saved. */
function bankApplyPostedOverride(snap, key, category) {
  if (!snap || !key) return;
  var next = category == null ? "" : String(category).trim();
  if (!next) return;
  var shown = false;
  bankEditRows(snap).forEach(function (r) {
    if (r.key === key && r.category === next) shown = true;
  });
  if (!shown) bankRememberOverride(snap, key, next);
}

function bankTakeOverrideResponse(root, payload, key, category) {
  var st = root._bank;
  function finish() {
    if (st.data) bankApplyPostedOverride(st.data, key, category);
    st.overrideError = "";
    bankPaint(root);
    return Promise.resolve(true);
  }
  if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    bankAdoptSnapshot(st, payload);
    return finish();
  }
  if (payload && payload.overrides && typeof payload.overrides === "object" && !Array.isArray(payload.overrides)) {
    if (!st.data || typeof st.data !== "object") st.data = {};
    st.data.category_overrides = payload.overrides;
    return finish();
  }
  return bankRefetch(root, { silent: true }).then(function (ok) {
    if (!ok && key && st.data) bankRememberOverride(st.data, key, category);
    return finish();
  });
}

function bankOverrideErrorText(res) {
  if (bankIsLockedResponse(res)) return "Sign in again to save a category edit.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Category edits are not on the feed yet. Nothing was saved.";
  return "Category edit did not save. Nothing was changed.";
}

function bankDueErrorText(res) {
  if (bankIsLockedResponse(res)) return "Sign in again to save a due day.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Due day edits are not on the feed yet. Nothing was saved.";
  return "Due day edit did not save. Nothing was changed.";
}

function bankTakeDueResponse(root, payload, key, day) {
  var st = root._bank;
  if (payload && payload.schema === "banking-dueday-overrides/v1" && payload.overrides &&
      typeof payload.overrides === "object" && !Array.isArray(payload.overrides)) {
    if (!st.data || typeof st.data !== "object") st.data = {};
    st.data.dueday_overrides = payload.overrides;
    st.dueError = "";
    st.billKey = key || st.billKey || "";
    bankPaint(root);
    return Promise.resolve();
  }
  if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    st.data = payload;
    st.dueError = "";
    st.billKey = key || st.billKey || "";
    bankPaint(root);
    return Promise.resolve();
  }
  return bankRefetch(root).then(function (ok) {
    if (ok) {
      if (key) st.billKey = key;
      return;
    }
    if (!st.data || typeof st.data !== "object") st.data = {};
    var map = {};
    var prev = st.data.dueday_overrides;
    if (prev && typeof prev === "object" && !Array.isArray(prev)) {
      Object.keys(prev).forEach(function (k) { map[k] = prev[k]; });
    }
    map[key] = day;
    st.data.dueday_overrides = map;
    st.dueError = "";
    st.billKey = key || "";
    bankPaint(root);
  });
}

function bankSaveDueDay(root, key, day) {
  if (!root || !root._bank || !key) return Promise.resolve();
  var next = day == null ? null : bankDay(day);
  if (day != null && next == null) return Promise.resolve();
  var dueArg = bankHasDueMap(root._bank.data) ? bankDueMap(root._bank.data) : undefined;
  var bills = bankNormalizeBills((root._bank.data && root._bank.data.budget) || {}, dueArg);
  var same = false;
  bills.forEach(function (b) {
    if (bankBillKey(b.name) !== key) return;
    if (next == null) same = b.typical_day == null;
    else same = b.typical_day === next;
  });
  if (same) return Promise.resolve();
  root._bank.dueError = "";
  root._bank.billKey = key;
  return fetch(BANK_DUEDAY_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key, day: next })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.dueError = bankDueErrorText(res);
      bankPaint(root);
      return;
    }
    return bankReadJson(res).then(function (payload) {
      return bankTakeDueResponse(root, payload, key, next);
    });
  }).catch(function () {
    root._bank.dueError = "Due day edit did not save. Nothing was changed.";
    bankPaint(root);
  });
}

function bankPayloadMustPayMap(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.schema === "banking-mustpay-overrides/v1") {
    var named = payload.overrides;
    if (!named || typeof named !== "object" || Array.isArray(named)) return {};
    return named;
  }
  if (payload.mustpay_overrides && typeof payload.mustpay_overrides === "object" && !Array.isArray(payload.mustpay_overrides)) {
    return payload.mustpay_overrides;
  }
  if (payload.overrides && typeof payload.overrides === "object" && !Array.isArray(payload.overrides) && !payload.current && !payload.budget) {
    return payload.overrides;
  }
  if (!payload.current && !payload.budget && !payload.categories && !payload.schema) {
    var keys = Object.keys(payload);
    if (keys.every(function (k) { return !!bankMustPayKind(payload[k]); })) return payload;
  }
  return null;
}

function bankRememberMustPay(snap, name, kind) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap) || !name) return;
  var map = {};
  var prev = bankMustPayMap(snap);
  Object.keys(prev).forEach(function (k) { map[k] = prev[k]; });
  if (!kind) delete map[name];
  else map[name] = kind;
  snap.mustpay_overrides = map;
}

function bankMustPayErrorText(res) {
  if (bankIsLockedResponse(res)) return "Sign in again to save Bill or Optional.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Bill or Optional edits are not on the feed yet. Nothing was saved.";
  return "Bill or Optional edit did not save. Nothing was changed.";
}

function bankTakeMustPayResponse(root, payload, name, kind) {
  var st = root._bank;
  function paintOk() {
    st.kindError = "";
    bankPaint(root);
    return Promise.resolve(true);
  }
  function ensure() {
    if (name && kind && bankMustPayOverride(st.data, name) !== kind) bankRememberMustPay(st.data, name, kind);
  }
  var map = bankPayloadMustPayMap(payload);
  if (map) {
    if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
    st.data.mustpay_overrides = map;
    ensure();
    return paintOk();
  }
  if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    bankAdoptSnapshot(st, payload);
    ensure();
    return paintOk();
  }
  return bankRefetch(root, { silent: true }).then(function (ok) {
    if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
    if (!ok) bankRememberMustPay(st.data, name, kind);
    else ensure();
    return paintOk();
  });
}

function bankSaveMustPay(root, name, kind) {
  if (!root || !root._bank || !name) return Promise.resolve(false);
  var next = bankMustPayKind(kind);
  if (!next) return Promise.resolve(false);
  var raw = String(name).trim();
  if (!raw) return Promise.resolve(false);
  if (bankMustPayOverride(root._bank.data, raw) === next) return Promise.resolve(true);
  root._bank.kindError = "";
  return fetch(BANK_MUSTPAY_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: raw, kind: next })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.kindError = bankMustPayErrorText(res);
      bankPaint(root);
      return false;
    }
    return bankReadJson(res).then(function (payload) {
      return bankTakeMustPayResponse(root, payload, raw, next);
    });
  }).catch(function () {
    root._bank.kindError = "Bill or Optional edit did not save. Nothing was changed.";
    bankPaint(root);
    return false;
  });
}

function bankPutMustPay(root, overrides) {
  if (!root || !root._bank) return Promise.resolve(false);
  var map = {};
  var src = overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {};
  Object.keys(src).forEach(function (k) {
    var kind = bankMustPayKind(src[k]);
    if (kind) map[k] = kind;
  });
  root._bank.kindError = "";
  return fetch(BANK_MUSTPAY_URL, bankFetchInit({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "banking-mustpay-overrides/v1", overrides: map })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.kindError = bankMustPayErrorText(res);
      bankPaint(root);
      return false;
    }
    return bankReadJson(res).then(function (payload) {
      var got = bankPayloadMustPayMap(payload);
      if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
      root._bank.data.mustpay_overrides = got || map;
      root._bank.kindError = "";
      bankPaint(root);
      return true;
    });
  }).catch(function () {
    root._bank.kindError = "Bill or Optional edit did not save. Nothing was changed.";
    bankPaint(root);
    return false;
  });
}

function bankApplyMustPayPayload(snap, payload) {
  var map = bankPayloadMustPayMap(payload);
  if (!map || !snap || typeof snap !== "object" || Array.isArray(snap)) return false;
  snap.mustpay_overrides = map;
  return true;
}

function bankRehydrateMustPay(root, opts) {
  opts = opts || {};
  if (!root || !root._bank) return Promise.resolve(false);
  var gen = (root._bank.kindGen = (root._bank.kindGen || 0) + 1);
  return Promise.resolve().then(function () {
    return fetch(BANK_MUSTPAY_URL, bankFetchInit());
  }).then(function (res) {
    if (!root._bank || root._bank.kindGen !== gen) return false;
    if (!res || res.ok !== true || res.type === "opaqueredirect") return false;
    return bankReadJson(res).then(function (payload) {
      if (!root._bank || root._bank.kindGen !== gen) return false;
      var st = root._bank;
      if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
      var before = JSON.stringify(bankMustPayMap(st.data));
      if (!bankApplyMustPayPayload(st.data, payload)) return false;
      var after = JSON.stringify(bankMustPayMap(st.data));
      if (!opts.silent && before !== after) bankPaint(root);
      return true;
    });
  }).catch(function () { return false; });
}

function bankSaveCategory(root, key, category, force) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var next = category == null ? "" : String(category).trim();
  if (!next) return Promise.resolve(false);
  var prev = "";
  var same = false;
  bankEditRows(root._bank.data).forEach(function (r) {
    if (r.key !== key) return;
    prev = r.category;
    if (r.category === next) same = true;
  });
  /* Re-selecting the current label does not post. A row add must post even if the feed already echoes the label. */
  if (same && !force) return Promise.resolve(true);
  root._bank.overrideError = "";
  return fetch(BANK_OVERRIDES_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key, category: next })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.overrideError = bankOverrideErrorText(res);
      bankPaint(root);
      return false;
    }
    return bankReadJson(res).then(function (payload) {
      return bankTakeOverrideResponse(root, payload, key, next).then(function (saved) {
        if (!saved || !prev || prev === next) return !!saved;
        return bankPruneCustomIfEmpty(root, prev).then(function () { return true; });
      });
    });
  }).catch(function () {
    root._bank.overrideError = "Category edit did not save. Nothing was changed.";
    bankPaint(root);
    return false;
  });
}

function bankReadNewCategory(root) {
  if (root && typeof root.querySelector === "function") {
    var input = root.querySelector("[data-bank-new-cat]");
    if (input) return input.value == null ? "" : String(input.value);
  }
  var st = root && root._bank;
  return st && st.newCatDraft != null ? String(st.newCatDraft) : "";
}

function bankCategoryErrorText(res) {
  if (bankIsLockedResponse(res)) return "Sign in again to add a category.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Categories are not on the feed yet. Nothing was saved.";
  return "Category did not save. Nothing was changed.";
}

function bankCategoryRemoveErrorText(res) {
  if (bankIsLockedResponse(res) || (res && Number(res.status) === 302)) return "Sign in again to remove a category.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Categories are not on the feed yet. Nothing was saved.";
  return "Category did not save. Nothing was changed.";
}

function bankRememberCategory(snap, name) {
  var next = bankClipCategory(name);
  if (!next || !snap) return;
  var list = bankCustomCategories(snap);
  if (list.indexOf(next) < 0) list.push(next);
  snap.custom_categories = list;
}

/* Union clipped names. An empty incoming list does not clear names already held. */
function bankMergeCustomCategories(snap, names) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return [];
  var prev = bankCustomCategories(snap);
  var extra = bankCustomCategories({ custom_categories: names });
  if (!extra.length) return prev;
  var merged = bankCustomCategories({ custom_categories: prev.concat(extra) });
  snap.custom_categories = merged;
  return merged;
}

function bankPayloadListsCategory(payload, name) {
  if (!name || !payload) return false;
  if (Array.isArray(payload.categories)) {
    return bankCustomCategories({ custom_categories: payload.categories }).indexOf(name) >= 0;
  }
  if (payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    return bankCustomCategories(payload).indexOf(name) >= 0;
  }
  return false;
}

/* A replacement print may be older than the label this seat just saved.
   An empty custom_categories list does not drop names already on this seat. */
function bankAdoptSnapshot(st, payload) {
  var prev = bankCustomCategories(st && st.data);
  st.data = payload;
  if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
  var incoming = bankCustomCategories(st.data);
  if (!incoming.length && prev.length) st.data.custom_categories = prev.slice();
  else prev.forEach(function (n) { bankRememberCategory(st.data, n); });
}

function bankCategoryCount(snap, name) {
  var target = name == null ? "" : String(name).trim();
  if (!target) return 0;
  var overrides = bankOverrideMap(snap);
  var seen = {};
  var n = 0;
  bankCategorySourceLists(snap).forEach(function (list) {
    list.forEach(function (raw) {
      var row = bankMapTx(raw, 0, overrides);
      if (!row.key || seen[row.key]) return;
      seen[row.key] = true;
      if (row.category === target) n += 1;
    });
  });
  /* An override whose tx is outside every loaded list still counts. */
  Object.keys(overrides).forEach(function (k) {
    if (seen[k]) return;
    seen[k] = true;
    if (bankCatName(overrides[k]) === target) n += 1;
  });
  return n;
}

function bankOverrideHasCategory(snap, name) {
  var target = name == null ? "" : String(name).trim();
  if (!target) return false;
  var ov = bankOverrideMap(snap);
  return Object.keys(ov).some(function (k) {
    return bankCatName(ov[k]) === target;
  });
}

/* Names sitting in an open add field are not removed before confirm. */
function bankDraftKeep(st) {
  var keep = {};
  if (!st) return keep;
  var typed = bankClipCategory(st.newCatDraft || "");
  if (typed) keep[typed] = true;
  if (st.rowAdd) {
    var draft = bankClipCategory(st.rowAdd.draft || "");
    if (draft) keep[draft] = true;
  }
  return keep;
}

/* Local dropdown filter only. Opening or refreshing Edits does not call this, and it does not post. */
function bankTakeEmptyCustoms(st) {
  if (!st || !st.data) return [];
  var keep = bankDraftKeep(st);
  var held = bankClipCategory(st.keptEmpty || "");
  if (held) keep[held] = true;
  var removed = [];
  var list = bankCustomCategories(st.data).filter(function (name) {
    if (keep[name] || bankCategoryCount(st.data, name) > 0 || bankOverrideHasCategory(st.data, name)) return true;
    removed.push(name);
    return false;
  });
  if (!removed.length) return removed;
  st.data.custom_categories = list;
  if (keep[st.editCat] !== true && removed.indexOf(st.editCat) >= 0) st.editCat = "";
  if (removed.indexOf(st.keptEmpty) >= 0) st.keptEmpty = "";
  return removed;
}

function bankNoteCategoryRemoved(st, name, payload, pending) {
  if (!st || !st.data) return;
  var prev = bankCustomCategories(st.data);
  if (payload && Array.isArray(payload.categories)) {
    st.data.custom_categories = bankCustomCategories({ custom_categories: payload.categories });
  } else if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    bankAdoptSnapshot(st, payload);
  }
  /* A short ack must not drop a custom that still has merchants. */
  prev.forEach(function (n) { bankRememberCategory(st.data, n); });
  var drop = {};
  drop[name] = true;
  (pending || []).forEach(function (n) { drop[n] = true; });
  Object.keys(drop).forEach(function (n) {
    if (bankOverrideHasCategory(st.data, n) || bankCategoryCount(st.data, n) > 0) delete drop[n];
  });
  st.data.custom_categories = bankCustomCategories(st.data).filter(function (n) { return !drop[n]; });
  if (st.keptEmpty && !drop[st.keptEmpty]) bankRememberCategory(st.data, st.keptEmpty);
  if (drop[st.editCat]) st.editCat = "";
  if (drop[st.keptEmpty]) st.keptEmpty = "";
}

function bankPostCategoryRemoval(root, names) {
  if (!names || !names.length) return Promise.resolve();
  if (root && root._bank) root._bank.categoryError = "";
  var pending = names.slice();
  var failed = [];
  var failRes = null;
  var sawFail = false;
  var i = 0;
  function noteFail(name, res) {
    failed.push(name);
    if (!sawFail) {
      sawFail = true;
      failRes = res || null;
    }
  }
  function step() {
    if (!root || !root._bank) return Promise.resolve();
    if (i >= names.length) {
      if (failed.length && root._bank.data) {
        failed.forEach(function (n) { bankRememberCategory(root._bank.data, n); });
        root._bank.categoryError = bankCategoryRemoveErrorText(failRes);
      }
      bankPaint(root);
      return Promise.resolve();
    }
    var name = names[i++];
    var snap = root._bank.data;
    /* Never delete a custom that any override still names, even outside the edits window. */
    if (snap && (bankOverrideHasCategory(snap, name) || bankCategoryCount(snap, name) > 0)) {
      bankRememberCategory(snap, name);
      return step();
    }
    return fetch(BANK_CATEGORIES_URL, bankFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: name, remove: true })
    })).then(function (res) {
      if (!res || res.ok !== true || res.type === "opaqueredirect") {
        noteFail(name, res);
        return step();
      }
      return bankReadJson(res).then(function (payload) {
        bankNoteCategoryRemoved(root._bank, name, payload, pending);
        return step();
      });
    }).catch(function () {
      noteFail(name, null);
      return step();
    });
  }
  return step();
}

function bankPruneCustomIfEmpty(root, name) {
  var st = root && root._bank;
  name = bankClipCategory(name);
  if (!st || !st.data || !name) return Promise.resolve();
  if (bankCustomCategories(st.data).indexOf(name) < 0) return Promise.resolve();
  if (bankCategoryCount(st.data, name) > 0) return Promise.resolve();
  if (bankOverrideHasCategory(st.data, name)) return Promise.resolve();
  if (bankDraftKeep(st)[name]) return Promise.resolve();
  st.catGen = (st.catGen || 0) + 1;
  st.data.custom_categories = bankCustomCategories(st.data).filter(function (n) { return n !== name; });
  if (st.editCat === name) st.editCat = "";
  if (st.keptEmpty === name) st.keptEmpty = "";
  st.categoryError = "";
  bankPaint(root);
  return bankPostCategoryRemoval(root, [name]);
}

/* Names the seat already holds that any override or loaded row still uses.
   An empty or partial categories.json must not drop these. */
function bankRetainOccupiedCustoms(snap, prior) {
  if (!snap) return;
  (prior || []).forEach(function (n) {
    if (bankOverrideHasCategory(snap, n) || bankCategoryCount(snap, n) > 0) bankRememberCategory(snap, n);
  });
}

/* GET categories.json and merge categories[] into the open snap.
   A failed read leaves the snap list alone. An empty list does not clear occupied names. */
function bankRehydrateCategories(root, opts) {
  opts = opts || {};
  if (!root || !root._bank) return Promise.resolve(false);
  var gen = (root._bank.catGen = (root._bank.catGen || 0) + 1);
  return Promise.resolve().then(function () {
    return fetch(BANK_CATEGORIES_URL, bankFetchInit());
  }).then(function (res) {
    if (!root._bank || root._bank.catGen !== gen) return false;
    if (!res || res.ok !== true || res.type === "opaqueredirect") return false;
    return bankReadJson(res).then(function (payload) {
      if (!root._bank || root._bank.catGen !== gen) return false;
      if (!payload || !Array.isArray(payload.categories)) return false;
      var st = root._bank;
      if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
      var before = bankCustomCategories(st.data).join("\n");
      var prior = bankCustomCategories(st.data);
      bankMergeCustomCategories(st.data, payload.categories);
      bankRetainOccupiedCustoms(st.data, prior);
      if (!root._bank || root._bank.catGen !== gen) return false;
      var after = bankCustomCategories(st.data).join("\n");
      if (!opts.silent && before !== after) bankPaint(root);
      return true;
    });
  }).catch(function () { return false; });
}

/* Entering or refreshing Edits paints the lists, then reloads categories and Bill or Optional. It does not post a removal. */
function bankRefreshEmptyCustoms(root) {
  var st = root && root._bank;
  if (!st || st.tab !== "edits") return Promise.resolve();
  bankPaint(root);
  return Promise.all([
    bankRehydrateCategories(root),
    bankRehydrateMustPay(root)
  ]).then(function () { return true; });
}

function bankTakeCategoryResponse(root, payload, name, hold) {
  var st = root._bank;
  var next = bankClipCategory(name);
  var known = bankPayloadListsCategory(payload, next);
  function ready() {
    if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
    /* The feed body can be empty, stale, or {}. The posted label still has to land in both dropdowns. */
    if (next) bankRememberCategory(st.data, next);
    st.categoryError = "";
    st.newCatDraft = "";
    /* Row add uses hold so the picker does not jump, but the new name is still empty until the assign lands. */
    if (next) st.keptEmpty = next;
    if (!hold && next) st.editCat = next;
    st.tab = "edits";
  }
  function finish() {
    ready();
    if (!hold) bankPaint(root);
    return Promise.resolve();
  }
  if (payload && Array.isArray(payload.categories)) {
    if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
    var cleaned = bankCustomCategories({ custom_categories: payload.categories });
    if (cleaned.length) st.data.custom_categories = cleaned;
  } else if (payload && payload.current && typeof payload.current === "object" && !Array.isArray(payload.current)) {
    bankAdoptSnapshot(st, payload);
  } else {
    return bankRefetch(root, { silent: true }).then(function () {
      ready();
      if (known) return finish();
      return bankRehydrateCategories(root, { silent: true }).then(finish);
    });
  }
  if (known) return finish();
  return bankRehydrateCategories(root, { silent: true }).then(finish);
}

function bankAddCategory(root, name, hold) {
  if (!root || !root._bank) return Promise.resolve(false);
  var next = bankClipCategory(name);
  if (!next) return Promise.resolve(false);
  var prevKept = root._bank.keptEmpty || "";
  root._bank.keptEmpty = next;
  root._bank.categoryError = "";
  root._bank.tab = "edits";
  function restoreKept() {
    if (root._bank && root._bank.keptEmpty === next) root._bank.keptEmpty = prevKept;
  }
  return fetch(BANK_CATEGORIES_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: next })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      restoreKept();
      root._bank.categoryError = bankCategoryErrorText(res);
      root._bank.newCatDraft = "";
      bankPaint(root);
      return false;
    }
    return bankReadJson(res).then(function (payload) {
      return bankTakeCategoryResponse(root, payload, next, hold).then(function () { return true; });
    });
  }).catch(function () {
    restoreKept();
    root._bank.categoryError = "Category did not save. Nothing was changed.";
    root._bank.newCatDraft = "";
    bankPaint(root);
    return false;
  });
}

function bankRowAddDraft(root) {
  if (root && typeof root.querySelector === "function") {
    var input = root.querySelector("[data-bank-row-cat]");
    if (input) return input.value == null ? "" : String(input.value);
  }
  var add = root && root._bank && root._bank.rowAdd;
  return add && add.draft != null ? String(add.draft) : "";
}

function bankFocusRowAdd(root) {
  if (!root || typeof root.querySelector !== "function") return;
  var input = root.querySelector("[data-bank-row-cat]");
  if (input && input.focus) {
    try { input.focus(); } catch (e) {}
  }
}

function bankBeginRowAdd(root, key) {
  if (!root || !root._bank || !key) return;
  var found = false;
  bankEditRows(root._bank.data).forEach(function (r) {
    if (r.key === key) found = true;
  });
  if (!found) return;
  root._bank.rowAdd = { key: key, draft: "" };
  root._bank.tab = "edits";
  root._bank.categoryError = "";
  bankPaint(root);
  bankFocusRowAdd(root);
}

function bankCancelRowAdd(root) {
  if (!root || !root._bank || !root._bank.rowAdd) return;
  root._bank.rowAdd = null;
  bankPaint(root);
}

function bankConfirmRowAdd(root, keyOverride) {
  if (!root || !root._bank) return Promise.resolve();
  var key = keyOverride || (root._bank.rowAdd && root._bank.rowAdd.key);
  if (!key) return Promise.resolve();
  var next = bankClipCategory(bankRowAddDraft(root));
  root._bank.rowAdd = null;
  if (!next) {
    bankPaint(root);
    return Promise.resolve();
  }
  return bankAddCategory(root, next, true).then(function (ok) {
    if (!ok || !root._bank) return;
    return bankSaveCategory(root, key, next, true).then(function (saved) {
      if (!root._bank || !saved) return;
      root._bank.editCat = next;
      root._bank.tab = "edits";
      root._bank.rowAdd = null;
      bankPaint(root);
    });
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
    overrideError: opts.overrideError || "",
    dueError: opts.dueError || "",
    kindError: opts.kindError || "",
    categoryError: opts.categoryError || "",
    billKey: opts.billKey || "",
    editCat: opts.editCat || "",
    newCatDraft: "",
    keptEmpty: "",
    rowAdd: null,
    prune: Promise.resolve()
  };
  if (root._bank.tab === "edits") root._bank.prune = bankRefreshEmptyCustoms(root);
  else {
    bankPaint(root);
    root._bank.prune = bankRehydrateCategories(root);
  }
  bankBindHistory(root);
  if (root._bankBound || !root.addEventListener) return;
  root._bankBound = true;
  if (!root._bankDocBound && typeof document !== "undefined" && document.addEventListener) {
    root._bankDocBound = true;
    document.addEventListener("click", function (ev) {
      if (!root._bank || !root._bank.menuOpen) return;
      var n = ev && ev.target;
      if (n && n.closest && n.closest(".bank-overflow")) return;
      if (n && root.contains && root.contains(n)) return;
      bankPaint(root);
    });
  }
  root.addEventListener("click", function (e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var tabBtn = t.closest("[data-bank-tab]");
    if (tabBtn && tabBtn.getAttribute) {
      if (root._bank) root._bank.menuOpen = false;
      bankActivate(root, tabBtn.getAttribute("data-bank-tab"));
      return;
    }
    var gear = t.closest("[data-bank-overflow]");
    if (gear) {
      if (e.preventDefault) e.preventDefault();
      if (!root._bank) return;
      root._bank.menuOpen = !root._bank.menuOpen;
      bankPaint(root, { keepMenu: true });
      if (root._bank.menuOpen) bankFocusOverflowItem(root);
      return;
    }
    var monthBtn = t.closest("[data-bank-month]");
    if (monthBtn && monthBtn.getAttribute) {
      bankActivateMonth(root, monthBtn.getAttribute("data-bank-month"));
      return;
    }
    var addBtn = t.closest("[data-bank-add-cat]");
    if (addBtn) {
      if (e.preventDefault) e.preventDefault();
      return bankAddCategory(root, bankReadNewCategory(root));
    }
    var rowOk = t.closest("[data-bank-row-ok]");
    if (rowOk) {
      if (e.preventDefault) e.preventDefault();
      var domKey = rowOk.getAttribute ? rowOk.getAttribute("data-bank-row-ok") : "";
      return bankConfirmRowAdd(root, domKey || (root._bank && root._bank.rowAdd && root._bank.rowAdd.key));
    }
    var rowCancel = t.closest("[data-bank-row-cancel]");
    if (rowCancel) {
      if (e.preventDefault) e.preventDefault();
      bankCancelRowAdd(root);
      return;
    }
    if (root._bank && root._bank.menuOpen && !t.closest(".bank-overflow")) {
      bankPaint(root);
    }
  });
  root.addEventListener("change", function (e) {
    var el = e && e.target;
    if (!el || !el.getAttribute) return;
    if (el.hasAttribute && el.hasAttribute("data-bank-new-cat")) {
      if (root._bank) root._bank.newCatDraft = el.value == null ? "" : String(el.value);
      return;
    }
    if (el.getAttribute("data-bank-kind")) {
      return bankSaveMustPay(root, el.getAttribute("data-bank-kind"), el.value);
    }
    if (el.getAttribute("data-bank-income")) {
      return bankSaveIncomeEdit(root, el.getAttribute("data-bank-income"), el.getAttribute("data-bank-income-field"), el.value);
    }
    if (el.getAttribute("data-bank-due")) {
      var rawDay = el.value;
      var dueDay = rawDay === "" || rawDay == null ? null : bankDay(rawDay);
      if (rawDay !== "" && rawDay != null && dueDay == null) return;
      return bankSaveDueDay(root, el.getAttribute("data-bank-due"), dueDay);
    }
    if (el.hasAttribute && el.hasAttribute("data-bank-cat")) {
      if (!root._bank) return;
      root._bank.editCat = el.value == null ? "" : String(el.value);
      root._bank.rowAdd = null;
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-tx")) {
      var txKey = el.getAttribute("data-bank-tx");
      var txVal = el.value == null ? "" : String(el.value);
      if (txVal === BANK_ROW_ADD) return bankBeginRowAdd(root, txKey);
      /* The select can reset to the old label while this row is adding a category. That must not drop the key. */
      if (root._bank && root._bank.rowAdd && root._bank.rowAdd.key === txKey) return;
      if (root._bank) root._bank.rowAdd = null;
      return bankSaveCategory(root, txKey, txVal);
    }
    if (el.hasAttribute && el.hasAttribute("data-bank-year")) {
      root._bank.year = el.value;
      root._bank.month = "year";
      root._bank.tab = "historical";
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-edit")) return;
  });
  root.addEventListener("input", function (e) {
    var el = e && e.target;
    if (!el || !el.hasAttribute || !root._bank) return;
    if (el.hasAttribute("data-bank-new-cat")) {
      root._bank.newCatDraft = el.value == null ? "" : String(el.value);
      return;
    }
    if (el.hasAttribute("data-bank-row-cat") && root._bank.rowAdd) {
      root._bank.rowAdd.draft = el.value == null ? "" : String(el.value);
    }
  });
  root.addEventListener("keydown", function (e) {
    var el = e && e.target;
    if (!el) return;
    if (e.key === "Escape" && root._bank && root._bank.menuOpen && !(el.hasAttribute && el.hasAttribute("data-bank-row-cat"))) {
      if (e.preventDefault) e.preventDefault();
      root._bank.menuOpen = false;
      bankPaint(root);
      bankFocusGear(root);
      return;
    }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && el.closest && el.closest("[data-bank-overflow]")) {
      if (e.preventDefault) e.preventDefault();
      if (root._bank && !root._bank.menuOpen) {
        root._bank.menuOpen = true;
        bankPaint(root, { keepMenu: true });
      }
      bankFocusOverflowItem(root);
      return;
    }
    if (!el.hasAttribute) return;
    if (el.hasAttribute("data-bank-row-cat")) {
      if (e.key !== "Enter" && e.key !== "Escape") return;
      if (e.preventDefault) e.preventDefault();
      if (e.key === "Escape") return bankCancelRowAdd(root);
      if (root._bank && root._bank.rowAdd) root._bank.rowAdd.draft = el.value == null ? "" : String(el.value);
      var typedKey = el.getAttribute ? el.getAttribute("data-bank-row-cat") : "";
      return bankConfirmRowAdd(root, typedKey);
    }
    if (!el.hasAttribute("data-bank-new-cat")) return;
    if (e.key !== "Enter") return;
    if (e.preventDefault) e.preventDefault();
    return bankAddCategory(root, el.value);
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
      return root._bank && root._bank.prune;
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
  bankBindHistory(root);
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
