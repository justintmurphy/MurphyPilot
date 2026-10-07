/* tip ep — House Banking.
   Budget and Current are one page, built on Budget. Spent versus plan sits on each tier and category row.
   The thin bar is green under 75 percent, amber from 75 through 100, and red over 100. It uses the shared meter.
   The due list says paid or due with the date on the row. #current and /current/ open Budget.
   tip eh — House Banking.
   Budget, Current, and Historical share one stack: Next pay, headline, plan bar, tier wheel, due list, calendar, meters.
   Each block is one render function with a mode (plan, current, or historical) and a month. Markup is not forked.
   Budget is the static plan. It has no actual fills. A paid due item only gets a small secondary marker.
   Current compares this month's actuals with this month's plan: fill is spent, the tick is the plan, and over is red.
   Historical compares a picked month's actuals with that month's frozen snapshot. tiers.json overrides stay on the current month.
   A counted:false bill is listed as not counted and left out of totals. Thin snapshots say the month is partial. Null income or left is an em dash.
   tip eb — House Banking.
   A tiers.json bill_status or manual_paid wins over the print. Cancelled and paid-off bills leave the plan from that month on.
   Account funding is a compact table: in, out, left, and a short status. The move sentence matches Next pay.
   Other income is a Current segment and a Budget bonus. It is not part of expected income or the plan.
   tip ea — House Banking.
   Budget is the plan. Current is actuals. Tiers are Required, Needs, and Wants.
   A tiers.json rule wins, then a must-pay override, then the print tier, then category_tiers, then the default map.
   Payroll is the 15th and the last day, rolled back to the prior business day. Fostering per diem stipend is the 10th and the 25th, also rolled back onto a business day when those dates fall on a weekend. A print pay_schedule or dated deposits wins, including a Forge roll already on the printed date.
   One-off payoffs marked already_excluded stay out of the historical spend adjustment.
   tip dz — House Banking.
   A twice-monthly bill shows on each of its days and counts its monthly amount once. A set-aside counts in the plan and stays off the calendar. A low-confidence note is escaped print text.
   Income deposits[] set the amount on each payday. monthly_amount wins, then the sum of deposits, then amount times times_per_month. income_total is already monthly. income_per_deposit_total is not a monthly figure.
   Rows marked one_off or exclude_from_spend_avg stay on the tape and stay out of the in/out bar.
   Historical spend drops one-off payoffs only when history.spend_includes_payoffs is true.
   Month-to-date rows drop them only when budget.mtd_includes_payoffs is true.
   budget.spend_includes_payoffs is the fallback when the specific flag is absent.
   Budget, Current, and Historical are site-nav pages. An empty or unknown hash still opens Current.
   Current is the live print. Budget is the plan, the due map, and progress against limits.
   Month-end balances stay off Current. The month-end spark helpers are gone.
   The recent tape keeps its print window and scrolls inside a pane about ten rows tall.
   That scroll region is a keyboard stop: tabindex 0, role region, label Recent activity.
   Bill, Optional, and Savings meters compare month-to-date print spend with a limit from the print.
   A missing Savings limit stays pending. An explicit Savings limit of 0 still draws the meter, with a short line that there is no room to save this month. This tip does not draw a meter per category.
   The in/out bar sums this month's inflows and outflows and leaves out a move only when both ends are linked accounts, or the print sets an internal or transfer flag.
   A category name is not a flag. An external mark keeps the row in the bar.
   Out counts tape flows. Spent so far counts category month-to-date. One line says so. The two figures are not forced to match.
   When some account balances are missing and total_cash is blank, Total cash is the sum of the known balances plus how many accounts are still pending.
   The live spent-versus-income block sits on Current. Historical keeps its own labels.
   Edits stays in the gear menu labeled More. The page title names the view and the month on screen.
   An empty hash opens Budget. #current, #historical, #historical=YYYY-MM, and #edits stay explicit.
   #edits still resolves through bankResolveTab and bankActivate.
   A view change writes that hash with pushState. Budget is the empty hash.
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
   Amount on an income row is one deposit. A monthly plan prefers monthly_amount, then amount_monthly. Otherwise it is amount times times_per_month. budget.income_total and each history income_total are already monthly and are never multiplied again.
   Cadence twice_monthly, biweekly, semi_monthly, or 2x, or times_per_month 2, is two deposits a month. A Payroll or paycheck label, and a fostering or per diem stipend label, are two deposits a month even when cadence is null.
   Those two labels use fixed pay days. Payroll is the 15th and the last day of the Budget month on screen (28, 29, 30, or 31), rolled back to the prior business day. Fostering per diem stipend is the 10th and the 25th, and a weekend date rolls back to the prior business day. A printed pay_schedule date wins. A print typical_day or typical_days list does not move them. An Edits day replaces the first of those days. The other day stays. There is no +14 guess.
   Any other twice-monthly row uses only the days the print lists (typical_days, typical_day, typical_day_2). A missing day stays off the calendar. The income list still shows the 2× plan.
   Edits keeps one day field. The hint says which second day stays.
   Edits lists current.edits_tx (the long window) plus history tx arrays.
   A present edits_tx does not hide a merchant that lives only on history.
   The Current tape stays on recent_tx. The merchant line and the category chip stay the feed strings. A known category with no rows still reads "No items in this category."
   A transaction key prefers tx_key, otherwise date|id|amount|desc.
   Due-day precedence: user KV, then snapshot manual, then a feed day, then a generic filler only when the feed day is null.
   Custom categories and both edits sync across seats. A null balance stays blank.
   A bill prefers typical_amount, then amount, and reads "amount pending" when both are blank.
   A bill with effective_from uses amount from that month on and prev_amount before it. No effective_from means amount. No prev_amount falls back to amount. The same fields may arrive on bills or bills_monthly and stay on the one merged row.
   A print amount override is that new amount. It applies from the effective month on and does not replace earlier months. An Edits amount in localStorage still wins in every month.
   bills_total, must_pay_budget, and left_after_bills are the as-of month and are shown unchanged for that month. Another month shifts them by the difference between that month's amount and the as-of amount. Left after bills moves the other way. The Bill meter uses the same shift. The change is not added on top of the as-of print.
   When effective_from falls in the month on screen, the bill line says "New amount from" that day. paid_current_month marks the bill paid for that month when its status is paid or paid_late, even if tx_key is null. There is no transaction match for a bill payment.
   Due this month, Current, and the next-bill ticker honor paid_current_month only when its month equals budget.paid_status_month and that month is the current Eastern calendar month. Any other stamp counts as unpaid for that month. A partial status (1 of 2) shows a chip and still lists the unpaid occurrence.
   A Z or numeric offset on effective_from, paid_date, or paid_current_month is the America/New_York calendar date. A plain YYYY-MM-DD stays that day. A plain YYYY-MM stays that month.
   The Bill list is those budget bills and due-day items from the print. Those names share the spend-category name space when Bill or Optional is tagged. It is not a second category system.
   The bill calendar is a Sun–Sat month grid for the as-of date in ET.
   Each pay or bill label keeps its full display name on title and aria-label.
   A day with two or more labels shows the first name and a +N chip at narrow widths, and two names on a wide screen. The full list stays on the day title and in the bill list.
   Budget Income and Bills are separate sections.
   The Budget month-to-date block shows spent so far and income received, with a bar for spend as a share of income. It does not invent income from income_monthly.
   Budget pies and the ranked lists under them list a category when its month-to-date spend is positive. A month-dated bill (effective_from or a print amount override) is also listed at the selected month's plan amount, the same amount as its bill line.
   Month-to-date category bars list a category only when its month-to-date spend is positive. A plan does not add a bar. The limit on a month-dated bill follows the selected month. Actuals stay the as-of print. When the calendar month is not that as-of month, the block says which month those actuals are from.
   A missing amount, or a zero or non-positive amount, does not keep an undated category on those surfaces, and it does not invent spend.
   The Budget month buttons keep a compact face and a 44 by 44 hit target.
   Edits still lists those empty categories so Bill versus Optional can be tagged.
   This file does not embed balances, last-4s, or named utilities. */

var BANK_STALE_MS = 36 * 60 * 60 * 1000;
var BANK_STORE = "murphyHouseBanking";
var BANK_DATA_URL = "/data/banking.json";
var BANK_OVERRIDES_URL = "/data/banking/overrides.json";
var BANK_DUEDAY_URL = "/data/banking/dueday-overrides.json";
var BANK_MUSTPAY_URL = "/data/banking/mustpay-overrides.json";
var BANK_CATEGORIES_URL = "/data/banking/categories.json";
var BANK_TIERS_URL = "/data/banking/tiers.json";
/* Generic bill tails only. A leading provider is hidden at display time (Example Mortgage shows as Mortgage).
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
  "education",
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

/* Real spaces live in the text node. The margin only adds visual padding. */
function bankSep() {
  return '<span class="sep"> \u00b7 </span>';
}

function bankMetaHtml(text) {
  var raw = text == null ? "" : String(text);
  if (!raw) return "";
  return raw.split(" \u00b7 ").map(function (part) { return bankEsc(part); }).join(bankSep());
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
  return (n < 0 ? "\u2212$" : "$") + abs;
}

/* Explicit +/− so in and out are not color-only. The minus is U+2212, not a hyphen. */
function bankSignedFlow(amount, kind) {
  var n = bankNum(amount);
  if (n == null) return { text: "\u2014", cls: "" };
  var out = kind === "out" || (kind !== "in" && n < 0);
  var abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { text: (out ? "\u2212$" : "+$") + abs, cls: out ? "tone-stop" : "tone-go" };
}

function bankFlowAmt(amount, kind) {
  var flow = bankSignedFlow(amount, kind);
  if (!flow.cls) return bankEsc(flow.text);
  return '<b class="' + flow.cls + '">' + bankEsc(flow.text) + "</b>";
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

function bankIsEomToken(v) {
  return /^eom$/i.test(String(v == null ? "" : v).trim());
}

/* EOM is the last day of the month on screen, the same rule payroll uses. */
function bankResolveDayToken(v, ym) {
  if (bankIsEomToken(v)) {
    if (ym && ym.year && ym.month) return bankMonthDim(ym.year, ym.month);
    return 31;
  }
  return bankDay(v);
}

function bankNameKeys(list) {
  var keys = [];
  if (!Array.isArray(list)) return keys;
  list.forEach(function (item) {
    var name = typeof item === "string" ? item : (item && (item.name || item.label));
    var key = bankBillKey(name);
    if (!key || keys.indexOf(key) >= 0) return;
    keys.push(key);
  });
  return keys;
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
function bankBillDisplayName(name, displayLabel) {
  /* A print display_label is the face. The shortener does not rewrite it. The key stays the name. */
  if (displayLabel != null && String(displayLabel).trim() !== "") return String(displayLabel).trim();
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
  add(raw.renamed_from);
  add(raw.alias);
  add(raw.aliases);
  add(raw.alias_key);
  add(raw.alias_keys);
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

/* Two middle dots plus the last four. Tiles, the day pop-up, Next pay, and funding share this. */
function bankAccountMask(last4) {
  var s = String(last4 == null ? "" : last4).replace(/\D/g, "");
  if (!s) return "";
  if (s.length > 4) s = s.slice(-4);
  return "\u00b7\u00b7" + s;
}

function bankMask(suffix) {
  return bankAccountMask(suffix);
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

function bankParseHash(hash) {
  var h = String(hash || "").replace(/^#/, "");
  var hist = h.match(/^historical(?:=(\d{4}-\d{2}))?$/);
  if (hist) return { tab: "historical", histMonth: hist[1] || "" };
  /* Old Current links open the merged Budget page. */
  if (h === "current") return { tab: "budget", histMonth: "" };
  if (h === "budget" || h === "edits") return { tab: h, histMonth: "" };
  return { tab: "budget", histMonth: "" };
}

function bankResolveTab(hash) {
  return bankParseHash(hash).tab;
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

/* Total cash is the sum of the balances on the tiles. A stated total is not a second figure.
   pending is how many tiles have no balance. value is null when none are known. */
function bankTotalCash(current, tiles) {
  var pending = 0;
  var known = 0;
  var sum = 0;
  var i;
  tiles = tiles || [];
  for (i = 0; i < tiles.length; i++) {
    if (!tiles[i] || tiles[i].balance == null) {
      pending++;
      continue;
    }
    known++;
    sum += tiles[i].balance;
  }
  if (!known) return { value: null, pending: pending };
  return { value: bankRoundCents(sum), pending: pending };
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

function bankLast4Digits(value) {
  var digits = String(value == null ? "" : value).replace(/\D/g, "");
  if (digits.length > 4) digits = digits.slice(-4);
  return digits;
}

function bankAccountLast4(snap, raw) {
  raw = raw || {};
  var account = raw.account && typeof raw.account === "object" ? raw.account : null;
  var direct = bankLast4Digits(raw.account_last4 || raw.last4 || (account && (account.last4 || account.last_4 || account.suffix || account.mask)));
  if (direct) return direct;
  var id = bankTxAccountId(raw);
  if (!id || !snap) return "";
  var found = "";
  bankAccounts(snap).forEach(function (acct) {
    if (found || !acct || String(acct.id || "") !== id) return;
    found = bankLast4Digits(acct.last4 || acct.last_4 || acct.suffix || acct.mask);
  });
  return found;
}

function bankMapTx(raw, i, overrides, snap) {
  raw = raw || {};
  var last4 = bankAccountLast4(snap, raw);
  return {
    key: bankTxKey(raw),
    tx_key: raw.tx_key == null ? "" : String(raw.tx_key),
    tx_id: raw.tx_id == null ? "" : String(raw.tx_id),
    date: raw.date || "",
    desc: raw.desc == null ? (raw.description == null ? "" : String(raw.description)) : String(raw.desc),
    description: raw.description == null ? "" : String(raw.description),
    merchant: raw.merchant == null ? "" : String(raw.merchant),
    amount: bankNum(raw.amount),
    flow: raw.flow || "",
    category: bankTxCategory(raw, overrides),
    last4: last4,
    tier: raw.tier == null ? "" : String(raw.tier),
    tier_basis: raw.tier_basis == null ? "" : String(raw.tier_basis),
    tier_default: raw.tier_default == null ? "" : String(raw.tier_default),
    tier_basis_default: raw.tier_basis_default == null ? "" : String(raw.tier_basis_default),
    tx_override_key: raw.tx_override_key == null ? "" : String(raw.tx_override_key),
    one_off: raw.one_off,
    exclude_from_spend_avg: raw.exclude_from_spend_avg,
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
      var row = bankMapTx(raw, n, overrides, snap);
      n += 1;
      if (seen[row.key]) return;
      seen[row.key] = true;
      out.push(row);
    });
  });
  return bankSortTx(out);
}

/* A month tag, a YYYY-MM..YYYY-MM span, or a list. Absent means the caller decides. */
function bankMonthRangeCovers(range, key) {
  key = bankMonthKey(key);
  if (range == null || range === "" || !key) return true;
  if (typeof range === "string" || typeof range === "number") {
    var parts = String(range).trim().split(/\s*(?:\.\.|\/|–|—|\bto\b)\s*/i).map(bankMonthKey).filter(Boolean);
    if (parts.length >= 2) return key >= parts[0] && key <= parts[parts.length - 1];
    var one = bankMonthKey(range);
    return !one || one === key;
  }
  if (Array.isArray(range)) {
    if (!range.length) return true;
    return range.some(function (item) { return bankMonthRangeCovers(item, key); });
  }
  if (typeof range === "object") {
    if (range.month) return bankMonthKey(range.month) === key;
    var from = bankMonthKey(range.from || range.start || range.begin);
    var to = bankMonthKey(range.to || range.end || range.through);
    if (from && to) return key >= from && key <= to;
    if (from || to) return key === (from || to);
    if (Array.isArray(range.months)) return bankMonthRangeCovers(range.months, key);
  }
  return true;
}

/* Current tape only. Edits uses bankEditRows and does not clip this window.
   When ym is set, a row or a recent_tx_month_range from another month is dropped. */
function bankRecent(snap, ym) {
  var cur = snap && snap.current;
  var rows = cur && cur.recent_tx;
  if (!Array.isArray(rows) || !rows.length) return [];
  var key = bankMonthKey(ym);
  if (key && cur.recent_tx_month_range != null && cur.recent_tx_month_range !== "" &&
      !bankMonthRangeCovers(cur.recent_tx_month_range, key)) return [];
  var overrides = bankOverrideMap(snap);
  var kept = [];
  rows.forEach(function (raw) {
    if (!raw) return;
    /* A month tag from another month drops the row. An untagged date still shows. */
    if (key && raw.month && bankMonthKey(raw.month) !== key) return;
    kept.push(raw);
  });
  return bankSortTx(kept.map(function (raw, i) {
    return bankMapTx(raw, i, overrides, snap);
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

/* Forge bill_id is a slug of the bill name. tiers.json bill_status and manual_paid use the same slug.
   A missing id falls back to that slug so older prints still join. Display text stays on bill.name. */
function bankBillSlug(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function bankBillIdOf(row) {
  if (!row) return "";
  if (typeof row === "string") return bankBillSlug(row);
  var id = row.bill_id == null ? "" : String(row.bill_id).trim();
  if (id) return id;
  return bankBillSlug(row.name || row.label || "");
}

function bankBillMatchKeys(row) {
  var keys = [];
  function add(v) {
    if (v == null || v === "") return;
    if (Array.isArray(v)) {
      v.forEach(add);
      return;
    }
    var s = String(v).trim();
    if (!s || keys.indexOf(s) >= 0) return;
    keys.push(s);
  }
  if (!row || typeof row !== "object") {
    add(row);
    return keys;
  }
  add(row.bill_id);
  add(bankBillSlug(row.name || row.label || ""));
  add(row.name);
  add(row.label);
  add(row.prev_key);
  add(row.prev_keys);
  (row.alias_keys || []).forEach(add);
  return keys;
}

function bankKeysMatch(a, b) {
  var left = String(a || "").trim();
  var right = String(b || "").trim();
  if (!left || !right) return false;
  if (left === right) return true;
  if (bankNormKey(left) === bankNormKey(right)) return true;
  if (bankBillKey(left) === bankBillKey(right)) return true;
  if (bankBillSlug(left) && bankBillSlug(left) === bankBillSlug(right)) return true;
  return false;
}

function bankBillMatchesKey(row, key) {
  var keys = bankBillMatchKeys(row);
  var i;
  for (i = 0; i < keys.length; i++) {
    if (bankKeysMatch(keys[i], key)) return true;
  }
  return false;
}

/* bill_id first, then the name, then a prev_key alias such as an old phone-carrier key. */
function bankBagLookupBill(bag, row) {
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  var keys = bankBillMatchKeys(row);
  var found = null;
  var foundKey = "";
  Object.keys(bag).forEach(function (k) {
    if (found !== null) return;
    var i;
    for (i = 0; i < keys.length; i++) {
      if (bankKeysMatch(k, keys[i])) {
        found = bag[k];
        foundKey = k;
        return;
      }
    }
  });
  if (found === null) return null;
  return { value: found, key: foundKey };
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

/* KV kinds stay must_pay and elective. The tier picker says Required, Needs, and Wants. */
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

function bankMtdSpendRows(budget, snap, monthKey) {
  if (monthKey && budget && budget.mtd_actual_by_category_month != null && budget.mtd_actual_by_category_month !== "") {
    if (bankMonthKey(budget.mtd_actual_by_category_month) !== bankMonthKey(monthKey)) return [];
  }
  var catWin = budget && (budget.mtd_actual_by_category_window || budget.mtd_window);
  if (catWin && !bankCalendarBlockOk({ window: catWin }, bankMonthKey(monthKey))) return [];
  var mtd = budget && budget.mtd_actual_by_category;
  if (!mtd || typeof mtd !== "object" || Array.isArray(mtd)) return [];
  var list = [];
  Object.keys(mtd).forEach(function (name) {
    var n = bankMtdAmount(mtd[name]);
    if (n == null) return;
    if (bankIsHealthInsuranceName(name) || bankIsExcludedName(name, budget) || bankIsListedIncome(name, budget)) return;
    if (snap && bankRetagFromTier(snap, name, null, null)) return;
    list.push({ name: name, amount: n });
  });
  if (bankMtdPayoffsIncluded(budget)) {
    var ym = "";
    if (snap && snap.asof) {
      var et = bankEtYmd(snap.asof);
      if (et) ym = bankYm(et.year, et.month);
    }
    if (!ym && snap) {
      var cal = bankCalendarMonth(snap);
      if (cal && cal.year && cal.month) ym = bankYm(cal.year, cal.month);
    }
    var cut = bankOneOffCut(budget, ym, bankRowsForPayoffMatch(snap, { month: ym }));
    list = list.map(function (row) {
      var n = cut.cuts[bankBillKey(row.name)] || 0;
      if (!(n > 0)) return row;
      var left = row.amount - n;
      if (!(left > 0) || Math.round(left * 100) <= 0) return null;
      return { name: row.name, amount: left };
    }).filter(Boolean);
  }
  return bankSpendRows(list, null);
}

function bankNamesMatch(a, b) {
  if (!bankBillKey(a) || !bankBillKey(b)) return false;
  if (bankBillKey(a) === bankBillKey(b)) return true;
  return bankBillNameMatch(a, b) || bankBillNameMatch(b, a);
}

/* effective_from or a print amount override. Undated bills stay on month-to-date. */
function bankBillMonthDated(row) {
  return !!(row && (row.effective_from || bankNum(row.override_amount) != null));
}

function bankPieAmount(n) {
  if (n == null || !(n > 0)) return null;
  if (Math.round(n * 100) <= 0) return null;
  return n;
}

/* Budget pies are the plan. Actual month-to-date rows stay on Current. */
function bankKindPies(snap, ym, edits) {
  var ctx = bankKindContext(snap);
  var must = [];
  var optional = [];
  var optionalSum = 0;
  var planned = ((snap && snap.budget) || {}).planned_by_category || {};
  Object.keys(planned).forEach(function (name) {
    if (bankSkipKindName(name, snap)) return;
    var amount = bankPieAmount(Math.abs(bankNum(planned[name]) || 0));
    if (amount == null) return;
    var row = { name: bankBillDisplayName(name), amount: amount, raw: name };
    if (bankResolveKind(name, snap, ctx) === "must_pay") must.push(row);
    else {
      optional.push(row);
      optionalSum += amount;
    }
  });
  if (ym) {
    var budget = (snap && snap.budget) || {};
    bankPreparedBills(snap, undefined).forEach(function (b) {
      if (bankResolveTier(b.name, snap, ctx, b) === "other_income") return;
      if (bankBillRetired(b, ym)) return;
      if (bankSkipKindName(b.name, snap) || bankIsHiddenBillName(b.name, budget)) return;
      var planCounted = bankIsTwiceBill(b) || bankIsSetAside(b) || b.set_aside;
      var amount = bankPieAmount(planCounted ? bankBillMonthPlan(b, ym) : bankBillShownAmount(b, ym, edits));
      if (amount == null) return;
      var hit = false;
      function paint(list, isOpt) {
        list.forEach(function (slice) {
          var raw = slice.raw || slice.name;
          if (bankBillKey(raw) !== bankBillKey(b.name) && !bankKeysMatch(raw, b.name)) return;
          hit = true;
          if (isOpt) optionalSum += amount - slice.amount;
          slice.amount = amount;
          slice.name = bankBillDisplayName(b.name, b.display_label);
        });
      }
      paint(must, false);
      paint(optional, true);
      if (hit) return;
      var row = { name: bankBillDisplayName(b.name, b.display_label), amount: amount, raw: b.name };
      if (bankResolveKind(b.name, snap, ctx) === "must_pay") must.push(row);
      else {
        optional.push(row);
        optionalSum += amount;
      }
    });
  }
  var billSlices = must.slice();
  if (optionalSum > 0) billSlices.push({ name: "Optional", amount: optionalSum });
  return { bills: billSlices, optional: optional };
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
  /* A bare Insurance filler is hidden from bill rows. The spend category still gets a tier control. */
  function heldByBill(name) {
    if (bankIsBareInsuranceName(name)) return false;
    return bankItemIsBillName(name, ctx.bills);
  }
  var planned = (snap && snap.budget && snap.budget.planned_by_category) || {};
  Object.keys(planned).forEach(function (name) {
    if (heldByBill(name)) return;
    add(name);
  });
  if (typeof bankCustomCategories === "function") bankCustomCategories(snap).forEach(function (name) {
    if (heldByBill(name)) return;
    add(name);
  });
  bankNormalizeSubs((snap && snap.budget) || {}).forEach(function (s) {
    if (!s || heldByBill(s.name)) return;
    add(s.name);
  });
  var others = (snap && snap.budget && snap.budget.other_income) || [];
  if (Array.isArray(others)) others.forEach(function (row) {
    var label = row && (row.name || row.label || row.desc);
    if (heldByBill(label)) return;
    add(label);
  });
  return out.filter(function (name) { return !heldByBill(name); });
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

/* Amount overrides were not read before. The value is the new amount, not a day. */
function bankBillAmountOverride(budget, row) {
  var list = budget && budget.overrides;
  if (!Array.isArray(list)) return null;
  var found = null;
  list.forEach(function (o) {
    if (!o || typeof o !== "object") return;
    var field = String(o.field || "").trim().toLowerCase();
    if (field !== "amount" && field !== "typical_amount" && field !== "bill_amount") return;
    var match = o.match != null ? o.match : (o.name || o.label || "");
    if (!bankBillNameMatch(row && row.name, match)) return;
    var n = bankNum(o.value != null ? o.value : o.amount);
    if (n == null) return;
    found = { amount: n, effective_from: bankEffectiveText(o.effective_from) };
  });
  return found;
}

/* A Z or a numeric UTC offset. Plain dates and month keys are not zoned. */
function bankDateHasZone(v) {
  var s = String(v == null ? "" : v);
  return /[zZ]/.test(s) || /[+-]\d{2}:?\d{2}\s*$/.test(s);
}

/* Plain YYYY-MM-DD and YYYY-MM stay on that calendar. A zoned instant is the ET wall date. */
function bankWallDate(v) {
  var s = v == null ? "" : String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (!/^\d{4}-\d{2}/.test(s)) return "";
  if (!bankDateHasZone(s)) {
    var plain = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return plain ? plain[1] : "";
  }
  var et = bankEtYmd(s);
  if (!et || !(et.day >= 1)) {
    var fallback = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return fallback ? fallback[1] : "";
  }
  return bankYm(et.year, et.month) + "-" + (et.day < 10 ? "0" : "") + String(et.day);
}

function bankCopyMonth(v) {
  if (v == null || v === "") return "";
  var s = String(v).trim();
  if (!s) return "";
  if (!bankDateHasZone(s)) return s;
  var wall = bankWallDate(s);
  if (/^\d{4}-\d{2}/.test(wall)) return wall.slice(0, 7);
  return s;
}

function bankCopyDate(v) {
  if (v == null || v === "") return "";
  var s = String(v).trim();
  if (!s) return "";
  if (!bankDateHasZone(s)) return s;
  return bankWallDate(s) || s;
}

function bankCopyPaid(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  var month = bankCopyMonth(raw.month);
  var status = raw.status == null ? "" : String(raw.status).trim();
  if (!month && !status) return null;
  var copy = {
    month: month,
    status: status,
    paid_date: bankCopyDate(raw.paid_date),
    due_date: bankCopyDate(raw.due_date),
    days_late: bankNum(raw.days_late),
    tx_key: raw.tx_key == null || raw.tx_key === "" ? null : raw.tx_key,
    source: raw.source == null ? "" : String(raw.source).trim().toLowerCase()
  };
  var paidCount = bankNum(raw.paid_count != null ? raw.paid_count : (raw.occurrences_paid != null ? raw.occurrences_paid : raw.count));
  var expected = bankNum(raw.expected != null ? raw.expected : (raw.expected_count != null ? raw.expected_count : (raw.of != null ? raw.of : raw.occurrences)));
  if (paidCount != null) copy.paid_count = paidCount;
  if (expected != null) copy.expected = expected;
  if (Array.isArray(raw.paid_days)) copy.paid_days = raw.paid_days;
  return copy;
}

/* Cancelled or paid off from status_from onward. Earlier months still include the row. */
function bankBillStatus(row) {
  var s = String(row && row.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "paid_off" || s === "paidoff") return "paid_off";
  return "";
}

function bankBillRetired(row, ym) {
  var status = bankBillStatus(row);
  if (!status) return false;
  var from = bankMonthKey(row && row.status_from);
  var month = bankMonthKey(ym);
  if (!from || !month) return false;
  return month >= from;
}

/* counted:false stays on the due list as not counted and stays out of totals. */
function bankBillCounted(row) {
  return !row || row.counted !== false;
}

/* Keys match the worker: lowercase, trim, collapse spaces. */
function bankNormKey(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function bankBagLookup(bag, name) {
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  var key = bankNormKey(name);
  if (!key) return null;
  var found = null;
  Object.keys(bag).forEach(function (k) {
    if (found !== null) return;
    if (bankNormKey(k) === key) found = bag[k];
  });
  return found;
}

function bankCopyStatusEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  var status = bankBillStatus(raw);
  if (!status) return null;
  var from = bankMonthKey(raw.from || raw.status_from || raw.month);
  return {
    status: status,
    from: from,
    note: raw.note == null ? "" : String(raw.note),
    paid_off_date: bankCopyDate(raw.paid_off_date || ""),
    set_at: raw.set_at == null ? "" : String(raw.set_at),
    source: raw.source == null ? "" : String(raw.source).trim().toLowerCase()
  };
}

function bankActiveStatusList(budget) {
  var raw = budget && budget.bill_status_active;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(function (row) { return row && typeof row === "object"; });
  if (typeof raw === "object") {
    return Object.keys(raw).map(function (k) {
      var row = raw[k];
      if (!row || typeof row !== "object" || Array.isArray(row)) return { name: k, status: row };
      var copy = {};
      Object.keys(row).forEach(function (f) { copy[f] = row[f]; });
      if (!copy.name && !copy.key && !copy.label) copy.name = k;
      return copy;
    });
  }
  return [];
}

function bankActiveStatusFor(budget, name) {
  var found = null;
  bankActiveStatusList(budget).forEach(function (row) {
    if (found || !row) return;
    var label = row.name || row.key || row.label || row.bill || "";
    if (bankNormKey(label) !== bankNormKey(name) && bankBillKey(label) !== bankBillKey(name)) return;
    found = row;
  });
  return found;
}

function bankManualMap(snap) {
  var doc = bankTierDoc(snap);
  var bag = doc.manual_paid;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return {};
  return bag;
}

function bankManualPaidFor(snap, name) {
  var hit = bankBagLookupBill(bankManualMap(snap), typeof name === "object" ? name : { name: name });
  var raw = hit ? hit.value : bankBagLookup(bankManualMap(snap), typeof name === "object" ? name.name : name);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  var month = bankMonthKey(raw.month);
  if (!month) return null;
  var localKeys = snap && snap._bankLocalKeys && snap._bankLocalKeys.manual_paid;
  return {
    month: month,
    paid_date: bankCopyDate(raw.paid_date || ""),
    tx_key: raw.tx_key == null ? "" : String(raw.tx_key).trim(),
    set_at: raw.set_at == null ? "" : String(raw.set_at),
    local: !!(localKeys && (localKeys[bankNormKey(typeof name === "object" ? name.name : name)] || localKeys[bankBillIdOf(name)]))
  };
}

function bankFindTxByKey(snap, txKey) {
  var key = String(txKey || "").trim();
  if (!key) return null;
  var found = null;
  var cur = snap && snap.current;
  var lists = [];
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (found || !raw || typeof raw !== "object") return;
      var stored = bankTxStoredKey(raw);
      if (stored && stored === key) found = raw;
      else if (bankTxKey(raw) === key) found = raw;
    });
  });
  return found;
}

function bankDatesEqual(a, b) {
  var left = bankCopyDate(a);
  var right = bankCopyDate(b);
  if (!left && !right) return true;
  return !!left && left === right;
}

/* Amount tolerance: $1 or 5% of the bill, whichever is larger. A missing amount keeps the name match. */
function bankDebitAmountOk(raw, amount) {
  var want = bankNum(amount);
  if (want == null) return true;
  var got = bankNum(raw && raw.amount);
  if (got == null) return false;
  var tol = Math.max(1, Math.abs(want) * 0.05);
  return Math.abs(Math.abs(got) - Math.abs(want)) <= tol + 0.001;
}

function bankFindMonthDebit(snap, name, month, amount) {
  var row = name && typeof name === "object" ? name : { name: name };
  var want = bankNormKey(row.name || name);
  if (!want || !month) return null;
  var found = null;
  var cur = snap && snap.current;
  var lists = [];
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (found || !raw || typeof raw !== "object") return;
      if (bankFlowSide(raw) === "in") return;
      if (bankMonthKey(raw.date) !== month) return;
      var cat = bankNormKey(raw.category || raw.merchant_key || "");
      var desc = bankNormKey(raw.desc || raw.name || "");
      var nameOk = cat === want || desc === want || bankBillMatchesKey(row, raw.category || "") || bankBillMatchesKey(row, raw.desc || "") || bankBillMatchesKey(row, raw.name || "");
      if (!nameOk) return;
      if (!bankDebitAmountOk(raw, amount)) return;
      var key = bankTxStoredKey(raw) || bankTxKey(raw);
      if (!key) return;
      found = raw;
    });
  });
  return found;
}

function bankApplyManualPaid(row, snap) {
  if (!row) return;
  var manual = bankManualPaidFor(snap, row);
  row.manual_paid = manual;
  row.manual_local = !!(manual && manual.local);
  row.manual_clear = false;
  if (!manual) return;
  var keyed = manual.tx_key ? bankFindTxByKey(snap, manual.tx_key) : null;
  if (!keyed) keyed = bankFindMonthDebit(snap, row, manual.month, row.amount);
  if (keyed && bankFlowSide(keyed) !== "in") {
    var debit = keyed;
    if (debit && bankFlowSide(debit) !== "in") {
      var when = bankCopyDate(debit.date || "");
      row.paid_current_month = {
        month: manual.month || bankMonthKey(when),
        status: "paid",
        paid_date: when || manual.paid_date || "",
        due_date: "",
        days_late: null,
        tx_key: manual.tx_key,
        source: "bank"
      };
      return;
    }
  }
  var paid = row.paid_current_month;
  var bankPaid = paid && String(paid.source || "").toLowerCase() === "bank" &&
    bankMonthKey(paid.month) === manual.month &&
    (String(paid.status || "") === "paid" || String(paid.status || "") === "paid_late");
  if (bankPaid) {
    row.manual_clear = !bankDatesEqual(manual.paid_date, paid.paid_date);
    return;
  }
  if (!paid || bankMonthKey(paid.month) !== manual.month || String(paid.source || "").toLowerCase() === "bank") {
    row.paid_current_month = {
      month: manual.month,
      status: "paid",
      paid_date: manual.paid_date || "",
      due_date: "",
      days_late: null,
      tx_key: null,
      source: "manual"
    };
    return;
  }
  paid.source = "manual";
  paid.status = paid.status || "paid";
  if (manual.paid_date) paid.paid_date = manual.paid_date;
}

/* tiers.json wins. Then bill_status_active. Then the print fields on the row. */
function bankApplyBillStatuses(bills, snap) {
  var budget = (snap && snap.budget) || {};
  var tierMap = bankTierDoc(snap).bill_status || {};
  var localKeys = (snap && snap._bankLocalKeys && snap._bankLocalKeys.bill_status) || {};
  (bills || []).forEach(function (b) {
    if (!b) return;
    var tierHit = bankBagLookupBill(tierMap, b);
    var tierEntry = bankCopyStatusEntry(tierHit ? tierHit.value : null);
    if (tierEntry) {
      b.status = tierEntry.status;
      b.status_from = tierEntry.from;
      b.status_source = "tiers";
      b.status_note = tierEntry.note;
      b.paid_off_date = tierEntry.paid_off_date;
      b.status_key = tierHit.key;
      b.status_undo = true;
      b.status_local = !!(localKeys[bankNormKey(b.name)] || localKeys[bankBillIdOf(b)] || localKeys[bankNormKey(tierHit.key)]);
    } else {
      var active = bankActiveStatusFor(budget, b.name);
      var activeEntry = bankCopyStatusEntry(active);
      if (activeEntry) {
        var src = String((active && (active.source || active.status_source)) || "print").trim().toLowerCase();
        b.status = activeEntry.status;
        if (activeEntry.from) b.status_from = activeEntry.from;
        b.status_source = src === "tiers" ? "tiers" : "print";
        b.status_note = activeEntry.note;
        if (activeEntry.paid_off_date) b.paid_off_date = activeEntry.paid_off_date;
        b.status_undo = b.status_source === "tiers";
        b.status_local = false;
      } else if (bankBillStatus(b)) {
        var src2 = String(b.status_source || "print").trim().toLowerCase();
        b.status_source = src2 === "tiers" ? "tiers" : "print";
        b.status_undo = b.status_source === "tiers";
        b.status_local = false;
      } else {
        b.status_undo = false;
        b.status_local = false;
      }
    }
    if (snap && snap._bankSnapshotMonth) {
      var frozenMonth = bankMonthKey(snap._bankSnapshotMonth);
      var liveHit = bankBagLookupBill(snap._bankLiveStatus || {}, b);
      var printHit = bankBagLookupBill(snap._bankPrintStatus || {}, b);
      var entries = [];
      function pushEntry(raw) {
        var entry = raw && raw.status ? raw : bankCopyStatusEntry(raw);
        if (entry && entry.from) entries.push(entry);
      }
      pushEntry(liveHit ? liveHit.value : null);
      pushEntry(printHit ? printHit.value : null);
      if (bankBillStatus(b) && bankMonthKey(b.status_from)) {
        entries.push({ status: bankBillStatus(b), from: bankMonthKey(b.status_from) });
      }
      var active = null;
      var future = null;
      entries.forEach(function (entry) {
        if (!entry || !entry.from || !frozenMonth) return;
        if (frozenMonth < entry.from) {
          if (!future || entry.from < future.from) future = entry;
        } else if (!active) active = entry;
      });
      /* A frozen month before the cancel month still shows the bill. Later months omit it. */
      if (active) {
        b.cancelled_later = false;
        if (!bankBillStatus(b) || (bankMonthKey(b.status_from) && frozenMonth >= bankMonthKey(b.status_from))) {
          b.status = active.status || "cancelled";
          b.status_from = active.from;
        }
      } else if (future) {
        b.cancelled_later = true;
      }
    }
    bankApplyManualPaid(b, snap);
  });
  return bills;
}

function bankPreparedBills(snap, dueArg) {
  var budget = (snap && snap.budget) || {};
  var bills = bankSurfaceBills(bankNormalizeBills(budget, dueArg), budget);
  return bankApplyBillStatuses(bills, snap);
}

function bankWholeDollarUp(n) {
  var v = bankNum(n);
  if (!(v > 0)) return 0;
  return Math.ceil(Math.round(v * 100) / 100 - 1e-9);
}

function bankPrintedRequired(budget) {
  budget = budget || {};
  var tiers = budget.tiers && typeof budget.tiers === "object" ? budget.tiers : {};
  if (bankNum(tiers.required_plan) != null) return bankNum(tiers.required_plan);
  if (bankNum(tiers.required_total) != null) return bankNum(tiers.required_total);
  if (bankNum(budget.bills_total_effective) != null) return bankNum(budget.bills_total_effective);
  return bankNum(budget.bills_total);
}

function bankPlanDedupeSum(budget) {
  var tiers = budget && budget.tiers && typeof budget.tiers === "object" ? budget.tiers : null;
  if (tiers && bankNum(tiers.plan_dedupe_total) != null) return Math.abs(bankNum(tiers.plan_dedupe_total));
  var list = budget && budget.plan_dedupe;
  if (!Array.isArray(list) || !list.length) return null;
  var sum = 0;
  var any = false;
  list.forEach(function (row) {
    var n = null;
    if (row != null && typeof row === "object") n = row.deducted != null && row.deducted !== "" ? bankNum(row.deducted) : bankNum(row.amount);
    else n = bankNum(row);
    if (n == null) return;
    any = true;
    sum += Math.abs(n);
  });
  return any ? sum : null;
}

function bankMustPayPrint(budget) {
  budget = budget || {};
  if (bankNum(budget.must_pay_budget_effective) != null) return bankNum(budget.must_pay_budget_effective);
  return bankGroupLimit(budget, BANK_BILL_LIMIT_KEYS);
}

/* A month-only effective_from is the 1st of that month. A full date stays. */
function bankEffectiveText(v) {
  var wall = bankWallDate(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(wall)) return wall;
  if (/^\d{4}-\d{2}$/.test(wall)) return wall + "-01";
  return "";
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
    var prevAmount = bankNum(raw.prev_amount);
    var effectiveFrom = bankEffectiveText(raw.effective_from);
    var amountBasis = raw.amount_basis == null ? "" : String(raw.amount_basis).trim();
    var historyMedian = bankNum(raw.history_median);
    var paid = bankCopyPaid(raw.paid_current_month);
    var monthlyAmount = bankNum(raw.monthly_amount);
    var times = bankNum(raw.times_per_month);
    var kind = raw.kind == null ? "" : String(raw.kind).trim();
    var displayLabel = raw.display_label == null ? "" : String(raw.display_label).trim();
    var note = raw.note == null ? "" : String(raw.note);
    var confidence = raw.confidence == null ? "" : String(raw.confidence).trim();
    var dayTokens = bankBillDayTokens(raw);
    var row = byName[name];
    if (!row) {
      row = {
        name: name,
        amount: amount,
        typical_amount: typical,
        prev_amount: prevAmount,
        effective_from: effectiveFrom,
        amount_basis: amountBasis || null,
        history_median: historyMedian,
        paid_current_month: paid,
        override_amount: null,
        typical_day: day,
        typical_days: dayTokens,
        monthly_amount: monthlyAmount,
        times_per_month: times,
        kind: kind,
        display_label: displayLabel,
        note: note,
        confidence: confidence,
        tier: raw.tier == null ? "" : String(raw.tier).trim(),
        status: raw.status == null ? "" : String(raw.status).trim(),
        status_from: bankMonthKey(raw.status_from),
        status_source: raw.status_source == null ? "" : String(raw.status_source).trim(),
        usual_account: raw.usual_account && typeof raw.usual_account === "object" ? raw.usual_account : null,
        cadence: raw.cadence || null,
        category: raw.category || "",
        source: raw.source || (fromMonthly ? "bills_monthly" : "bills"),
        counted: raw.counted !== false,
        bill_id: raw.bill_id == null ? "" : String(raw.bill_id).trim(),
        prev_key: raw.prev_key == null ? "" : String(raw.prev_key).trim(),
        bank_match: raw.bank_match && typeof raw.bank_match === "object" ? raw.bank_match : null,
        schedule: Array.isArray(raw.schedule) ? raw.schedule : null
      };
      byName[name] = row;
      order.push(name);
    } else {
      if (row.amount == null && amount != null) row.amount = amount;
      if (row.typical_amount == null && typical != null) row.typical_amount = typical;
      if (row.prev_amount == null && prevAmount != null) row.prev_amount = prevAmount;
      if (!row.effective_from && effectiveFrom) row.effective_from = effectiveFrom;
      if (!row.amount_basis && amountBasis) row.amount_basis = amountBasis;
      if (row.history_median == null && historyMedian != null) row.history_median = historyMedian;
      if (!row.paid_current_month && paid) row.paid_current_month = paid;
      if (row.typical_day == null && day != null) row.typical_day = day;
      if (!(row.typical_days && row.typical_days.length) && dayTokens.length) row.typical_days = dayTokens;
      if (row.monthly_amount == null && monthlyAmount != null) row.monthly_amount = monthlyAmount;
      if (row.times_per_month == null && times != null) row.times_per_month = times;
      if (!row.kind && kind) row.kind = kind;
      if (!row.display_label && displayLabel) row.display_label = displayLabel;
      if (!row.note && note) row.note = note;
      if (!row.confidence && confidence) row.confidence = confidence;
      if (!row.tier && raw.tier) row.tier = String(raw.tier).trim();
      if (!row.status && raw.status) row.status = String(raw.status).trim();
      if (!row.status_from && raw.status_from) row.status_from = bankMonthKey(raw.status_from);
      if (!row.status_source && raw.status_source) row.status_source = String(raw.status_source).trim();
      if (!row.usual_account && raw.usual_account && typeof raw.usual_account === "object") row.usual_account = raw.usual_account;
      if (!row.cadence && raw.cadence) row.cadence = raw.cadence;
      if (!row.category && raw.category) row.category = raw.category;
      if (raw.counted === false) row.counted = false;
      if (!row.bill_id && raw.bill_id) row.bill_id = String(raw.bill_id).trim();
      if (!row.prev_key && raw.prev_key) row.prev_key = String(raw.prev_key).trim();
      if (!row.bank_match && raw.bank_match && typeof raw.bank_match === "object") row.bank_match = raw.bank_match;
      if (!(row.schedule && row.schedule.length) && Array.isArray(raw.schedule) && raw.schedule.length) row.schedule = raw.schedule;
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
  var removedKeys = bankNameKeys(budget.removed_bills);
  var unscheduledKeys = bankNameKeys(budget.calendar_unscheduled);
  return order.map(function (name) {
    var row = byName[name];
    row.removed = removedKeys.indexOf(bankBillKey(name)) >= 0;
    row.set_aside = bankIsSetAside(row);
    row.unscheduled = row.set_aside || unscheduledKeys.indexOf(bankBillKey(name)) >= 0;
    var amtOver = bankBillAmountOverride(budget, row);
    if (amtOver) {
      row.override_amount = amtOver.amount;
      if (!row.effective_from && amtOver.effective_from) row.effective_from = amtOver.effective_from;
    }
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
    /* A set-aside has no due day. A retired name ignores a saved due day. */
    if (row.set_aside) return put(null, baseSource);
    if (row.removed) return put(baseDay, baseSource);
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

/* Payroll / paycheck and fostering / per diem stipend. No employer or bank name is part of the match. */
function bankIsPayrollIncome(label) {
  var s = bankFoldName(label);
  return s.indexOf("payroll") >= 0 || s.indexOf("paycheck") >= 0;
}

function bankIsFosteringIncome(label) {
  var s = bankFoldName(label);
  return s.indexOf("fostering") >= 0 || s.indexOf("per diem stipend") >= 0;
}

function bankIsJustinTwiceIncome(label) {
  return bankIsPayrollIncome(label) || bankIsFosteringIncome(label);
}

/* Print cadence or times_per_month. Null when the row does not say. */
function bankPrintTimes(raw) {
  var explicit = bankNum(raw && raw.times_per_month);
  if (explicit != null && explicit >= 1) return explicit;
  var cad = String((raw && raw.cadence) || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (cad === "twice_monthly" || cad === "biweekly" || cad === "bi_weekly" || cad === "semi_monthly" || cad === "semimonthly" || cad === "2x" || cad === "2×") return 2;
  return null;
}

/* Justin Payroll and Fostering rows are 2× even when cadence is null. Other rows follow the print. */
function bankIncomeTimes(raw, label) {
  if (bankIsJustinTwiceIncome(label)) return 2;
  var printed = bankPrintTimes(raw);
  return printed == null ? 1 : printed;
}

function bankUniqueDays(list) {
  var out = [];
  (list || []).forEach(function (v) {
    var d = bankDay(v);
    if (d == null || out.indexOf(d) < 0) out.push(d);
  });
  out.sort(function (a, b) { return a - b; });
  return out;
}

function bankFeedPayDays(raw) {
  var days = [];
  if (raw && Array.isArray(raw.typical_days)) days = days.concat(raw.typical_days);
  if (raw && raw.typical_day != null) days.push(raw.typical_day);
  if (raw && raw.typical_day_2 != null) days.push(raw.typical_day_2);
  if (raw && raw.day2 != null) days.push(raw.day2);
  return bankUniqueDays(days);
}

/* budget.income_total and history income_total are already monthly. Do not multiply by times_per_month. */
function bankMonthlyIncomeTotal(total) {
  return bankNum(total);
}

/* Monthly plan dollars. Prefer monthly_amount, then the sum of deposits[], else amount × times.
   budget.income_total is already monthly. income_per_deposit_total is not a monthly figure. */
function bankIncomeMonthAmount(inc) {
  if (!inc) return null;
  /* Deposits are the monthly line. An Edits amount replaces each deposit. monthly_amount is only a fallback. */
  if (inc.amount_edited && bankNum(inc.amount) != null && Array.isArray(inc.deposits) && inc.deposits.length) {
    return bankNum(inc.amount) * inc.deposits.length;
  }
  if (Array.isArray(inc.deposits) && inc.deposits.length) {
    var sum = 0;
    var any = false;
    inc.deposits.forEach(function (d) {
      var n = bankNum(d && d.amount);
      if (n == null) return;
      any = true;
      sum += n;
    });
    if (any) return sum;
  }
  var monthly = bankNum(inc.monthly_amount);
  if (monthly != null) return monthly;
  var amount = bankNum(inc.amount);
  var times = bankNum(inc.times_per_month);
  if (amount == null || times == null || !(times > 0)) return null;
  return amount * times;
}

/* Valid deposits beat amount. A missing or unusable list falls back to the print days. */
function bankReadDeposits(raw) {
  if (!raw || !Object.prototype.hasOwnProperty.call(raw, "deposits")) return undefined;
  if (!Array.isArray(raw.deposits)) return null;
  var out = [];
  raw.deposits.forEach(function (d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) return;
    var amount = bankNum(d.amount);
    if (amount == null) return;
    if (bankIsEomToken(d.day)) {
      out.push({ day: "EOM", amount: amount });
      return;
    }
    var date = bankCopyDate(d.date || d.on);
    var day = bankDay(d.day);
    if (day == null && date) day = bankDay(String(date).slice(8, 10));
    if (day == null) return;
    var row = { day: day, amount: amount };
    if (date) row.date = date;
    if (d.account && typeof d.account === "object") row.account = d.account;
    if (d.rolled_from) row.rolled_from = d.rolled_from;
    out.push(row);
  });
  return out.length ? out : null;
}

function bankIncomeResolvedDeposits(inc, ym) {
  if (!inc || !Array.isArray(inc.deposits) || !inc.deposits.length) return null;
  var rows = [];
  inc.deposits.forEach(function (d) {
    var day = bankResolveDayToken(d.day, ym);
    var amount = inc.amount_edited && bankNum(inc.amount) != null ? bankNum(inc.amount) : bankNum(d.amount);
    if (day == null || amount == null) return;
    rows.push({ day: day, amount: amount });
  });
  if (inc.day_edited && bankDay(inc.typical_day) != null && rows.length) {
    var edited = bankDay(inc.typical_day);
    var taken = false;
    rows.forEach(function (r) { if (r.day === edited) taken = true; });
    if (!taken) rows[0].day = edited;
  }
  return rows.length ? rows : null;
}

/* Fixed pair for the two Justin rows. Payroll's second day is the real last day of ym. */
function bankDow(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

function bankShiftYmd(year, month, day, delta) {
  var dt = new Date(year, month - 1, day + delta);
  return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() };
}

function bankDateKey(year, month, day) {
  return bankYm(year, month) + "-" + (day < 10 ? "0" : "") + String(day);
}

function bankDateKeyFromDay(ym, day) {
  var p = bankParseYm(ym);
  if (!p || day == null) return "";
  var d = Math.min(Number(day), bankMonthDim(p.year, p.month));
  if (!(d > 0)) return "";
  return bankDateKey(p.year, p.month, d);
}

function bankNthDow(year, month, dow, n) {
  var first = bankDow(year, month, 1);
  var delta = (dow - first + 7) % 7;
  return 1 + delta + (n - 1) * 7;
}

function bankLastDow(year, month, dow) {
  var dim = bankMonthDim(year, month);
  var last = bankDow(year, month, dim);
  return dim - ((last - dow + 7) % 7);
}

/* Federal Reserve holidays. A Sunday fixed date is observed Monday. A Saturday fixed date is not observed. */
function bankFedHolidaySet(year) {
  var set = {};
  function add(month, day) {
    var p = bankShiftYmd(year, month, day, 0);
    set[bankDateKey(p.year, p.month, p.day)] = true;
  }
  function addFixed(month, day) {
    if (bankDow(year, month, day) === 0) add(month, day + 1);
    else add(month, day);
  }
  addFixed(1, 1);
  add(1, bankNthDow(year, 1, 1, 3));
  add(2, bankNthDow(year, 2, 1, 3));
  add(5, bankLastDow(year, 5, 1));
  addFixed(6, 19);
  addFixed(7, 4);
  add(9, bankNthDow(year, 9, 1, 1));
  add(10, bankNthDow(year, 10, 1, 2));
  addFixed(11, 11);
  add(11, bankNthDow(year, 11, 4, 4));
  addFixed(12, 25);
  return set;
}

function bankIsBusinessDay(year, month, day) {
  var dow = bankDow(year, month, day);
  if (dow === 0 || dow === 6) return false;
  return !bankFedHolidaySet(year)[bankDateKey(year, month, day)];
}

/* Roll back onto the prior business day. Never forward. */
function bankRollBackDate(year, month, day) {
  var nominal = bankDateKey(year, month, day);
  var guard = 0;
  while (!bankIsBusinessDay(year, month, day) && guard < 12) {
    var prev = bankShiftYmd(year, month, day, -1);
    year = prev.year;
    month = prev.month;
    day = prev.day;
    guard += 1;
  }
  return {
    year: year,
    month: month,
    day: day,
    key: bankDateKey(year, month, day),
    rolled_from: bankDateKey(year, month, day) === nominal ? "" : nominal
  };
}

function bankScheduleDate(row) {
  if (!row) return "";
  return bankCopyDate(row.pay_date || row.date || row.on) || "";
}

function bankScheduleNominal(row) {
  if (!row) return "";
  return bankCopyDate(row.nominal_date || row.rolled_from) || "";
}

function bankPayMoveHint(row) {
  var nominal = bankScheduleNominal(row);
  var pay = bankScheduleDate(row);
  if (!nominal || !pay || nominal === pay) return "";
  var holiday = row && row.holiday_name ? " (" + String(row.holiday_name) + ")" : "";
  return "Moved from " + (bankShortDate(nominal) || nominal) + holiday;
}

function bankMovedNote(iso) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var y = Number(p[1]);
  var m = Number(p[2]);
  var d = Number(p[3]);
  return "(moved from " + names[bankDow(y, m, d)] + " " + BANK_MONTHS[m - 1] + " " + d + ")";
}

function bankJustinPayDays(label, ym) {
  if (bankIsPayrollIncome(label)) {
    if (!(ym && ym.year && ym.month)) return [15, 31];
    var mid = bankRollBackDate(ym.year, ym.month, 15);
    var end = bankRollBackDate(ym.year, ym.month, bankMonthDim(ym.year, ym.month));
    var days = [];
    if (mid.year === ym.year && mid.month === ym.month) days.push(mid.day);
    if (end.year === ym.year && end.month === ym.month && days.indexOf(end.day) < 0) days.push(end.day);
    return days;
  }
  if (bankIsFosteringIncome(label)) {
    if (!(ym && ym.year && ym.month)) return [10, 25];
    var first = bankRollBackDate(ym.year, ym.month, 10);
    var second = bankRollBackDate(ym.year, ym.month, 25);
    var stipendDays = [];
    if (first.year === ym.year && first.month === ym.month) stipendDays.push(first.day);
    if (second.year === ym.year && second.month === ym.month && stipendDays.indexOf(second.day) < 0) stipendDays.push(second.day);
    return stipendDays;
  }
  return null;
}

/* Calendar days. Justin fixed days win over a single observed print day. A user day replaces the first fixed day only. */
function bankScheduleDays(inc, ym) {
  if (!inc || !inc.schedule || !inc.schedule.length || !ym || !ym.year || !ym.month) return null;
  var key = bankYm(ym.year, ym.month);
  var days = [];
  inc.schedule.forEach(function (row) {
    var when = bankScheduleDate(row);
    if (bankMonthKey(when) !== key) return;
    var d = bankDay(String(when).slice(8, 10));
    if (d != null && days.indexOf(d) < 0) days.push(d);
  });
  return days;
}

function bankIncomePayDays(inc, ym) {
  if (!inc) return [];
  if (inc.schedule && inc.schedule.length) {
    var scheduled = bankScheduleDays(inc, ym);
    return scheduled || [];
  }
  var deposits = bankIncomeResolvedDeposits(inc, ym);
  if (deposits) return bankUniqueDays(deposits.map(function (d) { return d.day; }));
  var fixed = bankJustinPayDays(inc.label, ym);
  if (fixed) {
    var days = fixed.slice();
    var edited = inc.day_edited ? bankDay(inc.typical_day) : null;
    if (edited != null && days.indexOf(edited) < 0) days[0] = edited;
    return bankUniqueDays(days);
  }
  var listed = (inc.feed_days || []).slice();
  if (inc.day_edited && bankDay(inc.typical_day) != null) {
    var chosen = bankDay(inc.typical_day);
    listed = [chosen].concat(listed.filter(function (d) { return d !== chosen; }));
  }
  return bankUniqueDays(listed);
}

function bankAttachIncomePlan(incomes, ym) {
  (incomes || []).forEach(function (inc) {
    inc.pay_days = bankIncomePayDays(inc, ym);
  });
  return incomes;
}

function bankScheduleForLabel(budget, label) {
  var list = budget && budget.pay_schedule;
  if (!Array.isArray(list)) return null;
  var hits = [];
  list.forEach(function (row) {
    if (!row || typeof row !== "object") return;
    var name = row.name || row.label || "";
    if (!name) return;
    if (bankFoldName(name) !== bankFoldName(label) && !bankNamesMatch(name, label)) return;
    hits.push(row);
  });
  return hits.length ? hits : null;
}

function bankNormalizeIncome(budget) {
  var list = budget && budget.income_monthly;
  if (!Array.isArray(list)) return [];
  return list.filter(function (raw) {
    if (!raw || typeof raw !== "object") return false;
    var kind = String(raw.income_kind || "").trim().toLowerCase();
    if (kind === "other") return false;
    if (String(raw.category || "").trim().toLowerCase() === "other income") return false;
    return true;
  }).map(function (raw) {
    raw = raw || {};
    var label = String(raw.label || raw.name || "Paycheck");
    var monthly = bankNum(raw.monthly_amount);
    if (monthly == null) monthly = bankNum(raw.amount_monthly);
    var deposits = bankReadDeposits(raw);
    return {
      label: label,
      amount: bankNum(raw.amount),
      monthly_amount: monthly,
      amount_basis: raw.amount_basis || null,
      cadence: raw.cadence || null,
      times_per_month: bankIncomeTimes(raw, label),
      typical_day: bankDay(raw.typical_day),
      feed_days: bankFeedPayDays(raw),
      deposits: deposits && deposits.length ? deposits : null,
      deposits_rejected: deposits === null,
      schedule: bankScheduleForLabel(budget, label),
      usual_account: raw.usual_account && typeof raw.usual_account === "object" ? raw.usual_account : null,
      source: raw.source || "",
      editable: raw.editable === true,
      day_edited: false,
      amount_edited: false
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
      if (dayOnly != null) {
        inc.typical_day = dayOnly;
        inc.day_edited = true;
      }
      return;
    }
    if (typeof raw !== "object" || Array.isArray(raw)) return;
    if (Object.prototype.hasOwnProperty.call(raw, "amount")) {
      inc.amount = bankNum(raw.amount);
      inc.amount_edited = true;
    }
    if (Object.prototype.hasOwnProperty.call(raw, "typical_day")) {
      inc.typical_day = bankDay(raw.typical_day);
      inc.day_edited = inc.typical_day != null;
    }
  });
  return incomes;
}

function bankApplyEdits(bills, incomes, edits) {
  edits = edits || {};
  var billEd = edits.bills || {};
  var incEd = edits.income || {};
  bills.forEach(function (b) {
    var raw = null;
    if (Object.prototype.hasOwnProperty.call(billEd, b.name)) raw = billEd[b.name];
    else {
      var key = bankBillKey(b.name);
      Object.keys(billEd).forEach(function (k) {
        if (raw != null) return;
        if (bankBillKey(k) === key) raw = billEd[k];
      });
    }
    if (raw == null) return;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if (Object.prototype.hasOwnProperty.call(raw, "amount")) b.user_amount = bankNum(raw.amount);
      if (Object.prototype.hasOwnProperty.call(raw, "typical_day")) {
        b.typical_day = bankDay(raw.typical_day);
        b.source = "manual";
      }
      return;
    }
    b.typical_day = bankDay(raw);
    b.source = "manual";
  });
  incomes.forEach(function (inc) {
    if (!Object.prototype.hasOwnProperty.call(incEd, inc.label)) return;
    var raw = incEd[inc.label];
    var day = typeof raw === "object" && raw ? bankDay(raw.typical_day) : bankDay(raw);
    inc.typical_day = day;
    inc.day_edited = day != null;
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

/* Limit for a month-dated bill on an existing bar. Undefined means leave the print target. */
function bankBarPlanLimit(bills, name, ym, edits) {
  var found = null;
  (bills || []).some(function (b) {
    if (!bankBillMonthDated(b) || !bankNamesMatch(b.name, name)) return false;
    found = b;
    return true;
  });
  if (!found) return undefined;
  return bankBillShownAmount(found, ym, edits);
}

function bankBudgetBars(budget, ym, bills, edits, snap) {
  var planned = (budget && budget.planned_by_category) || {};
  var targets = {};
  if (planned && typeof planned === "object" && !Array.isArray(planned)) {
    Object.keys(planned).forEach(function (name) {
      targets[bankCatName(name)] = bankNum(planned[name]);
    });
  }
  return bankMtdSpendRows(budget, snap).map(function (r) {
    var has = Object.prototype.hasOwnProperty.call(targets, r.name);
    var target = has ? targets[r.name] : null;
    if (ym && bills) {
      var plan = bankBarPlanLimit(bills, r.name, ym, edits);
      if (plan !== undefined) target = plan;
    }
    var face = "";
    (bills || []).forEach(function (b) {
      if (face) return;
      if (bankNamesMatch(b.name, r.name) && b.display_label) face = b.display_label;
    });
    return {
      name: r.name,
      display_label: face,
      target: target,
      actual: r.amount,
      over: target != null && r.amount > target
    };
  });
}

function bankIncomeMarkDays(inc) {
  if (inc && Array.isArray(inc.pay_days)) return inc.pay_days;
  return bankIncomePayDays(inc, null);
}

function bankIncomeCalendarMarks(inc, ym) {
  if (!inc) return null;
  if (inc.schedule && inc.schedule.length && ym && ym.year && ym.month) {
    var key = bankYm(ym.year, ym.month);
    var out = [];
    inc.schedule.forEach(function (row) {
      var when = bankScheduleDate(row);
      if (bankMonthKey(when) !== key) return;
      var d = bankDay(String(when).slice(8, 10));
      if (d == null) return;
      out.push({
        day: d,
        amount: bankNum(row.amount),
        note: bankPayMoveHint(row) || bankMovedNote(row.rolled_from),
        account: row.account || inc.usual_account || null
      });
    });
    return out;
  }
  var resolved = bankIncomeResolvedDeposits(inc, ym);
  if (resolved) {
    return resolved.map(function (row) {
      return { day: row.day, amount: row.amount, note: "", account: inc.usual_account || null };
    });
  }
  return null;
}

function bankCheckGroups(bills, incomes, ym) {
  var days = [];
  var labels = {};
  var amounts = {};
  (incomes || []).forEach(function (inc) {
    var resolved = bankIncomeCalendarMarks(inc, ym);
    var marks = resolved || bankIncomeMarkDays(inc).map(function (d) { return { day: d, amount: null, note: "" }; });
    marks.forEach(function (mark) {
      var d = bankDay(mark.day);
      if (d == null) return;
      if (days.indexOf(d) < 0) days.push(d);
      if (!labels[d]) {
        labels[d] = inc.label || "Paycheck";
        if (mark.amount != null) amounts[d] = mark.amount;
      }
    });
  });
  days.sort(function (a, b) { return a - b; });
  if (!days.length) return [];
  var dated = [];
  (bills || []).forEach(function (b) {
    bankBillDueDays(b, ym).forEach(function (d) {
      dated.push({ name: b.name, day: d });
    });
  });
  return days.map(function (p, i) {
    var next = days[(i + 1) % days.length];
    var seen = {};
    var covered = [];
    dated.forEach(function (b) {
      var d = b.day;
      var inside = days.length === 1 || (p < next ? (d >= p && d < next) : (d >= p || d < next));
      if (!inside || seen[b.name]) return;
      seen[b.name] = true;
      covered.push({ name: b.name, display_label: b.display_label || "" });
    });
    return { day: p, label: labels[p] || "Paycheck", amount: amounts[p] != null ? amounts[p] : null, bills: covered };
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

function bankDayCells(bills, incomes, calendar, ym) {
  var days = [];
  var d;
  for (d = 1; d <= 31; d++) days.push({ day: d, pays: [], bills: [], items: [], subs: [] });
  (incomes || []).forEach(function (inc) {
    var resolved = bankIncomeCalendarMarks(inc, ym);
    var marks = resolved || bankIncomeMarkDays(inc).map(function (day) { return { day: day, amount: null, note: "" }; });
    var seen = {};
    marks.forEach(function (mark) {
      var day = bankDay(mark.day);
      if (day == null || seen[day]) return;
      seen[day] = true;
      var label = inc.label || "Paycheck";
      if (mark.amount != null) label = label + " " + bankMoney(mark.amount);
      days[day - 1].pays.push(label);
      if (mark.note) days[day - 1].payNotes = (days[day - 1].payNotes || []).concat([mark.note]);
    });
  });
  (bills || []).forEach(function (b) {
    bankBillDueMarks(b, ym).forEach(function (mark) {
      var day = mark.day;
      if (day == null || day < 1 || day > 31) return;
      var cell = days[day - 1];
      if (bankListHasChip(cell.bills, b.name)) return;
      cell.bills.push(b.name || "Bill");
      if (mark.note) cell.notes = (cell.notes || []).concat([mark.note]);
    });
  });
  /* budget.calendar_excluded is not a render source and is not a hide list. Status does that. */
  (calendar || []).forEach(function (c) {
    if (!c) return;
    var day = bankDay(c.day);
    if (day == null) return;
    var cell = days[day - 1];
    (c.items || []).forEach(function (item) {
      var label = typeof item === "string" ? item : (item && (item.name || item.label)) || "Item";
      var kind = item && typeof item === "object" ? String(item.kind || "") : "";
      if (kind === "subscription") {
        if (bankListHasChip(cell.bills, label) || bankListHasChip(cell.subs, label)) return;
        cell.subs.push(String(label));
      } else {
        if (bankListHasChip(cell.bills, label) || bankListHasChip(cell.items, label) || bankListHasChip(cell.subs, label)) return;
        cell.items.push(String(label));
      }
    });
  });
  return days;
}

function bankNormalizeSubs(budget) {
  var list = budget && budget.subscriptions;
  if (!Array.isArray(list)) return [];
  return list.map(function (raw) {
    raw = raw || {};
    var name = String(raw.name || raw.label || "Subscription").trim();
    return {
      name: name,
      amount: bankNum(raw.amount),
      typical_day: bankDay(raw.typical_day != null ? raw.typical_day : raw.due_day),
      confidence: raw.confidence == null ? "" : String(raw.confidence).trim(),
      note: raw.note == null ? "" : String(raw.note),
      paid_current_month: bankCopyPaid(raw.paid_current_month),
      tier: raw.tier == null ? "" : String(raw.tier).trim(),
      usual_account: raw.usual_account && typeof raw.usual_account === "object" ? raw.usual_account : null,
      kind: "subscription",
      counted: raw.counted !== false
    };
  }).filter(function (row) { return row.name; });
}

function bankChipKey(name) {
  return bankBillKey(String(name || "").replace(/\s+\$[\d,]+(?:\.\d+)?$/, ""));
}

function bankListHasChip(list, name) {
  var key = bankChipKey(name);
  if (!key) return false;
  return (list || []).some(function (n) { return bankChipKey(n) === key; });
}

function bankPlaceSubs(cells, subs, ym) {
  (subs || []).forEach(function (sub) {
    var day = bankResolveDayToken(sub.typical_day, ym);
    if (day == null || day < 1 || day > 31 || !cells[day - 1]) return;
    var cell = cells[day - 1];
    var label = sub.name;
    if (bankListHasChip(cell.bills, label) || bankListHasChip(cell.items, label) || bankListHasChip(cell.subs, label)) return;
    cell.subs.push(label);
  });
  return cells;
}

function bankHasDueDays(cells) {
  return (cells || []).some(function (c) { return c.pays.length || c.bills.length || c.items.length || (c.subs && c.subs.length); });
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

/* Largest remainder so the integer percents sum to 100. Ties go to the earlier row. */
function bankPercentShares(amounts) {
  var total = 0;
  (amounts || []).forEach(function (n) { total += Number(n) || 0; });
  if (!(total > 0)) return (amounts || []).map(function () { return 0; });
  var rows = (amounts || []).map(function (n, i) {
    var exact = ((Number(n) || 0) / total) * 100;
    var floor = Math.floor(exact + 1e-9);
    return { i: i, floor: floor, frac: exact - floor };
  });
  var used = 0;
  rows.forEach(function (r) { used += r.floor; });
  var left = 100 - used;
  var order = rows.slice().sort(function (a, b) {
    if (b.frac !== a.frac) return b.frac - a.frac;
    return a.i - b.i;
  });
  var k;
  for (k = 0; k < order.length && left > 0; k++) {
    order[k].floor += 1;
    left -= 1;
  }
  var out = [];
  rows.forEach(function (r) { out[r.i] = r.floor; });
  return out;
}

function bankKpi(key, label, value, missing, partial) {
  return '<div data-k="' + key + '" data-missing="' + (missing ? "1" : "0") + '"><span>' + bankEsc(label) +
    "</span> <b>" + value + "</b>" + (partial ? ' <i class="partial">partial</i>' : "") + "</div>";
}

function bankEndHtml(chips, caption) {
  if (!chips || !chips.length) return "";
  return '<div class="bank-ends"><span>' + bankEsc(caption || "End balances") + "</span> " + chips.map(function (c) {
    return '<b data-end="' + bankEsc(c.name) + '" data-missing="' + (c.missing ? "1" : "0") + '">' +
      bankEsc(c.name) + (c.mask ? " " + bankEsc(c.mask) : "") + " " + bankMoney(c.missing ? null : c.value) + "</b>";
  }).join(" ") + "</div>";
}

function bankGearSvg() {
  return '<svg class="bank-gear-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/>' +
    "</svg>";
}

function bankOverflowHtml(tab, menuOpen) {
  var onEdits = tab === "edits";
  var open = !!menuOpen;
  return '<div class="bank-overflow"><button type="button" class="bank-gear' + (onEdits ? " on" : "") +
    '" data-bank-overflow="1" aria-label="More" title="More" aria-haspopup="menu" aria-expanded="' +
    (open ? "true" : "false") + '" aria-controls="bankOverflowMenu"' +
    (onEdits ? ' aria-current="true"' : "") + ">" + bankGearSvg() +
    (onEdits ? '<i class="bank-gear-mark" aria-hidden="true"></i>' : "") +
    '</button><div class="bank-overflow-menu" id="bankOverflowMenu" role="menu" aria-label="More"' +
    (open ? "" : " hidden") + '><button type="button" role="menuitem" data-bank-tab="edits"' +
    (onEdits ? ' class="on" aria-current="true"' : "") + ">Edits</button></div></div>";
}

function bankViewName(tab) {
  if (tab === "current") return "Current";
  if (tab === "historical") return "Historical";
  if (tab === "edits") return "Edits";
  return "Budget";
}

function bankViewMonth(tab, snap, opts) {
  opts = opts || {};
  if (tab === "edits") return null;
  if (tab === "current") return bankTodayYmET(opts.now);
  if (tab === "historical") {
    var key = bankHistMonthKey(snap, opts);
    return bankParseYm(key) || bankCalendarMonth(snap);
  }
  return bankScreenMonth(snap, opts);
}

function bankViewTitle(tab, snap, opts) {
  var name = bankViewName(tab);
  if (tab === "edits") return name;
  var ym = bankViewMonth(tab, snap, opts);
  var month = ym && ym.year ? bankMonthTitle(ym.year, ym.month) : "";
  return month ? name + " \u00b7 " + month : name;
}

function bankNavHtml(tab, menuOpen, title, snap, opts) {
  var pick = tab === "historical" ? bankHistPickerHtml(snap, opts) : "";
  return '<div class="bank-nav"><h2 class="bank-view-title" id="bank-view-title">' + bankEsc(title || bankViewName(tab)) +
    "</h2>" + pick + bankOverflowHtml(tab, menuOpen) + "</div>";
}

function bankChipOptions(categories, current) {
  var list = (categories || []).slice();
  if (current && list.indexOf(current) < 0) list.unshift(current);
  return list.map(function (name) {
    var sel = name === current ? " selected" : "";
    return '<option value="' + bankEsc(name) + '"' + sel + ">" + bankEsc(bankBillDisplayName(name)) + "</option>";
  }).join(" ");
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
    return '<section class="bank-tape-block"><h2>Recent \u00b7 actual</h2><p class="bank-empty">No recent activity in this print.</p></section>';
  }
  var table = '<table class="book bank-tape"><tbody>' +
    rows.map(function (r) {
      var label = bankItemLabel(r.desc);
      var cat = r.category || "Other";
      return "<tr><td>" + bankEsc(r.date) + '</td><td><div class="bank-tx-main"><span class="bank-merchant">' +
        bankEsc(label) + '</span> <span class="bank-chip">' + bankEsc(cat) + "</span>" +
        "</div></td><td>" + bankMoney(r.amount) + "</td></tr>";
    }).join("") + "</tbody></table>";
  return '<section class="bank-tape-block"><h2>Recent \u00b7 actual</h2>' +
    bankCapList(table, rows.length, "Recent activity") + "</section>";
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

/* In the bar unless both ends are linked accounts, or an internal/transfer flag is set.
   Category and description text are not read. An external mark stays in the bar. */
function bankIsInternalTransfer(raw, accountSet) {
  raw = raw || {};
  if (bankIsExternalTransfer(raw)) return false;
  var flow = String((raw.flow || raw.direction) || "").trim().toLowerCase();
  if (flow === "transfer" || flow === "xfer" || flow === "internal_transfer") return true;
  var flags = [
    "internal", "internal_transfer", "is_internal", "linked_transfer",
    "own_account", "own_accounts", "between_accounts", "transfer", "is_transfer"
  ];
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
  return false;
}

function bankFlowSide(raw) {
  var flow = String((raw && (raw.flow || raw.direction)) || "").trim().toLowerCase();
  if (flow === "inflow" || flow === "in" || flow === "incoming" || flow === "credit") return "in";
  if (flow === "outflow" || flow === "out" || flow === "outgoing" || flow === "debit") return "out";
  return "";
}

function bankOneOffPayoffs(budget) {
  var list = budget && budget.one_off_payoffs;
  if (!Array.isArray(list)) return [];
  var out = [];
  list.forEach(function (raw) {
    if (raw == null || raw === "") return;
    if (typeof raw === "string") {
      out.push({ name: raw, amount: null, month: "", tx_key: "", already_excluded: false });
      return;
    }
    if (typeof raw !== "object") return;
    out.push({
      name: String(raw.name || raw.label || "").trim(),
      amount: bankNum(raw.amount),
      month: bankMonthKey(raw.month || raw.date),
      tx_key: raw.tx_key == null ? "" : String(raw.tx_key).trim(),
      tx_id: raw.tx_id == null ? "" : String(raw.tx_id).trim(),
      already_excluded: raw.already_excluded === true
    });
  });
  return out;
}

/* True only when the print says the figure still contains payoffs. A missing flag is false. */
function bankFlagIsTrue(owner, key) {
  return !!(owner && typeof owner === "object" && !Array.isArray(owner) &&
    Object.prototype.hasOwnProperty.call(owner, key) && owner[key] === true);
}

function bankHistPayoffsIncluded(snap) {
  var hist = snap && snap.history;
  if (hist && typeof hist === "object" && !Array.isArray(hist) &&
      Object.prototype.hasOwnProperty.call(hist, "spend_includes_payoffs")) {
    return hist.spend_includes_payoffs === true;
  }
  return bankFlagIsTrue(snap && snap.budget, "spend_includes_payoffs");
}

function bankMtdPayoffsIncluded(budget) {
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) return false;
  if (Object.prototype.hasOwnProperty.call(budget, "mtd_includes_payoffs")) return budget.mtd_includes_payoffs === true;
  return bankFlagIsTrue(budget, "spend_includes_payoffs");
}

function bankTxStoredKey(raw) {
  if (!raw || typeof raw !== "object" || raw.tx_key == null) return "";
  return String(raw.tx_key).trim();
}

/* tx_key, then tx_id, then date + amount + label. A present key that misses does not fall through. */
function bankPayoffMatchesTx(p, raw) {
  if (!p || !raw) return false;
  if (p.tx_key) {
    if (bankTxStoredKey(raw) && bankTxStoredKey(raw) === p.tx_key) return true;
    return bankTxKey(raw) === p.tx_key;
  }
  if (p.tx_id) {
    var txId = raw.tx_id == null ? "" : String(raw.tx_id).trim();
    var id = raw.id == null ? "" : String(raw.id).trim();
    return txId === p.tx_id || id === p.tx_id;
  }
  if (p.month && bankMonthKey(raw.date) !== bankMonthKey(p.month)) return false;
  var amount = bankNum(raw.amount);
  if (p.amount == null || amount == null) return false;
  if (Math.round(Math.abs(p.amount) * 100) !== Math.round(Math.abs(amount) * 100)) return false;
  var label = bankFoldName(p.name);
  var merchant = bankFoldName(raw.desc || raw.merchant || raw.name || raw.category || "");
  if (!label || !merchant) return false;
  return label === merchant || merchant.indexOf(label) !== -1 || label.indexOf(merchant) !== -1;
}

function bankPayoffCategory(p, txs) {
  var found = "";
  if (p && (p.tx_key || p.tx_id) && txs && txs.length) {
    txs.forEach(function (raw) {
      if (found) return;
      if (!bankPayoffMatchesTx(p, raw)) return;
      found = String(raw.category || raw.desc || "").trim();
    });
  }
  if (found) return found;
  return (p && p.name) || "";
}

function bankRowsForPayoffMatch(snap, month) {
  var txs = [];
  var key = month && month.month ? bankMonthKey(month.month) : "";
  if (month) {
    [month.tx, month.txs, month.transactions, month.history_tx, month.recent_tx].forEach(function (list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (raw) { if (raw && typeof raw === "object") txs.push(raw); });
    });
  }
  if (snap && key) {
    bankMtdTxLists(snap, key).forEach(function (list) {
      list.forEach(function (raw) {
        if (!raw || typeof raw !== "object") return;
        if (raw.date && bankMonthKey(raw.date) !== key) return;
        txs.push(raw);
      });
    });
  }
  return txs;
}

function bankTxExcludedFromSpend(raw, snap) {
  if (!raw || typeof raw !== "object") return false;
  if (bankTruthyFlag(raw.one_off) || bankTruthyFlag(raw.exclude_from_spend_avg)) return true;
  var budget = (snap && snap.budget) || {};
  if (!bankMtdPayoffsIncluded(budget)) return false;
  var hit = false;
  bankOneOffPayoffs(budget).forEach(function (p) {
    if (hit || p.already_excluded) return;
    if (bankPayoffMatchesTx(p, raw)) hit = true;
  });
  return hit;
}

/* Printed spend minus one-off payoffs in that month, when the print still includes them. */
function bankOneOffCut(budget, ym, txs) {
  var key = bankMonthKey(ym);
  var sum = 0;
  var cuts = {};
  bankOneOffPayoffs(budget).forEach(function (p) {
    if (p.already_excluded) return;
    if (key && p.month && p.month !== key) return;
    if (!p.month && key) return;
    if (p.amount == null) return;
    var abs = Math.abs(p.amount);
    sum += abs;
    var cat = bankPayoffCategory(p, txs || []);
    var ck = bankBillKey(cat);
    if (ck) cuts[ck] = (cuts[ck] || 0) + abs;
  });
  return { sum: sum, cuts: cuts };
}

function bankAdjustHistMonth(month, budget, snap) {
  if (!month) return month;
  if (!bankHistPayoffsIncluded(snap || { budget: budget })) return month;
  var cut = bankOneOffCut(budget, month.month, bankRowsForPayoffMatch(snap, month));
  if (!(cut.sum > 0) && !Object.keys(cut.cuts).length) return month;
  var copy = {};
  Object.keys(month).forEach(function (k) { copy[k] = month[k]; });
  if (cut.sum && bankNum(copy.spend_total) != null) copy.spend_total = bankNum(copy.spend_total) - cut.sum;
  if (cut.sum && bankNum(copy.net) != null) copy.net = bankNum(copy.net) + cut.sum;
  if (Array.isArray(copy.categories) && Object.keys(cut.cuts).length) {
    copy.categories = copy.categories.map(function (c) {
      var name = c && (c.name || c.category);
      var n = cut.cuts[bankBillKey(name)] || 0;
      if (!(n > 0)) return c;
      var amount = bankNum(c.amount);
      if (amount == null) return null;
      var left = amount - n;
      if (!(left > 0) || Math.round(left * 100) <= 0) return null;
      var row = {};
      Object.keys(c).forEach(function (k) { row[k] = c[k]; });
      row.amount = left;
      return row;
    }).filter(Boolean);
  }
  return copy;
}

/* current.month_window is the calendar month. Rolling lists are not monthly totals. */
function bankDeclaredCalendarWindow(snap) {
  var cur = snap && snap.current;
  var w = cur && cur.month_window;
  if (!w || typeof w !== "object" || Array.isArray(w)) return null;
  var basis = String(w.basis || "").trim();
  if (basis && basis !== "calendar_month") return null;
  return {
    start: bankDayKey(bankCopyDate(w.start)),
    end: bankDayKey(bankCopyDate(w.end)),
    through: bankDayKey(bankCopyDate(w.through_date)),
    basis: basis || "calendar_month"
  };
}

function bankCalendarBlockOk(block, key) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return true;
  var w = block.window;
  if (!w || typeof w !== "object" || Array.isArray(w)) return true;
  var basis = String(w.basis || "").trim();
  if (basis && basis !== "calendar_month") return false;
  if (key && w.start && bankMonthKey(w.start) && bankMonthKey(w.start) !== key) return false;
  return true;
}

function bankRollingListsBlocked(snap, ym) {
  var win = bankDeclaredCalendarWindow(snap);
  if (!win) return false;
  var key = bankMonthKey(ym);
  if (!key) return true;
  if (win.start && bankMonthKey(win.start) && bankMonthKey(win.start) !== key) return false;
  return true;
}

/* This month's inflows and outflows from the print. Internal moves between linked accounts are left out.
   One-off rows stay off this bar. A declared calendar month does not sum rolling tx lists. */
function bankMonthFlow(snap, ym) {
  var key = bankMonthKey(ym);
  if (!key) {
    var cal = bankCalendarMonth(snap);
    key = bankYm(cal.year, cal.month);
  }
  var flow = snap && snap.current && snap.current.month_flow;
  if (flow && typeof flow === "object" && !Array.isArray(flow) && bankMonthKey(flow.month) === key && bankCalendarBlockOk(flow, key)) {
    var inn = bankNum(flow.money_in);
    if (inn == null) inn = bankNum(flow.income_received);
    var out = bankNum(flow.money_out);
    var any = (inn != null && inn !== 0) || (out != null && out !== 0);
    return { inSum: inn == null ? 0 : inn, outSum: out == null ? 0 : out, any: any, fromFlow: true };
  }
  if (bankRollingListsBlocked(snap, key)) return { inSum: null, outSum: null, any: false };
  var accounts = bankAccountIdSet(snap);
  var seen = {};
  var inSum = 0;
  var outSum = 0;
  var any = false;
  bankMtdTxLists(snap, key).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      if (raw.month && bankMonthKey(raw.month) !== key) return;
      if (raw.date && bankMonthKey(raw.date) !== key) return;
      var txKey = bankTxKey(raw);
      if (seen[txKey]) return;
      seen[txKey] = true;
      if (bankTxExcludedFromSpend(raw, snap)) return;
      if (bankIsInternalTransfer(raw, accounts)) return;
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

function bankIoNote() {
  return '<p class="bank-io-note">Out is money that left your accounts this month. Spent so far is category spending month to date.</p>';
}

function bankIoHtml(flow) {
  var head = "<h2>In / out</h2>";
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
    return '<div class="bank-io-row"><div class="bank-io-k"><span>' + title + "</span> <b>" + bankMoney(amount) +
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

function bankSavingsGap(budget) {
  if (!budget || typeof budget !== "object") return null;
  var n = bankNum(budget.savings_gap);
  if (n != null) return n;
  var basis = budget.meters_basis;
  if (basis && typeof basis === "object" && !Array.isArray(basis)) {
    n = bankNum(basis.savings_gap);
    if (n != null) return n;
    n = bankNum(basis.gap);
    if (n != null) return n;
  }
  return null;
}

/* Explicit $0 is a real limit. A negative savings_gap names how far planned spend sits above income. */
function bankSavingsZeroNote(budget) {
  var gap = bankSavingsGap(budget);
  if (gap != null && gap < 0) {
    return "No room to save this month. Planned spend is " + bankMoney(Math.abs(gap)) + " above income.";
  }
  return "No room to save this month. Limit is $0 because planned spend is above income.";
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

/* Spent-so-far meters are Bill, Optional, and Savings. A blank actual stays blank until the print has spend. */
function bankCapRows(snap, ym) {
  var budget = (snap && snap.budget) || {};
  var ctx = bankKindContext(snap);
  var targets = bankCategoryTargetMap(budget);
  var mtd = budget.mtd_actual_by_category;
  var hasMtd = !!(mtd && typeof mtd === "object" && !Array.isArray(mtd));
  var sums = { bill: 0, optional: 0, savings: 0 };
  var saw = { bill: false, optional: false, savings: false };
  if (hasMtd) {
    bankMtdSpendRows(budget, snap, ym).forEach(function (r) {
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
  var printBill = bankGroupLimit(budget, BANK_BILL_LIMIT_KEYS);
  var limits = {
    bill: printBill,
    optional: bankGroupLimit(budget, BANK_OPTIONAL_LIMIT_KEYS),
    savings: savingsEx.limit
  };
  if (limits.bill == null) limits.bill = bankSumTargets(targets, snap, ctx, "bill");
  else {
    var viewKey = bankMonthKey(ym) || bankAsofMonthKey(snap);
    var adjusted = bankPlanTotals(snap, viewKey);
    var viewingNow = !bankMonthKey(ym) || bankMonthKey(ym) === bankAsofMonthKey(snap);
    if (adjusted.must_pay != null) {
      limits.bill = adjusted.must_pay + (viewingNow ? 0 : (adjusted.delta || 0));
    }
  }
  if (limits.optional == null) limits.optional = bankSumTargets(targets, snap, ctx, "optional");
  if (limits.savings == null) limits.savings = bankSumTargets(targets, snap, ctx, "savings");
  function actualFor(kind) {
    if (kind === "savings" && savingsEx.actual != null) return savingsEx.actual;
    if (!hasMtd) return null;
    if (!saw[kind] && limits[kind] == null) return null;
    return sums[kind];
  }
  var billActual = actualFor("bill");
  var optionalActual = actualFor("optional");
  var flow = bankMonthFlow(snap, ym || bankCalendarMonth(snap));
  if (billActual == null && optionalActual == null && flow && flow.outSum > 0 && !hasMtd) optionalActual = flow.outSum;
  var savingsNote = limits.savings === 0 ? bankSavingsZeroNote(budget) : "";
  return [
    { key: "bill", label: "Bill", actual: billActual, limit: limits.bill },
    { key: "optional", label: "Optional", actual: optionalActual, limit: limits.optional },
    { key: "savings", label: "Savings", actual: actualFor("savings"), limit: limits.savings, note: savingsNote }
  ];
}

function bankCapMeterHtml(row) {
  /* A limit of 0 is set, so the meter stays up even when actual is still blank. */
  var pending = row.limit == null || (row.actual == null && row.limit !== 0);
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
  var note = row.note ? '<p class="bank-cap-zero">' + bankEsc(row.note) + "</p>" : "";
  return '<div class="' + cls + '" data-cap="' + row.key + '"><div class="bank-cap-k"><span>' + bankEsc(row.label) +
    "</span> <b>" + bankEsc(actualText) + "</b> <i>" + bankEsc(limitText) + "</i></div>" + track + note + "</div>";
}

function bankTotalPendingHtml(n) {
  if (!(n > 0)) return "";
  var word = n === 1 ? "account" : "accounts";
  return '<i class="bank-total-pending">(' + n + " " + word + " pending)</i>";
}

function bankTilesHtml(tiles, rollup) {
  if (!tiles.length) return '<p class="bank-empty">No accounts in this print.</p>';
  rollup = rollup || { value: null, pending: 0 };
  var cards = tiles.map(function (t) {
    return '<div data-acct="' + bankEsc(t.name) + '" data-balance="' + (t.missing ? "missing" : String(t.balance)) + '">' +
      "<span>" + bankEsc(t.name) + "</span> " +
      (t.mask ? '<i class="mask">' + bankEsc(t.mask) + "</i> " : "") +
      "<b>" + bankMoney(t.missing ? null : t.balance) + "</b></div>";
  }).join("");
  var totalMissing = rollup.value == null;
  var partial = !totalMissing && rollup.pending > 0;
  var state = totalMissing ? "missing" : (partial ? "partial" : "set");
  cards += '<div data-total="' + state + '"' +
    (rollup.pending > 0 ? ' data-pending="' + rollup.pending + '"' : "") + '><span>Total cash</span> <b>' +
    bankMoney(totalMissing ? null : rollup.value) + "</b> " + bankTotalPendingHtml(rollup.pending) + "</div>";
  return '<div class="kpi">' + cards + "</div>";
}

function bankCurrentHtml(snap, opts) {
  opts = opts || {};
  /* Current is today's Eastern month. The feed asof and last closed month do not pick it. */
  return bankSharedLayout(snap, opts, "current", bankTodayYmET(opts.now));
}

function bankHistHtml(snap, opts) {
  opts = opts || {};
  var histKey = bankHistMonthKey(snap, opts);
  var histMonth = bankParseYm(histKey) || bankCalendarMonth(snap);
  if (!bankMonths(snap).length && !bankPickerMonths(snap).length) {
    return bankHistChrome(snap, opts) + '<p class="bank-empty">No history in this print.</p>';
  }
  return bankHistChrome(snap, opts) + bankSharedLayout(snap, opts, "historical", histMonth);
}

/* America/New_York year, month, and day from bankEtYmd, then days in that month. */
function bankMtdCaption(asof) {
  if (asof && typeof asof === "object" && asof.year && asof.month && asof.day >= 1) {
    return "Month to date \u00b7 day " + asof.day + " of " + bankMonthDim(asof.year, asof.month);
  }
  var et = bankEtYmd(asof);
  if (!et || !(et.day >= 1)) return "Month to date";
  return "Month to date \u00b7 day " + et.day + " of " + bankMonthDim(et.year, et.month);
}

/* Spent as a percent of plan. A missing side or a non-positive plan stays blank. */
function bankVsPct(spent, plan) {
  var s = bankNum(spent);
  var p = bankNum(plan);
  if (s == null || p == null || !(p > 0)) return null;
  return (s / p) * 100;
}

function bankVsTone(spent, plan) {
  var pct = bankVsPct(spent, plan);
  if (pct == null) return "";
  if (pct > 100) return "stop";
  if (pct >= 75) return "warn";
  return "go";
}

function bankVsColor(tone) {
  if (tone === "stop") return "var(--stop)";
  if (tone === "warn") return "var(--warn)";
  if (tone === "go") return "var(--go)";
  return "var(--rule)";
}

function bankOfText(spent, plan) {
  if (bankNum(spent) == null && bankNum(plan) == null) return "\u2014";
  return bankMoney(spent) + " of " + bankMoney(plan);
}

function bankVsBarHtml(spent, plan) {
  var pct = bankVsPct(spent, plan);
  var tone = bankVsTone(spent, plan);
  var width = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var toneAttr = tone ? ' data-tone="' + tone + '"' : "";
  var pctAttr = pct == null ? "" : ' data-pct="' + pct.toFixed(1) + '"';
  return '<span class="mix-bar"' + toneAttr + pctAttr + '><span style="width:' +
    width.toFixed(1) + "%;background:" + bankVsColor(tone) + '"></span></span>';
}

function bankVsRowHtml(name, spent, plan, attrs) {
  var tone = bankVsTone(spent, plan);
  var amtCls = tone === "stop" ? "mix-amt tone-stop" : "mix-amt";
  return '<li class="mix-leg"' + (attrs || "") + (tone ? ' data-tone="' + tone + '"' : "") + ">" +
    '<i style="background:' + bankVsColor(tone) + '"></i>' +
    '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(name) + "</span>" +
    bankVsBarHtml(spent, plan) + "</span> " +
    '<span class="mix-leg-fig"><span class="' + amtCls + '">' + bankEsc(bankOfText(spent, plan)) + "</span></span></li>";
}

function bankBarsHtml(rows, note) {
  var caption = note ? '<p class="bank-bar-note">' + bankEsc(note) + "</p>" : "";
  if (!rows.length) return caption + '<p class="bank-empty">No category limits in this print.</p>';
  var items = rows.map(function (r) {
    var name = bankBillDisplayName(r.name, r.display_label);
    return bankVsRowHtml(name, r.actual, r.target, ' data-bar="' + bankEsc(r.name) + '"');
  }).join("");
  return caption + bankCapList('<ul class="mix-legend">' + items + "</ul>", rows.length, "Progress vs limits");
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

/* Today's calendar month in America/New_York. opts.now wins, else the clock. */
function bankTodayYmET(now) {
  var et = bankEtYmd(now || new Date().toISOString());
  if (et && et.year && et.month) return et;
  var d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function bankMonthLong(month) {
  var title = bankMonthTitle(2026, month || 1);
  return String(title || "").replace(/\s+\d{4}$/, "") || "This month";
}

function bankCurrentQuietNote(snap, today) {
  if (!today || !today.year) return "";
  var key = bankYm(today.year, today.month);
  var name = bankMonthLong(today.month);
  var cur = (snap && snap.current) || {};
  var flow = cur.month_flow && typeof cur.month_flow === "object" ? cur.month_flow : null;
  var flowKey = flow ? bankMonthKey(flow.month) : "";
  var through = cur.through_date || (flow && flow.through_date) || "";
  var basis = String(cur.month_basis || (flow && flow.basis) || "").trim().toLowerCase();
  var asofEt = bankEtYmd(snap && snap.asof);
  var asofKey = asofEt ? bankYm(asofEt.year, asofEt.month) : "";
  var flowHere = flow && flowKey === key;
  var flowZero = flowHere && !(bankNum(flow.money_in) > 0) && !(bankNum(flow.money_out) > 0) &&
    !(bankNum(flow.income_received) > 0) && !(bankNum(flow.required_spent) > 0) &&
    !(bankNum(flow.needs_spent) > 0) && !(bankNum(flow.wants_spent) > 0);
  var monthStart = basis === "month_start" && !through;
  var staleFeed = asofKey && asofKey < key && !flowHere;
  if (monthStart || (flowZero && !through) || staleFeed) {
    return '<p class="bank-quiet">No ' + bankEsc(name) + " transactions yet</p>";
  }
  return "";
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
function bankClampDayLabel(name, due, dim, faces) {
  var custom = faces && Object.prototype.hasOwnProperty.call(faces, name) ? faces[name] : "";
  var shown = custom ? custom : bankBillDisplayName(name);
  if (due > dim) return shown + " (" + bankOrdinal(due) + ")";
  return shown;
}

function bankBillCalendarAmounts(bills, ym, edits) {
  var map = {};
  (bills || []).forEach(function (b) {
    if (!b) return;
    if (!(bankIsTwiceBill(b) || b.effective_from || b.override_amount != null || bankUserBillAmount(edits, b) != null)) return;
    var shown = bankIsTwiceBill(b) ? bankBillLineAmount(b, ym, edits) : bankBillShownAmount(b, ym, edits);
    if (shown == null) return;
    map[b.name || "Bill"] = bankMoney(shown);
  });
  return map;
}

function bankBillFaceMap(bills) {
  var map = {};
  (bills || []).forEach(function (b) {
    if (!b || !b.name || !b.display_label) return;
    map[b.name] = b.display_label;
  });
  return map;
}

function bankCalendarByDay(cells, dim, amounts, faces) {
  var byDay = {};
  function slot(day) {
    if (!byDay[day]) byDay[day] = { day: day, pays: [], bills: [], items: [], subs: [], payNotes: [] };
    return byDay[day];
  }
  (cells || []).forEach(function (c) {
    if (!c || !c.day) return;
    var due = c.day;
    var place = due > dim ? dim : due;
    if (place < 1) return;
    var dest = slot(place);
    (c.pays || []).forEach(function (name) { dest.pays.push(bankClampDayLabel(name, due, dim, faces)); });
    (c.payNotes || []).forEach(function (note) { dest.payNotes.push(note); });
    (c.notes || []).concat(c.payNotes || []).forEach(function (note) {
      if (!note) return;
      dest.notes = dest.notes || [];
      if (dest.notes.indexOf(note) < 0) dest.notes.push(note);
    });
    (c.subs || []).forEach(function (name) {
      var label = bankClampDayLabel(name, due, dim, faces);
      if (amounts && amounts[name]) label = label + " " + amounts[name];
      dest.subs.push(label);
    });
    (c.bills || []).forEach(function (name) {
      var label = bankClampDayLabel(name, due, dim, faces);
      if (amounts && amounts[name]) label = label + " " + amounts[name];
      dest.bills.push(label);
    });
    (c.items || []).forEach(function (name) { dest.items.push(bankClampDayLabel(name, due, dim, faces)); });
  });
  return byDay;
}

function bankDayLabels(c) {
  var labels = [];
  (c.pays || []).forEach(function (name) { labels.push({ kind: "pay", name: name }); });
  (c.subs || []).forEach(function (name) { labels.push({ kind: "sub", name: name }); });
  (c.bills || []).forEach(function (name) { labels.push({ kind: "bill", name: name }); });
  (c.items || []).forEach(function (name) {
    if ((c.bills || []).indexOf(name) >= 0) return;
    labels.push({ kind: "bill", name: name });
  });
  return labels;
}

function bankDayLabelHtml(kind, name, extraClass) {
  var esc = bankEsc(name);
  var shown = kind === "pay" ? "Pay" : esc;
  var cls = kind === "pay" ? "pay" : (kind === "sub" ? "sub" : "");
  if (extraClass) cls = cls ? cls + " " + extraClass : extraClass;
  var tag = kind === "pay" || kind === "sub" ? "em" : "span";
  var classAttr = cls ? ' class="' + cls + '"' : "";
  return "<" + tag + classAttr + ' title="' + esc + '" aria-label="' + esc + '">' + shown + "</" + tag + ">";
}

function bankDayMoreHtml(list, count, wide) {
  var n = wide ? count - 2 : count - 1;
  var which = wide ? "bank-day-more-wide" : "bank-day-more-narrow";
  return '<i class="bank-day-more ' + which + '" title="' + bankEsc(list) + '" aria-hidden="true">+' + n + "</i>";
}

function bankDayAria(c, ym) {
  var labels = bankDayLabels(c);
  var when = ym && ym.month ? BANK_MONTHS[ym.month - 1] + " " + c.day : "Day " + c.day;
  var notes = (c.notes || []).filter(Boolean);
  if (!labels.length && !notes.length) return when;
  var bits = labels.map(function (lab) { return lab.name; });
  notes.forEach(function (note) { bits.push(note); });
  return when + ": " + bits.join(", ");
}

function bankDayCellHtml(c, tabIndex, ym) {
  var labels = bankDayLabels(c);
  var tab = tabIndex === 0 ? "0" : "-1";
  var aria = ' aria-label="' + bankEsc(bankDayAria(c, ym)) + '"';
  var notes = (c.notes || []).filter(Boolean).map(function (note) {
    return '<small class="bank-day-note">' + bankEsc(note) + "</small>";
  }).join(" ");
  if (!labels.length) {
    return '<div class="bank-day" tabindex="' + tab + '" role="button"' + aria + "><b>" + c.day + "</b>" +
      (notes ? " " + notes : "") + "</div>";
  }
  var list = labels.map(function (lab) { return lab.name; }).join(", ");
  var bits = labels.map(function (lab, i) {
    var extra = i === 1 ? "bank-day-second" : (i >= 2 ? "bank-day-rest" : "");
    return bankDayLabelHtml(lab.kind, lab.name, extra);
  }).join(" ");
  var multi = labels.length >= 2;
  var head = "<b>" + c.day + "</b>";
  if (multi) {
    var chips = bankDayMoreHtml(list, labels.length, false);
    if (labels.length >= 3) chips += " " + bankDayMoreHtml(list, labels.length, true);
    head = '<span class="bank-day-top">' + head + " " + chips + "</span>";
  }
  bits = bits + (notes ? " " + notes : "");
  var title = multi ? ' title="' + bankEsc(list) + '"' : "";
  var payday = labels.some(function (lab) { return lab.kind === "pay"; });
  return '<div class="bank-day has' + (payday ? " bank-day-pay" : "") + (multi ? " multi" : "") + '" tabindex="' + tab + '" role="button"' + title + aria + ">" + head + (bits ? " " + bits : "") + "</div>";
}

function bankCalendarHtml(cells, hasDays, ym, amounts, faces, opts) {
  opts = opts || {};
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
  var byDay = bankCalendarByDay(cells, dim, amounts, faces);
  var heads = BANK_DOW.map(function (name) {
    return '<span role="columnheader">' + name + "</span>";
  }).join(" ");
  var slots = [];
  var i;
  for (i = 0; i < start; i++) slots.push(null);
  for (i = 1; i <= dim; i++) slots.push(byDay[i] || { day: i, pays: [], bills: [], items: [], subs: [], payNotes: [] });
  while (slots.length % 7) slots.push(null);
  var weeks = "";
  var dayStop = 0;
  var ymCells = { year: year, month: month };
  for (i = 0; i < slots.length; i += 7) {
    var row = "";
    for (var j = 0; j < 7; j++) {
      var slot = slots[i + j];
      if (!slot) row += '<div class="bank-cal-pad" aria-hidden="true"></div>';
      else {
        row += bankDayCellHtml(slot, dayStop === 0 ? 0 : -1, ymCells);
        dayStop += 1;
      }
    }
    weeks += '<div class="bank-cal-week" role="row">' + row + "</div>";
  }
  var title = bankMonthTitle(year, month);
  var nav = opts.hideNav
    ? "<span>" + bankEsc(title) + "</span>"
    : '<button type="button" class="bank-cal-nav" data-bank-plan="-1" aria-label="Previous month">\u2039</button>' +
      "<span>" + bankEsc(title) + "</span>" +
      '<button type="button" class="bank-cal-nav" data-bank-plan="1" aria-label="Next month">\u203a</button>';
  return '<p class="bank-cal-label">' + nav + '</p><div class="bank-cal-grid" role="grid" aria-label="' +
    bankEsc(title) + '"><div class="bank-cal-dow" role="row">' + heads + "</div>" + weeks + "</div>";
}

function bankMtdSpend(budget, snap, ym) {
  var rows = bankMtdSpendRows(budget, snap, ym);
  var flow = snap ? bankMonthFlow(snap, ym) : null;
  if (!rows.length) {
    if (flow && flow.outSum > 0) return flow.outSum;
    return null;
  }
  var sum = 0;
  rows.forEach(function (r) { sum += r.amount; });
  return sum;
}

function bankMtdTxLists(snap, ym) {
  var lists = [];
  if (bankRollingListsBlocked(snap, ym)) return lists;
  var cur = snap && snap.current;
  if (cur) {
    if (Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
    var range = cur.recent_tx_month_range;
    var rangeOk = range == null || range === "" || !ym || bankMonthRangeCovers(range, ym);
    if (rangeOk && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
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

function bankIsOtherIncomeRaw(raw, cat) {
  if (!raw && !cat) return false;
  var kind = String(raw && (raw.income_kind || "") || "").trim().toLowerCase();
  if (kind === "other") return true;
  var name = String(cat || (raw && raw.category) || "").trim().toLowerCase();
  return name === "other income";
}

/* A tiers.json other_income rule moves that category off its printed tier.
   The amount is the actual, not the plan. */
function bankRetagFromTier(snap, name, ctx, row) {
  if (!name || bankResolveTier(name, snap, ctx, row) !== "other_income") return "";
  var printed = bankResolveTierPrinted(name, snap, ctx, row);
  if (printed === "other_income") return "";
  if (printed !== "required" && printed !== "needs" && printed !== "wants") return "needs";
  return printed;
}

function bankLookupAmountMap(map, name) {
  if (!map || typeof map !== "object" || Array.isArray(map) || !name) return null;
  var hit = null;
  Object.keys(map).forEach(function (k) {
    if (hit != null) return;
    if (bankNormKey(k) === bankNormKey(name) || bankBillKey(k) === bankBillKey(name) || bankKeysMatch(k, name)) hit = bankNum(map[k]);
  });
  if (hit == null) return null;
  return Math.abs(hit);
}

function bankCategorySpendActual(snap, name, ym) {
  var key = bankMonthKey(ym);
  var budget = (snap && snap.budget) || {};
  var tagged = budget.mtd_actual_by_category_month;
  var monthOk = !key || tagged == null || tagged === "" || bankMonthKey(tagged) === key;
  if (monthOk) {
    var listed = bankLookupAmountMap(budget.mtd_actual_by_category, name);
    if (listed != null && listed > 0) return listed;
  }
  var bag = key ? bankActualsMap(snap)[key] : null;
  var cat = bankCategoryActual(bag, name);
  if (cat != null && cat > 0) return Math.abs(cat);
  if (bankRollingListsBlocked(snap, key)) return null;
  var sum = 0;
  var any = false;
  var seen = {};
  bankMtdTxLists(snap, key).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) === "in") return;
      if (key && raw.month && bankMonthKey(raw.month) !== key) return;
      if (key && raw.date && bankMonthKey(raw.date) !== key) return;
      var txKey = bankTxKey(raw);
      if (txKey && seen[txKey]) return;
      var catName = raw.category || raw.merchant_key || raw.desc || raw.name || "";
      if (!bankKeysMatch(catName, name) && bankBillKey(catName) !== bankBillKey(name) &&
          !bankNamesMatch(catName, name) && !bankNamesMatch(name, catName)) return;
      var amt = bankNum(raw.amount);
      if (amt == null || amt === 0) return;
      if (txKey) seen[txKey] = true;
      any = true;
      sum += Math.abs(amt);
    });
  });
  return any ? sum : null;
}

function bankRetagMoves(snap, ym) {
  var ctx = bankKindContext(snap);
  var seen = {};
  var moves = [];
  function consider(name, row) {
    var id = bankBillKey(name);
    if (!id || seen[id]) return;
    var from = bankRetagFromTier(snap, name, ctx, row);
    if (!from) return;
    seen[id] = true;
    var actual = bankCategorySpendActual(snap, name, ym);
    if (!(actual > 0)) return;
    moves.push({ name: name, from: from, amount: actual });
  }
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || bankBillRetired(b, ym)) return;
    consider(b.name, b);
  });
  var budget = (snap && snap.budget) || {};
  var planned = budget.planned_by_category || {};
  Object.keys(planned).forEach(function (name) { consider(name, null); });
  var mtd = budget.mtd_actual_by_category;
  if (mtd && typeof mtd === "object" && !Array.isArray(mtd)) Object.keys(mtd).forEach(function (name) { consider(name, null); });
  var rules = (bankTierDoc(snap).rules) || {};
  Object.keys(rules).forEach(function (name) { consider(name, null); });
  return moves;
}

function bankRetagOtherIncome(snap, ym) {
  var ctx = bankKindContext(snap);
  var sum = 0;
  var any = false;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || !bankBillCounted(b) || bankBillRetired(b, ym)) return;
    if (bankResolveTier(b.name, snap, ctx, b) !== "other_income") return;
    if (bankResolveTierPrinted(b.name, snap, ctx, b) === "other_income") return;
    var n = bankIsTwiceBill(b) || bankIsSetAside(b) ? bankBillMonthPlan(b, ym, null) : bankBillShownAmount(b, ym, null);
    if (n == null) return;
    any = true;
    sum += Math.abs(n);
  });
  var budget = (snap && snap.budget) || {};
  var planned = budget.planned_by_category || {};
  Object.keys(planned).forEach(function (name) {
    if (bankResolveTier(name, snap, ctx, null) !== "other_income") return;
    if (bankResolveTierPrinted(name, snap, ctx, null) === "other_income") return;
    var n = Math.max(0, (bankNum(planned[name]) || 0) - bankDedupeForName(budget, name));
    if (!(n > 0)) return;
    any = true;
    sum += n;
  });
  return any ? sum : 0;
}

function bankApplyRetagDeltas(snap, ym, out, flags) {
  if (!out) return out;
  flags = flags || { tiers: true, income: true, other: true, spent: true };
  var moves = bankRetagMoves(snap, ym);
  if (!moves.length) return out;
  var moved = 0;
  moves.forEach(function (m) {
    moved += m.amount;
    if (flags.tiers && out[m.from] != null) out[m.from] = Math.max(0, out[m.from] - m.amount);
  });
  if (flags.spent && out.spent != null) out.spent = Math.max(0, out.spent - moved);
  if (flags.other) out.other = (out.other || 0) + moved;
  if (flags.income) {
    if (out.income == null) out.income = moved;
    else out.income += moved;
  }
  return out;
}

function bankOtherIncomeMtd(snap, ym) {
  var budget = (snap && snap.budget) || {};
  var extra = bankRetagOtherIncome(snap, ym);
  var box = budget.other_income_mtd;
  if (box && typeof box === "object" && !Array.isArray(box) && bankCalendarBlockOk(box, bankMonthKey(ym))) {
    var month = bankMonthKey(box.month);
    var total = bankNum(box.total);
    if (total != null && (!ym || !month || month === bankMonthKey(ym))) {
      return { month: month || bankMonthKey(ym), total: total + extra, count: bankNum(box.count), as_of: box.as_of || "" };
    }
  }
  if (bankRollingListsBlocked(snap, ym)) {
    if (!(extra > 0)) return null;
    return { month: bankMonthKey(ym), total: extra, count: 1, as_of: "" };
  }
  var rows = budget.other_income;
  if (!Array.isArray(rows) || !rows.length) {
    if (!(extra > 0)) return null;
    return { month: bankMonthKey(ym), total: extra, count: 1, as_of: "" };
  }
  var sum = 0;
  var count = 0;
  var any = false;
  rows.forEach(function (row) {
    if (!row || typeof row !== "object") return;
    var when = bankMonthKey(row.date || row.month);
    if (ym && when && when !== bankMonthKey(ym)) return;
    var n = bankNum(row.amount);
    if (n == null) return;
    any = true;
    count += 1;
    sum += Math.abs(n);
  });
  if (!any && !(extra > 0)) return null;
  return { month: bankMonthKey(ym), total: sum + extra, count: count, as_of: "" };
}

/* In-month income txs, else an open history row's income_total. Never income_monthly.
   Other income is added when the tx walk did not already count it.
   When the print has month_flow.income_received, that plus other income is the figure. */
function bankMtdIncome(snap, ym) {
  var flowKey = bankMonthKey(ym);
  var flowBag = snap && snap.current && snap.current.month_flow;
  var listedOther = bankOtherIncomeMtd(snap, ym);
  var otherAdd = listedOther && listedOther.total > 0 ? listedOther.total : 0;
  if (flowBag && typeof flowBag === "object" && !Array.isArray(flowBag) && bankMonthKey(flowBag.month) === flowKey && flowBag.income_received != null) {
    var received = bankNum(flowBag.income_received);
    if (received == null) received = 0;
    var flowOther = bankNum(flowBag.other_income);
    if (flowOther != null && flowOther > otherAdd) otherAdd = flowOther;
    return bankRoundCents(received + otherAdd);
  }
  if (bankRollingListsBlocked(snap, ym)) {
    var blocked = bankOtherIncomeMtd(snap, ym);
    if (blocked && blocked.total != null) return blocked.total;
    return null;
  }
  var overrides = bankOverrideMap(snap);
  var incomeObj = bankMtdIncomeObj(snap, ym);
  var seen = {};
  var sum = 0;
  var any = false;
  var otherTx = 0;
  bankMtdTxLists(snap, ym).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      if (raw.month && bankMonthKey(raw.month) !== ym) return;
      if (raw.date && bankMonthKey(raw.date) !== ym) return;
      var key = bankTxKey(raw);
      if (seen[key]) return;
      var cat = bankTxCategory(raw, overrides);
      var other = bankIsOtherIncomeRaw(raw, cat);
      if (!other && (!bankIsIncomeName(cat, incomeObj) || bankIsTransferName(cat))) return;
      var n = bankNum(raw.amount);
      if (n == null || n === 0) return;
      seen[key] = true;
      any = true;
      sum += Math.abs(n);
      if (other) otherTx += Math.abs(n);
    });
  });
  var listed = bankOtherIncomeMtd(snap, ym);
  var extra = 0;
  if (listed && listed.total > 0) extra = Math.max(0, listed.total - otherTx);
  if (any) return sum + extra;
  var flowIn = bankMonthFlow(snap, ym);
  if (flowIn && flowIn.inSum > 0) return flowIn.inSum + extra;
  var months = bankMonths(snap);
  for (var i = 0; i < months.length; i++) {
    var m = months[i];
    if (String(m.month) !== ym || !bankOpenMonth(m)) continue;
    var total = bankMonthlyIncomeTotal(m.income_total);
    if (total != null) return Math.abs(total) + extra;
  }
  return extra > 0 ? extra : null;
}

function bankIncomeMixHtml(snap, ym) {
  var listed = bankOtherIncomeMtd(snap, ym);
  var other = listed && listed.total > 0 ? listed.total : 0;
  if (!(other > 0)) return "";
  var total = bankMtdIncome(snap, ym);
  if (!(total > 0)) total = other;
  var rest = Math.max(0, total - other);
  var parts = [];
  if (rest > 0) parts.push({ key: "rest", label: "Income", amount: rest });
  parts.push({ key: "other", label: "Other income", amount: other });
  var scale = 0;
  parts.forEach(function (p) { scale += p.amount; });
  if (!(scale > 0)) return "";
  var shares = bankPercentShares(parts.map(function (p) { return p.amount; }));
  var segs = "";
  var legend = "";
  parts.forEach(function (p, i) {
    var pct = (p.amount / scale) * 100;
    segs += '<i class="bank-mix-seg mix-' + p.key + '" style="width:' + pct.toFixed(1) + '%"></i>';
    legend += '<li><b class="mix-' + p.key + '"></b> <span>' + bankEsc(p.label) + "</span> <em>" +
      bankMoney(p.amount) + "</em>" + bankSep() + "<i>" + shares[i] + "%</i></li>";
  });
  return '<div class="bank-income-mix" role="img" aria-label="' + bankEsc("Income received, Other income " + bankMoney(other)) +
    '"><div class="bank-mix-track">' + segs + '</div><ul class="bank-mix-legend">' + legend + "</ul></div>";
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

/* Real percent through 999, then 999%+. Zero or missing income is an em dash, not 999%+. */
function bankMtdOfIncomeText(spend, income) {
  if (!(income > 0)) return "\u2014";
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
    '<div class="bank-mtd-fig"><span>Spent so far</span> <b>' + bankMoney(spend) + '</b><span class="sep"> </span></div>' +
    '<div class="bank-mtd-fig"><span>Income received</span> <b>' + bankMoney(income) + '</b><span class="sep"> </span></div>' +
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

function bankMtdBlock(snap, ym) {
  if (!ym || !ym.year) ym = bankCalendarMonth(snap);
  var monthKey = bankYm(ym.year, ym.month);
  var spend = bankMtdSpend(snap && snap.budget, snap, monthKey);
  var income = bankMtdIncome(snap, monthKey);
  var capWhen = ym && ym.day >= 1 ? ym : bankTodayYmET();
  var cap = bankMtdCaption(capWhen);
  return '<section class="bank-pie-block bank-mtd"><h2>' + bankEsc(cap) +
    "</h2>" + bankMtdSplitHtml(spend, income) + bankIncomeMixHtml(snap, bankYm(ym.year, ym.month)) + "</section>";
}

function bankTierKey(name) {
  var s = String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
  s = s.replace(/#\d+$/, "").trim();
  s = s.replace(/(?: |\*)\d{4,}$/, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
}

function bankTierWord(raw) {
  var s = String(raw == null ? "" : raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "required" || s === "must_pay" || s === "bill") return "required";
  if (s === "needs" || s === "need") return "needs";
  if (s === "wants" || s === "want") return "wants";
  if (s === "elective" || s === "optional") return "elective";
  if (s === "other_income") return "other_income";
  return "";
}

function bankTierLabel(tier) {
  if (tier === "required") return "Required";
  if (tier === "needs") return "Needs";
  if (tier === "wants") return "Wants";
  return "";
}

function bankAccountFace(acct) {
  if (acct == null || acct === "") return "account TBD";
  if (typeof acct === "string") {
    var text = acct.trim();
    return text || "account TBD";
  }
  if (typeof acct !== "object") return "account TBD";
  var nick = acct.nickname == null ? "" : String(acct.nickname).trim();
  if (nick) return nick;
  var last = bankAccountMask(acct.last4);
  if (last) return last;
  return "account TBD";
}

function bankAccountsSame(a, b) {
  if (bankAccountFace(a) === "account TBD" || bankAccountFace(b) === "account TBD") return false;
  return bankTierKey(bankAccountFace(a)) === bankTierKey(bankAccountFace(b));
}

function bankCategoryDefaultTier(name) {
  var s = String(name || "").toLowerCase();
  var wants = ["dining", "restaurant", "entertainment", "shopping", "travel"];
  var needs = ["groceries", "fuel", "gas station", "auto", "household", "medical", "pharmacy", "kids", "child essentials"];
  var i;
  for (i = 0; i < wants.length; i++) if (s.indexOf(wants[i]) >= 0) return "wants";
  for (i = 0; i < needs.length; i++) if (s.indexOf(needs[i]) >= 0) return "needs";
  return "needs";
}

function bankFeedTierWrap(snap) {
  var budget = snap && snap.budget;
  var wrap = budget && budget.tier_doc;
  if (!wrap || typeof wrap !== "object" || Array.isArray(wrap)) return null;
  return wrap;
}

function bankFeedTierDoc(snap) {
  var wrap = bankFeedTierWrap(snap);
  var doc = wrap && wrap.doc;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
  return doc;
}

/* A live tiers.json GET wins. If that GET failed, use budget.tier_doc.doc. snap.tier_doc is the in-memory mirror. */
function bankTierDoc(snap) {
  if (snap && snap._tiersFromGet && snap.tier_doc && typeof snap.tier_doc === "object" && !Array.isArray(snap.tier_doc)) return snap.tier_doc;
  if (snap && snap._tiersGetFailed) {
    var feed = bankFeedTierDoc(snap);
    if (feed) return feed;
  }
  var doc = snap && snap.tier_doc;
  if (doc && typeof doc === "object" && !Array.isArray(doc) && (doc.rules || doc.plans || doc.bill_status || doc.manual_paid)) return doc;
  var saved = bankFeedTierDoc(snap);
  if (saved) return saved;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { plans: {}, rules: {} };
  return doc;
}

function bankTierStaleHtml(snap) {
  if (snap && snap._tiersFromGet) return "";
  var wrap = bankFeedTierWrap(snap);
  if (!wrap || wrap.stale !== true) return "";
  return '<p class="bank-tier-stale">saved settings may be out of date</p>';
}

function bankLookupTierRule(snap, name) {
  var rules = bankTierDoc(snap).rules || {};
  var key = bankTierKey(name);
  if (!key) return "";
  var found = "";
  Object.keys(rules).forEach(function (k) {
    if (found) return;
    if (bankTierKey(k) !== key) return;
    var row = rules[k];
    var tier = bankTierWord(row && typeof row === "object" ? row.tier : row);
    if (tier && tier !== "elective") found = tier;
  });
  return found;
}

function bankRawMustTier(snap, name) {
  var map = bankMustPayMap(snap);
  var raw = null;
  var key = bankTierKey(name);
  Object.keys(map).forEach(function (k) {
    if (raw != null) return;
    if (bankTierKey(k) === key || bankBillKey(k) === bankBillKey(name)) raw = map[k];
  });
  return bankTierWord(raw);
}

function bankCategoryTier(snap, name) {
  var budget = (snap && snap.budget) || {};
  var map = budget.category_tiers;
  if (!map || typeof map !== "object" || Array.isArray(map)) return "";
  var found = "";
  var key = bankTierKey(name);
  Object.keys(map).forEach(function (k) {
    if (found) return;
    if (bankTierKey(k) !== key && bankBillKey(k) !== bankBillKey(name)) return;
    var tier = bankTierWord(map[k]);
    if (tier && tier !== "elective") found = tier;
  });
  return found;
}

function bankIsSubName(name, snap) {
  var key = bankBillKey(name);
  if (!key) return false;
  return bankNormalizeSubs((snap && snap.budget) || {}).some(function (s) { return bankBillKey(s.name) === key; });
}

/* bill_id education is the only Required education bill. A monthly education merchant, with no bill id, stays in Needs. It is not a bill or a sub. */
function bankEducationTier(name, row) {
  var id = row && row.bill_id != null ? String(row.bill_id).trim() : "";
  if (id === "education") return "required";
  var bits = [name];
  if (row && typeof row === "object") bits.push(row.name, row.label, row.category);
  var i;
  for (i = 0; i < bits.length; i++) {
    var key = bankBillKey(bits[i]);
    if (key === "education" || key === "childcare") return "needs";
  }
  return "";
}

function bankMerchantDefaultTier(snap, name) {
  var basis = snap && snap.budget && snap.budget.tier_basis;
  var map = basis && basis.merchant_default;
  if (!map || typeof map !== "object" || Array.isArray(map) || !name) return "";
  var found = "";
  Object.keys(map).forEach(function (k) {
    if (found) return;
    if (!bankKeysMatch(k, name) && bankTierKey(k) !== bankTierKey(name)) return;
    var tier = bankTierWord(map[k]);
    if (tier && tier !== "elective") found = tier;
  });
  return found;
}

/* Printed tier, with no tiers.json rule. Used so a rule moves only its own delta. */
function bankResolveTierPrinted(name, snap, ctx, row) {
  row = row || null;
  var explicit = bankTierWord(row && row.tier);
  if (explicit && explicit !== "elective") return explicit;
  var catName = (row && (row.category || row.name)) || name;
  var mapped = bankCategoryTier(snap, catName) || bankCategoryTier(snap, name);
  if (mapped) return mapped;
  if (row && String(row.bill_id || "").trim() === "education") return "required";
  var merchant = bankMerchantDefaultTier(snap, name);
  if (!merchant && row && row.merchant) merchant = bankMerchantDefaultTier(snap, row.merchant);
  if (!merchant && row && row.merchant_key) merchant = bankMerchantDefaultTier(snap, row.merchant_key);
  if (merchant) return merchant;
  var edu = bankEducationTier(name, row);
  if (edu) return edu;
  var must = bankRawMustTier(snap, name);
  if (!must && row && row.merchant_key) must = bankRawMustTier(snap, row.merchant_key);
  if (must === "required" || must === "needs" || must === "wants") return must;
  if (must !== "elective") {
    var printed = bankTierWord(row && (row.tier || (row.paid_current_month && row.paid_current_month.tier)));
    if (!printed && row && row.tier) printed = bankTierWord(row.tier);
    if (printed && printed !== "elective") return printed;
  }
  ctx = ctx || null;
  if (must === "elective") return bankCategoryDefaultTier(name);
  if (row && (row.kind === "subscription" || row.set_aside === false && row.subscription)) return "wants";
  if (ctx && bankItemIsBillName(name, ctx.bills)) return "required";
  if (!ctx && snap && bankItemIsBillName(name, bankNormalizeBills((snap.budget || {}), undefined))) return "required";
  if (row && bankIsSetAside(row)) return "required";
  if (bankIsSubName(name, snap)) return "wants";
  return bankCategoryDefaultTier(name);
}

/* Rules, then must-pay, then the row tier, then category_tiers, then the default map.
   elective means keep going to the category default. */
function bankResolveTier(name, snap, ctx, row) {
  row = row || null;
  var ruleName = (row && row.merchant_key) || name;
  var ruled = bankLookupTierRule(snap, ruleName);
  if (!ruled && row && row.merchant_key && name) ruled = bankLookupTierRule(snap, name);
  if (ruled) return ruled;
  /* An Edits Bill or Optional choice wins over the bill default. A bill with no choice stays Required. */
  var over = bankMustPayOverride(snap, name);
  if (!over && row && row.name) over = bankMustPayOverride(snap, row.name);
  if (over === "must_pay") return "required";
  if (over === "elective") return bankCategoryDefaultTier(name);
  if (bankIsBillForTier(name, snap, ctx, row)) return "required";
  return bankResolveTierPrinted(name, snap, ctx, row);
}

function bankIsBillForTier(name, snap, ctx, row) {
  row = row || null;
  if (row && (row.kind === "subscription" || row.subscription === true)) return false;
  if (row && (row.tx_key || row.desc || row.merchant)) return false;
  if (row && String(row.bill_id || "").trim()) return true;
  var bills = ctx && ctx.bills;
  if (!bills && snap) bills = bankNormalizeBills((snap.budget || {}), undefined);
  if (bankItemIsBillName(name, bills)) return true;
  if (row && row.name && bankItemIsBillName(row.name, bills)) return true;
  return false;
}

function bankUserPlanValue(snap, key) {
  var plans = bankTierDoc(snap).plans || {};
  if (!Object.prototype.hasOwnProperty.call(plans, key)) return null;
  if (plans[key] == null || plans[key] === "") return null;
  return bankNum(plans[key]);
}

function bankTierRulesActive(snap) {
  var rules = bankTierDoc(snap).rules || {};
  return Object.keys(rules).some(function (k) {
    var row = rules[k];
    var tier = bankTierWord(row && typeof row === "object" ? row.tier : row);
    return !!(tier && tier !== "elective");
  });
}

function bankUserPlansActive(snap) {
  return bankUserPlanValue(snap, "required") != null || bankUserPlanValue(snap, "needs") != null || bankUserPlanValue(snap, "wants") != null;
}

function bankExpectedIncome(snap, ym) {
  var incomes = bankAttachIncomePlan(bankNormalizeIncome((snap && snap.budget) || {}), ym);
  var any = false;
  var sum = 0;
  incomes.forEach(function (inc) {
    var n = bankIncomeMonthAmount(inc);
    if (n == null) return;
    any = true;
    sum += n;
  });
  if (any) return sum;
  return bankNum((snap && snap.budget && snap.budget.income_total));
}

function bankSumTierRows(snap, tier, ym, edits) {
  var ctx = bankKindContext(snap);
  var budget = (snap && snap.budget) || {};
  var sum = 0;
  var any = false;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (bankBillRetired(b, ym)) return;
    if (!bankBillCounted(b)) return;
    if (bankResolveTier(b.name, snap, ctx, b) !== tier) return;
    var n = bankIsTwiceBill(b) || bankIsSetAside(b) ? bankBillMonthPlan(b, ym) : bankBillShownAmount(b, ym, edits);
    if (n == null || !(n > 0)) return;
    any = true;
    sum += n;
  });
  bankNormalizeSubs(budget).forEach(function (s) {
    if (!bankBillCounted(s)) return;
    if (bankResolveTier(s.name, snap, ctx, s) !== tier) return;
    if (s.amount == null || !(s.amount > 0)) return;
    any = true;
    sum += s.amount;
  });
  var planned = budget.planned_by_category || {};
  Object.keys(planned).forEach(function (name) {
    if (bankIsGroupLimitKey(name)) return;
    if (bankResolveTier(name, snap, ctx, null) !== tier) return;
    if (bankItemIsBillName(name, ctx.bills) || bankIsSubName(name, snap)) return;
    var n = bankNum(planned[name]);
    if (n == null || n < 0) return;
    any = true;
    sum += n;
  });
  if (tier === "wants" && !bankItemIsBillName("subs", ctx.bills)) {
    var subsTotal = bankNum(budget.subs_total);
    var listed = bankNormalizeSubs(budget).some(function (s) { return s.amount != null; });
    if (!listed && subsTotal != null && subsTotal > 0) {
      any = true;
      sum += subsTotal;
    }
  }
  return any ? sum : null;
}

/* Printed totals plus the delta of a tiers.json move or a desk cancel/payoff. Not a full recompute. */
function bankPlanDelta(snap, ym, edits) {
  var ctx = bankKindContext(snap);
  var budget = (snap && snap.budget) || {};
  var delta = { required: 0, needs: 0, wants: 0, plan: 0 };
  var inPlan = { required: true, needs: true, wants: true };
  function bump(from, to, amount, retired) {
    if (!(amount > 0)) return;
    if (retired) {
      if (inPlan[from]) {
        delta[from] -= amount;
        delta.plan -= amount;
      }
      return;
    }
    if (from === to) return;
    if (inPlan[from]) delta[from] -= amount;
    if (inPlan[to]) delta[to] += amount;
    if (inPlan[from] && !inPlan[to]) delta.plan -= amount;
    if (!inPlan[from] && inPlan[to]) delta.plan += amount;
  }
  function amountOf(row) {
    if (!row) return null;
    if (row.kind === "subscription") return bankNum(row.amount);
    if (bankIsTwiceBill(row) || bankIsSetAside(row)) return bankBillMonthPlan(row, ym, edits);
    return bankBillShownAmount(row, ym, edits);
  }
  var countedBill = {};
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!bankBillCounted(b)) return;
    if (bankBillRetired(b, ym) && b.status_source !== "tiers") return;
    var printed = bankResolveTierPrinted(b.name, snap, ctx, b);
    var effective = bankResolveTier(b.name, snap, ctx, b);
    var retired = b.status_source === "tiers" && bankBillRetired(b, ym);
    var amt = amountOf(b);
    bump(printed, retired ? printed : effective, amt, retired);
    if (amt != null) countedBill[bankBillKey(b.name)] = (countedBill[bankBillKey(b.name)] || 0) + amt;
  });
  bankNormalizeSubs(budget).forEach(function (s) {
    if (!bankBillCounted(s)) return;
    bump(bankResolveTierPrinted(s.name, snap, ctx, s), bankResolveTier(s.name, snap, ctx, s), bankNum(s.amount), false);
  });
  var planned = budget.planned_by_category || {};
  Object.keys(planned).forEach(function (name) {
    if (bankIsGroupLimitKey(name)) return;
    if (bankIsSubName(name, snap)) return;
    var raw = bankNum(planned[name]);
    if (raw == null) return;
    var effectiveAmt = Math.max(0, raw - bankDedupeForName(budget, name) - (countedBill[bankBillKey(name)] || 0));
    bump(bankResolveTierPrinted(name, snap, ctx, null), bankResolveTier(name, snap, ctx, null), effectiveAmt, false);
  });
  return delta;
}

function bankDedupeForName(budget, name) {
  var list = budget && budget.plan_dedupe;
  if (!Array.isArray(list)) return 0;
  var sum = 0;
  list.forEach(function (row) {
    if (!row || typeof row !== "object") return;
    var label = row.name || row.category || row.label || "";
    if (!bankKeysMatch(label, name)) return;
    var n = row.deducted != null && row.deducted !== "" ? bankNum(row.deducted) : bankNum(row.amount);
    if (n != null) sum += Math.abs(n);
  });
  return sum;
}

function bankPlanNumbers(snap, ym, edits) {
  var budget = (snap && snap.budget) || {};
  var tiers = (budget.tiers && typeof budget.tiers === "object") ? budget.tiers : {};
  var delta = bankUserPlansActive(snap) ? { required: 0, needs: 0, wants: 0, plan: 0 } : bankPlanDelta(snap, ym, edits);
  var frozen = !!(snap && snap._bankSnapshotMonth);
  function explicitNull(printed) {
    return frozen && printed === null;
  }
  function part(key, printed) {
    var user = bankUserPlanValue(snap, key);
    if (user != null) return user;
    var base = null;
    if (key === "required" && frozen && bankNum(tiers.required_total) != null) base = bankNum(tiers.required_total);
    else if (key === "required") base = bankPrintedRequired(budget);
    if (base == null && bankNum(printed) != null) base = bankNum(printed);
    if (base == null) {
      if (explicitNull(printed)) return null;
      var summed = bankSumTierRows(snap, key, ym, edits);
      return summed == null ? 0 : summed;
    }
    return Math.max(0, base + (delta[key] || 0));
  }
  var requiredPrinted = frozen && bankNum(tiers.required_total) != null ? tiers.required_total : (tiers.required_plan != null ? tiers.required_plan : tiers.required_total);
  var required = part("required", requiredPrinted);
  var needs = part("needs", tiers.needs_plan);
  var wants = part("wants", tiers.wants_plan);
  if (required == null && !explicitNull(requiredPrinted)) required = 0;
  if (needs == null && !explicitNull(tiers.needs_plan)) needs = 0;
  if (wants == null && !explicitNull(tiers.wants_plan)) wants = 0;
  var income = bankExpectedIncome(snap, ym);
  var direct = !bankUserPlansActive(snap) && bankNum(tiers.plan_total_tiers) != null;
  var plan = direct ? Math.max(0, bankNum(tiers.plan_total_tiers) + (delta.plan || 0)) : (required || 0) + (needs || 0) + (wants || 0);
  var left;
  var leftSpecified = Object.prototype.hasOwnProperty.call(tiers, "left_after_tiers");
  var printedLeft = leftSpecified ? bankNum(tiers.left_after_tiers) : null;
  if (frozen && leftSpecified) left = printedLeft;
  else if (income != null) left = income - plan;
  else if (direct && printedLeft != null) left = printedLeft - (delta.plan || 0);
  else left = income == null ? null : income - plan;
  var txDelta = snap && snap._bankSnapshotMonth
    ? { required: 0, needs: 0, wants: 0, plan: 0 }
    : bankTxPlanDelta(snap, ym);
  if (txDelta.required || txDelta.needs || txDelta.wants || txDelta.plan) {
    if (required != null) required += txDelta.required;
    if (needs != null) needs += txDelta.needs;
    if (wants != null) wants += txDelta.wants;
    if (plan != null) plan += txDelta.plan;
    if (!(frozen && leftSpecified) && income != null) left = income - plan;
  }
  return {
    income: income,
    required: required,
    needs: needs,
    wants: wants,
    plan: plan,
    left: left,
    over: left != null && left < 0,
    cards: bankNum(tiers.required_card_payments),
    dedupe: bankPlanDedupeSum(budget)
  };
}

function bankRetiredPrintedAdjust(snap, ym, tier) {
  var ctx = bankKindContext(snap);
  var sum = 0;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || b.status_source !== "tiers" || !bankBillRetired(b, ym)) return;
    if (bankResolveTier(b.name, snap, ctx, b) !== tier) return;
    var n = bankIsTwiceBill(b) || bankIsSetAside(b) ? bankBillMonthPlan(b, ym) : bankBillShownAmount(b, ym, null);
    if (n != null && n > 0) sum += n;
  });
  return sum;
}

function bankFillTick(actual, plan) {
  var a = bankNum(actual);
  var p = bankNum(plan);
  var aUse = a == null ? 0 : Math.max(0, a);
  var pUse = p == null ? 0 : Math.max(0, p);
  var scale = Math.max(aUse, pUse);
  var fill = scale > 0 ? (aUse / scale) * 100 : 0;
  var tick = p == null || !(scale > 0) ? null : (pUse / scale) * 100;
  var remain = p == null ? null : pUse - aUse;
  return {
    fill: fill,
    tick: tick,
    remain: remain,
    over: remain != null && remain < -0.0001
  };
}

function bankSkipTierName(name, snap) {
  if (!name) return true;
  if (bankIsIncomeName(name, null) || bankIsTransferName(name) || bankSkipKindName(name, snap)) return true;
  if (bankIsSavingsName(name)) return true;
  return false;
}

function bankCollectTierRows(snap, ym, edits, withTx) {
  var ctx = bankKindContext(snap);
  var groups = { required: [], needs: [], wants: [] };
  function push(tier, row) {
    if (tier !== "required" && tier !== "needs" && tier !== "wants") tier = "needs";
    if (!(row.amount > 0) && row.amount !== 0) return;
    groups[tier].push(row);
  }
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || bankBillRetired(b, ym) || !bankBillCounted(b)) return;
    var tier = bankResolveTier(b.name, snap, ctx, b);
    if (tier === "other_income") return;
    var amount = bankIsTwiceBill(b) || bankIsSetAside(b) ? bankBillMonthPlan(b, ym, edits) : bankBillLineAmount(b, ym, edits);
    if (amount == null || !(amount > 0)) return;
    push(tier, {
      name: bankBillDisplayName(b.name, b.display_label),
      amount: amount,
      key: b.name,
      bill: b
    });
  });
  bankNormalizeSubs((snap && snap.budget) || {}).forEach(function (s) {
    if (!s || !bankBillCounted(s) || s.amount == null || !(s.amount > 0)) return;
    var tier = bankResolveTier(s.name, snap, ctx, s);
    push(tier, {
      name: bankBillDisplayName(s.name),
      amount: s.amount,
      key: s.name,
      bill: null,
      days: s.typical_day == null ? [] : [s.typical_day],
      typical_day: s.typical_day,
      set_aside: !!(s.set_aside || bankIsSetAside(s))
    });
  });
  var budget = (snap && snap.budget) || {};
  var planned = budget.planned_by_category || {};
  var surfaced = bankSurfaceBills(ctx.bills, budget);
  Object.keys(planned).forEach(function (name) {
    if (bankIsGroupLimitKey(name)) return;
    if (bankItemIsBillName(name, surfaced) || bankIsSubName(name, snap)) return;
    var n = bankNum(planned[name]);
    if (n == null || !(n > 0)) return;
    var tier = bankResolveTier(name, snap, ctx, null);
    push(tier, {
      name: bankBillDisplayName(name),
      amount: n,
      key: name,
      bill: null
    });
  });
  if (!withTx) return groups;
  var seen = {};
  bankEditRows(snap).forEach(function (r) {
    if (!r || seen[r.key]) return;
    var cat = r.category || "";
    if (bankSkipTierName(cat, snap) && bankSkipTierName(r.desc, snap)) return;
    if (bankFlowSide(r) === "in") return;
    var amount = bankNum(r.amount);
    if (amount == null || !(Math.abs(amount) > 0)) return;
    seen[r.key] = true;
    var tier = bankResolveTier(cat || r.desc, snap, ctx, { category: cat, name: r.desc });
    push(tier, {
      name: bankItemLabel(r.desc),
      amount: Math.abs(amount),
      key: cat || r.desc,
      bill: null,
      undated: true,
      merchant: true
    });
  });
  return groups;
}

function bankSortAmount(row) {
  if (!row) return 0;
  var n = bankNum(row.amount);
  if (n == null && row.amount != null && row.amount !== "") {
    n = bankNum(String(row.amount).replace(/[^0-9.\u2212-]/g, "").replace(/\u2212/g, "-"));
  }
  return n == null ? 0 : Math.abs(n);
}

function bankSortIso(raw) {
  if (raw == null || raw === "") return "";
  var copied = bankCopyDate(raw);
  if (copied && /^\d{4}-\d{2}-\d{2}/.test(copied)) return String(copied).slice(0, 10);
  var hit = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return hit ? hit[1] : "";
}

function bankSortUndated(row) {
  if (!row) return true;
  if (row.undated || row.merchant || row.set_aside) return true;
  if (bankIsSetAside(row)) return true;
  if (row.bill && (row.bill.set_aside || bankIsSetAside(row.bill))) return true;
  return false;
}

function bankSortDays(row, month) {
  var days = [];
  function push(v) {
    if (v == null || v === "") return;
    if (Array.isArray(v)) {
      v.forEach(push);
      return;
    }
    var day = bankDay(v);
    if (day == null || days.indexOf(day) >= 0) return;
    days.push(day);
  }
  push(row.days);
  push(row.day);
  push(row.typical_day);
  push(row.due_day);
  if (row.bill) push(bankBillDueDays(row.bill, month));
  return days;
}

function bankSortMonthDate(month, day) {
  if (!month || !month.year || day == null) return "";
  var dim = bankMonthDim(month.year, month.month);
  var d = day > dim ? dim : day;
  if (!(d > 0)) return "";
  return bankDateKey(month.year, month.month, d);
}

function bankSortNextDay(days, today, month) {
  if (!days || !days.length) return "";
  var todayKey = today ? String(today).slice(0, 7) : "";
  var viewKey = month && month.year ? bankYm(month.year, month.month) : "";
  if (month && month.year && (!todayKey || viewKey !== todayKey)) {
    var ahead = [];
    days.forEach(function (d) {
      var iso = bankSortMonthDate(month, d);
      if (iso) ahead.push(iso);
    });
    ahead.sort();
    return ahead[0] || "";
  }
  var base = null;
  if (month && (!todayKey || viewKey === todayKey)) base = month;
  else if (today && /^\d{4}-\d{2}-\d{2}/.test(today)) base = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  else if (month) base = month;
  if (!base) return "";
  var hits = [];
  days.forEach(function (d) {
    var iso = bankSortMonthDate(base, d);
    if (today && iso && iso < today) {
      var nxt = bankParseYm(bankShiftYm(base, 1));
      iso = nxt ? bankSortMonthDate(nxt, d) : "";
    }
    if (iso) hits.push(iso);
  });
  hits.sort();
  return hits[0] || "";
}

function bankSortDueKey(row, today, mode, month) {
  if (!row) return "";
  mode = mode || "plan";
  if (mode === "date") {
    var dated = bankSortIso(row.date || row.due);
    if (dated) return dated;
    var dueDay = bankDay(row.day != null ? row.day : row.due_day);
    if (dueDay != null) return "0000-00-" + (dueDay < 10 ? "0" : "") + dueDay;
    return "";
  }
  if (bankSortUndated(row)) return "";
  if (mode === "historical") {
    var paid = bankSortIso(row.paid_date || (row.paid_current_month && row.paid_current_month.paid_date) ||
      (row.bill && (row.bill.paid_date || (row.bill.paid_current_month && row.bill.paid_current_month.paid_date))));
    if (paid) return paid;
    var histDays = bankSortDays(row, month);
    var hist = [];
    histDays.forEach(function (d) {
      var iso = bankSortMonthDate(month, d);
      if (iso) hist.push(iso);
    });
    hist.sort();
    return hist[0] || "";
  }
  if (mode === "inplace") {
    var placeDays = bankSortDays(row, month);
    var place = [];
    placeDays.forEach(function (d) {
      var iso = bankSortMonthDate(month, d);
      if (iso) place.push(iso);
    });
    place.sort();
    if (place.length) return place[0];
    return bankSortIso(row.due);
  }
  if (mode === "current") {
    var curDays = bankSortDays(row, month);
    if (curDays.length && month) {
      var cur = [];
      curDays.forEach(function (d) {
        var iso = bankSortMonthDate(month, d);
        if (iso) cur.push(iso);
      });
      cur.sort();
      if (cur.length) return cur[0];
    }
    return bankSortIso(row.due);
  }
  var explicit = bankSortIso(row.due);
  if (explicit) return explicit;
  return bankSortNextDay(bankSortDays(row, month), today, month);
}

/* Soonest next due first. Ties take the larger amount. Undated rows (set-asides, merchant spend) go last. */
function bankSortByDue(rows, opts) {
  opts = opts || {};
  var today = opts.today || "";
  if (today && typeof today === "object") today = bankDateKey(today.year, today.month, today.day);
  var mode = opts.mode || "plan";
  var month = opts.month || null;
  if (typeof month === "string") month = bankParseYm(bankMonthKey(month));
  var list = (rows || []).slice();
  list.sort(function (a, b) {
    if (mode === "current") {
      var pa = a && a.paid ? 1 : 0;
      var pb = b && b.paid ? 1 : 0;
      if (pa !== pb) return pa - pb;
    }
    var da = bankSortDueKey(a, today, mode, month);
    var db = bankSortDueKey(b, today, mode, month);
    if (!da !== !db) return da ? -1 : 1;
    if (da && db && da !== db) return da < db ? -1 : 1;
    var aa = bankSortAmount(a);
    var ba = bankSortAmount(b);
    if (aa !== ba) return ba - aa;
    var an = String((a && (a.name || a.label)) || "");
    var bn = String((b && (b.name || b.label)) || "");
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  return list;
}

function bankTierRowLists(groups, opts) {
  opts = opts || {};
  var month = opts.month;
  if (typeof month === "string") month = bankParseYm(bankMonthKey(month));
  var mode = opts.mode || "plan";
  var today = opts.today || "";
  if (today && typeof today === "object") today = bankDateKey(today.year, today.month, today.day);
  return ["required", "needs", "wants"].map(function (tier) {
    var raw = (groups && groups[tier]) || [];
    var rows = raw.map(function (r) {
      var next = {};
      Object.keys(r || {}).forEach(function (k) { next[k] = r[k]; });
      if (mode === "current" && next.bill) {
        var st = bankBillPaidStatus(next.bill, month);
        next.paid = st === "paid" || st === "paid_late";
      }
      if (mode === "historical" && next.bill && !next.paid_date) {
        var bag = next.bill.paid_current_month;
        next.paid_date = (bag && bag.paid_date) || next.bill.paid_date || "";
      }
      return next;
    });
    rows = bankSortByDue(rows, { today: today, mode: "inplace", month: month });
    if (!rows.length) return "";
    var items = rows.map(function (r) {
      var notes = r.bill ? bankBillNotesHtml(r.bill, month) : "";
      var meta = r.bill ? bankBillMeta(r.bill, month, opts.edits) : "";
      var paid = r.bill ? bankBillPaidStatus(r.bill, month) : "";
      var dueKey = bankSortDueKey(r, today, "inplace", month);
      var stamp = "";
      if (paid === "paid" || paid === "paid_late" || r.paid) stamp = "paid";
      else if (dueKey && today && dueKey < String(today).slice(0, 10)) stamp = "past";
      if (stamp) meta = meta ? meta + " \u00b7 " + stamp : stamp;
      var swatch = tier === "needs" ? "var(--mix-a)" : tier === "wants" ? "var(--mix-b)" : "var(--mix-c)";
      if (meta === "day \u2014") meta = "";
      return '<div class="mix-leg"' + (paid ? ' data-paid="' + bankEsc(paid) + '"' : "") + '><i style="background:' + swatch + '"></i>' +
        '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(r.name) + "</span>" + notes +
        (meta ? ' <span class="sub">' + bankMetaHtml(meta) + "</span>" : "") + "</span> " +
        '<span class="mix-leg-fig"><span class="mix-amt">' + bankMoney(r.amount) + "</span></span></div>";
    }).join("");
    return '<h2>' + bankTierLabel(tier) + '</h2><div class="card span">' +
      bankCapList('<div class="mix-legend">' + items + "</div>", rows.length, bankTierLabel(tier)) + "</div>";
  }).join("");
}

function bankTierSumsFromCats(snap, list) {
  var sums = { required: 0, needs: 0, wants: 0 };
  (list || []).forEach(function (c) {
    if (!c) return;
    var name = typeof c === "string" ? c : (c.name || c.category || "");
    name = String(name || "").trim();
    if (!name || bankSkipTierName(name, snap)) return;
    var n = bankNum(c.amount);
    if (n == null || !(n > 0)) return;
    var tier = bankResolveTier(name, snap, null, { category: name, name: name });
    if (tier !== "required" && tier !== "needs" && tier !== "wants") tier = "needs";
    sums[tier] += n;
  });
  return sums;
}

/* One status word for Budget, Current, and Historical. Budget's chip is lowercase. */
function bankLedgerStatusWord(status) {
  var text = status == null ? "" : String(status);
  if (!text || text === "Due" || text === "Unpaid" || text.indexOf("Unpaid") === 0) return "unpaid";
  if (text.indexOf("Paid late") === 0) return text.replace(/^Paid/, "paid");
  if (text === "Paid" || text.indexOf("Paid") === 0) return "paid";
  return text;
}

function bankLedgerFace(snap, name) {
  var budget = (snap && snap.budget) || {};
  var alias = bankSnapshotAliasFace(budget, name, "bills") || bankSnapshotAliasFace(budget, name, "categories") || "";
  var shown = bankBillDisplayName(alias || name);
  if (shown && shown === shown.toLowerCase() && /[a-z]/.test(shown)) {
    shown = shown.replace(/(^|\s)([a-z])/g, function (_, sp, ch) { return sp + ch.toUpperCase(); });
  }
  return shown;
}

function bankClosedOpening(snap, monthKey) {
  var key = bankMonthKey(monthKey);
  var bag = key ? bankActualsMap(snap)[key] : null;
  var n = null;
  if (bag && typeof bag === "object") {
    n = bankNum(bag.opening_balance);
    if (n == null) n = bankNum(bag.start_balance);
    if (n == null) n = bankNum(bag.start);
  }
  if (n != null) return n;
  var shot = bankSnapshotFor(snap, key);
  if (shot && typeof shot === "object") {
    n = bankNum(shot.opening_balance);
    if (n == null) n = bankNum(shot.start_balance);
    if (n == null) n = bankNum(shot.start);
  }
  return n;
}

function bankUnlistedPosted(snap, ym, todayIso, listed) {
  var sum = 0;
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  var seen = {};
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) !== "out") return;
      if (bankTruthyFlag(raw.one_off)) return;
      var when = String(raw.date || "").slice(0, 10);
      if (!when || bankMonthKey(when) !== bankMonthKey(ym)) return;
      if (todayIso && when >= todayIso) return;
      var name = raw.category || raw.desc || raw.name || "";
      if (name && listed[bankTierKey(name)]) return;
      var key = raw.tx_key || raw.tx_id || (when + "|" + name + "|" + raw.amount);
      if (seen[key]) return;
      seen[key] = true;
      var n = bankNum(raw.amount);
      if (n == null) return;
      sum += Math.abs(n);
    });
  });
  return bankRoundCents(sum);
}

function bankPayStatusText(row, ym, today, trustPaid) {
  var status = trustPaid === false ? "" : bankBillPaidStatus(row, ym);
  if (status === "paid_late") {
    var late = bankShortDate(row.paid_current_month && row.paid_current_month.paid_date);
    return late ? "Paid late \u00b7 " + late : "Paid late";
  }
  if (status === "paid" || status === "paid_late") return bankBillPaidCaption(row, ym);
  var day = row.typical_day != null ? row.typical_day : row.due_day;
  if (today && ym && day != null && bankMonthKey(ym) === bankMonthKey(today) && day < today.day) return "Unpaid";
  return "Due";
}

function bankDueDayPhrase(days) {
  var list = (days || []).filter(function (d) { return d != null && d !== ""; });
  if (!list.length) return "no due day";
  if (list.length === 1) return "due day " + list[0];
  return "due days " + list.join(" and ");
}

/* Inline due status. The date sits in the phrase. There is no status column. */
function bankDueInlineStatus(paid, late, paidDate, day, ymObj) {
  if (paid) {
    var when = bankShortDate(paidDate);
    if (late) return when ? "paid late " + when : "paid late";
    return when ? "paid " + when : "paid";
  }
  if (day != null && ymObj && ymObj.month >= 1 && ymObj.month <= 12) {
    return "due " + BANK_MONTHS[ymObj.month - 1] + " " + String(day);
  }
  return "due";
}

function bankScreenToday(snap, opts) {
  opts = opts || {};
  var et = null;
  if (opts.now) et = bankEtYmd(opts.now);
  if (!et) et = bankEtYmd(new Date().toISOString());
  return et;
}

function bankCategoryActual(bag, name) {
  if (!bag || typeof bag !== "object") return null;
  var by = bag.by_category;
  if (!by || typeof by !== "object" || Array.isArray(by)) return null;
  var hit = null;
  Object.keys(by).forEach(function (k) {
    if (hit != null) return;
    if (bankNormKey(k) === bankNormKey(name) || bankBillKey(k) === bankBillKey(name)) hit = bankNum(by[k]);
  });
  return hit;
}

function bankDueIsPaid(snap, name, ym, mode, statusText) {
  var month = bankMonthKey(ym);
  if (bankFindMonthDebit(snap, name, month)) return true;
  if (statusText && statusText !== "Due" && statusText !== "Unpaid") return true;
  if (mode === "historical") {
    var spent = bankCategoryActual(bankActualsMap(snap)[month], name);
    if (spent != null && spent > 0) return true;
  }
  return false;
}

function bankRoundCents(n) {
  var v = bankNum(n);
  if (v == null) return 0;
  return Math.round((v + (v < 0 ? -1e-9 : 1e-9)) * 100) / 100;
}

function bankFundOpenAmount(acct) {
  if (!acct) return null;
  if (acct.onFirst != null) return acct.onFirst;
  if (acct.start != null) return acct.start;
  return null;
}

function bankCombinedBooks(snap, opts) {
  opts = opts || {};
  var budget = snap && snap.budget ? snap.budget : (snap || {});
  var view = snap && snap.budget ? snap : { budget: budget };
  var monthKey = opts.monthKey || opts.month || "";
  var window = bankFundingWindow(view, monthKey);
  var mirror = view.current && view.current.accounts_balance_on_first;
  var accounts = bankFundingAccounts(budget, { window: window, mirror: mirror });
  var start = 0;
  var startAny = false;
  var inn = 0;
  var out = 0;
  var end = 0;
  var endAny = false;
  accounts.forEach(function (acct) {
    var open = bankFundOpenAmount(acct);
    if (open != null) {
      start += open;
      startAny = true;
    }
    inn += acct.ins || 0;
    out += acct.outs || 0;
    if (acct.end != null) {
      end += acct.end;
      endAny = true;
    }
  });
  if (startAny) {
    var flowEnd = start + inn - out;
    if (endAny) {
      var gap = end - flowEnd;
      if (gap > 0.004) inn += gap;
      else if (gap < -0.004) out += -gap;
    } else {
      end = flowEnd;
      endAny = true;
    }
  }
  var today = opts.today || "";
  if (!today && opts.now) {
    var et = bankEtYmd(opts.now);
    if (et) today = bankDateKey(et.year, et.month, et.day);
  }
  if (!today) today = bankTodayIso(view, opts);
  var dates = [];
  accounts.forEach(function (acct) {
    (acct.rows || []).forEach(function (row) {
      var day = bankDayKey(row && row.date);
      if (day && dates.indexOf(day) < 0) dates.push(day);
    });
  });
  dates.sort();
  var worst = startAny ? start : null;
  var firstShort = "";
  dates.forEach(function (day) {
    var bal = 0;
    var any = false;
    accounts.forEach(function (acct) {
      var b = bankFundingBalanceOn(acct, day);
      if (b == null) return;
      bal += b;
      any = true;
    });
    if (!any) return;
    if (bal < -0.0001 && !firstShort) firstShort = day;
    if (worst == null || bal < worst) worst = bal;
  });
  var leftNow = null;
  if (today) {
    var sum = 0;
    var anyLeft = false;
    accounts.forEach(function (acct) {
      var b = bankFundingBalanceOn(acct, today);
      if (b == null) return;
      sum += b;
      anyLeft = true;
    });
    if (anyLeft) leftNow = sum;
  }
  if (leftNow == null && startAny) leftNow = start;
  var shortBy = worst != null && worst < -0.0001 ? Math.abs(worst) : 0;
  return {
    accounts: accounts,
    start: startAny ? bankRoundCents(start) : null,
    inn: bankRoundCents(inn),
    out: bankRoundCents(out),
    leftNow: leftNow == null ? null : bankRoundCents(leftNow),
    end: (endAny || startAny) ? bankRoundCents(end) : null,
    shortBy: shortBy > 0 ? bankRoundCents(shortBy) : 0,
    shortDate: shortBy > 0 ? firstShort : ""
  };
}

function bankMixMore(summary, body) {
  return '<details class="fills-more"><summary><span class="fills-sum">' + bankEsc(summary) + "</span> " +
    '<span class="fills-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
    '<span class="fills-dot">\u00b7 </span><span class="fills-lab-show">Show</span> <span class="fills-lab-hide">Hide</span></span></summary>' +
    body + "</details>";
}

function bankFundMoveNotes(snap) {
  var moves = bankShortMoves(snap, "").filter(function (move) { return move && move.amount > 0; });
  moves.sort(function (a, b) {
    if (a.date === b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : 1;
  });
  var seen = {};
  var lines = [];
  moves.forEach(function (move) {
    var face = bankAccountTag(move.toAcct || { last4: move.last4 });
    if (!face || face === "account TBD") face = move.to || "account TBD";
    var pair = (move.from || "") + "\u2192" + face;
    if (seen[pair]) return;
    seen[pair] = true;
    var when = move.date ? (bankShortDate(move.date) || move.date) : "";
    lines.push("Move " + bankMoney(move.amount) + " to " + face + (when ? " by " + when : ""));
  });
  return lines;
}

function bankPeriodSlices(start, end) {
  var slices = [];
  var cursor = start;
  var guard = 0;
  while (cursor && end && cursor < end && guard < 8) {
    guard += 1;
    var p = String(cursor).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!p) break;
    var y = Number(p[1]);
    var m = Number(p[2]);
    var dim = bankMonthDim(y, m);
    var monthEnd = bankDateKey(y, m, dim);
    var next = bankAddDays(monthEnd, 1);
    var sliceEnd = next && next < end ? next : end;
    var days = 0;
    var walk = cursor;
    var inner = 0;
    while (walk && walk < sliceEnd && inner < 40) {
      days += 1;
      walk = bankAddDays(walk, 1);
      inner += 1;
    }
    slices.push({ ym: bankYm(y, m), days: days, dim: dim });
    cursor = sliceEnd;
  }
  return slices;
}

function bankMonthTierPlan(snap, ym, key, opts) {
  var keyMonth = bankMonthKey(ym);
  var screen = bankMonthKey(bankScreenMonth(snap, opts || {}));
  var shots = snap && snap.budget && snap.budget.snapshots;
  var shot = shots && keyMonth ? shots[keyMonth] : null;
  if (keyMonth && screen && keyMonth !== screen) {
    if (!shot) return 0;
    var picked = bankSnapshotPlan(shot, key);
    return picked == null ? 0 : picked;
  }
  var fig = bankPlanNumbers(snap, bankParseYm(keyMonth) || ym, null);
  var n = fig ? fig[key] : 0;
  return n == null ? 0 : n;
}

function bankProratePlan(snap, start, end, key, opts) {
  var total = 0;
  bankPeriodSlices(start, end).forEach(function (slice) {
    var plan = bankMonthTierPlan(snap, slice.ym, key, opts);
    if (!(plan > 0) || !(slice.dim > 0)) return;
    total += plan * (slice.days / slice.dim);
  });
  return bankRoundCents(total);
}

function bankNeedsSpentInPeriod(snap, start, end, today, started) {
  if (!started || !start || !end) return 0;
  var until = today && today < end ? today : end;
  if (!until || until < start) return 0;
  var sum = 0;
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  var seen = {};
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw) return;
      var key = raw.tx_key || raw.tx_id || (String(raw.date || "") + "|" + (raw.desc || "") + "|" + raw.amount);
      if (seen[key]) return;
      seen[key] = true;
      if (bankFlowSide(raw) !== "out") return;
      var when = String(raw.date || "").slice(0, 10);
      if (!when || when < start || when > until || when >= end) return;
      var name = raw.category || raw.desc || "";
      var tier = bankResolveTier(name, snap, null, { category: raw.category || name, name: name, merchant: raw.desc || "" });
      if (tier !== "needs") return;
      var n = bankNum(raw.amount);
      if (n == null) return;
      sum += Math.abs(n);
    });
  });
  return bankRoundCents(sum);
}

function bankPayPeriod(snap, opts) {
  opts = opts || {};
  var today = bankTodayIso(snap, opts);
  var ym = bankScreenMonth(snap, opts);
  var events = bankCollectPayEvents(snap, ym).filter(function (ev) { return ev && ev.date; });
  events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var seen = {};
  events = events.filter(function (ev) {
    var k = ev.date + "|" + (ev.name || "") + "|" + (ev.amount || "");
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
  if (!events.length) return null;
  var startEv = null;
  var endDate = "";
  var started = false;
  if (today) {
    var prev = null;
    var next = null;
    events.forEach(function (ev) {
      if (ev.date <= today) prev = ev;
      if (!next && ev.date > today) next = ev;
    });
    if (prev && next && prev.date < next.date) {
      startEv = prev;
      endDate = next.date;
      started = true;
    }
  }
  if (!startEv) {
    events.forEach(function (ev) {
      if (!startEv && (!today || ev.date >= today)) startEv = ev;
    });
    if (!startEv) startEv = events[events.length - 1];
    events.forEach(function (ev) {
      if (!endDate && ev.date > startEv.date) endDate = ev.date;
    });
    started = !!(today && endDate && today >= startEv.date && today < endDate);
  }
  if (!endDate) endDate = bankAddDays(startEv.date, 14);
  return { focus: startEv, end: endDate, started: started, today: today || "" };
}

function bankPeriodBillRows(snap, opts, start, end) {
  var rows = [];
  var months = [];
  bankPeriodSlices(start, end).forEach(function (slice) {
    if (months.indexOf(slice.ym) < 0) months.push(slice.ym);
  });
  var ctx = bankKindContext(snap);
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || b.set_aside || bankIsSetAside(b)) return;
    months.forEach(function (month) {
      if (bankBillRetired(b, month)) return;
      if (bankResolveTier(b.name, snap, ctx, b) !== "required") return;
      var ym = bankParseYm(month);
      if (!ym) return;
      var trust = bankTrustPaidStatus(snap, b, month, opts);
      var paid = trust ? bankBillPaidStatus(b, month) : "";
      if (paid === "paid" || paid === "paid_late") return;
      var part = trust ? bankBillPartial(b, month) : null;
      var days = part ? bankPartialOpenDays(b, ym, part) : bankBillDueDays(b, ym);
      days.forEach(function (day) {
        var due = bankDateKey(ym.year, ym.month, day);
        if (!due || due < start || due >= end) return;
        var amount = bankBillAmountForMonth(b, month);
        if (bankIsTwiceBill(b)) {
          var plan = bankBillMonthPlan(b, month, opts && opts.edits);
          var times = bankBillTimes(b) || days.length || 1;
          if (plan != null && times > 0) amount = plan / times;
        }
        if (amount == null) amount = bankBillLineAmount(b, month, opts && opts.edits);
        rows.push({
          name: bankBillDisplayName(b.name, b.display_label),
          due: due,
          amount: amount
        });
      });
    });
  });
  rows.sort(function (a, b) {
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
  return rows;
}

function bankPostedOutAmount(snap, bill, ym) {
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  var found = null;
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (found != null || !raw || bankFlowSide(raw) !== "out") return;
      var when = String(raw.date || "").slice(0, 10);
      if (bankMonthKey(when) !== bankMonthKey(ym)) return;
      var blob = raw.category || raw.desc || raw.name || "";
      if (bankBillKey(blob) !== bankBillKey(bill.name) && !bankNamesMatch(blob, bill.name) && !bankNamesMatch(bill.name, blob)) return;
      var n = bankNum(raw.amount);
      if (n == null) return;
      found = Math.abs(n);
    });
  });
  return found;
}

function bankUndatedPlanAmount(snap, ym, edits, bills, subs) {
  var sum = 0;
  (bills || []).forEach(function (b) {
    if (!b || bankBillRetired(b, ym) || !bankBillCounted(b)) return;
    var days = bankBillDueDays(b, ym);
    var aside = !!(b.set_aside || bankIsSetAside(b));
    if (!aside && days.length) return;
    var n = aside || bankIsTwiceBill(b) ? bankBillMonthPlan(b, ym, edits) : bankBillLineAmount(b, ym, edits);
    if (n > 0) sum += n;
  });
  (subs || []).forEach(function (s) {
    if (!s || s.typical_day != null) return;
    if (s.amount > 0) sum += s.amount;
  });
  var budget = (snap && snap.budget) || {};
  var planned = budget.planned_by_category || {};
  var ctx = bankKindContext(snap);
  Object.keys(planned).forEach(function (name) {
    if (bankIsGroupLimitKey(name)) return;
    if (bankItemIsBillName(name, ctx.bills) || bankIsSubName(name, snap)) return;
    var tier = bankResolveTier(name, snap, ctx, null);
    if (tier !== "needs" && tier !== "wants") return;
    var n = bankNum(planned[name]);
    if (n > 0) sum += n;
  });
  return bankRoundCents(sum);
}

function bankDueHeading(title) {
  return '<p class="mix-hint">' + bankEsc(title) + "</p>";
}

function bankCashLedgerHtml(snap, ym, edits, subs, bills, opts) {
  opts = opts || {};
  var mode = opts.mode || "plan";
  var tierCtx = bankKindContext(snap);
  var today = bankScreenToday(snap, opts);
  var todayIso = today ? bankDateKey(today.year, today.month, today.day) : "";
  var monthKey = bankMonthKey(ym);
  var books = bankCombinedBooks(snap, { month: monthKey, monthKey: monthKey, now: opts.now, today: todayIso });
  var start = books.start != null ? books.start : 0;
  var fundingNames = {};
  (books.accounts || []).forEach(function (acct) {
    (acct.rows || []).forEach(function (row) {
      if (!row || row.kind === "in" || !row.name) return;
      fundingNames[bankTierKey(row.name)] = true;
      fundingNames[bankBillKey(row.name)] = true;
    });
  });
  function explicitTierPlan(key) {
    var shot = monthKey ? bankSnapshotFor(snap, monthKey) : null;
    var tiers = shot && bankSnapshotHasPrintedTiers(shot.tiers) ? shot.tiers : ((snap && snap.budget && snap.budget.tiers) || {});
    var printed = key === "required"
      ? (tiers.required_plan != null ? tiers.required_plan : tiers.required_total)
      : key === "needs"
        ? (tiers.needs_plan != null ? tiers.needs_plan : tiers.needs)
        : (tiers.wants_plan != null ? tiers.wants_plan : tiers.wants);
    return bankNum(printed);
  }
  var rows = [];
  function pushBillRow(b, due, day, phrase, marker, partial, counted, per, paidFlag, posted, planAmt) {
    var face = bankLedgerFace(snap, bankBillDisplayName(b.name, b.display_label));
    var key = bankTierKey(face) + "|" + (due || "") + "|out";
    if (!counted) key = "nc|" + bankTierKey(face);
    if (seenRow[key]) return;
    seenRow[key] = true;
    rows.push({
      date: due || "9998-12-31",
      name: face,
      amount: per,
      kind: "out",
      phrase: phrase,
      marker: marker,
      chip: partial ? bankPartialChip(partial) : "",
      tier: ledgerTier(b),
      counted: counted,
      pending: per == null,
      undated: !due,
      paid: !!paidFlag,
      posted: !!posted,
      actualDiff: posted && planAmt != null && per != null && Math.abs(per - planAmt) > 0.004
    });
  }
  function ledgerTier(row) {
    var explicit = bankTierWord(row && row.tier);
    if (explicit === "needs" || explicit === "wants") return explicit;
    return bankResolveTier(row && row.name, snap, tierCtx, row);
  }
  var seenRow = {};
  (bills || []).forEach(function (b) {
    if (!b || bankBillRetired(b, ym)) return;
    var trust = bankTrustPaidStatus(snap, b, ym, opts);
    var status = bankPayStatusText(b, ym, today, trust);
    var partial = trust ? bankBillPartial(b, ym) : null;
    var dueDays = partial ? bankPartialOpenDays(b, ym, partial) : bankBillDueDays(b, ym);
    var counted = bankBillCounted(b);
    var paidFlag = trust && (status === "Paid" || (status && status.indexOf("Paid") === 0) || bankBillPaidStatus(b, ym) === "paid" || bankBillPaidStatus(b, ym) === "paid_late");
    var planAmt = bankBillLineAmount(b, ym, edits);
    var actual = mode === "current" ? bankPostedOutAmount(snap, b, ym) : null;
    if (mode === "historical") {
      if (!counted) return;
      var actualBag = bankActualsMap(snap)[monthKey];
      var spentActual = null;
      [b.name, b.display_label, bankLedgerFace(snap, bankBillDisplayName(b.name, b.display_label))].forEach(function (nm) {
        if (spentActual != null || !nm) return;
        spentActual = bankCategoryActual(actualBag, nm);
      });
      if (!(spentActual > 0)) return;
      actual = spentActual;
      paidFlag = true;
    }
    var per = mode === "historical" ? actual : (actual != null ? actual : planAmt);
    if (actual == null && (bankIsTwiceBill(b) || dueDays.length > 1)) {
      var plan = bankBillMonthPlan(b, ym, edits);
      var times = bankBillTimes(b) || dueDays.length || 1;
      if (plan != null && times > 0) per = plan / times;
      else if (per != null && times > 1) per = per / times;
    }
    var ymObj = bankParseYm(monthKey);
    function phraseFor(day) {
      var word = bankLedgerStatusWord(status);
      var paid = paidFlag || word === "paid" || (status && status.indexOf("Paid") === 0);
      if (mode === "historical") {
        var spentHit = bankCategoryActual(bankActualsMap(snap)[monthKey], b.name);
        if (spentHit != null && spentHit > 0) paid = true;
      }
      var late = !!(status && status.indexOf("Paid late") === 0);
      var paidOn = (b.paid_current_month && b.paid_current_month.paid_date) || b.paid_date || "";
      var phrase = "";
      if (!counted) phrase = "not counted";
      else phrase = bankDueInlineStatus(paid, late, paidOn, day, ymObj);
      if (b.cancelled_later) phrase = (phrase ? phrase + " \u00b7 " : "") + "cancelled later";
      if (phrase === "day \u2014" || phrase === "due day \u2014") phrase = "";
      return { phrase: phrase, marker: "" };
    }
    if (!dueDays.length) {
      var bare = phraseFor(null);
      pushBillRow(b, "", null, bare.phrase, bare.marker, partial, counted, per, paidFlag, actual != null, planAmt);
      return;
    }
    dueDays.forEach(function (day) {
      var due = ymObj ? bankDateKey(ymObj.year, ymObj.month, day) : "";
      var bits = phraseFor(day);
      pushBillRow(b, due, day, bits.phrase, bits.marker, partial, counted, per, paidFlag, actual != null, planAmt);
    });
  });
  bankMerchantRecurringRows(snap, bills).forEach(function (extra) {
    var name = bankBillDisplayName(extra.name || extra.label || extra.merchant || "Recurring");
    var amount = bankNum(extra.amount != null ? extra.amount : extra.typical_amount);
    var tier = bankResolveTier(name, snap, tierCtx, extra);
    var inFunding = !!(fundingNames[bankTierKey(name)] || fundingNames[bankBillKey(name)]);
    var tierPlan = explicitTierPlan(tier);
    /* A printed funding row already carries this merchant. Leave it in the tier remainder. */
    if (inFunding && tierPlan != null && tierPlan > 0) return;
    var day = bankDay(extra.typical_day != null ? extra.typical_day : extra.due_day);
    var ymObj = bankParseYm(monthKey);
    var due = day != null && ymObj ? bankDateKey(ymObj.year, ymObj.month, day) : "";
    var key = bankTierKey(name) + "|" + (due || "") + "|out";
    if (seenRow[key]) return;
    seenRow[key] = true;
    rows.push({
      date: due || "9998-12-31",
      name: name,
      amount: amount,
      kind: "out",
      phrase: day != null ? bankDueInlineStatus(false, false, "", day, ymObj) : "",
      marker: "",
      chip: "",
      tier: tier,
      counted: true,
      pending: amount == null,
      undated: !due
    });
  });
  (subs || []).forEach(function (s) {
    if (!s) return;
    if (mode !== "historical" && s.typical_day == null) return;
    var subFace = bankLedgerFace(snap, bankBillDisplayName(s.name));
    if (mode === "historical") {
      var subBag = bankActualsMap(snap)[monthKey];
      var subActual = null;
      [s.name, subFace].forEach(function (nm) {
        if (subActual != null || !nm) return;
        subActual = bankCategoryActual(subBag, nm);
      });
      if (!(subActual > 0)) return;
      var subYm = bankParseYm(monthKey);
      var subDate = s.typical_day == null || !subYm ? "" : bankDateKey(subYm.year, subYm.month, s.typical_day);
      rows.push({
        date: subDate,
        name: subFace,
        marker: "",
        amount: subActual,
        kind: "out",
        phrase: "Subscription \u00b7 " + bankDueInlineStatus(true, false, subDate, s.typical_day, subYm),
        chip: "",
        tier: bankResolveTier(s.name, snap, tierCtx, s),
        counted: true,
        pending: false,
        posted: true,
        paid: true
      });
      return;
    }
    var ymObj = bankParseYm(monthKey);
    var due = ymObj ? bankDateKey(ymObj.year, ymObj.month, s.typical_day) : "";
    var trust = bankTrustPaidStatus(snap, s, ym, opts);
    var status = bankPayStatusText(s, ym, today, trust);
    var subWord = bankLedgerStatusWord(status);
    var subPaid = (trust && bankDueIsPaid(snap, s.name, ym, mode, status)) || subWord === "paid";
    var subLate = !!(status && status.indexOf("Paid late") === 0);
    var subPaidOn = (s.paid_current_month && s.paid_current_month.paid_date) || s.paid_date || "";
    var phrase = bankDueInlineStatus(subPaid, subLate, subPaidOn, s.typical_day, ymObj);
    rows.push({
      date: due || "9999-99-99",
      name: subFace,
      marker: "",
      amount: s.amount,
      kind: "out",
      phrase: "Subscription \u00b7 " + phrase,
      chip: "",
      tier: bankResolveTier(s.name, snap, tierCtx, s),
      counted: bankBillCounted(s),
      pending: s.amount == null
    });
  });
  bankLedgerDeposits(snap, bankParseYm(monthKey)).forEach(function (ev) {
    rows.push({
      date: ev.date,
      name: ev.kind || ev.name || "Deposit",
      amount: ev.amount,
      kind: "in",
      phrase: bankShortDate(ev.date) || ev.date,
      marker: "",
      chip: "",
      counted: true,
      pending: false
    });
  });
  var closed = mode === "historical";
  var opening = closed ? bankClosedOpening(snap, monthKey) : null;
  var showBalance = !closed || opening != null;
  if (closed) {
    rows = rows.filter(function (row) { return row.kind !== "in"; });
    var actualBag = bankActualsMap(snap)[monthKey] || {};
    var actualDeps = Array.isArray(actualBag.deposits) ? actualBag.deposits : [];
    if (!actualDeps.length && bankNum(actualBag.income_received) > 0) {
      actualDeps = [{ name: "Deposit", amount: actualBag.income_received, date: monthKey + "-01" }];
    }
    actualDeps.forEach(function (dep) {
      if (!dep) return;
      var amount = bankNum(dep.amount);
      if (!(amount > 0)) return;
      var when = bankCopyDate(dep.date || dep.on) || "";
      rows.push({
        date: when || (monthKey + "-01"),
        name: bankLedgerFace(snap, dep.name || dep.kind || "Deposit"),
        amount: amount,
        kind: "in",
        phrase: when ? ("paid " + (bankShortDate(when) || when)) : "paid",
        marker: "",
        chip: "",
        counted: true,
        pending: false,
        posted: true
      });
    });
    if (opening != null) start = opening;
  }
  rows.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "in" ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
  var liveMonth = !closed && todayIso && monthKey === String(todayIso).slice(0, 7);
  if (liveMonth) {
    rows = rows.filter(function (row) {
      if (!row || row.paid || row.notFound) return false;
      if (row.undated || !row.date || String(row.date).indexOf("999") === 0) return false;
      return row.date >= todayIso;
    });
  }
  var anchor = null;
  if (closed) {
    if (opening != null) anchor = opening;
  } else if (liveMonth && books.leftNow != null) anchor = books.leftNow;
  else if (books.start != null) anchor = books.start;
  var balance = anchor;
  var datedNet = 0;
  var needsListed = 0;
  var wantsListed = 0;
  function applyRow(row) {
    if (balance == null) {
      row.left = null;
      return;
    }
    if (!row.counted || row.pending || row.amount == null) {
      row.left = balance;
      return;
    }
    var signed = row.kind === "out" ? -row.amount : row.amount;
    datedNet += signed;
    balance = bankRoundCents(balance + signed);
    row.left = balance;
    if (!closed && row.kind === "out" && !row.rollup && row.tier === "needs") needsListed += row.amount;
    if (!closed && row.kind === "out" && !row.rollup && row.tier === "wants") wantsListed += row.amount;
  }
  var sameDay = [];
  var afterToday = [];
  if (liveMonth && todayIso) {
    rows.forEach(function (row) {
      if (row.date === todayIso) sameDay.push(row);
      else afterToday.push(row);
    });
  } else afterToday = rows.slice();
  var bodyRows = [];
  if (liveMonth && todayIso) {
    bodyRows.push({
      date: todayIso,
      name: "Today",
      amount: null,
      kind: "",
      phrase: "",
      marker: "",
      chip: "",
      counted: true,
      pending: true,
      today: true
    });
  }
  bodyRows = bodyRows.concat(sameDay, afterToday);
  bodyRows.forEach(applyRow);
  if (!closed) {
    var fig = bankPlanNumbers(snap, bankParseYm(monthKey), edits);
    var needsPlan = bankPrintedTierPlan(snap, monthKey, "needs");
    var wantsPlan = bankPrintedTierPlan(snap, monthKey, "wants");
    if (needsPlan == null) needsPlan = fig && fig.needs != null ? fig.needs : 0;
    if (wantsPlan == null) wantsPlan = fig && fig.wants != null ? fig.wants : 0;
    var spentTiers = bankTierSpend(snap, monthKey) || {};
    function tierRemain(plan, spent, listed) {
      return bankRoundCents(Math.max(0, (plan || 0) - (spent || 0) - (listed || 0)));
    }
    var listedRequired = {};
    bodyRows.forEach(function (row) {
      if (!row || row.kind !== "out" || row.rollup || row.tier !== "required" || row.amount == null) return;
      listedRequired[bankTierKey(row.name)] = true;
      listedRequired[bankBillKey(row.name)] = true;
    });
    function unlistedRequiredRemain() {
      var sum = 0;
      function paidMtd(name) {
        var paid = bankCategorySpendActual(snap, name, monthKey) || 0;
        (books.accounts || []).forEach(function (acct) {
          (acct.rows || []).forEach(function (row) {
            if (!row || row.kind === "in" || !(row.amount > 0)) return;
            var day = bankDayKey(row.date);
            if (todayIso && day && day > todayIso) return;
            if (bankTierKey(row.name) !== bankTierKey(name) && bankBillKey(row.name) !== bankBillKey(name)) return;
            if (row.amount > paid) paid = row.amount;
          });
        });
        return paid;
      }
      function take(name, plan, row) {
        if (!name || !(plan > 0)) return;
        var face = bankLedgerFace(snap, bankBillDisplayName(name, row && row.display_label));
        if (listedRequired[bankTierKey(name)] || listedRequired[bankTierKey(face)] || listedRequired[bankBillKey(name)]) return;
        var paid = paidMtd(name);
        if (face && face !== name) paid = Math.max(paid, paidMtd(face));
        var status = row && row.paid_current_month ? bankBillPaidStatus(row, ym) : "";
        if (row && bankTrustPaidStatus(snap, row, ym, opts) && (status === "paid" || status === "paid_late") && plan > paid) paid = plan;
        sum += Math.max(0, plan - (paid || 0));
      }
      (bills || []).forEach(function (b) {
        if (!b || bankBillRetired(b, ym) || !bankBillCounted(b) || ledgerTier(b) !== "required") return;
        var plan = bankIsSetAside(b) || bankIsTwiceBill(b) ? bankBillMonthPlan(b, ym, edits) : bankBillLineAmount(b, ym, edits);
        take(b.name, plan, b);
      });
      bankMerchantRecurringRows(snap, bills).forEach(function (extra) {
        var name = extra.name || extra.label || extra.merchant || "";
        if (bankResolveTier(name, snap, tierCtx, extra) !== "required") return;
        take(name, bankNum(extra.amount != null ? extra.amount : extra.typical_amount), extra);
      });
      return bankRoundCents(sum);
    }
    [["Required", unlistedRequiredRemain()], ["Needs", tierRemain(needsPlan, spentTiers.needs, needsListed)], ["Wants", tierRemain(wantsPlan, spentTiers.wants, wantsListed)]].forEach(function (pair) {
      var remain = pair[1];
      if (!(remain > 0.004)) return;
      if (balance != null) balance = bankRoundCents(balance - remain);
      bodyRows.push({
        date: "",
        name: "Remaining " + pair[0],
        amount: remain,
        kind: "out",
        phrase: "",
        marker: "",
        chip: "",
        counted: true,
        pending: false,
        left: balance
      });
    });
    bodyRows.push({
      date: "",
      name: "Month-end",
      amount: null,
      kind: "",
      phrase: "",
      marker: "",
      chip: "",
      counted: true,
      pending: true,
      left: balance,
      closing: true
    });
  } else if (showBalance) {
    var postedRows = bodyRows.filter(function (row) {
      return row && row.amount != null && !row.notFound && !row.closing;
    });
    if (!postedRows.length) bodyRows = [];
    else bodyRows.push({
      date: "",
      name: "Month-end",
      amount: null,
      kind: "",
      phrase: "",
      marker: "",
      chip: "",
      counted: true,
      pending: true,
      left: balance,
      closing: true
    });
  } else {
    bodyRows.forEach(function (row) { row.left = null; });
  }
  var listTitle = opts.listTitle || "Due this month";
  if (!bodyRows.length) {
    var emptyLine = closed ? "Nothing posted." : "Nothing due in this month.";
    return '<section class="bank-due-month">' + bankDueHeading(listTitle) + '<p class="bank-empty">' + emptyLine + "</p></section>";
  }
  var trs = bodyRows.map(function (row) {
    var metaBits = [];
    if (row.phrase && row.phrase !== "day \u2014") metaBits.push(row.phrase);
    if (row.actualDiff) metaBits.push("actual");
    if (row.today && !closed) metaBits.push("today");
    if (row.tier && !opts.hideTier) {
      var tierWord = bankTierLabel(row.tier);
      if (tierWord) metaBits.push(tierWord);
    }
    var meta = metaBits.length ? '<span class="sub">' + bankMetaHtml(metaBits.join(" \u00b7 ")) + "</span>" : "";
    var extras = [];
    if (row.marker) extras.push(row.marker);
    if (row.chip) extras.push(row.chip);
    var amt = row.closing || row.pending ? '<td class="num"><span class="sub">\u2014</span></td>' : (function () {
      var flow = bankFundSigned(row.amount, row.kind === "in" ? "in" : "out");
      return '<td class="num ' + flow.cls + '">' + bankEsc(flow.text) + "</td>";
    })();
    var leftCls = row.left < -0.0001 ? " num tone-stop" : " num";
    var todayAttr = row.today && !closed ? ' data-bank-today="1"' : "";
    var rowCls = row.notFound ? ' class="tone-flat"' : "";
    var leftCell = showBalance && !row.notFound ? '<td class="' + leftCls.trim() + '">' + bankEsc(bankMoney(row.left)) + "</td>" : (showBalance ? '<td class="num"><span class="sub">\u2014</span></td>' : "");
    return "<tr" + todayAttr + rowCls + "><td><span class=\"sym\">" + bankEsc(row.name) + "</span>" +
      (meta ? " " + meta : "") + (extras.length ? " " + extras.join(" ") : "") + "</td>" + amt +
      leftCell + "</tr>";
  }).join("");
  var head = showBalance
    ? "<tr><th>Item</th><th class=\"num\">Amount</th><th class=\"num\">Left after</th></tr>"
    : "<tr><th>Item</th><th class=\"num\">Amount</th></tr>";
  var table = '<table class="book"><thead>' + head + "</thead><tbody>" + trs + "</tbody></table>";
  return '<section class="bank-due-month">' + bankDueHeading(listTitle) +
    bankCapList(table, bodyRows.length, listTitle) + "</section>";
}

function bankMerchantRecurringRows(snap, bills) {
  var budget = (snap && snap.budget) || {};
  var tiers = budget.tiers && typeof budget.tiers === "object" ? budget.tiers : {};
  var lists = [];
  if (Array.isArray(tiers.merchant_recurring)) lists = lists.concat(tiers.merchant_recurring);
  if (Array.isArray(budget.merchant_recurring)) lists = lists.concat(budget.merchant_recurring);
  var seen = {};
  (bills || []).forEach(function (b) {
    if (!b || !b.name) return;
    seen[bankTierKey(bankBillDisplayName(b.name, b.display_label))] = true;
    seen[bankTierKey(b.name)] = true;
  });
  return lists.filter(function (row) {
    if (!row || typeof row !== "object") return false;
    var name = bankBillDisplayName(row.name || row.label || row.merchant || "");
    if (!name) return false;
    var key = bankTierKey(name);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function bankDueMonthHtml(snap, ym, edits, subs, bills, opts) {
  opts = opts || {};
  var mode = opts.mode || "plan";
  var ctx = bankKindContext(snap);
  var today = bankScreenToday(snap, opts);
  var todayIso = today ? bankDateKey(today.year, today.month, today.day) : "";
  var monthObj = bankParseYm(bankMonthKey(ym)) || (ym && ym.year ? ym : null);
  var sortMode = mode === "historical" ? "historical" : (mode === "current" ? "current" : "plan");
  var groups = { required: [], needs: [], wants: [] };
  function push(tier, row) {
    if (!groups[tier]) tier = "wants";
    groups[tier].push(row);
  }
  (bills || []).forEach(function (b) {
    if (bankBillRetired(b, ym)) return;
    var tier = bankResolveTier(b.name, snap, ctx, b);
    if (tier !== "required" && !bankItemIsBillName(b.name, ctx.bills)) return;
    if (tier !== "required" && tier !== "needs" && tier !== "wants") return;
    if (tier !== "required" && bankBillCounted(b)) return;
    var amount = bankIsTwiceBill(b) || bankIsSetAside(b) ? bankBillMonthPlan(b, ym) : bankBillLineAmount(b, ym, edits);
    var trust = bankTrustPaidStatus(snap, b, ym, opts);
    var partial = trust ? bankBillPartial(b, ym) : null;
    var dueDays = bankBillDueDays(b, ym);
    if (partial) {
      var openDays = bankPartialOpenDays(b, ym, partial);
      if (openDays.length) dueDays = openDays;
    }
    var status = bankPayStatusText(b, ym, today, trust);
    push(tier === "required" || !bankBillCounted(b) ? (groups[tier] ? tier : "required") : "required", {
      name: b.name,
      label: bankBillDisplayName(b.name, b.display_label),
      amount: amount == null ? "" : bankMoney(amount),
      dayText: bankDueDayPhrase(dueDays),
      partialChip: partial ? bankPartialChip(partial) : "",
      status: status,
      note: "Bill",
      bill: b,
      set_aside: !!(b.set_aside || bankIsSetAside(b)),
      counted: bankBillCounted(b),
      cancelledLater: !!b.cancelled_later,
      paid: mode === "current" && bankDueIsPaid(snap, b.name, ym, mode, status),
      paid_date: (b.paid_current_month && b.paid_current_month.paid_date) || b.paid_date || ""
    });
  });
  (subs || []).forEach(function (s) {
    var tier = bankResolveTier(s.name, snap, ctx, s);
    if (!groups[tier]) tier = "wants";
    var subDays = s.typical_day == null ? [] : [s.typical_day];
    var subTrust = bankTrustPaidStatus(snap, s, ym, opts);
    var subPartial = subTrust ? bankBillPartial(s, ym) : null;
    if (subPartial) {
      var subOpen = bankPartialOpenDays(s, ym, subPartial);
      if (subOpen.length) subDays = subOpen;
    }
    var status = bankPayStatusText(s, ym, today, subTrust);
    push(tier, {
      name: s.name,
      label: bankBillDisplayName(s.name),
      amount: s.amount == null ? "" : bankMoney(s.amount),
      days: subDays,
      typical_day: s.typical_day,
      dayText: bankDueDayPhrase(subDays),
      partialChip: subPartial ? bankPartialChip(subPartial) : "",
      status: status,
      note: "Subscription",
      set_aside: !!(s.set_aside || bankIsSetAside(s)),
      counted: bankBillCounted(s),
      paid: mode === "current" && bankDueIsPaid(snap, s.name, ym, mode, status),
      paid_date: (s.paid_current_month && s.paid_current_month.paid_date) || ""
    });
  });
  return bankCashLedgerHtml(snap, ym, edits, subs, bills, opts);
}

function bankRoundUp5(n) {
  if (!(n > 0)) return 0;
  return Math.ceil(n / 5) * 5;
}

function bankAccountTag(acct) {
  if (acct == null || acct === "") return "account TBD";
  if (typeof acct === "string") {
    var text = String(acct).trim();
    return text || "account TBD";
  }
  if (typeof acct !== "object") return "account TBD";
  var nick = acct.nickname == null ? "" : String(acct.nickname).trim();
  if (!nick && acct.name != null) nick = String(acct.name).trim();
  var last = bankAccountMask(acct.last4 != null && acct.last4 !== "" ? acct.last4 : acct.last_4);
  if (nick && last) return nick + " " + last;
  if (nick) return nick;
  if (last) return last;
  return bankAccountFace(acct);
}

function bankAccountBits(acct) {
  var nick = "";
  var last = "";
  if (acct && typeof acct === "object") {
    nick = String(acct.nickname || acct.name || acct.label || "").trim();
    last = bankAccountMask(acct.last4 != null && acct.last4 !== "" ? acct.last4 : acct.last_4);
  } else {
    var text = String(acct == null ? "" : acct).trim();
    var marked = text.match(/^(.*?)(?:\s+)?(\u00b7\u00b7\d{4})$/);
    if (marked) {
      nick = marked[1].trim();
      last = marked[2];
    } else if (/^\u00b7\u00b7\d{4}$/.test(text)) last = text;
    else nick = text;
  }
  return { nick: nick, last: last };
}

function bankAccountDirectory(snap) {
  var list = [];
  var budget = (snap && snap.budget) || {};
  bankFundingAccounts(budget).forEach(function (acct) {
    list.push({ nickname: acct.nickname, last4: acct.last4 });
  });
  (budget.pay_schedule || []).forEach(function (row) {
    if (row && row.account) list.push(row.account);
  });
  return list;
}

/* Nickname ··last4 on both ends. A last4 or nickname fills in from the funding list. */
function bankCanonicalAccount(acct, directory) {
  var bits = bankAccountBits(acct);
  (directory || []).forEach(function (other) {
    var o = bankAccountBits(other);
    var sameNick = bits.nick && o.nick && bankTierKey(bits.nick) === bankTierKey(o.nick);
    var sameLast = bits.last && o.last && bits.last === o.last;
    if (!sameNick && !sameLast) return;
    if (!bits.nick && o.nick) bits.nick = o.nick;
    if (!bits.last && o.last) bits.last = o.last;
  });
  var tag = "account TBD";
  if (bits.nick && bits.last) tag = bits.nick + " " + bits.last;
  else if (bits.nick) tag = bits.nick;
  else if (bits.last) tag = bits.last;
  return { tag: tag, key: bits.last || bankTierKey(bits.nick) || tag, nick: bits.nick, last: bits.last };
}

function bankPickField(row, keys) {
  if (!row || typeof row !== "object") return null;
  var i;
  for (i = 0; i < keys.length; i++) {
    if (row[keys[i]] != null && row[keys[i]] !== "") return row[keys[i]];
  }
  return null;
}

function bankFundingPush(events, list, kind) {
  if (!Array.isArray(list)) return;
  list.forEach(function (item) {
    if (item == null) return;
    if (typeof item !== "object") {
      var lone = bankNum(item);
      if (lone == null) return;
      events.push({ date: "", name: kind === "out" ? "Out" : "In", amount: Math.abs(lone), kind: kind || "in" });
      return;
    }
    var amount = bankNum(bankPickField(item, ["amount", "value", "amt"]));
    var asideNum = bankNum(item.set_aside);
    var aside = item.set_aside === true || asideNum != null;
    var pendingAmt = bankNum(item.pending_unposted);
    var fromPending = amount == null && pendingAmt != null;
    if (amount == null && asideNum != null) amount = asideNum;
    if (amount == null && pendingAmt != null) amount = pendingAmt;
    if (amount == null) return;
    var k = String(bankPickField(item, ["kind", "type", "direction", "flow"]) || kind || "").toLowerCase();
    var out = k === "out" || k === "debit" || k === "outflow" || k === "expense" || k === "payment";
    if (!out && !kind && amount < 0) out = true;
    if (kind === "out") out = true;
    if (kind === "in" && !aside && !fromPending) out = false;
    if (aside || fromPending) out = true;
    events.push({
      date: bankCopyDate(bankPickField(item, ["pay_date", "date", "on", "day", "when"])) || "",
      name: String(bankPickField(item, ["name", "label", "desc", "description"]) || (out ? "Out" : "In")),
      amount: Math.abs(amount),
      kind: out ? "out" : "in",
      balance_lag: bankTruthyFlag(item.balance_lag),
      likely_unreflected: bankTruthyFlag(item.likely_unreflected),
      set_aside: aside
    });
  });
}

function bankDayKey(v) {
  var m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function bankMonthLastDay(key) {
  var p = bankParseYm(key);
  if (!p) return "";
  var dim = bankMonthDim(p.year, p.month);
  return key + "-" + (dim < 10 ? "0" : "") + dim;
}

/* A Forge entry may be a number or an object with the balance on the 1st. */
function bankMirrorAmount(v) {
  if (v == null || v === "") return null;
  if (typeof v !== "object") return bankNum(v);
  if (Array.isArray(v)) return null;
  return bankNum(bankPickField(v, [
    "balance", "amount", "value", "start_balance", "balance_on_first",
    "on_first", "opening_balance", "available"
  ]));
}

/* start_balance is the balance at 00:00 ET on the 1st. The projection seed is separate. */
function bankFundingMirror(mirror, last4) {
  if (!mirror || typeof mirror !== "object" || Array.isArray(mirror) || !last4) return null;
  if (mirror[last4] != null && mirror[last4] !== "") return bankMirrorAmount(mirror[last4]);
  var found = null;
  Object.keys(mirror).forEach(function (k) {
    if (found != null) return;
    var digits = String(k).replace(/\D/g, "");
    if (digits.length > 4) digits = digits.slice(-4);
    if (digits === last4) found = bankMirrorAmount(mirror[k]);
  });
  return found;
}

function bankFundingAccount(row, opts) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  opts = opts || {};
  var events = [];
  var printedRows = Array.isArray(row.rows) ? row.rows : null;
  /* Printed rows are the whole table. tiers.merchant_recurring is already inside them. */
  if (printedRows && printedRows.length) {
    bankFundingPush(events, printedRows, "");
  } else {
    bankFundingPush(events, bankPickField(row, ["events", "items", "lines", "tx", "transactions"]), "");
    ["ins", "inflows", "credits", "in", "outs", "outflows", "debits", "out"].forEach(function (key) {
      var list = row[key];
      if (!Array.isArray(list)) return;
      var kind = key === "outs" || key === "outflows" || key === "debits" || key === "out" ? "out" : "in";
      bankFundingPush(events, list, kind);
    });
  }
  var pending = row.pending_unposted;
  if (Array.isArray(pending)) bankFundingPush(events, pending, "out");
  else if (pending && typeof pending === "object") bankFundingPush(events, [pending], "out");
  else if (bankNum(pending) != null && bankNum(pending) !== 0) {
    events.push({
      date: bankCopyDate(row.pending_unposted_date) || "",
      name: "Pending",
      amount: Math.abs(bankNum(pending)),
      kind: "out",
      balance_lag: false,
      likely_unreflected: false,
      set_aside: false
    });
  }
  events.sort(function (a, b) {
    if (a.date === b.date) return 0;
    if (!a.date) return -1;
    if (!b.date) return 1;
    return a.date < b.date ? -1 : 1;
  });
  var bounds = opts.window;
  if (bounds && (bounds.start || bounds.end)) {
    events = events.filter(function (ev) {
      var day = bankDayKey(ev.date);
      if (!day) return true;
      if (bounds.start && day < bounds.start) return false;
      if (bounds.end && day > bounds.end) return false;
      return true;
    });
  }
  var nick = String(bankPickField(row, ["nickname", "name", "label"]) || "").trim();
  var last = String(bankPickField(row, ["last4", "last_4", "mask"]) || "").replace(/\D/g, "");
  if (last.length > 4) last = last.slice(-4);
  var onFirst = bankNum(bankPickField(row, ["start_balance", "starting_balance", "start", "opening_balance", "open_balance"]));
  var mirrored = false;
  if (onFirst == null) {
    onFirst = bankFundingMirror(opts.mirror, last);
    mirrored = onFirst != null;
  }
  var firstDate = bankDayKey(bankCopyDate(row.start_balance_date));
  var basis = String(row.start_balance_basis || "").trim().toLowerCase();
  var projDate = bankDayKey(bankCopyDate(row.projection_start_asof));
  var hasProjBal = row.projection_start_balance != null && row.projection_start_balance !== "";
  var hasProj = hasProjBal || !!projDate;
  var newShape = !!(firstDate || basis || hasProj || mirrored);
  var seed = hasProjBal ? bankNum(row.projection_start_balance) : onFirst;
  if (seed == null) seed = onFirst;
  var seedDate = hasProj ? projDate : "";
  var running = seed == null ? 0 : seed;
  var firstShort = "";
  var usedPrinted = [];
  var rows = events.map(function (ev, idx) {
    var printedBal = printedRows && printedRows[idx] ? bankNum(bankPickField(printedRows[idx], ["running_balance", "balance"])) : null;
    if (printedRows && printedRows.length) {
      var src = null;
      printedRows.forEach(function (raw, rawIdx) {
        if (src || !raw || usedPrinted[rawIdx]) return;
        var rawDate = bankCopyDate(bankPickField(raw, ["date", "on", "day", "when"])) || "";
        var rawName = String(bankPickField(raw, ["name", "label", "desc", "description"]) || "");
        if (rawDate === ev.date && rawName === ev.name) {
          src = raw;
          usedPrinted[rawIdx] = true;
        }
      });
      if (src) printedBal = bankNum(bankPickField(src, ["running_balance", "balance"]));
    }
    var day = bankDayKey(ev.date);
    var beforeSeed = !!(seedDate && day && day < seedDate);
    var balance;
    if (printedBal != null) {
      balance = printedBal;
      if (!beforeSeed) running = printedBal;
    } else if (beforeSeed) {
      balance = null;
    } else {
      running += ev.kind === "out" ? -ev.amount : ev.amount;
      balance = running;
    }
    if (balance != null && balance < -0.0001 && !firstShort) firstShort = ev.date;
    var lag = "";
    if (ev.balance_lag) lag = "lag";
    else if (ev.likely_unreflected) lag = "unreflected";
    return { date: ev.date, name: ev.name, amount: ev.amount, kind: ev.kind, balance: balance, lag: lag };
  });
  var inSum = 0;
  var outSum = 0;
  rows.forEach(function (ev) {
    if (ev.kind === "out") outSum += ev.amount;
    else inSum += ev.amount;
  });
  var acctFace = { nickname: nick, last4: last };
  var shortBy = bankNum(bankPickField(row, ["short_by", "shortfall", "short"]));
  if (shortBy != null) shortBy = Math.abs(shortBy);
  var shortDate = bankCopyDate(bankPickField(row, ["first_short_date", "short_date", "first_short"])) || "";
  /* A negative running balance is a short even when the print omitted short_by. An explicit zero stays OK. */
  if (shortBy == null) {
    var worst = null;
    rows.forEach(function (ev) {
      if (!ev || ev.balance == null || !(ev.balance < -0.0001)) return;
      if (worst == null || ev.balance < worst) worst = ev.balance;
    });
    if (worst != null) shortBy = Math.abs(worst);
  }
  if (!shortDate && shortBy > 0) shortDate = firstShort;
  var end = bankNum(bankPickField(row, ["end_balance", "ending_balance", "end", "projected_end"]));
  if (end == null && rows.length) {
    var i;
    for (i = rows.length - 1; i >= 0; i--) {
      if (rows[i].balance != null) {
        end = rows[i].balance;
        break;
      }
    }
  }
  if (end == null && seed != null && !seedDate) end = seed + inSum - outSum;
  if (end == null && seed != null && seedDate) end = running;
  /* The window start is Oct 1 only when that balance is known. A projection date is not the 1st. */
  var labelDate = firstDate || "";
  if (!labelDate && onFirst != null && (mirrored || basis === "balance_on_1st") && bounds && bounds.start) {
    labelDate = bankDayKey(bounds.start);
  }
  var labelShort = labelDate ? bankShortDate(labelDate) : "";
  var startNote = "";
  if (basis === "earliest_available" && labelShort) startNote = "start balance as of " + labelShort;
  return {
    nickname: nick,
    last4: last,
    tag: bankAccountTag(acctFace),
    account: acctFace,
    start: seed,
    onFirst: onFirst,
    onFirstLabel: newShape && labelShort ? "Start (" + labelShort + ")" : "",
    startNote: startNote,
    seedDate: seedDate,
    asof: newShape ? "" : (bankCopyDate(bankPickField(row, ["start_asof", "asof", "as_of", "start_date"])) || ""),
    rows: rows,
    end: end,
    ins: inSum,
    outs: outSum,
    short_by: shortBy,
    first_short_date: shortDate
  };
}

function bankFundingAccounts(budget, opts) {
  var raw = budget && budget.account_funding;
  var list = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    Object.keys(raw).forEach(function (k) {
      var row = raw[k];
      if (!row || typeof row !== "object" || Array.isArray(row)) return;
      if (row.nickname == null && row.name == null && row.last4 == null && row.last_4 == null) row = Object.assign({ nickname: k }, row);
      list.push(row);
    });
  }
  var out = [];
  list.forEach(function (row) {
    var acct = bankFundingAccount(row, opts);
    if (acct) out.push(acct);
  });
  return out;
}

function bankFundingBasisText(budget) {
  var raw = budget && budget.account_funding_basis;
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    return raw.map(function (item) {
      if (item == null) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item === "object") return String(item.note || item.text || item.summary || "").trim();
      return "";
    }).filter(Boolean).join(" ");
  }
  if (typeof raw === "object") return String(raw.note || raw.text || raw.summary || raw.assumptions || "").trim();
  return "";
}

function bankFundingBalanceOn(acct, iso) {
  if (!acct) return null;
  var bal = null;
  var seedDate = acct.seedDate || "";
  var ask = bankDayKey(iso) || iso || "";
  if (acct.start != null && (!seedDate || !ask || seedDate <= ask) && (!acct.asof || !ask || acct.asof <= ask)) bal = acct.start;
  (acct.rows || []).forEach(function (row) {
    if (!row) return;
    var day = bankDayKey(row.date);
    if (seedDate && day && day < seedDate) {
      if (row.balance != null && (!ask || day <= ask)) bal = row.balance;
      return;
    }
    if (ask && day && day > ask) return;
    if (row.balance == null) return;
    bal = row.balance;
  });
  return bal;
}

function bankShortMoves(snap, around) {
  var accounts = bankFundingAccounts((snap && snap.budget) || {});
  var moves = [];
  accounts.forEach(function (acct) {
    if (!acct || !(acct.short_by > 0)) return;
    var when = acct.first_short_date || "";
    if (around && when && when > bankAddDays(around, 2)) return;
    var amount = bankWholeDollarUp(acct.short_by);
    if (!(amount > 0)) return;
    var best = null;
    accounts.forEach(function (src) {
      if (!src || src === acct || src.tag === acct.tag) return;
      var bal = bankFundingBalanceOn(src, when || around || "");
      if (bal == null || bal - amount < 0) return;
      if (!best || bal > best.bal) best = { acct: src, bal: bal };
    });
    moves.push({
      to: acct.tag || "account TBD",
      last4: acct.last4 || "",
      toAcct: acct.account || { nickname: acct.nickname, last4: acct.last4 },
      amount: amount,
      date: when,
      from: best ? best.acct.tag : "",
      fromAcct: best ? (best.acct.account || { nickname: best.acct.nickname, last4: best.acct.last4 }) : null,
      covered: !!best
    });
  });
  return moves;
}

function bankFundingWindow(snap, month) {
  var key = bankMonthKey(month);
  var win = bankDeclaredCalendarWindow(snap);
  if (win && win.start && (!key || !bankMonthKey(win.start) || bankMonthKey(win.start) === key)) {
    return { start: win.start, end: win.end || bankMonthLastDay(key || bankMonthKey(win.start)) };
  }
  if (!key) return null;
  return { start: key + "-01", end: bankMonthLastDay(key) };
}

function bankMoveMask(move) {
  if (!move) return "";
  if (move.last4) return bankAccountMask(move.last4);
  var tag = String(move.to || "");
  var found = tag.match(/\u00b7\u00b7(\d{4})\s*$/);
  return found ? "\u00b7\u00b7" + found[1] : "";
}

function bankMoveSentence(move) {
  if (!move || !(move.amount > 0)) return "";
  var mask = bankMoveMask(move);
  if (!mask) return "";
  var when = move.date ? (bankWeekDate(move.date) || "") : "";
  return "Move " + bankMoney(move.amount) + " to " + mask + (when ? " by " + when : "") + ".";
}

function bankFundingMoveSentence(snap, opts) {
  var model = bankNextPayModel(snap, opts || {});
  var shorts = model && model.shorts ? model.shorts : [];
  var i;
  for (i = 0; i < shorts.length; i++) {
    var sentence = bankMoveSentence(shorts[i]);
    if (sentence) return sentence;
  }
  return "";
}

function bankFundStatusHtml(acct) {
  if (!(acct && acct.short_by > 0)) {
    var word = acct && acct.outs > 0 ? "OK" : "Nothing due";
    return '<span class="fresh-chips"><span class="fresh-chip">' + word + "</span></span>";
  }
  var when = acct.first_short_date ? (bankShortDate(acct.first_short_date) || acct.first_short_date) : "";
  var full = "Short " + bankMoney(acct.short_by) + (when ? " starting " + when : "");
  return '<span class="fresh-chips"><span class="fresh-chip fresh-stale">' + bankEsc(full) + "</span></span>";
}

function bankFundStartHtml(acct) {
  if (!acct || acct.onFirst == null) return "";
  if (acct.onFirstLabel) {
    return '<li data-fund-start="1"><span>' + bankEsc(acct.onFirstLabel) + "</span> <b>" + bankMoney(acct.onFirst) +
      "</b> <i>" + bankEsc(acct.startNote || "") + "</i></li>";
  }
  if (acct.seedDate) return "";
  var note = acct.asof ? "as of " + (bankShortDate(acct.asof) || acct.asof) : "";
  return '<li data-fund-start="1"><span>Start</span> <b>' + bankMoney(acct.onFirst) + "</b> <i>" + bankEsc(note) + "</i></li>";
}

function bankFundDetailHtml(acct) {
  var rows = bankSortByDue((acct && acct.rows) || [], { mode: "date" });
  var trs = [];
  if (acct && acct.onFirst != null && (acct.onFirstLabel || !acct.seedDate)) {
    var startName = acct.onFirstLabel || "Start";
    var startNote = acct.onFirstLabel ? (acct.startNote || "") : (acct.asof ? "as of " + (bankShortDate(acct.asof) || acct.asof) : "");
    trs.push('<tr data-fund-start="1"><td><span class="sym">' + bankEsc(startName) + "</span>" +
      (startNote ? ' <span class="sub">' + bankEsc(startNote) + "</span>" : "") +
      '</td><td class="num"><span class="sub">\u2014</span></td><td class="num">' + bankEsc(bankMoney(acct.onFirst)) + "</td></tr>");
  }
  rows.forEach(function (row) {
    var when = row.date ? bankShortDate(row.date) || row.date : "";
    var flow = bankFundSigned(row.amount, row.kind);
    var lag = row.lag ? ' <i class="bank-fund-lag">' + bankEsc(row.lag) + "</i>" : "";
    var neg = row.balance < 0 ? " tone-stop" : "";
    trs.push("<tr" + (row.balance < 0 ? ' class="bank-fund-neg"' : "") + "><td><span class=\"sym\">" + bankEsc(row.name) + "</span>" +
      (when ? ' <span class="sub">' + bankEsc(when) + "</span>" : "") + lag +
      '</td><td class="num ' + flow.cls + '">' + bankEsc(flow.text) + '</td><td class="num' + neg + '">' +
      bankEsc(bankMoney(row.balance)) + "</td></tr>");
  });
  trs.push('<tr class="bank-fund-end"><td><span class="sym">End</span></td><td class="num"><span class="sub">\u2014</span></td><td class="num">' +
    bankEsc(bankMoney(acct && acct.end)) + "</td></tr>");
  var table = '<table class="book"><thead><tr><th>Item</th><th class="num">Amount</th><th class="num">Balance</th></tr></thead><tbody>' +
    trs.join("") + "</tbody></table>";
  return bankCapList(table, trs.length, "Account funding");
}

function bankFundingFlowHtml(books) {
  if (!books) return "";
  var inn = books.inn > 0 ? bankFundSigned(books.inn, "in") : { text: "\u2014", cls: "" };
  var out = books.out > 0 ? bankFundSigned(books.out, "out") : { text: "\u2014", cls: "" };
  return '<table class="book bank-fund-flow" data-fund-start="' + bankEsc(books.start == null ? "" : String(books.start)) +
    '" data-fund-in="' + bankEsc(String(books.inn || 0)) + '" data-fund-out="' + bankEsc(String(books.out || 0)) +
    '" data-fund-end="' + bankEsc(books.end == null ? "" : String(books.end)) + '"><thead><tr><th>Accounts</th><th class="num">Start</th><th class="num">In</th><th class="num">Out</th></tr></thead><tbody><tr><td><span class="sym">All accounts</span></td><td class="num">' +
    bankEsc(bankMoney(books.start)) + '</td><td class="num ' + inn.cls + '">' + bankEsc(inn.text) +
    '</td><td class="num ' + out.cls + '">' + bankEsc(out.text) + "</td></tr></tbody></table>";
}

function bankFundingHtml(snap, opts, extra) {
  opts = opts || {};
  var budget = snap && snap.budget ? snap.budget : (snap || {});
  var view = snap && snap.budget ? snap : { budget: budget };
  var books = bankCombinedBooks(view, opts);
  var accounts = books.accounts || [];
  var past = !!opts.past;
  if (past) {
    if (!extra) return "";
    return '<section class="bank-funding"><h2>' + bankEsc(opts.monthTitle || "Account funding") + '</h2><div class="card span">' + extra + "</div></section>";
  }
  var showBooks = !!accounts.length;
  if (!showBooks && !extra) return "";
  var short = "";
  if (books.shortBy > 0) {
    var when = books.shortDate ? (bankShortDate(books.shortDate) || books.shortDate) : "";
    short = '<span class="fresh-chips"><span class="fresh-chip fresh-stale">Short ' + bankMoney(books.shortBy) +
      (when ? " by " + bankEsc(when) : "") + "</span></span>";
  }
  function kpiCell(label, text, cls) {
    return "<div><span>" + bankEsc(label) + '</span> <b class="' + bankEsc(cls || "") + '">' + bankEsc(text) + "</b></div>";
  }
  var innFlow = books.inn > 0 ? bankFundSigned(books.inn, "in") : { text: "\u2014", cls: "" };
  var outFlow = books.out > 0 ? bankFundSigned(books.out, "out") : { text: "\u2014", cls: "" };
  var leftFlowCls = books.leftNow != null && books.leftNow < -0.0001 ? "tone-stop" : "";
  var table = showBooks
    ? '<div class="kpi" data-fund-start="' + bankEsc(books.start == null ? "" : String(books.start)) +
      '" data-fund-in="' + bankEsc(String(books.inn || 0)) + '" data-fund-out="' + bankEsc(String(books.out || 0)) +
      '" data-fund-left="' + bankEsc(books.leftNow == null ? "" : String(books.leftNow)) + '">' +
      kpiCell("Start", bankMoney(books.start), "") +
      kpiCell("In", innFlow.text, innFlow.cls) +
      kpiCell("Out", outFlow.text, outFlow.cls) +
      kpiCell("Left", bankMoney(books.leftNow), leftFlowCls) +
      "</div>" + short
    : "";
  var moveLines = opts.hideMoves ? [] : bankFundMoveNotes(view);
  var notes = moveLines.length ? '<p class="hint">' + bankEsc(moveLines.join(" \u00b7 ")) + "</p>" : "";
  var body = table + notes + (extra || "");
  if (!body) return "";
  return '<section class="bank-funding"><h2>Account funding</h2><div class="card span">' + body + "</div></section>";
}

function bankFundAccountsTable(accounts, today) {
  var head = "<tr><th>Account</th><th class=\"num\">Start</th><th class=\"num\">In</th><th class=\"num\">Out</th><th class=\"num\">Left</th><th class=\"num\">Month-end</th></tr>";
  var body = (accounts || []).map(function (acct) {
    if (!acct) return "";
    var left = bankFundingBalanceOn(acct, today);
    if (left == null) left = acct.start;
    var inn = acct.ins > 0 ? bankFundSigned(acct.ins, "in") : { text: "\u2014", cls: "" };
    var out = acct.outs > 0 ? bankFundSigned(acct.outs, "out") : { text: "\u2014", cls: "" };
    var leftCls = left != null && left < -0.0001 ? "num tone-stop" : "num";
    var endCls = acct.end != null && acct.end < -0.0001 ? "num tone-stop" : "num";
    return '<tr data-fund-summary="' + bankEsc(acct.tag) + '"><td><span class="sym">' + bankEsc(acct.tag) + "</span></td>" +
      '<td class="num">' + bankEsc(bankMoney(acct.start)) + "</td>" +
      '<td class="num ' + inn.cls + '">' + bankEsc(inn.text) + "</td>" +
      '<td class="num ' + out.cls + '">' + bankEsc(out.text) + "</td>" +
      '<td class="' + leftCls + '">' + bankEsc(bankMoney(left)) + "</td>" +
      '<td class="' + endCls + '">' + bankEsc(bankMoney(acct.end)) + "</td></tr>";
  }).join("");
  if (!body) return "";
  return '<table class="book bank-fund-accounts"><thead>' + head + "</thead><tbody>" + body + "</tbody></table>";
}

function bankFundMoveNote(snap, acct) {
  if (!acct || !(acct.short_by > 0)) return "";
  var tag = acct.tag || bankAccountTag(acct);
  var lines = bankFundMoveNotes(snap);
  var line = "";
  lines.forEach(function (text) {
    if (line || !text) return;
    if (tag && text.indexOf(tag) >= 0) line = text;
  });
  if (!line && lines.length === 1) line = lines[0];
  if (!line) return "";
  return '<p class="hint">' + bankEsc(line) + "</p>";
}

function bankFundingAccountBlocks(snap, opts) {
  opts = opts || {};
  var books = bankCombinedBooks(snap, opts);
  var accounts = books.accounts || [];
  if (!accounts.length) return "";
  var today = "";
  if (opts.now) {
    var et = bankEtYmd(opts.now);
    if (et) today = bankDateKey(et.year, et.month, et.day);
  }
  if (!today) today = bankTodayIso(snap, opts);
  var summary = bankFundAccountsTable(accounts, today);
  if (!summary) return "";
  var seenNote = {};
  var notes = [];
  accounts.forEach(function (acct) {
    var note = bankFundMoveNote(snap, acct);
    if (!note || seenNote[note]) return;
    seenNote[note] = true;
    notes.push(note);
  });
  return summary + notes.join("");
}

function bankFundSigned(amount, kind) {
  var n = bankNum(amount);
  var abs = Math.abs(n == null ? 0 : n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (kind === "out") return { text: "\u2212$" + abs, cls: "tone-stop" };
  return { text: "+$" + abs, cls: "tone-go" };
}

function bankBonusSuggestionHtml(snap, ym) {
  var listed = bankOtherIncomeMtd(snap, ym);
  if (!listed || !(listed.total > 0)) return "";
  var budget = (snap && snap.budget) || {};
  var targets = Array.isArray(budget.savings_targets) ? budget.savings_targets.filter(function (t) { return t && (t.nickname || t.last4); }) : [];
  var where = targets.length ? bankAccountTag(targets[0]) : "savings";
  return '<p class="bank-bonus-next">Put bonus income ' + bankMoney(listed.total) + " toward " + bankEsc(where) + ".</p>";
}

function bankFundingBalance(budget, acct) {
  var face = bankAccountFace(acct);
  if (face === "account TBD") return null;
  var found = null;
  var bags = [budget && budget.account_funding, budget && budget.accounts];
  bags.forEach(function (list) {
    if (!Array.isArray(list)) return;
    list.forEach(function (row) {
      if (found != null || !row) return;
      var rowFace = bankAccountFace(row.account || row);
      if (bankTierKey(rowFace) !== bankTierKey(face) && bankTierKey(row.nickname || "") !== bankTierKey(face)) return;
      if (row.balance != null) found = bankNum(row.balance);
      else if (row.running_balance != null) found = bankNum(row.running_balance);
    });
  });
  return found;
}

function bankShortWeekday(iso) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[bankDow(Number(p[1]), Number(p[2]), Number(p[3]))];
}

function bankShortPayDate(iso) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var month = Number(p[2]);
  var day = Number(p[3]);
  if (month < 1 || month > 12) return "";
  return bankShortWeekday(iso) + ", " + BANK_MONTHS[month - 1] + " " + day;
}

function bankWeekDate(iso) {
  var when = bankShortDate(iso);
  if (!when) return "";
  var day = bankShortWeekday(iso);
  return day ? day + " " + when : when;
}

function bankWeekdayLabel(iso) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var months = BANK_MONTHS;
  var y = Number(p[1]);
  var m = Number(p[2]);
  var d = Number(p[3]);
  return names[bankDow(y, m, d)] + ", " + months[m - 1] + " " + d;
}

function bankAddDays(iso, delta) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var shifted = bankShiftYmd(Number(p[1]), Number(p[2]), Number(p[3]), delta);
  return bankDateKey(shifted.year, shifted.month, shifted.day);
}

function bankStreamKind(label, row) {
  if (row && row.kind === "stipend") return "Stipend";
  if (row && row.kind === "payroll") return "Payroll";
  if (bankIsFosteringIncome(label)) return "Stipend";
  if (bankIsPayrollIncome(label)) return "Payroll";
  return label || "Income";
}

function bankCollectPayEvents(snap, ym) {
  var budget = (snap && snap.budget) || {};
  var events = [];
  if (Array.isArray(budget.pay_schedule) && budget.pay_schedule.length) {
    budget.pay_schedule.forEach(function (row) {
      if (!row || (!row.date && !row.pay_date)) return;
      var when = bankScheduleDate(row);
      if (!when) return;
      var nominal = bankScheduleNominal(row);
      events.push({
        name: row.name || "Income",
        kind: bankStreamKind(row.name, row),
        date: when,
        amount: bankNum(row.amount),
        account: row.account || null,
        rolled_from: nominal && nominal !== when ? nominal : (row.rolled_from || ""),
        holiday_name: row.holiday_name || "",
        roll_reason: row.roll_reason || ""
      });
    });
    return events;
  }
  var incomes = bankNormalizeIncome(budget);
  var base = ym && ym.year ? ym : bankCalendarMonth(snap);
  [0, 1].forEach(function (shift) {
    var view = bankParseYm(bankShiftYm(base, shift));
    if (!view) return;
    incomes.forEach(function (inc) {
      var dated = [];
      if (Array.isArray(inc.deposits)) {
        inc.deposits.forEach(function (dep) {
          var date = bankCopyDate(dep && (dep.date || dep.on));
          if (!date || bankMonthKey(date) !== bankYm(view.year, view.month)) return;
          dated.push({
            name: inc.label,
            kind: bankStreamKind(inc.label, inc),
            date: date,
            amount: bankNum(dep.amount != null ? dep.amount : inc.amount),
            account: (dep && dep.account) || inc.usual_account || null,
            rolled_from: (dep && dep.rolled_from) || ""
          });
        });
      }
      if (dated.length) {
        dated.forEach(function (ev) { events.push(ev); });
        return;
      }
      if (bankIsPayrollIncome(inc.label)) {
        [15, bankMonthDim(view.year, view.month)].forEach(function (nominal) {
          var rolled = bankRollBackDate(view.year, view.month, nominal);
          events.push({
            name: inc.label,
            kind: "Payroll",
            date: rolled.key,
            amount: bankNum(inc.amount),
            account: inc.usual_account || null,
            rolled_from: rolled.rolled_from
          });
        });
        return;
      }
      if (bankIsFosteringIncome(inc.label)) {
        [10, 25].forEach(function (day) {
          var rolled = bankRollBackDate(view.year, view.month, day);
          events.push({
            name: inc.label,
            kind: "Stipend",
            date: rolled.key,
            amount: bankNum(inc.amount),
            account: inc.usual_account || null,
            rolled_from: rolled.rolled_from
          });
        });
      }
    });
  });
  return events;
}

/* Ledger deposits keep the pay schedule, then add stipend days and any other dated income the schedule skipped. */
function bankLedgerDeposits(snap, ym) {
  ym = ym && ym.year ? ym : bankParseYm(ym);
  var monthKey = ym ? bankYm(ym.year, ym.month) : "";
  var budget = (snap && snap.budget) || {};
  var events = [];
  var seen = {};
  function push(ev) {
    if (!ev || !ev.date || !monthKey || bankMonthKey(ev.date) !== monthKey) return;
    var amount = bankNum(ev.amount);
    if (!(amount > 0)) return;
    var name = ev.kind || ev.name || "Deposit";
    var stream = name === "Payroll" || name === "Stipend" || bankIsPayrollIncome(name) || bankIsFosteringIncome(name);
    var key = ev.date + "|" + (stream ? bankTierKey(bankStreamKind(name, ev)) : (bankTierKey(name) + "|" + amount));
    if (seen[key]) return;
    seen[key] = true;
    events.push({
      name: ev.name || name,
      kind: name,
      date: ev.date,
      amount: amount
    });
  }
  bankCollectPayEvents(snap, ym).forEach(push);
  var hasSchedule = Array.isArray(budget.pay_schedule) && budget.pay_schedule.length;
  if (hasSchedule && ym) {
    bankNormalizeIncome(budget).forEach(function (inc) {
      if (!inc || bankIsPayrollIncome(inc.label)) return;
      var deposits = bankIncomeResolvedDeposits(inc, ym);
      bankIncomePayDays(inc, ym).forEach(function (day) {
        var amount = bankNum(inc.amount);
        if (deposits) {
          deposits.forEach(function (dep) {
            if (dep.day === day && dep.amount != null) amount = dep.amount;
          });
        }
        push({
          name: inc.label,
          kind: bankStreamKind(inc.label, inc),
          date: bankDateKey(ym.year, ym.month, day),
          amount: amount
        });
      });
    });
  }
  var others = budget.other_income;
  if (Array.isArray(others)) {
    others.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      var date = bankCopyDate(row.date || row.on);
      if (!date && ym) {
        var day = bankDay(row.day != null ? row.day : row.typical_day);
        if (day != null) date = bankDateKey(ym.year, ym.month, day);
      }
      var label = row.name || row.label || row.desc || "Income";
      push({
        name: label,
        kind: bankStreamKind(label, row),
        date: date,
        amount: Math.abs(bankNum(row.amount) || 0)
      });
    });
  }
  return events;
}

function bankTodayIso(snap, opts) {
  var et = bankScreenToday(snap, opts || {});
  if (!et) return "";
  return bankDateKey(et.year, et.month, et.day);
}

/* Earliest deposit on or after today. Does not replace a landed paycheck the way Next Pay can. */
function bankNextDeposit(snap, opts) {
  opts = opts || {};
  var today = bankTodayIso(snap, opts);
  var ym = bankScreenMonth(snap, opts);
  var events = bankCollectPayEvents(snap, ym).filter(function (ev) { return ev && ev.date; });
  events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var i;
  for (i = 0; i < events.length; i++) {
    if (!today || events[i].date >= today) return events[i];
  }
  return null;
}

function bankNextBillOut(snap, opts) {
  opts = opts || {};
  var today = bankTodayIso(snap, opts);
  var base = bankScreenMonth(snap, opts);
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var bills = bankPreparedBills(snap, dueArg);
  var hits = [];
  [0, 1].forEach(function (shift) {
    var ym = bankParseYm(bankShiftYm(base, shift));
    if (!ym) return;
    var month = bankYm(ym.year, ym.month);
    bills.forEach(function (b) {
      if (!b || bankBillRetired(b, month) || !bankBillCounted(b)) return;
      var trust = bankTrustPaidStatus(snap, b, month, opts);
      var paid = trust ? bankBillPaidStatus(b, month) : "";
      if (paid === "paid" || paid === "paid_late") return;
      var part = trust ? bankBillPartial(b, month) : null;
      var openDays = part ? bankPartialOpenDays(b, ym, part) : null;
      bankBillDueDays(b, ym).forEach(function (day) {
        if (openDays && openDays.indexOf(day) < 0) return;
        var due = bankDateKey(ym.year, ym.month, day);
        if (!due || (today && due < today)) return;
        var amount = bankBillLineAmount(b, month, opts.edits);
        hits.push({
          name: bankBillDisplayName(b.name, b.display_label),
          bill_id: bankBillIdOf(b),
          due: due,
          amount: amount
        });
      });
    });
  });
  if (!hits.length) return null;
  hits.sort(function (a, b) {
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return (b.amount || 0) - (a.amount || 0);
  });
  var first = hits[0];
  var more = 0;
  hits.forEach(function (hit) { if (hit.due === first.due) more += 1; });
  return { name: first.name, due: first.due, amount: first.amount, bill_id: first.bill_id, more: Math.max(0, more - 1) };
}

function bankIncomeTxMatch(snap, ev) {
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  var hit = null;
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (hit || !raw) return;
      var side = bankFlowSide(raw);
      if (side !== "in") return;
      var when = String(raw.date || "").slice(0, 10);
      if (!when || !ev.date) return;
      var a = Date.parse(when + "T12:00:00Z");
      var b = Date.parse(ev.date + "T12:00:00Z");
      if (!isFinite(a) || !isFinite(b) || Math.abs(a - b) > 2 * 86400000) return;
      var amt = Math.abs(bankNum(raw.amount) || 0);
      var expect = Math.abs(ev.amount || 0);
      if (expect > 0 && Math.abs(amt - expect) / expect > 0.1) return;
      var blob = bankFoldName((raw.desc || "") + " " + (raw.category || "") + " " + (raw.name || ""));
      var stream = bankFoldName(ev.name);
      if (stream && blob.indexOf(stream) < 0 && bankFoldName(ev.kind) && blob.indexOf(bankFoldName(ev.kind)) < 0) {
        if (!(ev.kind === "Payroll" && /pay/.test(blob))) return;
      }
      hit = { date: when, amount: amt };
    });
  });
  return hit;
}

function bankNextPayModel(snap, opts) {
  opts = opts || {};
  var todayIso = "";
  if (opts.now) {
    var et = bankEtYmd(opts.now);
    if (et) todayIso = bankDateKey(et.year, et.month, et.day);
  }
  if (!todayIso && snap && snap.asof) {
    var as = bankEtYmd(snap.asof);
    if (as) todayIso = bankDateKey(as.year, as.month, as.day);
  }
  var ym = bankScreenMonth(snap, opts);
  var events = bankCollectPayEvents(snap, ym).filter(function (ev) { return ev.date; });
  events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var seen = {};
  events = events.filter(function (ev) {
    var k = ev.date + "|" + ev.name;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
  if (!events.length) return null;
  var recent = null;
  var upcoming = null;
  events.forEach(function (ev) {
    if (todayIso && ev.date <= todayIso) recent = ev;
    if (!upcoming && (!todayIso || ev.date >= todayIso)) upcoming = ev;
  });
  var focus = upcoming || recent;
  var landed = null;
  if (opts.focusDate) {
    var forced = null;
    events.forEach(function (ev) {
      if (!forced && ev.date === opts.focusDate) forced = ev;
    });
    if (forced) focus = forced;
  } else if (recent) {
    landed = bankIncomeTxMatch(snap, recent);
    if (landed) focus = recent;
  }
  if (!focus) return null;
  var following = null;
  events.forEach(function (ev) {
    if (following) return;
    if (ev.date > focus.date) following = ev;
  });
  var end = following ? following.date : "9999-12-31";
  var ctx = bankKindContext(snap);
  var budget = (snap && snap.budget) || {};
  var fundHits = [];
  bankFundingAccounts(budget).forEach(function (acct) {
    var face = acct.account || { nickname: acct.nickname, last4: acct.last4 };
    (acct.rows || []).forEach(function (line) {
      if (!line || !line.name) return;
      fundHits.push({ name: line.name, account: face });
    });
  });
  function accountForRow(row) {
    if (row && row.usual_account && bankAccountFace(row.usual_account) !== "account TBD") return row.usual_account;
    var found = null;
    fundHits.forEach(function (hit) {
      if (found || !row) return;
      if (bankKeysMatch(hit.name, row.name) || bankBillNameMatch(hit.name, row.name) || bankBillNameMatch(row.name, hit.name)) found = hit.account;
    });
    return found || (row && row.usual_account) || null;
  }
  var bills = [];
  function pushOccurrence(row, day, month, amount, sub) {
    var due = bankDateKeyFromDay(month, day);
    if (due && due < focus.date) {
      var nxt = bankParseYm(bankShiftYm(month, 1));
      due = nxt ? bankDateKey(nxt.year, nxt.month, Math.min(day, bankMonthDim(nxt.year, nxt.month))) : "";
    }
    if (!due || due < focus.date || due >= end) return;
    var paidMonth = due.slice(0, 7);
    var paid = bankBillPaidStatus(row, paidMonth);
    if (paid === "paid" || paid === "paid_late") return;
    bills.push({
      name: row.name,
      display_label: row.display_label || "",
      due: due,
      day: day,
      amount: amount,
      account: accountForRow(row),
      sub: !!sub
    });
  }
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (bankBillRetired(b, focus.date.slice(0, 7)) || bankBillRetired(b, ym)) return;
    if (bankResolveTier(b.name, snap, ctx, b) !== "required") return;
    var month = focus.date.slice(0, 7);
    var days = bankBillDueDays(b, month);
    if (!days.length && b.typical_day != null) days = [b.typical_day];
    days.forEach(function (day) {
      var per = bankBillAmountForMonth(b, month);
      if (bankIsTwiceBill(b) || bankIsSetAside(b)) {
        var plan = bankBillMonthPlan(b, month, opts.edits);
        var times = bankBillTimes(b) || days.length || 1;
        if (per == null && plan != null && times > 0) per = plan / times;
        else if (bankIsSetAside(b)) per = plan;
      } else if (per == null) per = bankBillLineAmount(b, month, opts.edits);
      pushOccurrence(b, day, month, per, false);
    });
  });
  bankNormalizeSubs(budget).forEach(function (s) {
    if (s.typical_day == null) return;
    var month = focus.date.slice(0, 7);
    pushOccurrence(s, s.typical_day, month, s.amount, true);
  });
  var depositAcct = focus.account;
  var groups = {};
  var order = [];
  bills.forEach(function (b) {
    var face = bankAccountFace(b.account);
    if (face === "account TBD") return;
    if (bankAccountsSame(depositAcct, b.account)) return;
    if (!groups[face]) {
      groups[face] = { face: face, account: b.account, amount: 0 };
      order.push(face);
    }
    groups[face].amount += b.amount || 0;
  });
  var transfers = order.map(function (face) {
    var g = groups[face];
    var last = "";
    if (g.account && typeof g.account === "object") {
      last = String(g.account.last4 != null && g.account.last4 !== "" ? g.account.last4 : (g.account.last_4 || "")).replace(/\D/g, "");
      if (last.length > 4) last = last.slice(-4);
    }
    return {
      from: bankAccountFace(depositAcct),
      fromAcct: depositAcct,
      to: face,
      toAcct: g.account,
      amount: g.amount,
      last4: last,
      skipped: !(g.amount > 0)
    };
  }).filter(function (row) { return !row.skipped; });
  var covered = 0;
  bills.forEach(function (b) { if (b.amount != null) covered += b.amount; });
  var left = focus.amount == null ? null : focus.amount - covered;
  var targets = Array.isArray(budget.savings_targets) ? budget.savings_targets.filter(function (t) { return t && (t.nickname || t.last4); }) : [];
  var splitTbd = targets.length > 0 && targets.every(function (t) { return t.share == null || t.share === ""; });
  var savings = [];
  if (left != null && left > 0) {
    if (!targets.length) savings.push({ name: "Savings", amount: left });
    else {
      var shares = targets.map(function (t) { return bankNum(t.share); });
      var shareSum = 0;
      var even = splitTbd;
      shares.forEach(function (n) { if (n != null) shareSum += n; });
      targets.forEach(function (t, i) {
        var part = even || !(shareSum > 0) ? left / targets.length : left * ((shares[i] || 0) / shareSum);
        savings.push({ name: t.nickname || bankAccountFace(t), amount: part });
      });
    }
  }
  var countdown = "";
  if (todayIso && focus.date) {
    var a = Date.parse(todayIso + "T12:00:00Z");
    var b = Date.parse(focus.date + "T12:00:00Z");
    var diff = Math.round((b - a) / 86400000);
    if (diff <= 0) countdown = "today";
    else if (diff === 1) countdown = "tomorrow";
    else countdown = "in " + diff + " days";
  }
  return {
    focus: focus,
    landed: landed,
    countdown: countdown,
    bills: bills,
    transfers: transfers,
    shorts: bankShortMoves(snap, focus.date).filter(function (t) {
      t.shownKey = (t.date || "") + "|" + (t.from || "") + "|" + (t.to || "");
      return !(opts.shownShorts && opts.shownShorts[t.shownKey]);
    }),
    left: left,
    savings: savings,
    splitTbd: splitTbd,
    from: bankAccountFace(depositAcct)
  };
}

function bankNextPayHtml(snap, opts, model, primary) {
  opts = opts || {};
  var period = bankPayPeriod(snap, opts);
  if (!period) return "";
  var ev = period.focus;
  var bills = bankPeriodBillRows(snap, opts, ev.date, period.end);
  var billSum = 0;
  bills.forEach(function (row) { if (row.amount != null) billSum += row.amount; });
  billSum = bankRoundCents(billSum);
  var needsFull = bankProratePlan(snap, ev.date, period.end, "needs", opts);
  var spent = bankNeedsSpentInPeriod(snap, ev.date, period.end, period.today, period.started);
  var needs = bankRoundCents(Math.max(0, needsFull - spent));
  var aside = bankRoundCents(billSum + needs);
  var deposit = bankNum(ev.amount);
  var left = deposit == null ? null : bankRoundCents(deposit - aside);
  var dest = "account TBD";
  if (ev.account) dest = bankAccountTag(ev.account);
  else if (model && model.from && model.from !== "account TBD") dest = model.from;
  var payFlow = bankFundSigned(deposit || 0, "in");
  var payLine = '<p><span class="' + payFlow.cls + '">' + bankEsc(deposit == null ? "\u2014" : payFlow.text) +
    '</span> <span class="sep"> \u00b7 </span> <span>to ' + bankEsc(dest) + "</span></p>";
  var shown = bills.slice(0, 10);
  var billTr = shown.map(function (row) {
    var flow = bankFundSigned(row.amount || 0, "out");
    var due = row.due ? (bankShortDate(row.due) || row.due) : "";
    return '<tr><td><span class="sym">' + bankEsc(row.name) + '</span> <span class="sub">' + bankEsc(due) + "</span></td>" +
      '<td class="num ' + flow.cls + '">' + bankEsc(row.amount == null ? "\u2014" : flow.text) + "</td></tr>";
  }).join("");
  function moneyRow(label, amount, bold) {
    var name = bold ? "<b>" + bankEsc(label) + "</b>" : '<span class="sym">' + bankEsc(label) + "</span>";
    var cell = !(amount > 0) ? '<td class="num"><span class="sub">\u2014</span></td>' : (function () {
      var flow = bankFundSigned(amount, "out");
      return '<td class="num ' + flow.cls + '">' + bankEsc(flow.text) + "</td>";
    })();
    return "<tr><td>" + name + "</td>" + cell + "</tr>";
  }
  var leftFlow = left == null || left === 0 ? { text: "\u2014", cls: "" } : bankFundSigned(Math.abs(left), left < 0 ? "out" : "in");
  var foot = moneyRow("Needs (groceries, etc.)", needs, false) +
    moneyRow("Set aside", aside, true) +
    '<tr><td><b>Left from this check</b></td><td class="num ' + leftFlow.cls + '">' + bankEsc(leftFlow.text) + "</td></tr>";
  var billTable = '<table class="book bank-next-bills"><thead><tr><th>Bill</th><th class="num">Amount</th></tr></thead><tbody>' +
    billTr + "</tbody><tfoot>" + foot + "</tfoot></table>";
  if (bills.length > 10) billTable = bankCapList(billTable, bills.length, "Next pay bills");
  var lastDay = period.end ? bankAddDays(period.end, -1) : "";
  var windowHint = "This check covers " + bankShortPayDate(ev.date) + (lastDay ? " through " + bankShortPayDate(lastDay) : "") + ".";
  if (period.started) windowHint = "This period has started. " + windowHint;
  var roll = "";
  if (ev.holiday_name && ev.rolled_from) roll = "Moved from " + bankShortPayDate(ev.rolled_from) + " (" + ev.holiday_name + ")";
  else if (ev.rolled_from) roll = "Rolled back from " + bankShortPayDate(ev.rolled_from);
  if (roll) windowHint = windowHint + " " + roll;
  var hints = '<p class="hint">' + bankEsc(windowHint) + "</p>";
  return '<section class="bank-next"' + (primary === false ? "" : ' aria-labelledby="bank-next-title"') + "><h2" +
    (primary === false ? "" : ' id="bank-next-title"') + ">" + (primary === false ? "Next pay" : ("Next pay \u00b7 " + bankEsc(bankShortPayDate(ev.date)))) +
    "</h2><div class=\"card span\">" + payLine + billTable + hints + "</div></section>";
}

function bankNextPaySection(snap, opts) {
  return bankNextPayHtml(snap, opts || {}, null, true);
}

function bankDayStateText(row, ym) {
  if (!row) return "Estimated";
  var text = bankPayStatusText(row, ym, null);
  if (text && text.indexOf("Paid") === 0) return text;
  return "Estimated";
}

function bankDayItems(snap, ym, day, edits) {
  var budget = (snap && snap.budget) || {};
  var bills = bankPreparedBills(snap, bankHasDueMap(snap) ? bankDueMap(snap) : undefined)
    .filter(function (b) { return !bankBillRetired(b, ym); });
  var incomes = bankAttachIncomePlan(bankNormalizeIncome(budget), ym);
  var subs = bankNormalizeSubs(budget);
  var cells = bankDayCells(bills, incomes, bankCalendarForBills(Array.isArray(budget.calendar) ? budget.calendar : [], budget), ym);
  bankPlaceSubs(cells, subs, ym);
  var cell = cells[day - 1];
  if (!cell) return [];
  var items = [];
  function pushItem(row) {
    items.push(row);
  }
  (cell.pays || []).forEach(function (label) {
    var inc = null;
    incomes.forEach(function (row) {
      if (bankChipKey(row.label) === bankChipKey(label)) inc = row;
    });
    pushItem({
      name: label,
      amount: "",
      type: "Income",
      state: "Expected",
      account: bankAccountFace(inc && inc.usual_account)
    });
  });
  (cell.subs || []).forEach(function (name) {
    var sub = null;
    subs.forEach(function (s) { if (bankNamesMatch(s.name, name) || bankChipKey(s.name) === bankChipKey(name)) sub = s; });
    pushItem({
      name: bankBillDisplayName(name),
      amount: sub && sub.amount != null ? bankMoney(sub.amount) : "",
      type: "Subscription",
      state: bankDayStateText(sub, ym),
      account: bankAccountFace(sub && sub.usual_account)
    });
  });
  (cell.bills || []).forEach(function (name) {
    var bill = null;
    bills.forEach(function (b) { if (bankNamesMatch(b.name, name) || bankChipKey(b.name) === bankChipKey(name)) bill = b; });
    var amountN = bill ? bankBillLineAmount(bill, ym, edits) : null;
    pushItem({
      name: bill ? bankBillDisplayName(bill.name, bill.display_label) : bankBillDisplayName(name),
      amount: amountN == null ? "" : bankMoney(amountN),
      type: "Bill",
      state: bankDayStateText(bill, ym),
      account: bankAccountFace(bill && bill.usual_account)
    });
  });
  (cell.items || []).forEach(function (name) {
    if (bankListHasChip(cell.bills, name) || bankListHasChip(cell.subs, name)) return;
    pushItem({
      name: bankBillDisplayName(name),
      amount: "",
      type: "Bill",
      state: "Estimated",
      account: "account TBD"
    });
  });
  return items;
}

function bankDayDialogHtml(snap, ym, day, edits) {
  if (day == null) return "";
  var items = bankDayItems(snap, ym, day, edits);
  var iso = ym && ym.year ? bankDateKey(ym.year, ym.month, day) : "";
  items.forEach(function (it) { it.date = iso; });
  items = bankSortByDue(items, { mode: "date" });
  var body = items.length ? bankCapList("<ul>" + items.map(function (it) {
    var bits = [it.amount, it.type, it.state, it.account].filter(Boolean);
    return "<li><b>" + bankEsc(it.name) + "</b> <i>" + bankMetaHtml(bits.join(" \u00b7 ")) + "</i></li>";
  }).join("") + "</ul>", items.length, "Day items") : '<p class="bank-empty">Nothing scheduled</p>';
  return '<div class="bank-day-scrim" data-bank-day-scrim="1"></div><div class="bank-day-dialog" role="dialog" aria-modal="true" aria-labelledby="bank-day-title" tabindex="-1">' +
    '<h3 id="bank-day-title">' + bankEsc(BANK_MONTHS[(ym && ym.month ? ym.month : 1) - 1] + " " + day) + "</h3>" + body +
    '<button type="button" data-bank-day-close="1">Close</button></div>';
}

function bankTierSpend(snap, monthKey) {
  var budget = (snap && snap.budget) || {};
  var key = bankMonthKey(monthKey);
  var mtd = budget.tiers_mtd;
  var tagged = mtd && typeof mtd === "object" ? bankMonthKey(mtd.month) : "";
  /* A month tag from another month is ignored. An untagged bag still counts. */
  var mtdStale = !!(key && tagged && tagged !== key);
  if (!mtdStale && mtd && typeof mtd === "object" && !Array.isArray(mtd) && bankCalendarBlockOk(mtd, key) &&
      (mtd.required_spent != null || mtd.needs_spent != null || mtd.wants_spent != null)) {
    var printedTiers = {
      required: bankNum(mtd.required_spent) || 0,
      needs: bankNum(mtd.needs_spent) || 0,
      wants: bankNum(mtd.wants_spent) || 0,
      unposted: Array.isArray(mtd.required_known_unposted) ? mtd.required_known_unposted : []
    };
    bankRetagMoves(snap, key).forEach(function (move) {
      printedTiers[move.from] = Math.max(0, (printedTiers[move.from] || 0) - move.amount);
    });
    return printedTiers;
  }
  if (bankRollingListsBlocked(snap, key)) {
    var blockedSums = { required: 0, needs: 0, wants: 0 };
    var blockedCtx = bankKindContext(snap);
    bankMtdSpendRows(budget, snap, key).forEach(function (r) {
      var tier = bankResolveTier(r.name, snap, blockedCtx, null);
      if (tier !== "required" && tier !== "needs" && tier !== "wants") return;
      blockedSums[tier] += r.amount;
    });
    return { required: blockedSums.required, needs: blockedSums.needs, wants: blockedSums.wants, unposted: [] };
  }
  var walkKey = key || bankAsofMonthKey(snap);
  var ctx = bankKindContext(snap);
  var sums = { required: 0, needs: 0, wants: 0 };
  var accounts = bankAccountIdSet(snap);
  var seen = {};
  bankMtdTxLists(snap, walkKey).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) === "in") return;
      if (key && raw.month && bankMonthKey(raw.month) !== key) return;
      if (key && raw.date && bankMonthKey(raw.date) !== key) return;
      if (bankTruthyFlag(raw.one_off)) return;
      if (bankIsInternalTransfer(raw, accounts)) return;
      if (bankTxExcludedFromSpend(raw, snap)) return;
      var txKey = bankTxKey(raw);
      if (seen[txKey]) return;
      seen[txKey] = true;
      var name = raw.merchant_key || raw.category || raw.desc || "";
      var ruled = bankResolveTier(name, snap, ctx, raw);
      if (ruled === "other_income") return;
      var tier = bankTierWord(raw.tier);
      if (!tier || tier === "elective") tier = ruled;
      if (tier === "other_income") return;
      if (tier !== "required" && tier !== "needs" && tier !== "wants") tier = "needs";
      var n = bankNum(raw.amount);
      if (n == null) return;
      sums[tier] += Math.abs(n);
    });
  });
  if (!seen || !Object.keys(seen).length) {
    bankMtdSpendRows(budget, snap, key).forEach(function (r) {
      var tier = bankResolveTier(r.name, snap, ctx, null);
      if (!sums[tier] && sums[tier] !== 0) return;
      sums[tier] += r.amount;
    });
  }
  return { required: sums.required, needs: sums.needs, wants: sums.wants, unposted: [] };
}

/* YYYY-MM from a month key, a date, or { year, month }. */
function bankMonthKey(ym) {
  if (ym == null || ym === "") return "";
  if (typeof ym === "object") {
    if (!ym.year || !ym.month) return "";
    return bankYm(Number(ym.year), Number(ym.month));
  }
  var s = String(ym).trim();
  if (bankDateHasZone(s)) {
    var wall = bankWallDate(s);
    if (/^\d{4}-\d{2}/.test(wall)) return wall.slice(0, 7);
  }
  var p = s.match(/^(\d{4})-(\d{2})/);
  if (!p) return "";
  var month = Number(p[2]);
  if (month < 1 || month > 12) return "";
  return p[1] + "-" + p[2];
}

function bankShiftYm(ym, delta) {
  var p = bankParseYm(bankMonthKey(ym));
  if (!p) return "";
  var n = p.year * 12 + (p.month - 1) + (Number(delta) || 0);
  var year = Math.floor(n / 12);
  var month = n - year * 12;
  if (month < 0) {
    month += 12;
    year -= 1;
  }
  return bankYm(year, month + 1);
}

function bankBillDayTokens(raw) {
  var out = [];
  function push(v) {
    if (v == null || v === "") return;
    if (bankIsEomToken(v)) {
      if (out.indexOf("EOM") < 0) out.push("EOM");
      return;
    }
    var day = bankDay(v);
    if (day == null || out.indexOf(day) >= 0) return;
    out.push(day);
  }
  if (raw && Array.isArray(raw.typical_days)) raw.typical_days.forEach(push);
  return out;
}

function bankIsSetAside(row) {
  var kind = String(row && row.kind || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return kind === "set_aside" || kind === "setaside";
}

function bankBillTimes(row) {
  var explicit = bankNum(row && row.times_per_month);
  if (explicit != null && explicit >= 1) return explicit;
  var printed = bankPrintTimes(row);
  if (printed != null) return printed;
  if (row && Array.isArray(row.typical_days) && row.typical_days.length >= 2) return row.typical_days.length;
  return null;
}

function bankIsTwiceBill(row) {
  if (!row || bankIsSetAside(row)) return false;
  var times = bankBillTimes(row);
  return times != null && times >= 2;
}

/* A day past the month, an EOM token, or the last day of the month clamps and rolls back off a weekend. */
function bankClampDueDay(day, ym, eom) {
  if (day == null) return { day: null, note: "" };
  if (!ym || !ym.year || !ym.month) return { day: day, note: "" };
  var dim = bankMonthDim(ym.year, ym.month);
  if (day <= dim && !eom) return { day: day, note: "" };
  var clamped = day > dim ? dim : day;
  var rolled = bankRollBackDate(ym.year, ym.month, clamped);
  var landed = rolled.year === ym.year && rolled.month === ym.month ? rolled.day : clamped;
  var note = "";
  if (landed !== day) {
    if (landed !== clamped) {
      note = "moved from " + bankShortWeekday(bankDateKey(ym.year, ym.month, clamped)) + " " + BANK_MONTHS[ym.month - 1] + " " + clamped;
    } else note = "moved from day " + day;
  }
  return { day: landed, note: note };
}

/* Calendar days. typical_days wins, so a repeated typical_day is not a third mark. */
function bankBillDueDays(row, ym) {
  var marks = bankBillDueMarks(row, ym);
  var out = [];
  marks.forEach(function (mark) {
    if (mark.day == null || out.indexOf(mark.day) >= 0) return;
    out.push(mark.day);
  });
  return out;
}

function bankBillScheduleDays(row, ym) {
  if (!row || !Array.isArray(row.schedule) || !row.schedule.length || !ym || !ym.year || !ym.month) return null;
  var key = bankYm(ym.year, ym.month);
  var days = [];
  row.schedule.forEach(function (item) {
    var when = bankScheduleDate(item);
    if (bankMonthKey(when) !== key) return;
    var d = bankDay(String(when).slice(8, 10));
    if (d != null && days.indexOf(d) < 0) days.push(d);
  });
  return days;
}

function bankBillDueMarks(row, ym) {
  if (!row || row.set_aside || row.unscheduled || bankIsSetAside(row) || bankBillRetired(row, ym)) return [];
  var scheduled = bankBillScheduleDays(row, ym);
  if (scheduled) {
    return scheduled.map(function (day) { return { day: day, note: "" }; });
  }
  var tokens = (row.typical_days && row.typical_days.length) ? row.typical_days : [];
  if (!tokens.length && row.typical_day != null) tokens = [row.typical_day];
  var out = [];
  tokens.forEach(function (token) {
    var eom = bankIsEomToken(token);
    var day = bankResolveDayToken(token, ym);
    var clamped = bankClampDueDay(day, ym, eom);
    if (clamped.day == null) return;
    var seen = false;
    out.forEach(function (mark) { if (mark.day === clamped.day) seen = true; });
    if (seen) return;
    var note = clamped.note;
    if (row.cancelled_later) note = note ? note + " · cancelled later" : "cancelled later";
    out.push({ day: clamped.day, note: note });
  });
  return out;
}

function bankBillUseNew(row, ym) {
  var eff = bankMonthKey(row && row.effective_from);
  var month = bankMonthKey(ym);
  return !eff || !month || month >= eff;
}

/* One monthly figure. Prefer monthly_amount, else amount × times. Not added on top of a print total. */
function bankBillMonthPlan(row, ym, edits) {
  if (!row) return null;
  if (!bankIsTwiceBill(row)) return bankBillAmountForMonth(row, ym);
  var useNew = bankBillUseNew(row, ym);
  var times = bankBillTimes(row) || 2;
  if (!(times > 0)) times = 2;
  var user = bankUserBillAmount(edits, row);
  if (user != null) return user * times;
  if (useNew && bankNum(row.override_amount) != null) return bankNum(row.override_amount) * times;
  if (useNew && bankNum(row.monthly_amount) != null) return bankNum(row.monthly_amount);
  var per = useNew ? bankNum(row.amount) : bankNum(row.prev_amount);
  if (per == null) per = bankNum(row.amount);
  if (per == null) return null;
  return per * times;
}

/* Amount from the effective month on. Earlier months use prev_amount.
   No effective_from means amount. No prev_amount falls back to amount.
   A print override is the new amount and is not used before effective_from.
   This is the per-occurrence figure. Twice-monthly plans use bankBillMonthPlan. */
function bankBillAmountForMonth(row, ym) {
  if (!row) return null;
  var amount = bankNum(row.amount);
  var override = bankNum(row.override_amount);
  var eff = bankMonthKey(row.effective_from);
  var month = bankMonthKey(ym);
  var useNew = !eff || !month || month >= eff;
  if (useNew && override != null) return override;
  if (useNew) return amount;
  var prev = bankNum(row.prev_amount);
  return prev == null ? amount : prev;
}

function bankUserBillAmount(edits, row) {
  /* A retired bill, or a name no longer in the print, does not come back from Edits. */
  if (!row || row.removed) return null;
  if (row && Object.prototype.hasOwnProperty.call(row, "user_amount") && bankNum(row.user_amount) != null) {
    return bankNum(row.user_amount);
  }
  var bag = edits && edits.bills;
  if (!bag || typeof bag !== "object" || Array.isArray(bag) || !row) return null;
  var raw = null;
  if (Object.prototype.hasOwnProperty.call(bag, row.name)) raw = bag[row.name];
  else {
    var key = bankBillKey(row.name);
    Object.keys(bag).forEach(function (k) {
      if (raw != null) return;
      if (bankBillKey(k) === key) raw = bag[k];
    });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (!Object.prototype.hasOwnProperty.call(raw, "amount")) return null;
  return bankNum(raw.amount);
}

function bankBillShownAmount(row, ym, edits) {
  var user = bankUserBillAmount(edits, row);
  if (user != null) return user;
  if (row && (row.effective_from || row.override_amount != null)) return bankBillAmountForMonth(row, ym);
  var typical = bankNum(row && row.typical_amount);
  if (typical != null) return typical;
  return bankNum(row && row.amount);
}

function bankShortDate(iso) {
  var m = String(bankWallDate(iso) || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  var month = Number(m[2]);
  var day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return BANK_MONTHS[month - 1] + " " + String(day);
}

function bankBillFreshCaption(row, ym) {
  if (!row || !row.effective_from) return "";
  var eff = bankMonthKey(row.effective_from);
  if (!eff || eff !== bankMonthKey(ym)) return "";
  var when = bankShortDate(row.effective_from);
  if (!when) return "";
  return "New amount from " + when;
}

/* Current Eastern month trusts paid_current_month only when that month matches budget.paid_status_month. */
function bankTrustPaidStatus(snap, row, ym, opts) {
  var view = bankMonthKey(ym);
  var et = bankScreenToday(snap, opts || {});
  var etMonth = et && et.year && et.month ? bankYm(et.year, et.month) : "";
  if (!view || !etMonth || view !== etMonth) return true;
  var paid = row && row.paid_current_month;
  var paidMonth = bankMonthKey(paid && paid.month);
  var statusMonth = bankMonthKey(snap && snap.budget && snap.budget.paid_status_month);
  return !!(paidMonth && statusMonth && paidMonth === statusMonth && statusMonth === etMonth);
}

function bankBillPartial(row, ym) {
  var paid = row && row.paid_current_month;
  if (!paid || typeof paid !== "object") return null;
  if (String(paid.status || "").trim().toLowerCase() !== "partial") return null;
  var paidMonth = bankMonthKey(paid.month);
  var view = bankMonthKey(ym);
  if (paidMonth && view && paidMonth !== view) return null;
  var paidN = bankNum(paid.paid_count);
  if (paidN == null) paidN = bankNum(paid.occurrences_paid);
  if (paidN == null) paidN = bankNum(paid.count);
  var ofN = bankNum(paid.expected);
  if (ofN == null) ofN = bankNum(paid.expected_count);
  if (ofN == null) ofN = bankNum(paid.of);
  if (ofN == null) ofN = bankNum(paid.occurrences);
  if (ofN == null) ofN = bankBillTimes(row);
  if (paidN == null || ofN == null || !(ofN > paidN)) return null;
  return { paid: paidN, of: ofN };
}

function bankPartialOpenDays(row, ym, part) {
  var days = bankBillDueDays(row, ym).slice().sort(function (a, b) { return a - b; });
  var paid = row && row.paid_current_month;
  var marked = paid && Array.isArray(paid.paid_days) ? paid.paid_days.map(function (d) { return bankDay(d); }).filter(function (d) { return d != null; }) : [];
  var skip = {};
  if (marked.length) marked.forEach(function (d) { skip[d] = true; });
  else {
    var n = Math.max(0, Math.floor(part.paid));
    if (days.length && n >= days.length) n = days.length - 1;
    days.slice(0, n).forEach(function (d) { skip[d] = true; });
  }
  var open = days.filter(function (d) { return !skip[d]; });
  if (!open.length && days.length) open = [days[days.length - 1]];
  return open;
}

function bankPartialCountText(n) {
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return String(n);
}

function bankPartialChip(part) {
  if (!part) return "";
  return '<span class="fresh-chips"><span class="fresh-chip">partial: ' +
    bankPartialCountText(part.paid) + " of " + bankPartialCountText(part.of) + "</span></span>";
}

function bankBillPaidStatus(row, ym) {
  var paid = row && row.paid_current_month;
  if (!paid || typeof paid !== "object") return "";
  var paidMonth = bankMonthKey(paid.month);
  var month = bankMonthKey(ym);
  if (!paidMonth || paidMonth !== month) return "";
  var status = String(paid.status || "");
  if (status !== "paid" && status !== "paid_late") return "";
  var paidMonth = bankMonthKey(paid.month) || bankMonthKey(paid.paid_date);
  if (paidMonth && month && paidMonth !== month) return "";
  return status;
}

function bankBillPaidCaption(row, ym) {
  var status = bankBillPaidStatus(row, ym);
  if (!status) return "";
  var paid = row.paid_current_month || {};
  var when = bankShortDate(paid.paid_date);
  if (status === "paid" && String(paid.source || "").toLowerCase() === "manual") return "Paid \u2713 (marked)";
  if (status === "paid_late") return when ? "Paid late \u00b7 " + when : "Paid late";
  return when ? "Paid \u00b7 " + when : "Paid";
}

function bankBillConfidenceNote(row) {
  if (!row) return "";
  var low = String(row.confidence || "").trim().toLowerCase() === "low";
  var note = row.note == null ? "" : String(row.note).trim();
  if (low && note) return "Low confidence \u00b7 " + note;
  if (low) return "Low confidence";
  return note;
}

function bankBillNotesHtml(row, ym) {
  var html = "";
  var fresh = bankBillFreshCaption(row, ym);
  if (fresh) html += ' <small class="bank-bill-note">' + bankMetaHtml(fresh) + "</small>";
  var paid = bankBillPaidCaption(row, ym);
  if (paid) html += ' <small class="bank-bill-note">' + bankMetaHtml(paid) + "</small>";
  var extra = bankBillConfidenceNote(row);
  if (extra) html += ' <small class="bank-bill-note">' + bankMetaHtml(extra) + "</small>";
  return html;
}

function bankBillLineAmount(row, ym, edits) {
  var user = bankUserBillAmount(edits, row);
  if (user != null) return user;
  if (row && (bankIsTwiceBill(row) || String(row.amount_basis || "") === "per_occurrence")) {
    if (row.effective_from || row.override_amount != null) return bankBillAmountForMonth(row, ym);
    return bankNum(row.amount);
  }
  return bankBillShownAmount(row, ym, edits);
}

function bankBillMeta(row, ym, edits) {
  if (!row) return "";
  if (row.set_aside || bankIsSetAside(row)) return "Set-aside \u00b7 no due day";
  if (bankIsTwiceBill(row)) {
    var bits = [(bankBillTimes(row) === 2 || !bankBillTimes(row) ? "2\u00d7 / month" : (String(bankBillTimes(row)) + "\u00d7 / month"))];
    var monthly = bankBillMonthPlan(row, ym, edits);
    if (monthly != null) bits.push(bankMoney(monthly) + " / mo");
    var each = bankBillAmountForMonth(row, ym);
    if (each != null && (monthly == null || Math.abs(each - monthly) > 0.001)) bits.push(bankMoney(each) + " each");
    return bits.join(" \u00b7 ");
  }
  var day = row.typical_day == null ? "\u2014" : String(row.typical_day);
  return "day " + day;
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
    html += ' <option value="' + d + '"' + (current === d ? " selected" : "") + ">" + d + "</option>";
  }
  return html;
}

function bankIncomeDayPhrase(days) {
  if (!days || !days.length) return "";
  if (days.length === 1) return "day " + days[0];
  if (days.length === 2) return "days " + days[0] + " and " + days[1];
  return "days " + days.join(", ");
}

/* Bold figure is one deposit. The softer line carries 2× / month and the monthly estimate. */
function bankIncomeDepositPhrase(inc, ym) {
  var rows = bankIncomeResolvedDeposits(inc, ym);
  if (!rows || !rows.length) return "";
  var bits = rows.map(function (r) {
    return bankMoney(r.amount) + " on the " + bankOrdinal(r.day);
  });
  var monthly = bankIncomeMonthAmount(inc);
  if (monthly != null) bits.push(bankMoney(monthly) + " / mo");
  return bits.join(" \u00b7 ");
}

function bankIncomeMeta(inc, ym) {
  var depositPhrase = bankIncomeDepositPhrase(inc, ym);
  if (depositPhrase) return depositPhrase;
  var times = bankNum(inc && inc.times_per_month);
  var days = (inc && inc.pay_days) || [];
  var dayBit = bankIncomeDayPhrase(days);
  if (!(times >= 2)) {
    if (dayBit) return dayBit;
    var one = inc && inc.typical_day != null ? String(inc.typical_day) : "\u2014";
    return "day " + one;
  }
  var bits = ["per deposit", times === 2 ? "2\u00d7 / month" : (String(times) + "\u00d7 / month")];
  var monthly = bankIncomeMonthAmount(inc);
  if (monthly != null) bits.push(bankMoney(monthly) + " / month");
  if (dayBit) bits.push(dayBit);
  return bits.join(" \u00b7 ");
}

function bankIncomeEditNote(inc) {
  if (!inc || !inc.editable) return "";
  if (bankIsFosteringIncome(inc.label)) return "Days 10 and 25. A day here replaces the 10th. The 25th stays.";
  if (bankIsPayrollIncome(inc.label)) return "Days 15 and the last day of the month. A day here replaces the 15th. The last day stays.";
  return "";
}

function bankIncomeRowsFor(snap, ym, opts) {
  opts = opts || {};
  var key = bankMonthKey(ym);
  var screen = bankMonthKey(bankScreenMonth(snap, opts));
  var past = !!(key && screen && key < screen);
  if (past) {
    var shot = bankSnapshotFor(snap, key);
    var expected = shot && shot.income ? bankNum(bankSnapshotExpected(shot.income)) : null;
    if (expected != null) return [{ label: "Expected", amount: expected, meta: "" }];
  }
  var budget = (snap && snap.budget) || {};
  var hasSchedule = Array.isArray(budget.pay_schedule) && budget.pay_schedule.length;
  if (hasSchedule) {
    var events = bankCollectPayEvents(snap, bankParseYm(key) || ym).filter(function (ev) {
      return ev && ev.date && bankMonthKey(ev.date) === key && ev.amount > 0;
    });
    if (events.length) {
      return events.map(function (ev) {
        return {
          label: ev.kind || bankBillDisplayName(ev.name) || "Income",
          amount: ev.amount,
          meta: bankShortDate(ev.date) || ev.date
        };
      });
    }
  }
  var monthObj = bankParseYm(key) || ym || {};
  var incomes = bankAttachIncomePlan(bankApplyIncomeEdits(bankNormalizeIncome(budget), opts.edits), monthObj);
  var built = [];
  (incomes || []).forEach(function (inc) {
    var face = inc.label || "Income";
    var deposits = bankIncomeResolvedDeposits(inc, monthObj);
    if (deposits && deposits.length) {
      deposits.forEach(function (dep) {
        built.push({
          label: face,
          amount: dep.amount,
          meta: bankShortDate(bankDateKey(monthObj.year, monthObj.month, dep.day))
        });
      });
      return;
    }
    /* A deposits list that cannot be read stays on the 2× plan line, not a guessed date row. */
    if (inc.deposits_rejected) {
      var rejectedMeta = bankIncomeMeta(inc, monthObj);
      if (!rejectedMeta || rejectedMeta === "day \u2014") rejectedMeta = "";
      built.push({ label: face, amount: bankNum(inc.amount), meta: rejectedMeta });
      return;
    }
    var days = inc.pay_days || [];
    if (days.length && monthObj.year) {
      days.forEach(function (day) {
        built.push({
          label: face,
          amount: bankNum(inc.amount),
          meta: bankShortDate(bankDateKey(monthObj.year, monthObj.month, day))
        });
      });
      return;
    }
    var meta = bankIncomeMeta(inc, monthObj);
    if (!meta || meta === "day \u2014") meta = "";
    built.push({ label: inc.label || "Income", amount: bankNum(inc.amount), meta: meta });
  });
  return built;
}

function bankIncomeListHtml(incomes, ym, snap, opts) {
  var rows = (snap ? bankIncomeRowsFor(snap, ym, opts) : null);
  if (!rows) {
    rows = (incomes || []).map(function (inc) {
      var phrase = bankIncomeDepositPhrase(inc, ym);
      var shown = phrase ? bankNum(inc.amount) : bankNum(inc.amount);
      var meta = bankIncomeMeta(inc, ym);
      if (!meta || meta === "day \u2014") meta = "";
      return { label: inc.label || "Income", amount: shown, meta: meta };
    });
  }
  var inner = '<p class="bank-empty">No expected income in this print.</p>';
  if (rows && rows.length) {
    var trs = rows.map(function (row) {
      var pending = row.amount == null;
      var meta = row.meta && row.meta !== "day \u2014" ? ' <span class="sub">' + bankMetaHtml(row.meta) + "</span>" : "";
      return "<tr><td><span class=\"sym\">" + bankEsc(row.label || "Income") + "</span>" + meta +
        '</td><td class="num' + (pending ? " bank-pending" : "") + '">' + bankEsc(bankBillAmount(row.amount)) + "</td></tr>";
    }).join("");
    inner = bankCapList('<table class="book"><thead><tr><th>Income</th><th class="num">Amount</th></tr></thead><tbody>' +
      trs + "</tbody></table>", rows.length, "Expected income");
  }
  return '<section class="bank-income"><h2>Expected income</h2><div class="card span">' + inner + "</div></section>";
}

function bankEditIncomeHtml(incomes, ym) {
  if (!incomes || !incomes.length) return '<p class="bank-empty">No income in this print.</p>';
  var items = incomes.map(function (inc) {
    var label = inc.label || "Income";
    var shown = bankNum(inc.amount);
    var pending = shown == null;
    if (!inc.editable) {
      return "<li><span class=\"bank-merchant\">" + bankEsc(label) + '</span> <span class="bank-edit-side"><b' +
        (pending ? ' class="bank-pending"' : "") + ">" + bankEsc(bankBillAmount(shown)) +
        "</b> <i>" + bankMetaHtml(bankIncomeMeta(inc, ym)) + "</i></span></li>";
    }
    var amtVal = shown == null ? "" : String(shown);
    var dayShown = inc.day_edited ? inc.typical_day : null;
    var note = bankIncomeEditNote(inc);
    return "<li><span class=\"bank-merchant\">" + bankEsc(label) + '</span> <span class="bank-edit-side' +
      (note ? " bank-edit-side-note" : "") + '">' +
      '<input class="bank-income-amt" type="text" inputmode="decimal" autocomplete="off" data-bank-income="' +
      bankEsc(label) + '" data-bank-income-field="amount" aria-label="Amount for ' + bankEsc(label) +
      '" value="' + bankEsc(amtVal) + '">' +
      ' <select class="bank-chip" data-bank-income="' + bankEsc(label) +
      '" data-bank-income-field="day" aria-label="Day for ' + bankEsc(label) + '">' +
      bankDayOptions(dayShown, "Day") + "</select>" +
      (note ? ' <i class="bank-income-fixed">' + bankEsc(note) + "</i>" : "") +
      "</span></li>";
  }).join("");
  return bankCapList('<ul class="bank-edit-list">' + items + "</ul>", incomes.length, "Income");
}

function bankScreenMonth(snap, opts) {
  opts = opts || {};
  var parsed = bankParseYm(bankMonthKey(opts.planMonth));
  if (parsed) return parsed;
  return bankCalendarMonth(snap);
}

function bankAsofMonthKey(snap) {
  var ym = bankCalendarMonth(snap);
  return bankYm(ym.year, ym.month);
}

/* Print totals already include the as-of amount. Another month shifts by the difference. */
function bankBillMonthDelta(snap, viewKey) {
  var asofKey = bankAsofMonthKey(snap);
  if (!viewKey || viewKey === asofKey) return 0;
  var budget = (snap && snap.budget) || {};
  var bills = bankSurfaceBills(bankNormalizeBills(budget), budget);
  var delta = 0;
  bills.forEach(function (b) {
    var viewAmt = bankBillMonthPlan(b, viewKey);
    var nowAmt = bankBillMonthPlan(b, asofKey);
    if (viewAmt == null || nowAmt == null) return;
    delta += viewAmt - nowAmt;
  });
  return delta;
}

function bankPlanTotals(snap, ym) {
  var budget = (snap && snap.budget) || {};
  var viewKey = bankMonthKey(ym) || bankAsofMonthKey(snap);
  var delta = bankBillMonthDelta(snap, viewKey);
  function adj(v, sign) {
    var n = bankNum(v);
    if (n == null) return null;
    return n + sign * delta;
  }
  var asofKey = bankAsofMonthKey(snap);
  var current = !viewKey || viewKey === asofKey;
  var billsTotal = current && bankNum(budget.bills_total_effective) != null
    ? bankNum(budget.bills_total_effective)
    : adj(budget.bills_total, 1);
  var tiers = budget.tiers && typeof budget.tiers === "object" ? budget.tiers : {};
  var required = bankNum(budget.must_pay);
  if (required == null) required = bankNum(budget.must_pay_budget);
  if (current && bankNum(tiers.required_total) != null) required = bankNum(tiers.required_total);
  return {
    month: viewKey,
    bills_total: billsTotal,
    must_pay: required,
    left_after_bills: adj(budget.left_after_bills, -1),
    delta: delta
  };
}

function bankPlanTotalsHtml(snap, ym) {
  var t = bankPlanTotals(snap, ym);
  var bits = [];
  if (t.bills_total != null) {
    bits.push('<span data-plan="dues">Bills <b>' + bankEsc(bankMoney(t.bills_total)) + "</b></span>");
  }
  if (t.left_after_bills != null) {
    bits.push('<span data-plan="left-after-bills">Left after bills <b>' + bankEsc(bankMoney(t.left_after_bills)) + "</b></span>");
  }
  if (!bits.length) return "";
  return '<p class="bank-plan-totals">' + bits.join(" ") + "</p>";
}


function bankPart(name, mode, inner) {
  return '<div data-bank-part="' + name + '" data-mode="' + mode + '">' + (inner || "") + "</div>";
}

function bankSnapshotMap(snap) {
  var bag = snap && snap.budget && snap.budget.snapshots;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return {};
  return bag;
}

function bankActualsMap(snap) {
  var bag = snap && snap.budget && snap.budget.actuals_by_month;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return {};
  return bag;
}

function bankSnapshotFor(snap, monthKey) {
  var key = bankMonthKey(monthKey);
  if (!key) return null;
  var shot = bankSnapshotMap(snap)[key];
  if (!shot || typeof shot !== "object" || Array.isArray(shot)) return null;
  return shot;
}

function bankPickerMonths(snap) {
  var seen = {};
  function add(key) {
    var ym = bankMonthKey(key);
    if (ym) seen[ym] = true;
  }
  Object.keys(bankSnapshotMap(snap)).forEach(add);
  Object.keys(bankActualsMap(snap)).forEach(add);
  return Object.keys(seen).sort(function (a, b) {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  });
}

function bankMonthClosed(snap, key) {
  var months = bankMonths(snap);
  var i;
  for (i = 0; i < months.length; i++) {
    if (String(months[i].month) === key) return !bankOpenMonth(months[i]);
  }
  var asof = bankAsofMonthKey(snap);
  if (asof && key >= asof) return false;
  return true;
}

function bankDefaultHistMonth(snap) {
  var keys = bankPickerMonths(snap);
  var asof = bankAsofMonthKey(snap);
  var i;
  for (i = 0; i < keys.length; i++) {
    if (keys[i] < asof && bankMonthClosed(snap, keys[i])) return keys[i];
  }
  for (i = 0; i < keys.length; i++) {
    if (bankMonthClosed(snap, keys[i])) return keys[i];
  }
  return keys.length ? keys[0] : "";
}

function bankHistMonthKey(snap, opts) {
  opts = opts || {};
  var picked = bankMonthKey(opts.histMonth);
  if (!picked && /^\d{4}-\d{2}$/.test(String(opts.month || ""))) picked = bankMonthKey(opts.month);
  if (picked) return picked;
  return bankDefaultHistMonth(snap);
}

function bankTierPick(tiers, keys) {
  tiers = tiers && typeof tiers === "object" ? tiers : {};
  var i;
  for (i = 0; i < keys.length; i++) {
    if (Object.prototype.hasOwnProperty.call(tiers, keys[i])) return tiers[keys[i]];
  }
  return undefined;
}

function bankSnapshotBillRaw(raw) {
  raw = raw || {};
  var days = [];
  if (Array.isArray(raw.due_days)) days = raw.due_days.slice();
  else if (Array.isArray(raw.typical_days)) days = raw.typical_days.slice();
  var due = raw.due_day != null && raw.due_day !== "" ? raw.due_day : raw.typical_day;
  var counted = raw.counted !== false;
  return {
    name: raw.name || raw.label || "Bill",
    amount: raw.amount,
    typical_day: due,
    typical_days: days,
    due_day: due,
    status: counted ? (raw.status || "") : "",
    status_from: raw.status_from || "",
    counted: counted,
    tier: raw.tier || "",
    cadence: raw.cadence || "monthly",
    display_label: raw.display_label || "",
    paid_current_month: raw.paid_current_month || null,
    kind: raw.kind || "",
    note: raw.note || "",
    category: raw.category || "",
    times_per_month: raw.times_per_month,
    monthly_amount: raw.monthly_amount,
    bill_id: raw.bill_id || "",
    prev_key: raw.prev_key || "",
    bank_match: raw.bank_match || null
  };
}

/* Frozen labels come from snapshots_display_aliases, then a live prev_key / renamed_from. */
function bankSnapshotAliasFace(liveBudget, name, kind) {
  var rawName = String(name == null ? "" : name).trim();
  if (!rawName) return "";
  var aliases = liveBudget && liveBudget.snapshots_display_aliases;
  var mapped = bankAliasLookup(aliases && aliases[kind || "bills"], rawName);
  if (!mapped && kind !== "categories") mapped = bankAliasLookup(aliases && aliases.categories, rawName);
  if (mapped) return mapped;
  var bills = [];
  if (liveBudget && Array.isArray(liveBudget.bills)) bills = bills.concat(liveBudget.bills);
  if (liveBudget && Array.isArray(liveBudget.bills_monthly)) bills = bills.concat(liveBudget.bills_monthly);
  var face = "";
  bills.forEach(function (live) {
    if (face || !live || typeof live !== "object") return;
    var liveName = String(live.name || live.label || "").trim();
    if (!liveName || bankKeysMatch(liveName, rawName)) return;
    var keys = bankCollectAliasKeys(live);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (bankKeysMatch(keys[i], rawName)) {
        face = liveName;
        return;
      }
    }
  });
  return face;
}

function bankSnapshotHasPrintedTiers(tiers) {
  if (!tiers || typeof tiers !== "object") return false;
  var keys = ["required_plan", "required_total", "needs_plan", "needs", "wants_plan", "wants", "plan_total_tiers"];
  var i;
  for (i = 0; i < keys.length; i++) {
    if (bankNum(tiers[keys[i]]) != null) return true;
  }
  return false;
}

function bankSnapshotExpected(income) {
  income = income && typeof income === "object" ? income : {};
  if (Object.prototype.hasOwnProperty.call(income, "expected_total")) return income.expected_total;
  if (Object.prototype.hasOwnProperty.call(income, "expected")) return income.expected;
  return undefined;
}

function bankAliasLookup(bag, name) {
  if (!bag || typeof bag !== "object" || Array.isArray(bag) || !name) return "";
  var found = "";
  Object.keys(bag).forEach(function (k) {
    if (found) return;
    if (!bankKeysMatch(k, name)) return;
    found = String(bag[k] || "").trim();
  });
  return found;
}

function bankPartSum(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" || typeof raw === "string") return bankNum(raw);
  var sum = 0;
  var any = false;
  function take(n) {
    var v = bankNum(n);
    if (v == null) return;
    any = true;
    sum += v;
  }
  if (Array.isArray(raw)) {
    raw.forEach(function (row) {
      if (row != null && typeof row === "object") take(row.amount != null ? row.amount : row.value);
      else take(row);
    });
  } else if (typeof raw === "object") {
    Object.keys(raw).forEach(function (k) { take(raw[k]); });
  }
  return any ? sum : null;
}

function bankSnapshotCategoryList(shot) {
  if (!shot || typeof shot !== "object") return [];
  var rows = [];
  if (Array.isArray(shot.categories) && shot.categories.length) {
    rows = shot.categories.map(function (row) {
      if (!row || typeof row !== "object") return row;
      var copy = {};
      Object.keys(row).forEach(function (k) { copy[k] = row[k]; });
      return copy;
    });
  } else {
    var spend = shot.spend || shot.by_category || shot.category_totals;
    if (spend && typeof spend === "object" && !Array.isArray(spend)) {
      rows = Object.keys(spend).map(function (k) { return { name: k, amount: spend[k] }; });
    }
  }
  ["spend_parts", "orig_parts"].forEach(function (key) {
    var bag = shot[key];
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) return;
    Object.keys(bag).forEach(function (name) {
      var summed = bankPartSum(bag[name]);
      if (summed == null) return;
      var hit = null;
      rows.forEach(function (row) {
        if (hit || !row) return;
        if (bankKeysMatch(row.name || row.category, name)) hit = row;
      });
      if (hit) hit.amount = summed;
      else rows.push({ name: name, amount: summed });
    });
  });
  return rows;
}

/* Live print statuses, kept beside a frozen snapshot so an earlier month can still say cancelled later. */
function bankPrintStatusMap(snap) {
  var budget = (snap && snap.budget) || {};
  var bag = {};
  function put(row) {
    if (!row || typeof row !== "object") return;
    var entry = bankCopyStatusEntry(row);
    if (!entry) return;
    var keys = bankBillMatchKeys(row);
    if (!keys.length) keys = [row.name || row.label || row.key || ""];
    keys.forEach(function (k) {
      if (k && !Object.prototype.hasOwnProperty.call(bag, k)) bag[k] = { status: entry.status, from: entry.from };
    });
  }
  (Array.isArray(budget.bills) ? budget.bills : []).forEach(put);
  (Array.isArray(budget.bills_monthly) ? budget.bills_monthly : []).forEach(put);
  bankActiveStatusList(budget).forEach(put);
  return bag;
}

function bankProjectSnapshot(snap, shot, monthKey) {
  var tiers = shot.tiers && typeof shot.tiers === "object" ? shot.tiers : {};
  var income = shot.income && typeof shot.income === "object" ? shot.income : {};
  var expected = bankSnapshotExpected(income);
  var rows = [];
  if (bankNum(expected) != null) {
    var row = {
      label: income.label || "Income",
      amount: bankNum(expected),
      monthly_amount: bankNum(expected),
      cadence: "monthly"
    };
    if (Array.isArray(income.deposits) && income.deposits.length) row.deposits = income.deposits;
    rows.push(row);
  }
  var view = {};
  Object.keys(snap || {}).forEach(function (k) { view[k] = snap[k]; });
  var liveBudget = (snap && snap.budget) || {};
  view.budget = {
    tiers: {
      required_plan: bankTierPick(tiers, ["required_plan", "required_total"]),
      required_total: bankTierPick(tiers, ["required_total", "required_plan"]),
      needs_plan: bankTierPick(tiers, ["needs_plan", "needs"]),
      wants_plan: bankTierPick(tiers, ["wants_plan", "wants"]),
      plan_total_tiers: tiers.plan_total_tiers,
      left_after_tiers: Object.prototype.hasOwnProperty.call(tiers, "left_after_tiers") ? tiers.left_after_tiers : undefined,
      plan_dedupe_total: shot.plan_dedupe_total != null ? shot.plan_dedupe_total : tiers.plan_dedupe_total,
      required_card_payments: tiers.required_card_payments
    },
    bills: (Array.isArray(shot.bills) ? shot.bills : []).map(function (raw) {
      var row = bankSnapshotBillRaw(raw);
      if (!row.display_label) {
        var face = bankSnapshotAliasFace(liveBudget, row.name, "bills");
        if (face && !bankKeysMatch(face, row.name)) row.display_label = face;
      }
      return row;
    }),
    bills_monthly: [],
    subscriptions: Array.isArray(shot.subs) ? shot.subs : (Array.isArray(shot.subscriptions) ? shot.subscriptions : []),
    planned_by_category: shot.planned_by_category && typeof shot.planned_by_category === "object" ? shot.planned_by_category : {},
    income_monthly: rows,
    income_total: expected === undefined ? null : expected,
    calendar: Array.isArray(shot.calendar) ? shot.calendar : [],
    insights: [],
    mtd_actual_by_category: {},
    actuals_by_month: liveBudget.actuals_by_month || {},
    snapshots: liveBudget.snapshots || {},
    plan_dedupe: [],
    other_income: [],
    pay_schedule: Array.isArray(shot.pay_schedule) ? shot.pay_schedule : []
  };
  if (!bankSnapshotHasPrintedTiers(tiers)) {
    var catList = bankSnapshotCategoryList(shot).map(function (c) {
      if (!c) return c;
      var name = c.name || c.category || "";
      var face = bankSnapshotAliasFace(liveBudget, name, "categories");
      if (!face || bankKeysMatch(face, name)) return c;
      var copy = {};
      Object.keys(c).forEach(function (k) { copy[k] = c[k]; });
      copy.name = face;
      return copy;
    });
    if (catList.length) {
      var sums = bankTierSumsFromCats(snap, catList);
      var total = sums.required + sums.needs + sums.wants;
      view.budget.tiers.required_plan = sums.required;
      view.budget.tiers.required_total = sums.required;
      view.budget.tiers.needs_plan = sums.needs;
      view.budget.tiers.wants_plan = sums.wants;
      view.budget.tiers.plan_total_tiers = total;
    }
  }
  var liveStatus = snap && snap.tier_doc && snap.tier_doc.bill_status;
  view._bankLiveStatus = liveStatus && typeof liveStatus === "object" && !Array.isArray(liveStatus) ? liveStatus : {};
  view._bankPrintStatus = bankPrintStatusMap(snap);
  view.tier_doc = { plans: {}, rules: {} };
  view._tiersFromGet = true;
  view.mustpay_overrides = {};
  view._bankSnapshotMonth = monthKey;
  return view;
}

function bankActualBag(snap, monthKey) {
  var key = bankMonthKey(monthKey);
  var bag = bankActualsMap(snap)[key];
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  if (!bankCalendarBlockOk(bag, key)) return null;
  return bag;
}

function bankFlowMatchesMonth(snap, monthKey) {
  var flow = snap && snap.current && snap.current.month_flow;
  if (!flow || typeof flow !== "object" || Array.isArray(flow)) return null;
  var key = bankMonthKey(monthKey);
  if (bankMonthKey(flow.month) !== key) return null;
  if (!bankCalendarBlockOk(flow, key)) return null;
  return flow;
}

function bankTierActuals(snap, monthKey, mode) {
  var out = { required: null, needs: null, wants: null, income: null, other: null, spent: null, unposted: [] };
  var key = bankMonthKey(monthKey);
  var flow = mode === "current" ? bankFlowMatchesMonth(snap, key) : null;
  var agg = { tiers: false, income: false, other: false, spent: false };
  if (mode === "current") {
    if (flow) {
      agg.tiers = true;
      agg.income = true;
      agg.other = true;
      agg.spent = true;
      out.required = bankNum(flow.required_spent) || 0;
      out.needs = bankNum(flow.needs_spent) || 0;
      out.wants = bankNum(flow.wants_spent) || 0;
      var inn = bankNum(flow.income_received);
      if (inn == null) inn = bankNum(flow.money_in);
      out.income = inn;
      out.other = bankNum(flow.other_income);
      var spent = bankNum(flow.money_out);
      if (spent == null) spent = (out.required || 0) + (out.needs || 0) + (out.wants || 0);
      out.spent = spent;
      var mtd = snap && snap.budget && snap.budget.tiers_mtd;
      var mtdMonth = mtd && typeof mtd === "object" ? bankMonthKey(mtd.month) : "";
      if (mtd && (!mtdMonth || mtdMonth === key) && Array.isArray(mtd.required_known_unposted)) {
        out.unposted = mtd.required_known_unposted;
      }
    } else {
      var live = bankTierSpend(snap, key);
      out.required = live.required;
      out.needs = live.needs;
      out.wants = live.wants;
      out.unposted = live.unposted || [];
      out.income = bankMtdIncome(snap, key);
      var listed = bankOtherIncomeMtd(snap, key);
      out.other = listed && listed.total != null ? listed.total : null;
      out.spent = bankMtdSpend(snap && snap.budget, snap, key);
      if (out.spent == null) {
        var walkedOut = bankMonthFlow(snap, key);
        if (walkedOut && walkedOut.outSum > 0) out.spent = walkedOut.outSum;
      }
    }
  }
  var bag = bankActualBag(snap, key);
  if (!bag) {
    if (agg.tiers || agg.income || agg.other || agg.spent) bankApplyRetagDeltas(snap, key, out, agg);
    return out;
  }
  function take(field, bagKey) {
    if (!Object.prototype.hasOwnProperty.call(bag, bagKey)) return false;
    out[field] = bankNum(bag[bagKey]);
    return true;
  }
  /* month_flow owns Current tier spent when its month is today. The bag still fills income. */
  if (!flow) {
    var tookTier = false;
    if (take("required", "required_spent")) tookTier = true;
    if (take("needs", "needs_spent")) tookTier = true;
    if (take("wants", "wants_spent")) tookTier = true;
    if (tookTier) agg.tiers = true;
  }
  if (take("income", "income_received")) agg.income = true;
  if (take("other", "other_income")) agg.other = true;
  var hasSpend = !flow && ["required_spent", "needs_spent", "wants_spent"].some(function (k) {
    return Object.prototype.hasOwnProperty.call(bag, k);
  });
  if (hasSpend) {
    var sum = 0;
    var any = false;
    ["required", "needs", "wants"].forEach(function (k) {
      if (out[k] == null) return;
      any = true;
      sum += out[k];
    });
    out.spent = any ? sum : null;
    agg.spent = true;
  }
  if (agg.tiers || agg.income || agg.other || agg.spent) bankApplyRetagDeltas(snap, key, out, agg);
  return out;
}

function bankRenderNextPay(snap, opts, mode) {
  if (mode === "historical") return "";
  var html = bankNextPaySection(snap, opts);
  if (html) return html;
  return '<section class="bank-next"><h2>Next pay</h2><div class="card span"><p class="bank-empty">No paycheck dated in this print.</p></div></section>';
}

function bankScaleSlices(rows, plan) {
  if (!rows.length || plan == null || !(plan > 0)) return rows;
  var sum = 0;
  rows.forEach(function (r) { sum += r.amount || 0; });
  if (!(sum > 0) || plan - sum < 0.02) return rows;
  var copy = rows.map(function (r) {
    var next = {};
    Object.keys(r).forEach(function (k) { next[k] = r[k]; });
    return next;
  });
  copy.push({ name: "Plan balance", amount: Math.round((plan - sum) * 100) / 100, tier: "" });
  return copy;
}

function bankLayoutDueArg(view, mode) {
  if (mode === "historical") return undefined;
  return bankHasDueMap(view) ? bankDueMap(view) : undefined;
}

function bankRenderDueList(view, opts, mode, month, missing) {
  var listTitle = (opts && opts.listTitle) || "Due this month";
  if (mode === "historical" && missing) {
    return '<section class="bank-due-month">' + bankDueHeading(listTitle) + '<p class="bank-empty">No saved budget for this month</p></section>';
  }
  var budget = (view && view.budget) || {};
  var edits = mode === "historical" ? null : (opts && opts.edits);
  var bills = bankPreparedBills(view, bankLayoutDueArg(view, mode)).filter(function (b) { return !bankBillRetired(b, month); });
  var subs = bankNormalizeSubs(budget);
  var dueOpts = { now: opts && opts.now, mode: mode, listTitle: listTitle };
  return bankDueMonthHtml(view, month, edits, subs, bills, dueOpts);
}

function bankCalendarHeading(mode) {
  if (mode === "plan") return "Due calendar \u00b7 plan";
  if (mode === "current") return "Due calendar \u00b7 this month";
  return "Due calendar";
}

function bankRenderCalendar(view, opts, mode, month, missing) {
  var heading = bankCalendarHeading(mode);
  if (mode === "historical" && missing) {
    return '<section class="bank-cal"><h2>' + heading + '</h2><div class="card span"><p class="bank-empty">No saved budget for this month</p></div></section>';
  }
  var budget = (view && view.budget) || {};
  var edits = mode === "historical" ? null : (opts && opts.edits);
  var bills = bankPreparedBills(view, bankLayoutDueArg(view, mode)).filter(function (b) {
    return !bankBillRetired(b, month) && bankBillCounted(b);
  });
  var incomes = bankAttachIncomePlan(bankApplyIncomeEdits(bankNormalizeIncome(budget), edits), month);
  var subs = bankNormalizeSubs(budget).filter(bankBillCounted);
  var retiredKeys = {};
  bankPreparedBills(view, undefined).forEach(function (b) {
    if (!b || !bankBillRetired(b, month)) return;
    retiredKeys[bankBillKey(b.name)] = true;
    if (b.bill_id) retiredKeys[String(b.bill_id)] = true;
  });
  var calendar = bankCalendarForBills(Array.isArray(budget.calendar) ? budget.calendar : [], budget).map(function (c) {
    if (!c) return c;
    var items = (c.items || []).filter(function (item) {
      var label = typeof item === "string" ? item : (item && (item.name || item.label)) || "";
      var id = item && typeof item === "object" ? item.bill_id : "";
      if (label && retiredKeys[bankBillKey(label)]) return false;
      if (id && retiredKeys[String(id)]) return false;
      return true;
    });
    return { day: c.day, items: items };
  });
  var cells = bankDayCells(bills, incomes, calendar, month);
  bankPlaceSubs(cells, subs, month);
  var picked = "";
  var openDay = bankDay(opts && opts.openDay);
  if (openDay) {
    var items = bankDayItems(view, month, openDay, edits);
    picked = '<div class="bank-cal-picked"><h2>' + bankEsc(BANK_MONTHS[(month.month || 1) - 1] + " " + openDay) + "</h2>" +
      (items.length ? "<div class=\"mix-legend\">" + items.map(function (it) {
        return '<div class="mix-leg"><span class="mix-leg-name">' + bankEsc(it.name) + "</span> <span class=\"mix-amt\">" +
          bankEsc(it.amount || "\u2014") + "</span></div>";
      }).join("") + "</div>" : '<p class="bank-empty">Nothing scheduled</p>') + "</div>";
  }
  return '<section class="bank-cal"><h2>' + heading + '</h2><div class="card span">' +
    bankCalendarHtml(cells, bankHasDueDays(cells), month, bankBillCalendarAmounts(bills, month, edits), bankBillFaceMap(bills), { hideNav: mode === "current" }) +
    picked + "</div></section>";
}

function bankSnapshotPlan(shot, key) {
  if (!shot) return null;
  var tiers = shot.tiers || {};
  var keys = key === "required" ? ["required_plan", "required_total"] : key === "needs" ? ["needs_plan", "needs"] : ["wants_plan", "wants"];
  var picked = bankTierPick(tiers, keys);
  if (picked === undefined) return null;
  return bankNum(picked);
}
function bankPrintedTierPlan(snap, ym, key) {
  var keyMonth = bankMonthKey(ym);
  var shot = keyMonth ? bankSnapshotFor(snap, keyMonth) : null;
  var tiers = {};
  if (shot && bankSnapshotHasPrintedTiers(shot.tiers)) tiers = shot.tiers;
  else tiers = (snap && snap.budget && snap.budget.tiers) || {};
  var printed;
  if (key === "required") printed = tiers.required_plan != null ? tiers.required_plan : tiers.required_total;
  else if (key === "needs") printed = tiers.needs_plan != null ? tiers.needs_plan : tiers.needs;
  else printed = tiers.wants_plan != null ? tiers.wants_plan : tiers.wants;
  var n = bankNum(printed);
  if (n == null && key === "required" && !(shot && bankSnapshotHasPrintedTiers(shot.tiers))) {
    var budget = (snap && snap.budget) || {};
    if (bankNum(budget.bills_total_effective) != null) n = bankNum(budget.bills_total_effective);
  }
  return n;
}

function bankAlignTierGroups(groups, snap, ym) {
  groups = groups || { required: [], needs: [], wants: [] };
  ["required", "needs", "wants"].forEach(function (key) {
    var plan = bankPrintedTierPlan(snap, ym, key);
    var rows = (groups[key] || []).slice();
    if (plan == null) {
      groups[key] = rows;
      return;
    }
    var bills = rows.filter(function (r) { return r && r.bill; });
    var rest = rows.filter(function (r) { return r && !r.bill; });
    var sum = 0;
    bills.forEach(function (r) { sum += r.amount || 0; });
    var kept = bills.slice();
    rest.forEach(function (r) {
      if (sum + (r.amount || 0) <= plan + 0.004) {
        kept.push(r);
        sum += r.amount || 0;
      }
    });
    sum = bankRoundCents(sum);
    if (plan - sum > 0.004) kept.push({ name: "Other", amount: bankRoundCents(plan - sum), key: "other" });
    groups[key] = kept;
  });
  return groups;
}

function bankTierSummaryHtml(snap, opts, mode, month, view, actuals, missing, shot) {
  if (mode === "historical" && missing) {
    return '<section class="bank-tier-summary"><h2>Tier summary</h2><div class="card span"><p class="bank-empty">No saved budget for this month.</p></div></section>';
  }
  var spentBag = actuals;
  if (!spentBag) {
    try { spentBag = bankTierActuals(snap, bankMonthKey(month), "current"); } catch (e) { spentBag = null; }
  }
  var body = ["required", "needs", "wants"].map(function (key) {
    var plan = bankPrintedTierPlan(snap, month, key);
    var spent = spentBag ? spentBag[key] : null;
    return bankVsRowHtml(bankTierLabel(key), spent, plan, ' data-tier="' + key + '"');
  }).join("");
  return '<section class="bank-tier-summary"><h2>Tier summary</h2><div class="card span"><ul class="mix-legend">' +
    body + "</ul></div></section>";
}

function bankMoreDetailsHtml(snap, opts, mode, month, view, actuals, missing) {
  opts = opts || {};
  var bits = [];
  var blocks = bankFundingAccountBlocks(snap, { monthKey: bankMonthKey(month), now: opts.now });
  if (blocks) bits.push(bankMixMore("By account", blocks));
  if (!(mode === "historical" && missing)) {
    var edits = mode === "historical" ? null : opts.edits;
    var groups = bankAlignTierGroups(bankCollectTierRows(view, month, edits, false), snap, month);
    var today = bankScreenToday(view, opts);
    var todayIso = today ? bankDateKey(today.year, today.month, today.day) : "";
    var lists = bankTierRowLists(groups, {
      today: todayIso,
      mode: mode === "historical" ? "historical" : (mode || "plan"),
      month: month,
      edits: edits
    });
    if (lists) bits.push(lists);
  }
  if (mode === "plan") {
    var budget = (snap && snap.budget) || {};
    var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
    var bills = bankPreparedBills(snap, dueArg).filter(function (b) {
      return b && !bankBillRetired(b, month) && bankBillCounted(b);
    });
    var insights = bankNormalizeInsights(budget);
    if (insights.length) {
      bits.push('<section class="bank-insight-block"><h2>Insights</h2><ul class="bank-insights">' +
        insights.map(function (row) {
          var cls = "bank-insight" + (row.severity ? " sev-" + row.severity : "");
          return '<li class="' + cls + '">' + bankEsc(bankInsightText(row)) + "</li>";
        }).join("") + "</ul></section>");
    }
    var bars = bankBudgetBars(budget, month, bills, opts.edits, snap);
    var viewKey = bankMonthKey(month);
    var asofKey = bankAsofMonthKey(snap);
    if (viewKey && asofKey && viewKey !== asofKey) bars.forEach(function (r) { r.over = false; });
    if (bars && bars.length) bits.push('<section class="bank-bars"><h2>Progress vs limits</h2>' + bankBarsHtml(bars, "") + "</section>");
  }
  if (mode === "current" && month && month.year) {
    bits.push(bankMtdBlock(snap, month));
    var tiles = bankPairBalances(bankAccounts(snap), (snap.current && snap.current.balances) || []);
    var total = bankTotalCash(snap.current, tiles);
    var stale = bankStale(snap.asof, opts.now);
    var asof = bankAsofLabel(snap.asof) || "\u2014";
    var title = bankMonthTitle(month.year, month.month);
    bits.push('<p class="hint">' + bankEsc(title + " \u00b7 as of " + asof + " \u00b7 day " + month.day + " of " +
      bankMonthDim(month.year, month.month) + (stale ? " \u00b7 out of date" : "")) + "</p>");
    var quiet = bankCurrentQuietNote(snap, month);
    if (quiet) bits.push(quiet);
    bits.push(bankTilesHtml(tiles, total));
    bits.push(bankIoHtml(bankMonthFlow(snap, month)));
    bits.push(bankTapeHtml(bankRecent(snap, month)));
  }
  if (mode === "historical") {
    var mom = bankMomHtml(snap);
    if (mom) bits.push(mom);
  }
  return bankMixMore("More details", bits.filter(Boolean).join("") || '<p class="bank-empty">Nothing else in this print.</p>');
}

function bankSharedLayout(snap, opts, mode, month) {
  opts = opts || {};
  var monthKey = bankMonthKey(month);
  var screenKey = bankMonthKey(mode === "current" ? bankTodayYmET(opts.now) : bankScreenMonth(snap, opts));
  var past = mode === "historical" && monthKey && screenKey && monthKey !== screenKey && monthKey < screenKey;
  var shot = mode === "historical" || mode === "current" ? bankSnapshotFor(snap, monthKey) : null;
  var missing = mode === "historical" && past && !shot;
  var view = shot ? bankProjectSnapshot(snap, shot, monthKey) : snap;
  var actuals = bankTierActuals(snap, monthKey, mode === "plan" ? "current" : mode);
  var planView = past ? view : snap;
  var listTitle = "Due this month";
  var fundOpts = { monthKey: monthKey, now: opts.now, past: past, monthTitle: "Account funding", hideMoves: past };
  var ledgerOpts = Object.assign({}, opts, { listTitle: listTitle, past: past });
  var ledger = bankRenderDueList(planView, ledgerOpts, mode, month, missing);
  var incomeOpts = Object.assign({}, opts, { edits: past ? null : opts.edits });
  var parts = [];
  if (mode !== "historical") parts.push(bankPart("next", mode, bankRenderNextPay(snap, opts, mode)));
  parts.push(bankPart("funding", mode, bankFundingHtml(past ? planView : snap, fundOpts, ledger)));
  parts.push(bankPart("calendar", mode, bankRenderCalendar(planView, opts, mode, month, missing)));
  parts.push(bankPart("income", mode, bankIncomeListHtml(null, month, planView, incomeOpts)));
  parts.push(bankPart("tiers", mode, bankTierSummaryHtml(snap, opts, mode, month, planView, actuals, missing, shot)));
  parts.push(bankPart("more", mode, bankMoreDetailsHtml(snap, opts, mode, month, planView, actuals, missing)));
  return parts.join("");
}

function bankMomPair(plan, actual, income) {
  var p = bankNum(plan);
  var a = bankNum(actual);
  var delta = (p == null || a == null) ? null : a - p;
  var word = "\u2014";
  var cls = "bank-delta";
  if (delta != null && Math.abs(delta) < 0.0001) word = "even";
  else if (delta != null && delta > 0) {
    word = "over " + bankMoney(delta);
    cls += income ? " good" : " bad";
  } else if (delta != null) {
    word = "under " + bankMoney(Math.abs(delta));
    cls += income ? " bad" : " good";
  }
  return '<b>plan ' + bankMoney(p) + "</b> <b>actual " + bankMoney(a) + '</b> <em class="' + cls + '">' + bankEsc(word) + "</em>";
}

function bankMomHtml(snap) {
  var keys = bankPickerMonths(snap);
  if (!keys.length) return "";
  var items = keys.map(function (key) {
    var shot = bankSnapshotFor(snap, key) || {};
    var tiers = shot.tiers && typeof shot.tiers === "object" ? shot.tiers : {};
    var bag = bankActualBag(snap, key) || {};
    var income = shot.income && typeof shot.income === "object" ? shot.income : {};
    var anySpent = ["required_spent", "needs_spent", "wants_spent"].some(function (k) { return bankNum(bag[k]) != null; });
    var totalActual = anySpent ? ["required_spent", "needs_spent", "wants_spent"].reduce(function (sum, k) {
      var n = bankNum(bag[k]);
      return sum + (n == null ? 0 : n);
    }, 0) : null;
    function line(label, plan, actual, incomeLine) {
      return "<p><span>" + bankEsc(label) + "</span> " + bankMomPair(plan, actual, incomeLine) + "</p>";
    }
    return '<li data-mom="' + bankEsc(key) + '">' +
      line("Required", bankTierPick(tiers, ["required_plan", "required_total"]), bag.required_spent, false) +
      line("Needs", bankTierPick(tiers, ["needs_plan", "needs"]), bag.needs_spent, false) +
      line("Wants", bankTierPick(tiers, ["wants_plan", "wants"]), bag.wants_spent, false) +
      line("Total", tiers.plan_total_tiers, totalActual, false) +
      line("Income", bankSnapshotExpected(income), bag.income_received, true) +
      "</li>";
  }).join("");
  return '<section class="bank-mom"><h2>Month over month</h2>' +
    bankCapList('<ul class="bank-mom-list">' + items + "</ul>", keys.length, "Month over month") + "</section>";
}

function bankMonthInProgress(snap, key) {
  return !bankMonthClosed(snap, key);
}

function bankHistPickerHtml(snap, opts) {
  var key = bankHistMonthKey(snap, opts);
  var keys = bankPickerMonths(snap).filter(function (ym) { return !bankMonthInProgress(snap, ym); });
  if (key && keys.indexOf(key) < 0) keys.push(key);
  keys.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });
  var options = keys.map(function (ym) {
    var title = bankMonthTitle(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
    return '<option value="' + bankEsc(ym) + '"' + (ym === key ? " selected" : "") + ">" + bankEsc(title) + "</option>";
  }).join(" ");
  if (!options) options = '<option value="">No months</option>';
  return '<label class="bank-month-pick">Month <select class="bank-hist-select" data-bank-hist-month aria-label="Historical month">' +
    options + "</select></label>";
}

function bankHistChrome(snap, opts) {
  return "";
}

function bankBudgetHtml(snap, opts) {
  opts = opts || {};
  var ym = bankScreenMonth(snap, opts);
  var openDay = bankDay(opts.openDay);
  return bankSharedLayout(snap, opts, "plan", ym) +
    (openDay ? bankDayDialogHtml(snap, ym, openDay, opts.edits) : "");
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

function bankCatPickerHtml(known, picked) {
  return '<label class="bank-cat-pick">Category <select data-bank-cat aria-label="Category">' +
    bankChipOptions(known || [], picked) + "</select></label>";
}

function bankEditTxListHtml(rows, known, picked, rowAdd) {
  var assignCats = known || [];
  var addingKey = rowAdd && rowAdd.key ? String(rowAdd.key) : "";
  if (!rows || !rows.length) return '<p class="bank-empty">No transactions in this print.</p>';
  var mine = rows.filter(function (r) { return r.category === picked; });
  if (!mine.length) return '<p class="bank-empty">No items in this category.</p>';
  var txItems = mine.map(function (r) {
    var label = bankBillDisplayName(bankItemLabel(r.desc));
    var date = r.date ? String(r.date) : "\u2014";
    var control = addingKey && r.key === addingKey
      ? bankRowAddHtml(r, rowAdd.draft)
      : '<select class="bank-chip" data-bank-tx="' + bankEsc(r.key) + '" aria-label="Category for ' + bankEsc(label) + '">' +
        bankChipOptions(assignCats, r.category) + " " + bankRowAddOption() + "</select>";
    return "<li><span class=\"bank-edit-id\"><span class=\"bank-merchant\">" + bankEsc(label) +
      '</span> <span class="bank-edit-meta">' + bankEsc(date) +
      '</span></span> <span class="bank-edit-side">' + control +
      " <b>" + bankMoney(r.amount) + "</b></span></li>";
  }).join("");
  return bankCapList('<ul class="bank-edit-list">' + txItems + "</ul>", mine.length, "Transactions");
}

function bankEditTxHtml(rows, known, picked, rowAdd) {
  return bankCatPickerHtml(known, picked) + bankEditTxListHtml(rows, known, picked, rowAdd);
}

function bankBillControlKey(b) {
  if (b && b.bill_id) return String(b.bill_id).trim();
  return bankBillKey(b && b.name);
}

function bankMatchConfidenceLabel(conf) {
  var c = String(conf || "").trim().toLowerCase();
  if (c === "high") return "Matched";
  if (c === "med" || c === "medium") return "Likely match";
  if (c === "low") return "Weak match";
  return "";
}

function bankMatchHits(row) {
  var match = row && row.bank_match;
  var hits = match && Array.isArray(match.recent_hits) ? match.recent_hits : [];
  return hits.filter(function (hit) { return hit && typeof hit === "object"; });
}

function bankTxFallbackHits(snap, row) {
  var hits = [];
  var seen = {};
  var cur = snap && snap.current;
  var lists = [];
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  lists.forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) === "in") return;
      var key = raw.tx_key || bankTxKey(raw);
      if (key && seen[key]) return;
      var ok = bankBillMatchesKey(row, raw.category || "") || bankBillMatchesKey(row, raw.desc || "") ||
        bankBillMatchesKey(row, raw.name || "") || bankBillMatchesKey(row, raw.merchant_key || "");
      if (!ok) return;
      if (key) seen[key] = true;
      hits.push({
        date: raw.date,
        amount: raw.amount,
        account_last4: raw.account_last4 || (raw.account && raw.account.last4) || "",
        description: raw.desc || raw.description || "",
        tx_key: key || ""
      });
    });
  });
  hits.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  return hits.slice(0, 6);
}

function bankMatchEmpty(row, snap) {
  var match = row && row.bank_match;
  if (!match) return !bankTxFallbackHits(snap, row).length;
  var conf = String(match.confidence || "").trim().toLowerCase();
  if (conf === "none") return true;
  return !bankMatchHits(row).length;
}

function bankConfirmSentence(row, status, snap) {
  var name = bankBillDisplayName(row && row.name, row && row.display_label);
  var verb = status === "paid_off" ? "Mark " + name + " paid off?" : "Cancel " + name + "?";
  var hits = bankMatchHits(row);
  if (!hits.length && !(row && row.bank_match)) hits = bankTxFallbackHits(snap, row);
  var conf = String(row && row.bank_match && row.bank_match.confidence || "").trim().toLowerCase();
  if (!hits.length || conf === "none") return verb + " No matching payments found";
  var hit = hits[0];
  var when = bankShortDate(hit.date) || hit.date || "";
  var paidAmt = bankNum(hit.amount);
  return verb + " Last payment: " + String(hit.description || "payment") + ", " +
    bankMoney(paidAmt == null ? null : Math.abs(paidAmt)) + (when ? " on " + when : "");
}

function bankMatchTypicalHtml(match) {
  if (!match || typeof match !== "object") return "";
  var dayList = Array.isArray(match.typical_days) && match.typical_days.length ? match.typical_days : null;
  var day = match.typical_day != null && match.typical_day !== "" ? match.typical_day : match.typical_pay_day;
  var amount = match.typical_amount;
  var basis = match.typical_basis == null ? "" : String(match.typical_basis).trim();
  if (!dayList && (day == null || day === "") && amount == null && !basis) return "";
  var days = dayList ? dayList.join(" and ") : (day != null && day !== "" ? String(day) : "");
  var hint = "";
  if (basis === "plan_fallback") hint = ' <span class="hint">from plan</span>';
  else if (basis) hint = ' <span class="hint">' + bankEsc(basis) + "</span>";
  return "<p>Usually around day " + bankEsc(days || "\u2014") + ", about " + bankMoney(amount) + hint + "</p>";
}

function bankBillMatchHtml(b, snap) {
  var match = b && b.bank_match;
  var hits = bankMatchHits(b).slice(0, 6);
  if (!match) hits = bankTxFallbackHits(snap, b);
  var empty = bankMatchEmpty(b, snap);
  var warn = empty ? '<p class="bank-match-miss">No matching payments found</p>' : "";
  if (!match && !hits.length) return warn;
  var conf = bankMatchConfidenceLabel(match && match.confidence);
  var confHtml = conf ? '<p class="bank-match-conf">' + bankEsc(conf) + " </p>" : "";
  var descriptors = match && Array.isArray(match.descriptors) ? match.descriptors.slice(0, 5) : [];
  var descHtml = descriptors.length ? "<p>" + descriptors.map(function (d) { return bankEsc(d); }).join(", ") + "</p>" : "";
  var list = hits.map(function (hit) {
    var when = bankShortDate(hit.date) || hit.date || "";
    var mask = bankAccountMask(hit.account_last4);
    var desc = String(hit.description || "");
    var shown = bankBillDisplayName(desc);
    if (shown && shown !== desc && (bankKeysMatch(desc, b && b.name) || bankBillDisplayName(b && b.name, b && b.display_label) === shown)) desc = shown;
    return "<li><span>" + bankEsc(when) + "</span> <b>" + bankMoney(hit.amount) + "</b> <i>" +
      bankEsc(mask) + " " + bankEsc(desc) + "</i></li>";
  }).join("");
  var capped = list ? bankCapList('<ul class="bank-match-hits">' + list + "</ul>", hits.length, "Matching payments") : "";
  var typical = bankMatchTypicalHtml(match);
  return warn + '<details class="bank-match"><summary>How it shows in your account</summary>' +
    confHtml + descHtml + capped + typical + "</details>";
}

function bankBillStatusControls(b, ym, confirm) {
  var key = bankBillControlKey(b);
  var label = bankBillDisplayName(b.name, b.display_label);
  var month = bankMonthKey(ym);
  var printLocked = b.status_source === "print" && !!bankBillStatus(b) && !b.status_undo;
  if (printLocked) {
    var badge = b.status === "paid_off" ? '<span class="fresh-chips"><span class="fresh-chip">Paid off</span></span>' : "";
    return '<span class="bank-bill-status"><span class="fresh-chips"><span class="fresh-chip">set by data feed</span></span>' + badge + "</span>";
  }
  var from = b.status === "cancelled" && b.status_from ? b.status_from : "";
  var active = !bankBillStatus(b);
  var paid = b.paid_current_month;
  var paidNow = paid && bankMonthKey(paid.month) === month && (paid.status === "paid" || paid.status === "paid_late");
  var merged = paidNow && String(paid.source || "").toLowerCase() === "bank";
  var marked = paidNow && (b.manual_paid || String(paid.source || "").toLowerCase() === "manual");
  var rawName = b && b.name ? String(b.name) : key;
  var ariaName = label;
  if (rawName && bankBillKey(rawName) !== bankBillKey(label) && !/childcare/i.test(rawName)) ariaName = label + " " + bankBillSlug(rawName);
  var paidControl = merged || marked
    ? '<span class="bank-paid-month">Paid this month \u2713</span>'
    : '<button type="button" class="book-chip" data-bank-paid-month="' + bankEsc(key) + '" aria-label="Paid this month ' + bankEsc(ariaName) +
      '">Paid this month</button>';
  var undo = (b.status_undo || b.manual_paid) ? ' <button type="button" data-bank-status-undo="' + bankEsc(key) +
    '" aria-label="Undo ' + bankEsc(ariaName) + '">Undo</button>' : "";
  var pending = confirm && String(confirm.key) === String(key) ? '<p class="bank-confirm" role="status">' + bankEsc(confirm.text) +
    ' <button type="button" data-bank-confirm="' + bankEsc(key) + '" data-bank-confirm-status="' + bankEsc(confirm.status) +
    '">Confirm</button></p>' : "";
  return '<span class="bank-bill-status"><label>Status <select data-bank-status="' + bankEsc(key) + '" aria-label="Status for ' + bankEsc(label) + '">' +
    '<option value=""' + (active ? " selected" : "") + '>Active</option> ' +
    '<option value="cancelled"' + (b.status === "cancelled" ? " selected" : "") + '>Cancelled</option> ' +
    '<option value="paid_off"' + (b.status === "paid_off" ? " selected" : "") + '>Paid off</option>' +
    "</select></label> " +
    '<label>Cancelled from <input type="month" data-bank-cancel="' + bankEsc(key) +
    '" value="' + bankEsc(from) + '" aria-label="Cancelled from for ' + bankEsc(label) + '"></label> ' +
    '<button type="button" class="act" data-bank-status-save="' + bankEsc(key) + '" aria-label="Save ' + bankEsc(ariaName) +
    '">Save</button> ' +
    paidControl + undo + "</span>" + pending;
}

function bankEditBillHtml(bills, ym, edits, confirm, snap) {
  if (!bills || !bills.length) return '<p class="bank-empty">No bills in this print.</p>';
  var items = bills.map(function (b) {
    var key = bankBillKey(b.name);
    var label = bankBillDisplayName(b.name, b.display_label);
    var shown = bankBillLineAmount(b, ym, edits);
    var pending = shown == null;
    var paid = bankBillPaidStatus(b, ym);
    var flag = paid ? ' data-paid="' + bankEsc(paid) + '"' : "";
    var dueControl;
    if (b.set_aside || bankIsSetAside(b)) {
      dueControl = '<span class="bank-due-fixed">' + bankMetaHtml("Set-aside \u00b7 no due day") + "</span>";
    } else if (bankIsTwiceBill(b)) {
      var fixed = bankBillDueDays(b, ym);
      dueControl = '<span class="bank-due-fixed">Days ' + bankEsc(fixed.join(" and ")) + "</span>";
    } else {
      dueControl = '<select class="bank-chip" data-bank-due="' + bankEsc(key) +
        '" aria-label="Due day for ' + bankEsc(label) + '">' + bankDayOptions(b.typical_day) + "</select>";
    }
    var dayText = b.set_aside || bankIsSetAside(b) ? "Set-aside" : (bankIsTwiceBill(b) ? ("Days " + bankBillDueDays(b, ym).join(" and ")) : (b.typical_day != null ? ("day " + b.typical_day) : ""));
    var paidCap = bankBillPaidCaption(b, ym);
    var statusHtml = paidCap ? bankMetaHtml(paidCap) : bankEsc(b.status === "paid_off" ? "Paid off" : (b.status === "cancelled" ? "Cancelled" : "Unpaid"));
    var fresh = bankBillFreshCaption(b, ym);
    var freshHtml = fresh ? '<p class="hint">' + bankMetaHtml(fresh) + "</p>" : "";
    var tierCtx = bankKindContext(snap);
    var tier = bankResolveTier(b.name, snap, tierCtx, b);
    var tierPick = '<select class="bank-chip" data-bank-kind="' + bankEsc(b.name) + '" aria-label="Tier for ' +
      bankEsc(label) + '">' + bankKindOptions(tier) + "</select>";
    return "<li" + flag + "><details class=\"fills-more\"><summary><span class=\"fills-sum\"><span class=\"bank-merchant\">" + bankEsc(label) +
      "</span></span> <span class=\"sub\">" + bankEsc(dayText) + "</span> <b" + (pending ? ' class="bank-pending"' : "") + ">" +
      bankEsc(bankBillAmount(shown)) + "</b> <span class=\"sub\">" + statusHtml + "</span> " +
      '<span class="fills-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
      '<span class="fills-lab-show">Show</span> <span class="fills-lab-hide">Hide</span></span></summary>' +
      '<div class="bank-edit-side"><span class="bank-kind-name">' + bankEsc(label) + "</span> " + dueControl + " " + tierPick + " " + bankBillStatusControls(b, ym, confirm) + "</div>" +
      freshHtml + bankBillMatchHtml(b, snap) + "</details></li>";
  }).join("");
  return bankCapList('<ul class="bank-edit-list">' + items + "</ul>", bills.length, "Bills");
}

function bankCapList(html, count, label) {
  var max = 10;
  if (!(count > max)) return html;
  if (typeof MPListCap !== "undefined" && MPListCap && MPListCap.capHtml) {
    return MPListCap.capHtml(html, { count: count, max: max, label: label || "List" });
  }
  return '<div class="list-cap" tabindex="0" role="region" aria-label="' + bankEsc(label || "List") + '">' + html +
    '</div><p class="list-cap-note">Showing ' + max + " of " + count + ", scroll for more</p>";
}

function bankPlanFieldHtml(snap, ym, key, label) {
  var fig = bankPlanNumbers(snap, ym, null);
  var value = fig && fig[key] != null ? String(fig[key]) : "";
  var clear = value !== "" ? ' <button type="button" class="act ghost" data-bank-plan-clear="' + key +
    '" aria-label="Clear ' + bankEsc(label) + '">\u00d7</button>' : "";
  return '<label>' + bankEsc(label) + ' <input data-bank-plan-tier="' + key + '" inputmode="decimal" maxlength="12" max="1000000" aria-label="' +
    bankEsc(label) + '" value="' + bankEsc(value) + '">' + clear + "</label>";
}

function bankBasisCaption(budget) {
  var bits = [];
  if (budget && budget.bank_match_basis) bits.push(String(budget.bank_match_basis));
  if (budget && budget.bill_id_basis) bits.push(String(budget.bill_id_basis));
  if (!bits.length) return "";
  return '<p class="bank-basis">' + bankEsc(bits.join(" ")) + "</p>";
}

function bankUnmatchedStatusHtml(snap) {
  var bag = (bankTierDoc(snap).bill_status) || {};
  var bills = bankPreparedBills(snap, undefined);
  var rows = [];
  Object.keys(bag).forEach(function (key) {
    if (!bag[key]) return;
    var hit = false;
    bills.forEach(function (b) { if (bankBillMatchesKey(b, key)) hit = true; });
    if (!hit) rows.push(key);
  });
  if (!rows.length) return "";
  return '<div class="bank-unmatched"><h2>Unmatched status entries</h2><ul>' + rows.map(function (key) {
    return "<li><span>" + bankEsc(key) + '</span> <button type="button" data-bank-status-undo="' + bankEsc(key) +
      '" aria-label="Undo ' + bankEsc(key) + '">Undo</button></li>';
  }).join("") + "</ul></div>";
}

function bankKindOptions(tier) {
  function opt(value, label) {
    return '<option value="' + value + '"' + (tier === value ? " selected" : "") + ">" + label + "</option>";
  }
  return [opt("required", "Required"), opt("needs", "Needs"), opt("wants", "Wants"),
    opt("other_income", "Other income"), opt("elective", "Default")].join(" ");
}

function bankKindSourceRow(snap, name) {
  var found = null;
  var key = bankBillKey(name);
  bankNormalizeBills((snap && snap.budget) || {}).forEach(function (b) {
    if (!found && bankBillKey(b.name) === key) found = b;
  });
  bankNormalizeSubs((snap && snap.budget) || {}).forEach(function (s) {
    if (!found && bankBillKey(s.name) === key) found = s;
  });
  var others = (snap && snap.budget && snap.budget.other_income) || [];
  if (Array.isArray(others)) {
    others.forEach(function (row) {
      var label = row && (row.name || row.label || row.desc);
      if (!found && bankBillKey(label) === key) found = row;
    });
  }
  return found;
}

function bankHasMustPayNote(snap) {
  var map = bankMustPayMap(snap);
  return Object.keys(map).some(function (k) { return bankMustPayKind(map[k]) != null; });
}

function bankKindEditHtml(snap) {
  var names = bankKindTargets(snap);
  if (!names.length) return '<p class="bank-empty">No budget categories in this print.</p>';
  var ctx = bankKindContext(snap);
  var items = names.map(function (name) {
    var label = bankBillDisplayName(name);
    bankNormalizeBills((snap && snap.budget) || {}).forEach(function (b) {
      if (bankBillKey(b.name) === bankBillKey(name) && b.display_label) label = b.display_label;
    });
    var tier = bankResolveTier(name, snap, ctx, bankKindSourceRow(snap, name));
    return "<li><span class=\"bank-kind-name\" title=\"" + bankEsc(label) + "\">" + bankEsc(label) + '</span> <span class="bank-edit-side"><select class="bank-chip" data-bank-kind="' +
      bankEsc(name) + '" aria-label="Tier for ' + bankEsc(label) + '">' + bankKindOptions(tier) +
      "</select></span></li>";
  }).join("");
  return bankCapList('<ul class="bank-edit-list">' + items + "</ul>", names.length, "Tiers");
}

function bankTierPickHtml(key, tier, label) {
  function opt(value, text) {
    return '<option value="' + value + '"' + (tier === value ? " selected" : "") + ">" + text + "</option>";
  }
  return '<select class="bank-chip" data-bank-row-tier="' + bankEsc(key) + '" aria-label="Tier for ' + bankEsc(label) + '">' +
    opt("required", "Required") + " " + opt("needs", "Needs") + " " + opt("wants", "Wants") + " " +
    opt("other_income", "Other income") + "</select>";
}

function bankTierEditSections(snap, ym, edits, confirm, opts) {
  opts = opts || {};
  var ctx = bankKindContext(snap);
  var groups = { required: [], needs: [], wants: [], other_income: [] };
  function place(tier, item) {
    if (tier === "other_income") {
      groups.other_income.push(item);
      return;
    }
    if (tier !== "required" && tier !== "needs" && tier !== "wants") tier = "needs";
    groups[tier].push(item);
  }
  bankNormalizeSubs((snap && snap.budget) || {}).forEach(function (s) {
    if (!s || !bankBillCounted(s)) return;
    var tier = bankResolveTier(s.name, snap, ctx, s);
    var label = bankBillDisplayName(s.name);
    place(tier, {
      html: "<tr><td><span class=\"sym bank-merchant\">" + bankEsc(label) +
        '</span></td><td class="num">' + bankMoney(s.amount) + "</td><td>" + bankTierPickHtml(s.name, tier, label) + "</td></tr>",
      amount: s.amount,
      days: s.typical_day == null ? [] : [s.typical_day],
      typical_day: s.typical_day,
      name: label,
      set_aside: !!(s.set_aside || bankIsSetAside(s))
    });
  });
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var bills = bankPreparedBills(snap, dueArg);
  bills.forEach(function (b) {
    if (!b) return;
    var tier = bankResolveTier(b.name, snap, ctx, b);
    var label = bankBillDisplayName(b.name, b.display_label);
    var shown = bankBillLineAmount(b, ym, edits);
    var pending = shown == null;
    var dueKey = bankBillKey(b.name);
    var dueControl;
    if (b.set_aside || bankIsSetAside(b)) dueControl = '<span class="bank-due-fixed">' + bankMetaHtml("Set-aside \u00b7 no due day") + "</span>";
    else if (bankIsTwiceBill(b)) dueControl = '<span class="bank-due-fixed">Days ' + bankEsc(bankBillDueDays(b, ym).join(" and ")) + "</span>";
    else dueControl = '<select class="bank-chip" data-bank-due="' + bankEsc(dueKey) + '" aria-label="Due day for ' + bankEsc(label) + '">' + bankDayOptions(b.typical_day) + "</select>";
    place(tier, {
      html: "<tr><td><span class=\"sym bank-merchant\">" + bankEsc(label) + "</span>" + bankBillNotesHtml(b, ym) +
        "</td><td class=\"num" + (pending ? " bank-pending" : "") + "\">" + bankEsc(bankBillAmount(shown)) +
        "</td><td>" + bankTierPickHtml(b.name, tier, label) + "</td></tr>",
      amount: shown,
      days: (b.set_aside || bankIsSetAside(b)) ? [] : bankBillDueDays(b, ym),
      name: label,
      set_aside: !!(b.set_aside || bankIsSetAside(b)),
      bill: b
    });
  });
  var others = (snap && snap.budget && snap.budget.other_income) || [];
  if (Array.isArray(others)) {
    others.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      var rawName = row.name || row.label || row.desc || "Other income";
      var label = bankBillDisplayName(rawName);
      var amount = bankNum(row.amount);
      place("other_income", {
        html: "<tr><td><span class=\"sym bank-merchant\">" + bankEsc(label) +
          '</span></td><td class="num tone-go">' + bankMoney(amount) + "</td><td></td></tr>",
        amount: amount,
        name: label,
        undated: true
      });
    });
  }
  var pickedCat = opts.editCat || "";
  bankEditRows(snap).forEach(function (r) {
    if (!r) return;
    var cat = r.category || "";
    if (pickedCat && cat !== pickedCat) return;
    if (bankSkipTierName(cat, snap) || bankFlowSide(r) === "in") return;
    var rawLabel = bankItemLabel(r.desc);
    var label = bankBillDisplayName(rawLabel);
    var tier = bankResolveTier(cat || rawLabel, snap, ctx, { category: cat, name: rawLabel, tx_key: r.tx_key, merchant: rawLabel, flow: r.flow });
    if (bankFlowSide(r) === "in") tier = "other_income";
    var key = cat || rawLabel;
    var meta = r.date ? '<span class="sub">' + bankEsc(r.date) + "</span>" : "";
    var pick = tier === "other_income" ? "" : bankTierPickHtml(key, tier, label);
    place(tier, {
      html: "<tr><td><span class=\"sym bank-merchant\">" + bankEsc(label) + "</span> " + meta +
        '</td><td class="num">' + bankMoney(r.amount) + "</td><td>" + pick + "</td></tr>",
      amount: Math.abs(bankNum(r.amount) || 0),
      name: label,
      undated: true,
      merchant: true
    });
  });
  var today = bankScreenToday(snap, opts);
  var todayIso = today ? bankDateKey(today.year, today.month, today.day) : "";
  var monthObj = bankParseYm(bankMonthKey(ym));
  function oneTier(tier) {
    var items = bankSortByDue(groups[tier], { today: todayIso, mode: "plan", month: monthObj });
    var title = tier === "other_income" ? "Other income" : bankTierLabel(tier);
    if (tier === "other_income" && !items.length) return "";
    var body = items.length
      ? bankCapList('<table class="book"><thead><tr><th>Name</th><th class="num">Amount</th><th>Tier</th></tr></thead><tbody>' +
        items.map(function (item) { return item.html; }).join("") + "</tbody></table>", items.length, title)
      : '<p class="hint">Nothing in ' + title + ".</p>";
    return '<section data-tier-list="' + tier + '"><h2>' + title + '</h2><div class="card span">' + body + "</div></section>";
  }
  return {
    other: oneTier("other_income"),
    rules: ""
  };
}

var bankTxHashCache = {};

function bankTxOverrideSource(raw) {
  if (typeof raw === "string") return String(raw).trim();
  raw = raw || {};
  var key = raw.tx_key != null && String(raw.tx_key).trim() !== "" ? String(raw.tx_key).trim() : "";
  if (!key && raw.tx_id != null) key = String(raw.tx_id).trim();
  return key;
}

function bankTxOverrideKeyOk(key) {
  return /^h:[0-9a-f]{32}$/.test(String(key || ""));
}

function bankTxOverrideHashHex(buf) {
  var bytes = new Uint8Array(buf);
  var hex = "";
  var i;
  for (i = 0; i < bytes.length && hex.length < 32; i++) {
    var piece = bytes[i].toString(16);
    hex += (piece.length < 2 ? "0" : "") + piece;
  }
  return hex.slice(0, 32).toLowerCase();
}

function bankTxOverrideHashed(source) {
  if (!source) return "";
  if (bankTxOverrideKeyOk(source)) return source;
  return bankTxHashCache[source] || "";
}

/* The Worker accepts only ^h:[0-9a-f]{32}$. That is h: plus the first 32 lowercase hex chars of sha256(UTF-8 tx_key), or of tx_id when tx_key is blank. */
function bankTxOverrideHash(raw) {
  var source = bankTxOverrideSource(raw);
  var ready = bankTxOverrideHashed(source);
  if (ready) return Promise.resolve(ready);
  if (!source) return Promise.resolve("");
  if (typeof crypto === "undefined" || !crypto || !crypto.subtle || typeof crypto.subtle.digest !== "function") return Promise.resolve("");
  if (typeof TextEncoder === "undefined") return Promise.resolve("");
  var bytes;
  try { bytes = new TextEncoder().encode(source); } catch (e) { return Promise.resolve(""); }
  return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
    var hashed = "h:" + bankTxOverrideHashHex(buf);
    if (!bankTxOverrideKeyOk(hashed)) return "";
    bankTxHashCache[source] = hashed;
    return hashed;
  }).catch(function () { return ""; });
}

function bankTxOverrideKey(raw) {
  return bankTxOverrideHashed(bankTxOverrideSource(raw));
}

function bankWarmTxOverrideKeys(snap) {
  var seen = {};
  var pending = [];
  function queue(source) {
    if (!source || seen[source] || bankTxOverrideHashed(source)) return;
    seen[source] = true;
    pending.push(bankTxOverrideHash(source));
  }
  bankTxRows(snap).forEach(function (raw) { queue(bankTxOverrideSource(raw)); });
  bankTxSupersededPairs(snap).forEach(function (pair) {
    queue(pair.oldKey);
    queue(pair.newKey);
  });
  if (!pending.length) return Promise.resolve(false);
  return Promise.all(pending).then(function () { return true; });
}

function bankTxMovesOn(snap) {
  if (!snap || snap._txMoves === false) return false;
  var doc = bankTierDoc(snap);
  return !!(doc && Object.prototype.hasOwnProperty.call(doc, "tx_overrides"));
}

function bankTxBagKey(raw) {
  var printed = raw && raw.tx_override_key != null ? String(raw.tx_override_key).trim() : "";
  if (bankTxOverrideKeyOk(printed)) return printed;
  return bankTxOverrideKey(raw);
}

function bankMonthIsClosed(snap, ym) {
  var key = bankMonthKey(ym);
  if (!key) return false;
  var closed = false;
  bankMonths(snap).forEach(function (m) {
    if (bankMonthKey(m.month) === key && m.closed === true) closed = true;
  });
  return closed;
}

/* Income, one-off payoffs, closed months, and snapshot views are not re-tiered here. */
function bankTxRetierBlocked(snap, raw) {
  if (!raw) return true;
  if (snap && snap._bankSnapshotMonth) return true;
  if (bankFlowSide(raw) === "in") return true;
  if (bankTruthyFlag(raw.one_off) || bankTruthyFlag(raw.exclude_from_spend_avg)) return true;
  if (snap && bankTxExcludedFromSpend(raw, snap)) return true;
  if (snap && bankMonthIsClosed(snap, raw.date)) return true;
  return false;
}

function bankTxFixedTier(snap, raw) {
  if (String(raw.tier_basis || "") === "tx_override" && bankTierWord(raw.tier_default)) return bankTierWord(raw.tier_default);
  return bankTxPrintedTier(snap, raw);
}

/* The print's tier is what the totals already count once Forge has applied the override. */
function bankTxBaselineTier(snap, raw) {
  if (String(raw.tier_basis || "") === "tx_override" && bankTierWord(raw.tier)) return bankTierWord(raw.tier);
  return bankTxPrintedTier(snap, raw);
}

function bankTxSupersededPairs(snap) {
  var list = snap && snap.current && snap.current.tx_superseded;
  var pairs = [];
  if (!Array.isArray(list)) return pairs;
  list.forEach(function (row) {
    if (!row) return;
    if (Array.isArray(row) && row.length >= 2) {
      pairs.push({ oldKey: String(row[0]), newKey: String(row[1]) });
      return;
    }
    if (typeof row !== "object") return;
    var oldKey = row.pending_tx_key || row.old_tx_key || row.from_tx_key || row.old || row.from || "";
    var newKey = row.posted_tx_key || row.new_tx_key || row.to_tx_key || row.posted || row.to || row.next || "";
    if (!oldKey && row.pending != null && typeof row.pending !== "object") oldKey = row.pending;
    if (!newKey && row.posted != null && typeof row.posted !== "object") newKey = row.posted;
    if (oldKey && newKey) pairs.push({ oldKey: String(oldKey), newKey: String(newKey) });
  });
  return pairs;
}

function bankTxOverrideEntry(snap, raw) {
  var bag = (bankTierDoc(snap).tx_overrides) || {};
  var key = bankTxBagKey(raw);
  if (key && bag[key] != null) return bag[key];
  var source = bankTxOverrideSource(raw);
  var pairs = bankTxSupersededPairs(snap);
  var i;
  for (i = 0; i < pairs.length; i++) {
    if (String(pairs[i].newKey) !== String(source)) continue;
    var oldHash = bankTxOverrideHashed(pairs[i].oldKey);
    if (oldHash && bag[oldHash] != null) return bag[oldHash];
  }
  return null;
}

function bankTxOverrideTier(snap, raw) {
  if (!bankTxMovesOn(snap) || bankTxRetierBlocked(snap, raw)) return "";
  var row = bankTxOverrideEntry(snap, raw);
  if (row == null) return "";
  return bankTierWord(typeof row === "object" ? row.tier : row);
}

function bankTxMerchantName(raw) {
  raw = raw || {};
  return bankItemLabel(raw.merchant || raw.desc || raw.description || raw.name);
}

function bankTxRows(snap) {
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.edits_tx)) return cur.edits_tx.map(function (raw, i) { return bankMapTx(raw, i, bankOverrideMap(snap), snap); });
  return bankEditRows(snap);
}

function bankTxPrintedTier(snap, raw) {
  var name = bankTxMerchantName(raw);
  var cat = raw.category || name;
  return bankResolveTierPrinted(cat || name, snap, null, { category: cat, name: name, merchant: raw.merchant || name });
}

function bankTxShownTier(snap, raw) {
  raw = raw || {};
  if (bankTxRetierBlocked(snap, raw)) return bankTxFixedTier(snap, raw);
  var override = bankTxOverrideTier(snap, raw);
  if (override) return override;
  if (String(raw.tier_basis || "") === "tx_override" && bankTierWord(raw.tier_default)) return bankTierWord(raw.tier_default);
  var name = bankTxMerchantName(raw);
  var ruled = bankLookupTierRule(snap, name);
  if (ruled && bankTierKey(name) !== bankTierKey(raw.category || "")) return ruled;
  var cat = raw.category || name;
  var catRule = bankLookupTierRule(snap, cat);
  if (catRule) return catRule;
  return bankTxPrintedTier(snap, raw);
}

function bankTxPlanDelta(snap, ym) {
  var delta = { required: 0, needs: 0, wants: 0, plan: 0 };
  if (snap && snap._bankSnapshotMonth) return delta;
  var month = bankMonthKey(ym);
  if (!month && snap) month = bankMonthKey(bankCalendarMonth(snap));
  var inPlan = { required: true, needs: true, wants: true };
  function bump(from, to, amount) {
    if (!(amount > 0) || from === to) return;
    if (inPlan[from]) delta[from] -= amount;
    if (inPlan[to]) delta[to] += amount;
    if (inPlan[from] && !inPlan[to]) delta.plan -= amount;
    if (!inPlan[from] && inPlan[to]) delta.plan += amount;
  }
  bankTxRows(snap).forEach(function (raw) {
    if (!raw || bankTxRetierBlocked(snap, raw)) return;
    var rowMonth = bankMonthKey(raw.date);
    if (month && rowMonth && rowMonth !== month) return;
    var amount = Math.abs(bankNum(raw.amount) || 0);
    bump(bankTxBaselineTier(snap, raw), bankTxShownTier(snap, raw), amount);
  });
  return delta;
}

function bankTxAmountHit(amount, query) {
  var n = bankNum(amount);
  if (n == null) return false;
  var q = String(query || "").replace(/[$,\s]/g, "");
  if (!q) return false;
  var plain = Math.abs(n).toFixed(2);
  var raw = String(Math.abs(n));
  return plain.indexOf(q) >= 0 || raw.indexOf(q) >= 0;
}

function bankTxDateHit(iso, query) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return false;
  var year = Number(p[1]);
  var month = Number(p[2]);
  var day = Number(p[3]);
  var q = String(query || "").trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!q) return false;
  if (q === p[1] + "-" + p[2] + "-" + p[3]) return true;
  var slash = q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    var sy = slash[3] ? Number(slash[3]) : null;
    if (sy != null && sy < 100) sy += 2000;
    return Number(slash[1]) === month && Number(slash[2]) === day && (sy == null || sy === year);
  }
  var names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var short = BANK_MONTHS[month - 1].toLowerCase();
  var full = names[month - 1];
  var named = q.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/);
  if (named) {
    var mon = named[1];
    var namedDay = Number(named[2]);
    var namedYear = named[3] ? Number(named[3]) : null;
    var monOk = mon === short || mon === full || (mon.length >= 3 && (short.indexOf(mon) === 0 || full.indexOf(mon) === 0));
    return monOk && namedDay === day && (namedYear == null || namedYear === year);
  }
  return q === short || q === full || (q.length >= 3 && (short.indexOf(q) === 0 || full.indexOf(q) === 0));
}

function bankTxQueryHit(raw, query) {
  var q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  var name = bankTxMerchantName(raw).toLowerCase();
  var desc = String(raw.desc || "").toLowerCase();
  var description = String(raw.description || "").toLowerCase();
  if (name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || description.indexOf(q) >= 0) return true;
  if (bankTxAmountHit(raw.amount, q)) return true;
  if (bankTxDateHit(raw.date, q)) return true;
  return false;
}

function bankTxSearchRows(snap, opts) {
  opts = opts || {};
  var tier = bankTierWord(opts.tier || "");
  var month = bankMonthKey(opts.month || "");
  var acct = String(opts.account || "").replace(/\D/g, "");
  if (acct.length > 4) acct = acct.slice(-4);
  var rows = bankTxRows(snap).filter(function (raw) {
    if (!bankTxQueryHit(raw, opts.q || "")) return false;
    if (tier && bankTxShownTier(snap, raw) !== tier && !(bankFlowSide(raw) === "in" && tier === "other_income")) return false;
    if (month && bankMonthKey(raw.date) !== month) return false;
    if (acct && raw.last4 !== acct) return false;
    return true;
  });
  var asc = opts.order === "asc";
  rows.sort(function (a, b) {
    if (a.date !== b.date) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return asc ? (a.date < b.date ? -1 : 1) : (a.date < b.date ? 1 : -1);
    }
    return asc ? a.i - b.i : b.i - a.i;
  });
  return rows;
}

function bankTxPickHtml(snap, raw) {
  var tier = bankTxShownTier(snap, raw);
  if (bankTxRetierBlocked(snap, raw)) return '<span class="bank-tx-fixed">Not re-tierable</span>';
  var key = bankTxOverrideKey(raw);
  var singles = bankTxMovesOn(snap) && !!key;
  var current = tier === "required" || tier === "needs" || tier === "wants" ? tier : "needs";
  var scope = '<select data-bank-tx-scope="' + bankEsc(key) + '" aria-label="Move scope"' + (key ? "" : " disabled") + ">" +
    '<option value="merchant">All from this merchant</option>' +
    '<option value="one"' + (singles ? "" : " disabled") + ">Just this one</option></select>";
  var pick = '<select data-bank-tx-pick="' + bankEsc(key || bankTxMerchantName(raw)) + '" data-bank-tx-merchant="' +
    bankEsc(bankTxMerchantName(raw)) + '" aria-label="Tier">' +
    ["required", "needs", "wants"].map(function (name) {
      return '<option value="' + name + '"' + (name === current ? " selected" : "") + ">" + bankTierLabel(name) + "</option>";
    }).join("") + "</select>";
  var undo = '<button type="button" class="act ghost" data-bank-tx-undo="' + bankEsc(key || bankTxMerchantName(raw)) + '" data-bank-tx-merchant="' +
    bankEsc(bankTxMerchantName(raw)) + '">Undo</button>';
  return scope + " " + pick + " " + undo;
}

function bankTxSearchHtml(snap, opts) {
  opts = opts || {};
  var q = opts.txQuery == null ? (opts.q || "") : opts.txQuery;
  var tier = opts.txTier || "";
  var account = opts.txAcct || "";
  var month = opts.txMonth || "";
  var order = opts.txOrder === "asc" ? "asc" : "desc";
  var rows = bankTxSearchRows(snap, { q: q, tier: tier, account: account, month: month, order: order });
  var accounts = {};
  var months = {};
  bankTxRows(snap).forEach(function (raw) {
    if (raw.last4) accounts[raw.last4] = true;
    var ym = bankMonthKey(raw.date);
    if (ym) months[ym] = true;
  });
  var acctOpts = Object.keys(accounts).sort().map(function (last) {
    return '<option value="' + last + '"' + (last === String(account).replace(/\D/g, "").slice(-4) ? " selected" : "") + ">" +
      bankEsc(bankAccountMask(last)) + "</option>";
  }).join(" ");
  var monthOpts = Object.keys(months).sort().reverse().map(function (ym) {
    return '<option value="' + ym + '"' + (ym === month ? " selected" : "") + ">" + bankEsc(ym) + "</option>";
  }).join(" ");
  var note = "";
  if (!bankTxMovesOn(snap)) note = "";
  else if (opts.txNote) note = '<p class="bank-tx-note">' + bankEsc(opts.txNote) + "</p>";
  var assign = opts.txAssign || "";
  var list = rows.map(function (raw) {
    var tierName = bankFlowSide(raw) === "in" || bankTxShownTier(snap, raw) === "other_income"
      ? "Other income"
      : (bankTierLabel(bankTxShownTier(snap, raw)) || "Needs");
    var when = bankShortDate(raw.date) || raw.date || "";
    var tone = bankFlowSide(raw) === "in" ? " num tone-go" : " num tone-stop";
    return "<tr><td><span class=\"sub\">" + bankEsc(when) + '</span></td><td><span class="sym">' +
      bankEsc(bankTxMerchantName(raw)) + "</span> <span class=\"sub\">" + bankEsc(raw.last4 ? bankAccountMask(raw.last4) : "") +
      "</span></td><td class=\"" + tone.trim() + "\">" + bankMoney(raw.amount) + "</td><td>" + bankEsc(tierName) +
      "</td><td>" + bankTxPickHtml(snap, raw) + "</td></tr>";
  }).join("");
  var body = rows.length
    ? bankCapList('<table class="book bank-tx-results"><thead><tr><th>Date</th><th>Name</th><th class="num">Amount</th><th>Tier</th><th></th></tr></thead><tbody>' +
      list + "</tbody></table>", rows.length, "Transactions")
    : '<p class="hint">No matching transactions.</p>';
  if (!String(q || "").trim() && !tier && !account && !month) body = '<p class="hint">Type to search.</p>';
  return '<section class="bank-tx-search"><h2>Transactions</h2><div class="card span">' +
    '<label>Search <input type="search" data-bank-find value="' + bankEsc(q) + '" aria-label="Search"></label>' +
    '<div class="row2">' +
    '<select data-bank-find-filter="tier" aria-label="Tier"><option value="">Any tier</option> ' +
    '<option value="required"' + (tier === "required" ? " selected" : "") + ">Required</option> " +
    '<option value="needs"' + (tier === "needs" ? " selected" : "") + ">Needs</option> " +
    '<option value="wants"' + (tier === "wants" ? " selected" : "") + ">Wants</option></select> " +
    '<select data-bank-find-filter="account" aria-label="Account"><option value="">Any account</option> ' + acctOpts + "</select> " +
    '<select data-bank-find-filter="month" aria-label="Month"><option value="">Any month</option> ' + monthOpts + "</select> " +
    '<button type="button" class="book-chip" data-bank-find-order="' + (order === "asc" ? "desc" : "asc") + '">' +
    (order === "asc" ? "Oldest" : "Newest") + "</button></div>" +
    note + body + assign + "</div></section>";
}

function bankEditsPanelHtml(snap, opts) {
  opts = opts || {};
  var budget = (snap && snap.budget) || {};
  var dueArg = bankHasDueMap(snap) ? bankDueMap(snap) : undefined;
  var ym = bankScreenMonth(snap, opts);
  var bills = bankPreparedBills(snap, dueArg);
  var incomes = bankAttachIncomePlan(bankApplyIncomeEdits(bankNormalizeIncome(budget), opts.edits), ym);
  var rows = bankEditRows(snap);
  var known = bankKnownCategories(snap);
  var inUse = bankCategoriesInUse(rows, known);
  var picked = bankResolveEditCat(inUse, known, opts.editCat);
  var dueNote = bankHasDueNote(snap) ? '<p class="hint">Due day edits sync across your seats.</p>' : "";
  var kindNote = bankHasMustPayNote(snap) || bankTierRulesActive(snap) ? '<p class="hint">Tier edits sync across your seats.</p>' : "";
  var catErr = opts.overrideError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.overrideError) + "</p>" : "";
  var addErr = opts.categoryError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.categoryError) + "</p>" : "";
  var dueErr = opts.dueError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.dueError) + "</p>" : "";
  var kindErr = opts.kindError ? '<p class="bank-override-err" role="status">' + bankEsc(opts.kindError) + "</p>" : "";
  var saveErr = opts.tierSaveError ? '<p class="bank-save-notice" role="status">' + bankEsc(opts.tierSaveError) + "</p>" : "";
  var tiers = bankTierEditSections(snap, ym, opts.edits, opts.statusConfirm, Object.assign({}, opts, { editCat: picked }));
  var txAssign = bankEditTxListHtml(rows, known, picked, opts.rowAdd);
  var more = bankMixMore("More details",
    "<section><h2>Categories</h2><div class=\"card span\">" + catErr + addErr +
    '<p class="hint">Categories sync across your seats.</p>' +
    bankAddCategoryHtml() + bankCatPickerHtml(known, picked) + "</div></section>" +
    "<section><h2>Income</h2><div class=\"card span\">" +
    '<p class="hint">A blank amount or day stays blank.</p>' +
    bankEditIncomeHtml(incomes, ym) + "</div></section>" +
    bankBasisCaption(budget) + bankUnmatchedStatusHtml(snap));
  return '<div class="bank-edit-grid">' + saveErr + bankTxSearchHtml(snap, Object.assign({}, opts, { txAssign: txAssign })) +
    '<section class="bank-edit-block"><h2>Bills</h2><div class="card span">' + dueNote + dueErr +
    bankEditBillHtml(bills, ym, opts.edits, opts.statusConfirm, snap) + "</div></section>" +
    (tiers.other || "") +
    '<div class="bank-edit-rules">' + (tiers.rules || "") +
    "<section><h2>Rules</h2><div class=\"card span\">" +
    (kindNote || "") + kindErr +
    '<div class="bank-tier-plans">' + bankPlanFieldHtml(snap, ym, "required", "Required plan") + " " +
    bankPlanFieldHtml(snap, ym, "needs", "Needs plan") + " " + bankPlanFieldHtml(snap, ym, "wants", "Wants plan") + "</div>" +
    bankKindEditHtml(snap) + "</div></section></div>" + more + "</div>";
}

function bankTabHint(tab) {
  if (tab === "current") return "Balances, money in and out, recent activity";
  if (tab === "budget") return "Plan, bills due, progress against limits";
  if (tab === "edits") return "Fix categories, due days, income, and tiers";
  return "";
}

function bankSrcLine(tab) {
  if (tab === "current") return "What\u2019s in the print right now.";
  if (tab === "budget") return "What you planned \u2014 and how actuals track the limits.";
  return "From the one-time passcode feed. Blank means the print omitted that figure.";
}

function bankPageHtml(snap, opts) {
  opts = opts || {};
  bankMergeLocalTiers(snap);
  var rawTab = String(opts.tab == null ? "" : opts.tab).replace(/^#/, "");
  /* A direct current tab still renders that mode. Hashes and the menu open Budget. */
  var tab = rawTab === "current" ? "current" : bankResolveTab(opts.tab || "budget");
  var panel = "";
  if (tab === "historical") panel = bankHistHtml(snap || {}, opts);
  else if (tab === "budget") panel = bankBudgetHtml(snap || {}, opts);
  else if (tab === "edits") panel = bankEditsPanelHtml(snap || {}, opts);
  else panel = bankCurrentHtml(snap || {}, opts);
  var title = bankViewTitle(tab, snap || {}, opts);
  return bankNavHtml(tab, opts.menuOpen, title, snap || {}, opts) + '<div class="bank-panel" data-panel="' + tab + '" aria-labelledby="bank-view-title">' +
    bankTierStaleHtml(snap) + panel + "</div>";
}

function bankCopyTierBag(raw) {
  var src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  var rules = src.rules && typeof src.rules === "object" && !Array.isArray(src.rules) ? src.rules : {};
  var plans = src.plans && typeof src.plans === "object" && !Array.isArray(src.plans) ? src.plans : {};
  return { rules: rules, plans: plans };
}

function bankReadStore() {
  try {
    if (typeof localStorage === "undefined" || !localStorage.getItem) return { bills: {}, income: {} };
    var raw = localStorage.getItem(BANK_STORE);
    var o = raw ? JSON.parse(raw) : null;
    if (!o || typeof o !== "object") return { bills: {}, income: {} };
    var store = {
      bills: o.bills && typeof o.bills === "object" ? o.bills : {},
      income: o.income && typeof o.income === "object" ? o.income : {}
    };
    if (o.tiers && typeof o.tiers === "object") store.tiers = bankCopyTierBag(o.tiers);
    return store;
  } catch (e) {
    return { bills: {}, income: {} };
  }
}

/* A saved tier applies only when the feed has no rule for that name. */
function bankMergeLocalTiers(snap) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return;
  var local = bankReadStore().tiers;
  if (!local) return;
  var ruleKeys = Object.keys(local.rules || {});
  var planKeys = Object.keys(local.plans || {});
  if (!ruleKeys.length && !planKeys.length) return;
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (!snap.tier_doc.rules || typeof snap.tier_doc.rules !== "object" || Array.isArray(snap.tier_doc.rules)) snap.tier_doc.rules = {};
  if (!snap.tier_doc.plans || typeof snap.tier_doc.plans !== "object" || Array.isArray(snap.tier_doc.plans)) snap.tier_doc.plans = {};
  ruleKeys.forEach(function (k) {
    if (bankLookupTierRule(snap, k)) return;
    snap.tier_doc.rules[k] = local.rules[k];
  });
  planKeys.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(snap.tier_doc.plans, k) && bankNum(snap.tier_doc.plans[k]) != null) return;
    snap.tier_doc.plans[k] = local.plans[k];
  });
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
    planMonth: st.planMonth || "",
    now: st.now,
    edits: st.edits || bankReadStore(),
    editsOpen: !!st.editsOpen,
    overrideError: st.overrideError || "",
    dueError: st.dueError || "",
    kindError: st.kindError || "",
    tierSaveError: st.tierSaveError || "",
    statusConfirm: st.statusConfirm || null,
    categoryError: st.categoryError || "",
    billKey: st.billKey || "",
    editCat: st.editCat || "",
    rowAdd: st.rowAdd || null,
    menuOpen: !!st.menuOpen,
    openDay: st.openDay || "",
    histMonth: st.histMonth || "",
    txQuery: st.txQuery || "",
    txTier: st.txTier || "",
    txAcct: st.txAcct || "",
    txMonth: st.txMonth || "",
    txOrder: st.txOrder || "",
    txNote: st.txNote || ""
  });
  bankPaintTicker(st.data, { now: st.now });
  if (typeof MPListCap !== "undefined" && MPListCap && MPListCap.refresh) {
    try { MPListCap.refresh(root); } catch (e) {}
  }
  bankScrollLedgerToToday(root);
}

function bankScrollLedgerToToday(root) {
  if (!root || !root.querySelector) return;
  var row = root.querySelector("[data-bank-today]");
  if (!row || !row.closest) return;
  var cap = row.closest(".list-cap");
  if (!cap) return;
  var top = row.getBoundingClientRect().top - cap.getBoundingClientRect().top + (cap.scrollTop || 0);
  if (top > 1) cap.scrollTop = top;
}

function bankPaintTicker(snap, opts) {
  var el = typeof document !== "undefined" && document.getElementById ? document.getElementById("mp-ticker") : null;
  if (!el || typeof MPTicker === "undefined" || !MPTicker.render) return;
  try { MPTicker.render(el, snap, bankTierDoc(snap), bankScreenToday(snap, opts || {})); } catch (e) {}
}

function bankFocusGear(root) {
  var el = root && root.querySelector && root.querySelector("[data-bank-overflow]");
  if (el && el.focus) {
    try { el.focus(); } catch (e) {}
  }
}

function bankFocusDayDialog(root) {
  var el = root && root.querySelector && root.querySelector(".bank-day-dialog");
  if (el && el.focus) {
    try { el.focus(); } catch (e) {}
  }
}

function bankDayNumberFromCell(cell) {
  if (!cell || typeof cell.querySelector !== "function") return null;
  var b = cell.querySelector("b");
  if (!b) return null;
  return bankDay(b.textContent);
}

function bankFocusDayCell(root, day) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  var cells = root.querySelectorAll(".bank-day");
  var i;
  for (i = 0; i < cells.length; i++) {
    var cell = cells[i];
    var num = bankDayNumberFromCell(cell);
    if (num !== day || !cell.focus) continue;
    try { cell.focus(); } catch (e) {}
    return;
  }
}

function bankDialogTabbables(dialog) {
  if (!dialog || typeof dialog.querySelectorAll !== "function") return [];
  var nodes = dialog.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
  var out = [];
  var i;
  for (i = 0; i < nodes.length; i++) out.push(nodes[i]);
  return out;
}

function bankOpenDay(root, day) {
  if (!root || !root._bank) return;
  var n = bankDay(day);
  if (n == null) return;
  root._bank.openDay = n;
  root._bank.dayReturn = n;
  root._bank.tab = "budget";
  bankPaint(root);
  bankFocusDayDialog(root);
}

function bankCloseDay(root) {
  if (!root || !root._bank || !root._bank.openDay) return;
  var back = root._bank.dayReturn || root._bank.openDay;
  root._bank.openDay = "";
  bankPaint(root);
  bankFocusDayCell(root, back);
}

function bankFocusPlan(root, step) {
  if (!root || typeof root.querySelector !== "function") return;
  var el = root.querySelector('[data-bank-plan="' + String(step) + '"]');
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

function bankSyncSectionNav() {
  try {
    if (typeof MPNav !== "undefined" && MPNav && typeof MPNav.syncBanking === "function") MPNav.syncBanking();
  } catch (e) {}
}

function bankWriteTabHistory(tab) {
  if (bankNavLock) return;
  try {
    if (typeof history === "undefined" || typeof location === "undefined") return;
    var h = tab === "budget" ? "" : "#" + tab;
    var url = (location.pathname || "") + (location.search || "") + h;
    var now = (location.pathname || "") + (location.search || "") + (location.hash || "");
    if (url === now) {
      bankSyncSectionNav();
      return;
    }
    bankNavLock = true;
    try {
      if (history.pushState) history.pushState({ bankTab: tab }, "", url);
      else if (history.replaceState) history.replaceState({ bankTab: tab }, "", url);
    } finally {
      bankNavLock = false;
    }
    bankSyncSectionNav();
  } catch (e) {
    bankNavLock = false;
  }
}

/* Back, forward, and a hash edit already updated location. Activating again must not push. */
function bankActivateFromHistory() {
  if (bankNavLock) return;
  var root = bankNavRoot;
  if (!root || !root._bank) return;
  var parsed = bankParseHash(typeof location !== "undefined" ? location.hash : "");
  var tab = parsed.tab;
  var histMonth = parsed.histMonth || "";
  if (root._bank.tab === tab && (tab !== "historical" || (root._bank.histMonth || "") === histMonth)) return;
  root._bank.histMonth = histMonth;
  bankActivate(root, tab, { fromHistory: true });
}

function bankWriteHistHash(month) {
  if (bankNavLock) return;
  try {
    if (typeof history === "undefined" || typeof location === "undefined") return;
    var h = month ? "#historical=" + month : "#historical";
    var url = (location.pathname || "") + (location.search || "") + h;
    var now = (location.pathname || "") + (location.search || "") + (location.hash || "");
    if (url === now) {
      bankSyncSectionNav();
      return;
    }
    bankNavLock = true;
    try {
      if (history.pushState) history.pushState({ bankTab: "historical", histMonth: month || "" }, "", url);
    } finally {
      bankNavLock = false;
    }
    bankSyncSectionNav();
  } catch (e) {
    bankNavLock = false;
  }
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
  if (base.tiers) store.tiers = base.tiers;
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
  if (bankIsLockedResponse(res)) return "Sign in again to save the tier.";
  var status = res && Number(res.status);
  if (status === 404 || status === 405) return "Tier edits are not on the feed yet. Nothing was saved.";
  return "Tier edit did not save. Nothing was changed.";
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
    if (kind === "elective") bankDropTierRule(st.data, name);
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
    root._bank.kindError = "Tier edit did not save. Nothing was changed.";
    bankPaint(root);
    return false;
  });
}

function bankApplyTierRule(snap, name, tier) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap) || !name) return;
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (!snap.tier_doc.rules || typeof snap.tier_doc.rules !== "object" || Array.isArray(snap.tier_doc.rules)) snap.tier_doc.rules = {};
  snap.tier_doc.rules[name] = { tier: tier };
  if (tier === "required") bankRememberMustPay(snap, name, "must_pay");
  else if (tier === "needs" || tier === "wants" || tier === "other_income") bankRememberMustPay(snap, name, "elective");
}

function bankApplyTierPlan(snap, key, amount) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap) || !key) return;
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (!snap.tier_doc.plans || typeof snap.tier_doc.plans !== "object" || Array.isArray(snap.tier_doc.plans)) snap.tier_doc.plans = {};
  if (amount == null) delete snap.tier_doc.plans[key];
  else snap.tier_doc.plans[key] = amount;
}

function bankDropTierRule(snap, name) {
  var key = bankTierKey(name);
  if (!key) return;
  var doc = snap && snap.tier_doc;
  if (doc && doc.rules && typeof doc.rules === "object") {
    Object.keys(doc.rules).forEach(function (k) {
      if (bankTierKey(k) === key) delete doc.rules[k];
    });
  }
  var store = bankReadStore();
  if (!store.tiers || !store.tiers.rules) return;
  var changed = false;
  Object.keys(store.tiers.rules).forEach(function (k) {
    if (bankTierKey(k) !== key) return;
    delete store.tiers.rules[k];
    changed = true;
  });
  if (changed) bankWriteStore(store);
}

function bankKeepTierLocal(root, name, tier) {
  var store = bankReadStore();
  if (!store.tiers) store.tiers = { rules: {}, plans: {} };
  store.tiers.rules[name] = { tier: tier };
  bankWriteStore(store);
  if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
  bankApplyTierRule(root._bank.data, name, tier);
  root._bank.kindError = "";
  bankPaint(root);
  return true;
}

function bankKeepPlanLocal(root, key, amount) {
  var store = bankReadStore();
  if (!store.tiers) store.tiers = { rules: {}, plans: {} };
  store.tiers.plans[key] = amount;
  bankWriteStore(store);
  if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
  bankApplyTierPlan(root._bank.data, key, amount);
  root._bank.kindError = "";
  bankPaint(root);
  return true;
}

function bankSaveTier(root, name, tier) {
  if (!root || !root._bank || !name) return Promise.resolve(false);
  var next = bankTierWord(tier);
  if (next !== "required" && next !== "needs" && next !== "wants" && next !== "other_income") return Promise.resolve(false);
  var raw = String(name).trim();
  if (!raw) return Promise.resolve(false);
  root._bank.kindError = "";
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule: { name: raw, tier: next } })
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") return bankKeepTierLocal(root, raw, next);
    return bankReadJson(res).then(function () {
      if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
      bankApplyTierRule(root._bank.data, raw, next);
      root._bank.kindError = "";
      bankPaint(root);
      return true;
    });
  }).catch(function () {
    return bankKeepTierLocal(root, raw, next);
  });
}

function bankEnsureTxOverrides(snap) {
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (!snap.tier_doc.tx_overrides || typeof snap.tier_doc.tx_overrides !== "object" || Array.isArray(snap.tier_doc.tx_overrides)) {
    snap.tier_doc.tx_overrides = {};
  }
  return snap.tier_doc.tx_overrides;
}

function bankSaveTxOverride(root, key, tier) {
  if (!root || !root._bank) return Promise.resolve(false);
  var snap = root._bank.data || {};
  if (!bankTxMovesOn(snap)) {
    root._bank.txNote = "";
    snap._txMoves = false;
    bankPaint(root);
    return Promise.resolve(false);
  }
  var next = bankTierWord(tier);
  if (next !== "required" && next !== "needs" && next !== "wants") return Promise.resolve(false);
  return bankTxOverrideHash(key).then(function (clean) {
  if (!root._bank) return false;
  if (!bankTxOverrideKeyOk(clean)) return false;
  var live = root._bank.data || {};
  var bag = (bankTierDoc(live).tx_overrides) || {};
  if (!Object.prototype.hasOwnProperty.call(bag, clean) && Object.keys(bag).length >= 1000) return false;
  var body = { tx_overrides: {} };
  body.tx_overrides[clean] = { tier: next };
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
      bankPaint(root);
      return false;
    }
    if (!root._bank.data || typeof root._bank.data !== "object") root._bank.data = {};
    bankEnsureTxOverrides(root._bank.data)[clean] = { tier: next };
    root._bank.data._txMoves = true;
    root._bank.txNote = "";
    root._bank.tierSaveError = "";
    bankPaint(root);
    return true;
  }).catch(function () {
    if (!root._bank) return false;
    root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
    bankPaint(root);
    return false;
  });
  });
}

function bankUndoTxMove(root, key, merchant) {
  if (!root || !root._bank) return Promise.resolve(false);
  return bankTxOverrideHash(key).then(function (clean) {
  if (!root._bank) return false;
  var snap = root._bank.data || {};
  var bag = (bankTierDoc(snap).tx_overrides) || {};
  if (bankTxOverrideKeyOk(clean) && bag && Object.prototype.hasOwnProperty.call(bag, clean)) {
    var undo = { tx_overrides: {} };
    undo.tx_overrides[clean] = null;
    return fetch(BANK_TIERS_URL, bankFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(undo)
    })).then(function (res) {
      if (!res || res.ok !== true || res.type === "opaqueredirect") {
        root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
        bankPaint(root);
        return false;
      }
      if (root._bank.data && root._bank.data.tier_doc && root._bank.data.tier_doc.tx_overrides) {
        delete root._bank.data.tier_doc.tx_overrides[clean];
      }
      root._bank.tierSaveError = "";
      bankPaint(root);
      return true;
    }).catch(function () {
      if (root._bank) {
        root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
        bankPaint(root);
      }
      return false;
    });
  }
  var name = String(merchant || key || "").trim();
  if (!name) return Promise.resolve(false);
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule: { name: name, tier: null } })
  })).then(function (res) {
    var failed = !res || res.ok !== true || res.type === "opaqueredirect";
    if (!failed && root._bank.data) bankDropTierRule(root._bank.data, name);
    root._bank.tierSaveError = failed ? "Could not save tiers.json. The change is still on this screen." : "";
    bankPaint(root);
    return !failed;
  }).catch(function () {
    if (root._bank) {
      root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
      bankPaint(root);
    }
    return false;
  });
  });
}

function bankBillRowByKey(snap, key) {
  var found = null;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (found) return;
    if (bankBillControlKey(b) === key || bankBillMatchesKey(b, key)) found = b;
  });
  return found;
}

function bankClearTierPlan(root, key) {
  if (!root || !root._bank) return Promise.resolve(false);
  var tier = bankTierWord(key);
  if (tier !== "required" && tier !== "needs" && tier !== "wants") return Promise.resolve(false);
  var body = { plans: {} };
  body.plans[tier] = null;
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).then(function (res) {
    var failed = !res || res.ok !== true || res.type === "opaqueredirect";
    if (!root._bank.data || typeof root._bank.data !== "object") root._bank.data = {};
    bankApplyTierPlan(root._bank.data, tier, null);
    if (root._bank.data.tier_doc && root._bank.data.tier_doc.plans) delete root._bank.data.tier_doc.plans[tier];
    root._bank.tierSaveError = failed ? "Could not save tiers.json. The change is still on this screen." : "";
    bankPaint(root);
    return !failed;
  }).catch(function () {
    root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
    bankPaint(root);
    return false;
  });
}

function bankSaveTierPlans(root, key, value) {
  if (!root || !root._bank) return Promise.resolve(false);
  var tier = bankTierWord(key);
  if (tier !== "required" && tier !== "needs" && tier !== "wants") return Promise.resolve(false);
  var n = bankNum(String(value == null ? "" : value).replace(/[$,]/g, ""));
  if (n == null || n < 0) return Promise.resolve(false);
  var body = { plans: {} };
  body.plans[tier] = n;
  root._bank.kindError = "";
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).then(function (res) {
    if (!res || res.ok !== true || res.type === "opaqueredirect") return bankKeepPlanLocal(root, tier, n);
    return bankReadJson(res).then(function () {
      if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
      bankApplyTierPlan(root._bank.data, tier, n);
      root._bank.kindError = "";
      bankPaint(root);
      return true;
    });
  }).catch(function () {
    return bankKeepPlanLocal(root, tier, n);
  });
}

function bankEnsureTierBags(snap) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (!snap.tier_doc.bill_status || typeof snap.tier_doc.bill_status !== "object" || Array.isArray(snap.tier_doc.bill_status)) snap.tier_doc.bill_status = {};
  if (!snap.tier_doc.manual_paid || typeof snap.tier_doc.manual_paid !== "object" || Array.isArray(snap.tier_doc.manual_paid)) snap.tier_doc.manual_paid = {};
  return snap.tier_doc;
}

function bankBillNameFromKey(snap, key) {
  var found = key;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (bankBillKey(b.name) === key || bankNormKey(b.name) === bankNormKey(key)) found = b.name;
  });
  return found;
}

function bankWriteTierBag(doc, field, name, entry) {
  if (!doc[field] || typeof doc[field] !== "object" || Array.isArray(doc[field])) doc[field] = {};
  var norm = bankNormKey(name);
  Object.keys(doc[field]).forEach(function (k) {
    if (bankNormKey(k) === norm) delete doc[field][k];
  });
  if (entry != null) doc[field][name] = entry;
}

function bankMarkLocalKey(snap, field, name, on) {
  if (!snap._bankLocalKeys) snap._bankLocalKeys = {};
  if (!snap._bankLocalKeys[field]) snap._bankLocalKeys[field] = {};
  var norm = bankNormKey(name);
  if (on) snap._bankLocalKeys[field][norm] = true;
  else delete snap._bankLocalKeys[field][norm];
}

function bankPostTierPatch(root, body, applyLocal) {
  if (!root || !root._bank) return Promise.resolve(false);
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).then(function (res) {
    var failed = !res || res.ok !== true || res.type === "opaqueredirect";
    if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
    applyLocal(root._bank.data, failed);
    root._bank.tierSaveError = failed ? "Could not save tiers.json. The change is still on this screen." : "";
    bankPaint(root);
    return !failed;
  }).catch(function () {
    if (!root._bank) return false;
    if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
    applyLocal(root._bank.data, true);
    root._bank.tierSaveError = "Could not save tiers.json. The change is still on this screen.";
    bankPaint(root);
    return false;
  });
}

function bankTierPostBag(snap, key, entry, field) {
  var row = null;
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (row) return;
    if (bankBillControlKey(b) === key || bankBillMatchesKey(b, key) || bankBillKey(b.name) === bankBillKey(key)) row = b;
  });
  var id = row && row.bill_id ? String(row.bill_id).trim() : (row ? row.name : bankBillNameFromKey(snap, key));
  var bag = {};
  bag[id] = entry;
  if (row) {
    bankBillMatchKeys(row).forEach(function (oldKey) {
      if (!oldKey || bankKeysMatch(oldKey, id)) return;
      if (bag[oldKey] === undefined) bag[oldKey] = null;
    });
    var fields = field ? [field] : ["bill_status", "manual_paid"];
    fields.forEach(function (name) {
      var doc = bankTierDoc(snap)[name] || {};
      Object.keys(doc).forEach(function (stored) {
        if (!doc[stored] && doc[stored] !== 0) return;
        if (bankKeysMatch(stored, id)) return;
        if (bankBillMatchesKey(row, stored)) bag[stored] = null;
      });
    });
  }
  return { id: id, bag: bag, row: row };
}

function bankSaveBillStatus(root, key, entry) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var posted = bankTierPostBag(root._bank.data, key, entry, "bill_status");
  return bankPostTierPatch(root, { bill_status: posted.bag }, function (snap, local) {
    var doc = bankEnsureTierBags(snap);
    if (!doc) return;
    Object.keys(posted.bag).forEach(function (k) {
      if (posted.bag[k] == null) bankWriteTierBag(doc, "bill_status", k, null);
    });
    bankWriteTierBag(doc, "bill_status", posted.id, entry);
    bankMarkLocalKey(snap, "bill_status", posted.id, !!local && entry != null);
  });
}

function bankSaveManualPaid(root, key, entry) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var posted = bankTierPostBag(root._bank.data, key, entry, "manual_paid");
  return bankPostTierPatch(root, { manual_paid: posted.bag }, function (snap, local) {
    var doc = bankEnsureTierBags(snap);
    if (!doc) return;
    Object.keys(posted.bag).forEach(function (k) {
      if (posted.bag[k] == null) bankWriteTierBag(doc, "manual_paid", k, null);
    });
    bankWriteTierBag(doc, "manual_paid", posted.id, entry);
    bankMarkLocalKey(snap, "manual_paid", posted.id, !!local && entry != null);
  });
}

function bankUndoBillDesk(root, key) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var posted = bankTierPostBag(root._bank.data, key, null);
  var row = posted.row;
  var id = posted.id;
  var nullBag = posted.bag;
  var body = {};
  var clearStatus = !row || !!row.status_undo;
  var clearPaid = !row || !!row.manual_paid;
  if (!clearStatus && !clearPaid) {
    clearStatus = true;
    clearPaid = true;
  }
  if (clearStatus) body.bill_status = nullBag;
  if (clearPaid) body.manual_paid = nullBag;
  return bankPostTierPatch(root, body, function (snap) {
    var doc = bankEnsureTierBags(snap);
    if (!doc) return;
    Object.keys(nullBag).forEach(function (k) {
      if (body.bill_status) bankWriteTierBag(doc, "bill_status", k, null);
      if (body.manual_paid) bankWriteTierBag(doc, "manual_paid", k, null);
    });
    bankMarkLocalKey(snap, "bill_status", id, false);
    bankMarkLocalKey(snap, "manual_paid", id, false);
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
    root._bank.kindError = "Tier edit did not save. Nothing was changed.";
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
  return "Category was not removed. Nothing was changed.";
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
      var row = bankMapTx(raw, 0, overrides, snap);
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

function bankTierPayloadDoc(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  var doc = payload.doc && typeof payload.doc === "object" && !Array.isArray(payload.doc) ? payload.doc : payload;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
  if (payload.schema === "banking-tiers/v1" || doc.rules || doc.plans || doc.bill_status || doc.manual_paid ||
    Object.prototype.hasOwnProperty.call(doc, "tx_overrides")) return doc;
  return null;
}

/* Cookie GET of tiers.json. A miss keeps budget.tier_doc.doc. */
function bankRehydrateTiers(root) {
  if (!root || !root._bank) return Promise.resolve(false);
  var gen = (root._bank.tierGen = (root._bank.tierGen || 0) + 1);
  return Promise.resolve().then(function () {
    return fetch(BANK_TIERS_URL, bankFetchInit());
  }).then(function (res) {
    if (!root._bank || root._bank.tierGen !== gen) return false;
    var st = root._bank;
    if (!st.data || typeof st.data !== "object" || Array.isArray(st.data)) st.data = {};
    if (!res || res.ok !== true || res.type === "opaqueredirect") {
      st.data._tiersFromGet = false;
      st.data._tiersGetFailed = true;
      bankPaint(root);
      return false;
    }
    return bankReadJson(res).then(function (payload) {
      if (!root._bank || root._bank.tierGen !== gen) return false;
      var doc = bankTierPayloadDoc(payload);
      if (!doc) {
        st.data._tiersFromGet = false;
        st.data._tiersGetFailed = true;
        bankPaint(root);
        return false;
      }
      st.data.tier_doc = doc;
      st.data._tiersFromGet = true;
      st.data._tiersGetFailed = false;
      st.data._txMoves = Object.prototype.hasOwnProperty.call(doc, "tx_overrides");
      return bankWarmTxOverrideKeys(st.data).then(function () {
        if (!root._bank || root._bank.tierGen !== gen) return false;
        bankPaint(root);
        return true;
      });
    });
  }).catch(function () {
    if (!root._bank || root._bank.tierGen !== gen || !root._bank.data) return false;
    root._bank.data._tiersFromGet = false;
    root._bank.data._tiersGetFailed = true;
    bankPaint(root);
    return false;
  });
}

/* Entering or refreshing Edits paints the lists, then reloads categories and Bill or Optional. It does not post a removal. */
function bankRefreshEmptyCustoms(root) {
  var st = root && root._bank;
  if (!st || st.tab !== "edits") return Promise.resolve();
  bankPaint(root);
  return Promise.all([
    bankRehydrateCategories(root),
    bankRehydrateMustPay(root),
    bankRehydrateTiers(root)
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
  var parsed = bankParseHash(typeof location !== "undefined" ? location.hash : "");
  var tab = opts.tab ? bankResolveTab(opts.tab) : parsed.tab;
  root._bank = {
    data: data || {},
    tab: tab,
    year: opts.year || null,
    month: opts.month || null,
    planMonth: opts.planMonth || "",
    histMonth: opts.histMonth || (tab === "historical" ? (parsed.histMonth || "") : ""),
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
    openDay: opts.openDay || "",
    prune: Promise.resolve()
  };
  if (root._bank.tab === "edits") root._bank.prune = bankRefreshEmptyCustoms(root);
  else {
    bankPaint(root);
    root._bank.prune = Promise.all([
      bankRehydrateCategories(root),
      bankRehydrateTiers(root)
    ]);
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
    var fundBtn = t.closest("[data-bank-fund-toggle]");
    if (fundBtn && fundBtn.getAttribute) {
      if (e.preventDefault) e.preventDefault();
      var fundOpen = fundBtn.getAttribute("aria-expanded") === "true";
      fundBtn.setAttribute("aria-expanded", fundOpen ? "false" : "true");
      var fundExp = fundBtn.querySelector ? fundBtn.querySelector(".sub") : null;
      if (fundExp) fundExp.textContent = fundOpen ? "Show bills" : "Hide bills";
      var fundId = fundBtn.getAttribute("aria-controls") || "";
      var fundPanel = fundId && root.querySelector && /^bank-fund-\d+$/.test(fundId) ? root.querySelector("#" + fundId) : null;
      if (fundPanel) {
        if (fundOpen) fundPanel.setAttribute("hidden", "");
        else fundPanel.removeAttribute("hidden");
      }
      if (typeof MPListCap !== "undefined" && MPListCap && MPListCap.refresh) MPListCap.refresh(root);
      bankScrollLedgerToToday(root);
      return;
    }
    var txOrderBtn = t.closest("[data-bank-find-order]");
    if (txOrderBtn && txOrderBtn.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.txOrder = txOrderBtn.getAttribute("data-bank-find-order") === "asc" ? "asc" : "desc";
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    var txUndo = t.closest("[data-bank-tx-undo]");
    if (txUndo && txUndo.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      return bankUndoTxMove(root, txUndo.getAttribute("data-bank-tx-undo"), txUndo.getAttribute("data-bank-tx-merchant"));
    }
    var dayClose = t.closest("[data-bank-day-close], [data-bank-day-scrim]");
    if (dayClose) {
      if (e.preventDefault) e.preventDefault();
      bankCloseDay(root);
      return;
    }
    var confirmBtn = t.closest("[data-bank-confirm]");
    if (confirmBtn && confirmBtn.getAttribute && root._bank && root._bank.statusConfirm) {
      if (e.preventDefault) e.preventDefault();
      var pending = root._bank.statusConfirm;
      root._bank.statusConfirm = null;
      return bankSaveBillStatus(root, pending.key, pending.entry);
    }
    var statusSave = t.closest("[data-bank-status-save]");
    if (statusSave && statusSave.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var saveKey = statusSave.getAttribute("data-bank-status-save");
      var draftFrom = root._bank.cancelDraft && root._bank.cancelDraft[saveKey];
      if (!draftFrom) return;
      var saveRow = bankBillRowByKey(root._bank.data, saveKey);
      root._bank.statusConfirm = {
        key: saveKey,
        status: "cancelled",
        text: bankConfirmSentence(saveRow || { name: saveKey }, "cancelled", root._bank.data),
        entry: { status: "cancelled", from: draftFrom }
      };
      bankPaint(root);
      return;
    }
    var paidOff = t.closest("[data-bank-paidoff]");
    if (paidOff && paidOff.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var offKey = paidOff.getAttribute("data-bank-paidoff");
      var offFrom = bankMonthKey(root._bank.planMonth || bankCalendarMonth(root._bank.data));
      var offRow = bankBillRowByKey(root._bank.data, offKey);
      root._bank.statusConfirm = {
        key: offKey,
        status: "paid_off",
        text: bankConfirmSentence(offRow || { name: offKey }, "paid_off", root._bank.data),
        entry: { status: "paid_off", from: offFrom }
      };
      bankPaint(root);
      return;
    }
    var planClear = t.closest("[data-bank-plan-clear]");
    if (planClear && planClear.getAttribute) {
      if (e.preventDefault) e.preventDefault();
      return bankClearTierPlan(root, planClear.getAttribute("data-bank-plan-clear"));
    }
    var paidMonthBtn = t.closest("[data-bank-paid-month]");
    if (paidMonthBtn && paidMonthBtn.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var paidKey = paidMonthBtn.getAttribute("data-bank-paid-month");
      var paidMonth = bankMonthKey(root._bank.planMonth || bankCalendarMonth(root._bank.data));
      var today = bankScreenToday(root._bank.data, { now: root._bank.now });
      var paidDate = today ? bankDateKey(today.year, today.month, today.day) : "";
      var paidEntry = { month: paidMonth };
      if (paidDate) paidEntry.paid_date = paidDate;
      return bankSaveManualPaid(root, paidKey, paidEntry);
    }
    var undoBtn = t.closest("[data-bank-status-undo]");
    if (undoBtn && undoBtn.getAttribute) {
      if (e.preventDefault) e.preventDefault();
      return bankUndoBillDesk(root, undoBtn.getAttribute("data-bank-status-undo"));
    }
    var dayCell = t.closest(".bank-day");
    if (dayCell && root._bank) {
      var dayNum = bankDayNumberFromCell(dayCell);
      if (dayNum != null) {
        bankOpenDay(root, dayNum);
        return;
      }
    }
    var planBtn = t.closest("[data-bank-plan]");
    if (planBtn && planBtn.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var step = Number(planBtn.getAttribute("data-bank-plan"));
      var base = root._bank.planMonth || bankMonthKey(bankCalendarMonth(root._bank.data));
      root._bank.planMonth = bankShiftYm(base, step);
      root._bank.tab = "budget";
      bankPaint(root);
      bankFocusPlan(root, step);
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
    if (el.hasAttribute && el.hasAttribute("data-bank-hist-month")) {
      if (!root._bank) return;
      root._bank.tab = "historical";
      root._bank.histMonth = bankMonthKey(el.value);
      bankWriteHistHash(root._bank.histMonth);
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-plan-tier")) {
      return bankSaveTierPlans(root, el.getAttribute("data-bank-plan-tier"), el.value);
    }
    if (el.getAttribute("data-bank-find-filter")) {
      if (!root._bank) return;
      var which = el.getAttribute("data-bank-find-filter");
      if (which === "tier") root._bank.txTier = el.value || "";
      if (which === "account") root._bank.txAcct = el.value || "";
      if (which === "month") root._bank.txMonth = el.value || "";
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-tx-scope")) {
      if (root._bank) root._bank.txScope = el.value || "merchant";
      return;
    }
    if (el.getAttribute("data-bank-tx-pick")) {
      var picked = bankTierWord(el.value);
      var scopeEl = el.parentNode && el.parentNode.querySelector ? el.parentNode.querySelector("[data-bank-tx-scope]") : null;
      var scope = scopeEl && scopeEl.value ? scopeEl.value : (root._bank && root._bank.txScope) || "merchant";
      if (scope === "one") return bankSaveTxOverride(root, el.getAttribute("data-bank-tx-pick"), picked);
      return bankSaveTier(root, el.getAttribute("data-bank-tx-merchant") || el.getAttribute("data-bank-tx-pick"), picked);
    }
    if (el.getAttribute("data-bank-row-tier")) {
      var rowTier = bankTierWord(el.value);
      if (rowTier === "required" || rowTier === "needs" || rowTier === "wants" || rowTier === "other_income") {
        return bankSaveTier(root, el.getAttribute("data-bank-row-tier"), rowTier);
      }
    }
    if (el.getAttribute("data-bank-kind")) {
      var tierWord = bankTierWord(el.value);
      if (tierWord === "required" || tierWord === "needs" || tierWord === "wants" || tierWord === "other_income") {
        return bankSaveTier(root, el.getAttribute("data-bank-kind"), tierWord);
      }
      return bankSaveMustPay(root, el.getAttribute("data-bank-kind"), el.value);
    }
    if (el.getAttribute("data-bank-cancel")) {
      if (!root._bank) return;
      if (!root._bank.cancelDraft) root._bank.cancelDraft = {};
      root._bank.cancelDraft[el.getAttribute("data-bank-cancel")] = bankMonthKey(el.value);
      return;
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
    if (el.hasAttribute("data-bank-find")) {
      root._bank.txQuery = el.value == null ? "" : String(el.value);
      root._bank.tab = "edits";
      if (root._bank.txTimer) clearTimeout(root._bank.txTimer);
      root._bank.txTimer = setTimeout(function () {
        if (!root._bank) return;
        root._bank.txTimer = 0;
        var snap = root._bank.data;
        bankWarmTxOverrideKeys(snap).then(function () {
          if (!root._bank) return;
          bankPaint(root);
        });
      }, 200);
      return;
    }
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
    if (e.key === "Escape" && root._bank && root._bank.openDay) {
      if (e.preventDefault) e.preventDefault();
      bankCloseDay(root);
      return;
    }
    if (e.key === "Tab" && root._bank && root._bank.openDay && el.closest && el.closest(".bank-day-dialog")) {
      var dialog = el.closest(".bank-day-dialog");
      var tabbables = bankDialogTabbables(dialog);
      if (tabbables.length) {
        var first = tabbables[0];
        var last = tabbables[tabbables.length - 1];
        if (e.shiftKey && (el === first || el === dialog)) {
          if (e.preventDefault) e.preventDefault();
          if (last.focus) last.focus();
        } else if (!e.shiftKey && el === last) {
          if (e.preventDefault) e.preventDefault();
          if (first.focus) first.focus();
        }
      } else if (e.preventDefault) e.preventDefault();
      return;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") && el.closest && el.closest(".bank-day") && root.querySelectorAll) {
      var days = root.querySelectorAll(".bank-day");
      var current = el.closest(".bank-day");
      var idx = -1;
      var n;
      for (n = 0; n < days.length; n++) if (days[n] === current) idx = n;
      if (idx >= 0) {
        var step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        if (e.key === "ArrowUp") step = -7;
        if (e.key === "ArrowDown") step = 7;
        var next = days[idx + step];
        if (next) {
          if (e.preventDefault) e.preventDefault();
          for (n = 0; n < days.length; n++) {
            if (days[n].setAttribute) days[n].setAttribute("tabindex", days[n] === next ? "0" : "-1");
          }
          if (next.focus) next.focus();
        }
      }
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && el.closest && el.closest(".bank-day")) {
      var typedDay = bankDayNumberFromCell(el.closest(".bank-day"));
      if (typedDay != null) {
        if (e.preventDefault) e.preventDefault();
        bankOpenDay(root, typedDay);
        return;
      }
    }
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

function bankBoot() {
  var root = null;
  try { root = document.getElementById("bankDesk"); } catch (e) { return; }
  if (!root) return;
  bankBindHistory(root);
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
