/* tip fa — Every due-calendar deposit chip uses the income name. A weekday payroll says Payroll, the same as a rolled one.
   The Next Pay header uses that name, as in Payroll · Thu Oct 15. A rolled stipend stays Stipend · Fri Oct 23 (for Sun 25th).
   One-off deposits keep the name they already have.
   A bill due in a card's window subtracts from Left whether it is paid or not. Checking it off does not change Left.
   The hero To pay figure still counts only what is unpaid.
   tip ez — A pay_schedule row counts only in a month it dates.
   Any other month uses that income's deposits or typical days, rolled back to the prior business day.
   Each scheduled deposit, payroll and stipend, is its own Next Pay card. The window runs from that deposit to the next deposit of any kind.
   One-off deposits in the window stay as named rows under the deposit. A rolled day still marks where it moved.
   tip ey — Edits can put a skipped outflow into a category.
   The sheet says it is not counted as spending now, then the usual picker, starting on Just this one.
   Money in stays locked unless it is already a refund. A closed month stays read-only and says Closed month.
   A saved category replaces that chip and counts in that category for the month. The skipped choice again clears it.
   tip ex — The gear in the Banking header opens Edits (/#edits) in one tap.
   The menu it replaced only listed Edits, so nothing else moved.
   tip ev — Each bill names the account that pays it. Each Next pay card lists the moves that keep that account from going negative.
   Pay from defaults to the account that paid the bill most recently. The Edits bill sheet can override it.
   The override is a POST merge of bill_account only. Moves are advice. They do not move money.
   tip es — Cancel a bill or subscription from this month or next. One isCancelled(item, month) check.
   tip et — Next pay is a swipe carousel of paycheck periods through month-end.
   tip eq — Edits income rows stack the name, then the amount and day, then one helper on a narrow phone.
   Feed basis notes stay off the page. The transaction search keeps its input and refreshes only the results.
   tip ep — House Banking.
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
   The gear opens Edits (/#edits) in one tap. The page title names the view and the month on screen.
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
    printed_category: raw.category,
    category_basis: raw.category_basis == null ? "" : String(raw.category_basis),
    feed_category: raw.feed_category == null ? "" : String(raw.feed_category),
    last4: last4,
    tier: raw.tier == null ? "" : String(raw.tier),
    tier_basis: raw.tier_basis == null ? "" : String(raw.tier_basis),
    tier_default: raw.tier_default == null ? "" : String(raw.tier_default),
    tier_basis_default: raw.tier_basis_default == null ? "" : String(raw.tier_basis_default),
    tx_override_key: raw.tx_override_key == null ? "" : String(raw.tx_override_key),
    one_off: raw.one_off,
    exclude_from_spend_avg: raw.exclude_from_spend_avg,
    transfer: raw.transfer,
    internal: raw.internal,
    payoff: raw.payoff,
    refund: raw.refund,
    kind: raw.kind == null ? "" : String(raw.kind),
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
  var cancel = row.cancel_key == null ? "" : String(row.cancel_key).trim();
  if (cancel) return cancel;
  var sub = row.sub_id == null ? "" : String(row.sub_id).trim();
  if (sub) return sub;
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
  add(row.cancel_key);
  add(row.sub_id);
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
  if (row && row.cancelled_from && !s) return "cancelled";
  return "";
}

/* The one cancel check for the hero, month list, Next Pay, ticker, funding, and plan totals. */
function isCancelled(item, month) {
  if (!item) return false;
  var status = bankBillStatus(item);
  if (status !== "cancelled") return false;
  var from = bankMonthKey(item.status_from || item.cancelled_from || item.from);
  var when = bankMonthKey(month);
  if (!from || !when) return false;
  return when >= from;
}

function bankBillRetired(row, ym) {
  if (isCancelled(row, ym)) return true;
  var status = bankBillStatus(row);
  if (status !== "paid_off") return false;
  var from = bankMonthKey(row && (row.status_from || row.cancelled_from));
  var month = bankMonthKey(ym);
  if (!from || !month) return false;
  return month >= from;
}

function bankCancelAriaName(row, label) {
  var rawName = row && row.name ? String(row.name) : "";
  var ariaName = label || bankBillDisplayName(rawName, row && row.display_label);
  if (rawName && bankBillKey(rawName) !== bankBillKey(ariaName) && !/childcare/i.test(rawName)) {
    ariaName = ariaName + " " + bankBillSlug(rawName);
  }
  return ariaName;
}

function bankCancelButton(row, label) {
  if (!row) return "";
  var key = bankBillControlKey(row);
  if (!key) return "";
  var name = bankCancelAriaName(row, label);
  return '<button type="button" class="book-chip" data-bank-cancel="' + bankEsc(key) +
    '" data-bank-cancel-open="1" aria-label="Cancel ' + bankEsc(name) + '">Cancel</button>';
}

function bankDeskRowByKey(snap, key) {
  var found = null;
  function scan(list) {
    (list || []).forEach(function (row) {
      if (found || !row) return;
      if (String(bankBillControlKey(row)) === String(key) || bankBillMatchesKey(row, key) || bankBillKey(row.name) === bankBillKey(key)) found = row;
    });
  }
  try { scan(bankPreparedBills(snap, undefined)); } catch (e) {}
  try { scan(bankPreparedSubs(snap)); } catch (e2) {}
  return found;
}

function bankCancelTarget(snap, raw) {
  if (!raw || !snap) return null;
  var found = null;
  function consider(row) {
    if (found || !row) return;
    if (raw.bill_id && (bankKeysMatch(raw.bill_id, row.bill_id) || bankKeysMatch(raw.bill_id, row.cancel_key))) found = row;
    else if (raw.sub_id && (bankKeysMatch(raw.sub_id, row.sub_id) || bankKeysMatch(raw.sub_id, row.cancel_key))) found = row;
    else if (raw.cancel_key && bankBillMatchesKey(row, raw.cancel_key)) found = row;
  }
  try { bankPreparedBills(snap, undefined).forEach(consider); } catch (e) {}
  try { bankPreparedSubs(snap).forEach(consider); } catch (e2) {}
  if (found) return found;
  if (!(raw.bill_id || raw.sub_id || raw.kind === "bill" || raw.kind === "subscription" || raw.kind === "sub")) return null;
  var blob = raw.name || raw.desc || raw.merchant || "";
  function byName(row) {
    if (found || !row || !blob) return;
    if (bankBillMatchesKey(row, blob) || bankKeysMatch(row.name, blob)) found = row;
  }
  try { bankPreparedBills(snap, undefined).forEach(byName); } catch (e3) {}
  try { bankPreparedSubs(snap).forEach(byName); } catch (e4) {}
  return found;
}

function bankTxMatchesItem(raw, item) {
  if (!raw || !item) return false;
  if (raw.bill_id && (bankKeysMatch(raw.bill_id, item.bill_id) || bankKeysMatch(raw.bill_id, item.cancel_key) || bankBillMatchesKey(item, raw.bill_id))) return true;
  if (raw.sub_id && (bankKeysMatch(raw.sub_id, item.sub_id) || bankKeysMatch(raw.sub_id, item.cancel_key) || bankBillMatchesKey(item, raw.sub_id))) return true;
  if (raw.bill_id || raw.sub_id) return false;
  var blob = raw.desc || raw.name || raw.category || raw.merchant || "";
  return !!(blob && (bankBillMatchesKey(item, blob) || bankKeysMatch(item.name, blob)));
}

function bankTxChargedAfter(snap, raw) {
  if (!raw) return false;
  if (raw.charged_after_cancel === true) return true;
  if (raw.charged_after_cancel === false) return false;
  var item = bankCancelTarget(snap, raw);
  if (!item) return false;
  var from = bankMonthKey(item.status_from || item.cancelled_from || item.from);
  if (!from || !isCancelled(item, bankMonthKey(raw.date) || from)) return false;
  var day = String(raw.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < from + "-01") return false;
  try { if (bankFlowSide(raw) === "in") return false; } catch (e) {}
  return true;
}

function bankItemChargedAfter(snap, item) {
  if (!snap || !item) return false;
  var txs = [];
  try { txs = bankSpendTxRows(snap); } catch (e) { txs = []; }
  var i;
  for (i = 0; i < txs.length; i++) {
    var raw = txs[i];
    if (!bankTxMatchesItem(raw, item)) continue;
    if (raw.charged_after_cancel === true) return true;
    if (raw.charged_after_cancel === false) continue;
    if (bankTxChargedAfter(snap, raw)) return true;
  }
  return false;
}

function bankChargedAfterCount(snap) {
  var n = 0;
  function scan(list) {
    (list || []).forEach(function (row) {
      if (row && bankItemChargedAfter(snap, row)) n += 1;
    });
  }
  try { scan(bankPreparedBills(snap, undefined)); } catch (e) {}
  try { scan(bankPreparedSubs(snap)); } catch (e2) {}
  var printed = bankNum(snap && snap.budget && snap.budget.charged_after_cancel_count);
  if (printed != null && printed > n) return Math.round(printed);
  return n;
}

function bankChargedAfterItems(snap) {
  var items = [];
  function scan(list) {
    (list || []).forEach(function (row) {
      if (row && bankItemChargedAfter(snap, row)) items.push(row);
    });
  }
  try { scan(bankPreparedBills(snap, undefined)); } catch (e) {}
  try { scan(bankPreparedSubs(snap)); } catch (e2) {}
  return items;
}

function bankChargedFlagHtml() {
  return '<span class="fresh-chip fresh-flag">Charged after cancel</span>';
}

function bankChargedPillHtml(snap) {
  var n = 0;
  try { n = bankChargedAfterCount(snap); } catch (e) { n = 0; }
  if (!(n > 0)) return "";
  var items = [];
  try { items = bankChargedAfterItems(snap); } catch (e2) { items = []; }
  var text = n + " charged after cancel \u00b7 Review";
  if (n === 1 && items.length === 1) {
    text = bankBillDisplayName(items[0].name, items[0].display_label) + " charged after cancel \u00b7 Review";
  }
  return '<div class="fresh-chips"><button type="button" class="fresh-chip fresh-flag" data-bank-charged-alert="' + n +
    '" data-bank-tab="edits" data-bank-charged-review="1">' + bankEsc(text) + "</button></div>";
}

function bankMonthHasCharge(snap, item, monthKey) {
  if (!snap || !item) return false;
  var month = bankMonthKey(monthKey);
  if (!month) return false;
  var txs = [];
  try { txs = bankSpendTxRows(snap); } catch (e) { txs = []; }
  var i;
  for (i = 0; i < txs.length; i++) {
    var raw = txs[i];
    if (!raw || !bankTxMatchesItem(raw, item)) continue;
    if (bankMonthKey(raw.date) !== month) continue;
    try { if (bankFlowSide(raw) === "in") continue; } catch (e2) {}
    return true;
  }
  return false;
}

function bankFundingEventCancelled(snap, ev) {
  if (!snap || !ev || ev.kind === "in") return false;
  var month = bankMonthKey(ev.date);
  var name = ev.name || "";
  if (!month || !name) return false;
  var hit = false;
  function scan(list) {
    (list || []).forEach(function (row) {
      if (hit || !row || !isCancelled(row, month)) return;
      if (bankBillMatchesKey(row, name) || bankKeysMatch(row.name, name)) hit = true;
    });
  }
  try { scan(bankPreparedBills(snap, undefined)); } catch (e) {}
  try { scan(bankPreparedSubs(snap)); } catch (e2) {}
  return hit;
}

function bankCancelledCategoryDrop(snap, monthKey) {
  var drop = {};
  var month = bankMonthKey(monthKey);
  if (!snap || !month) return drop;
  function add(row) {
    if (!row || !isCancelled(row, month)) return;
    var id = "";
    try { id = bankItemCategoryId(row, snap) || ""; } catch (e) { id = ""; }
    if (!id) return;
    var amt = null;
    try { amt = bankBillLineAmount(row, month); } catch (e2) { amt = null; }
    if (amt == null) amt = bankNum(row.amount);
    if (!(amt > 0)) return;
    drop[id] = bankRoundCents((drop[id] || 0) + amt);
  }
  try { bankPreparedBills(snap, undefined).forEach(add); } catch (e3) {}
  try { bankPreparedSubs(snap).forEach(add); } catch (e4) {}
  return drop;
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
    if (!b.status_from && b.cancelled_from) b.status_from = bankMonthKey(b.cancelled_from);
    if (!bankBillStatus(b) && b.cancelled_from) b.status = "cancelled";
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
        sub_id: raw.sub_id == null ? "" : String(raw.sub_id).trim(),
        cancel_key: raw.cancel_key == null ? "" : String(raw.cancel_key).trim(),
        cancelled_from: bankMonthKey(raw.cancelled_from),
        cancel_note: raw.cancel_note == null ? "" : String(raw.cancel_note),
        prev_key: raw.prev_key == null ? "" : String(raw.prev_key).trim(),
        bank_match: raw.bank_match && typeof raw.bank_match === "object" ? raw.bank_match : null,
        schedule: Array.isArray(raw.schedule) ? raw.schedule : null
      };
      if (!row.status_from && row.cancelled_from) row.status_from = row.cancelled_from;
      if (!row.status && row.cancelled_from) row.status = "cancelled";
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
      if (!row.sub_id && raw.sub_id) row.sub_id = String(raw.sub_id).trim();
      if (!row.cancel_key && raw.cancel_key) row.cancel_key = String(raw.cancel_key).trim();
      if (!row.cancelled_from && raw.cancelled_from) row.cancelled_from = bankMonthKey(raw.cancelled_from);
      if (!row.cancel_note && raw.cancel_note) row.cancel_note = String(raw.cancel_note);
      if (!row.status_from && row.cancelled_from) row.status_from = row.cancelled_from;
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

/* A month is covered when this income has a pay_schedule row whose pay date falls in it. */
function bankScheduleCoversMonth(inc, ym) {
  var days = bankScheduleDays(inc, ym);
  return !!(days && days.length);
}

function bankIncomeFace(inc, row) {
  var kind = bankStreamKind(inc && inc.label, row || inc);
  if (kind === "Stipend" || kind === "Payroll") return kind;
  return (inc && inc.label) || kind || "Income";
}

function bankRollNominalDay(ym, nominalDay) {
  if (!(ym && ym.year && ym.month) || nominalDay == null) {
    return { day: nominalDay, date: "", rolled_from: "", nominalDay: nominalDay };
  }
  var rolled = bankRollBackDate(ym.year, ym.month, nominalDay);
  var inMonth = rolled.year === ym.year && rolled.month === ym.month;
  return {
    day: inMonth ? rolled.day : null,
    date: rolled.key,
    rolled_from: rolled.rolled_from,
    nominalDay: nominalDay
  };
}

/* Deposits or typical days for a month the schedule does not cover, with the prior-business-day roll. */
function bankIncomeFallbackMarks(inc, ym) {
  if (!inc || !ym || !ym.year || !ym.month) return [];
  var face = bankIncomeFace(inc, inc);
  var rows = [];
  var key = bankYm(ym.year, ym.month);
  if (Array.isArray(inc.deposits) && inc.deposits.length) {
    inc.deposits.forEach(function (d) {
      if (!d) return;
      var amount = inc.amount_edited && bankNum(inc.amount) != null ? bankNum(inc.amount) : bankNum(d.amount);
      if (amount == null) amount = bankNum(inc.amount);
      var explicit = bankCopyDate(d.date || d.on);
      if (explicit && bankMonthKey(explicit) !== key) return;
      if (explicit && bankMonthKey(explicit) === key) {
        var stated = bankCopyDate(d.rolled_from);
        var day = bankDay(String(explicit).slice(8, 10));
        var nomDay = stated && bankMonthKey(stated) === key ? bankDay(String(stated).slice(8, 10)) : null;
        var moved = nomDay != null && nomDay !== day;
        rows.push({
          day: day,
          date: explicit,
          amount: amount,
          rolled_from: moved ? stated : "",
          nominalDay: moved ? nomDay : null,
          chip: moved ? face : ""
        });
        return;
      }
      var nominalDay = bankResolveDayToken(d.day, ym);
      if (nominalDay == null) return;
      var rolledDep = bankRollNominalDay(ym, nominalDay);
      if (rolledDep.day == null) return;
      var depMoved = !!rolledDep.rolled_from;
      rows.push({
        day: rolledDep.day,
        date: rolledDep.date,
        amount: amount,
        rolled_from: depMoved ? rolledDep.rolled_from : "",
        nominalDay: depMoved ? nominalDay : null,
        chip: depMoved ? face : ""
      });
    });
  } else {
    var nominals = null;
    if (bankIsPayrollIncome(inc.label)) nominals = [15, bankMonthDim(ym.year, ym.month)];
    else if (bankIsFosteringIncome(inc.label)) nominals = [10, 25];
    else {
      nominals = (inc.feed_days || []).slice();
      if (inc.day_edited && bankDay(inc.typical_day) != null) {
        var chosen = bankDay(inc.typical_day);
        nominals = [chosen].concat(nominals.filter(function (d) { return d !== chosen; }));
      }
    }
    nominals.forEach(function (nominalDay) {
      var dayNum = bankDay(nominalDay);
      if (dayNum == null) return;
      var rolled = bankRollNominalDay(ym, dayNum);
      if (rolled.day == null) return;
      var moved = !!rolled.rolled_from;
      rows.push({
        day: rolled.day,
        date: rolled.date,
        amount: bankNum(inc.amount),
        rolled_from: moved ? rolled.rolled_from : "",
        nominalDay: moved ? dayNum : null,
        chip: moved ? face : ""
      });
    });
  }
  if (inc.day_edited && bankDay(inc.typical_day) != null && rows.length &&
      (bankIsJustinTwiceIncome(inc.label) || (Array.isArray(inc.deposits) && inc.deposits.length))) {
    var edited = bankDay(inc.typical_day);
    var taken = false;
    rows.forEach(function (r) { if (r.day === edited) taken = true; });
    if (!taken) {
      var dim = bankMonthDim(ym.year, ym.month);
      var placed = Math.min(edited, dim);
      rows[0].day = placed;
      rows[0].date = bankDateKey(ym.year, ym.month, placed);
      rows[0].rolled_from = "";
      rows[0].nominalDay = null;
      rows[0].chip = "";
    }
  }
  return rows;
}

function bankIncomePayDays(inc, ym) {
  if (!inc) return [];
  if (inc.schedule && inc.schedule.length) {
    if (bankScheduleCoversMonth(inc, ym)) return bankScheduleDays(inc, ym);
    var uncovered = bankIncomeFallbackMarks(inc, ym);
    if (uncovered.length) return bankUniqueDays(uncovered.map(function (m) { return m.day; }));
    return [];
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

function bankMarksFromFallback(inc, ym, withAmount) {
  return bankIncomeFallbackMarks(inc, ym).map(function (m) {
    return {
      day: m.day,
      amount: withAmount ? m.amount : null,
      note: "",
      chip: m.chip || "",
      nominalDay: m.nominalDay || null,
      account: inc.usual_account || null
    };
  });
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
      var nominal = bankScheduleNominal(row);
      var nomDay = null;
      if (nominal && nominal !== when && bankMonthKey(nominal) === key) nomDay = bankDay(String(nominal).slice(8, 10));
      var rolled = nomDay != null && nomDay !== d;
      var face = bankIncomeFace(inc, row);
      out.push({
        day: d,
        amount: bankNum(row.amount),
        note: rolled ? "" : (bankPayMoveHint(row) || bankMovedNote(row.rolled_from)),
        chip: rolled ? face : "",
        nominalDay: rolled ? nomDay : null,
        account: row.account || inc.usual_account || null
      });
    });
    if (out.length) return out;
    var uncovered = bankMarksFromFallback(inc, ym, true);
    return uncovered.length ? uncovered : null;
  }
  if (bankIsJustinTwiceIncome(inc.label) && ym && ym.year && !(Array.isArray(inc.deposits) && inc.deposits.length)) {
    var rolledMarks = bankMarksFromFallback(inc, ym, false);
    if (rolledMarks.length) return rolledMarks;
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
  for (d = 1; d <= 31; d++) days.push({ day: d, pays: [], payChips: [], bills: [], items: [], subs: [] });
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
      var cell = days[day - 1];
      cell.pays.push(label);
      /* A roll already stored the income name. A weekday deposit uses that same name. */
      cell.payChips.push(mark.chip || bankIncomeFace(inc, inc));
      if (mark.note) cell.payNotes = (cell.payNotes || []).concat([mark.note]);
      if (mark.chip && mark.nominalDay && mark.nominalDay !== day && mark.nominalDay >= 1 && mark.nominalDay <= 31) {
        var shift = mark.chip + " \u2192 " + bankOrdinal(day);
        var orig = days[mark.nominalDay - 1];
        orig.notes = orig.notes || [];
        if (orig.notes.indexOf(shift) < 0) orig.notes.push(shift);
      }
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
    var from = bankMonthKey(raw.status_from || raw.cancelled_from);
    var status = raw.status == null ? "" : String(raw.status).trim();
    if (!status && raw.cancelled_from) status = "cancelled";
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
      category: raw.category || "",
      counted: raw.counted !== false,
      sub_id: raw.sub_id == null ? "" : String(raw.sub_id).trim(),
      bill_id: raw.bill_id == null ? "" : String(raw.bill_id).trim(),
      cancel_key: raw.cancel_key == null ? "" : String(raw.cancel_key).trim(),
      status: status,
      status_from: from,
      cancelled_from: bankMonthKey(raw.cancelled_from),
      cancel_note: raw.cancel_note == null ? "" : String(raw.cancel_note),
      bank_match: raw.bank_match && typeof raw.bank_match === "object" ? raw.bank_match : null
    };
  }).filter(function (row) { return row.name; });
}

function bankSubStatusRows(budget) {
  var rows = [];
  ["sub_status_active", "sub_status_scheduled"].forEach(function (key) {
    var raw = budget && budget[key];
    if (!Array.isArray(raw)) return;
    raw.forEach(function (row) {
      if (row && typeof row === "object") rows.push(row);
    });
  });
  return rows;
}

function bankPreparedSubs(snap) {
  var budget = (snap && snap.budget) || {};
  var subs = bankNormalizeSubs(budget);
  bankApplyBillStatuses(subs, snap);
  var extra = bankSubStatusRows(budget);
  subs.forEach(function (s) {
    if (!s || bankBillStatus(s)) return;
    extra.forEach(function (row) {
      if (!s || bankBillStatus(s) || !row) return;
      var label = row.name || row.key || row.label || row.sub_id || "";
      var id = row.sub_id || row.cancel_key || "";
      var same = (id && (bankKeysMatch(id, s.sub_id) || bankKeysMatch(id, s.cancel_key))) || bankKeysMatch(label, s.name);
      if (!same) return;
      var entry = bankCopyStatusEntry(row);
      if (!entry) return;
      s.status = entry.status;
      if (entry.from) s.status_from = entry.from;
      s.status_source = "print";
      s.cancel_note = entry.note || s.cancel_note;
    });
  });
  return subs;
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

function bankOverflowHtml(tab) {
  var onEdits = tab === "edits";
  return '<div class="bank-overflow"><button type="button" class="bank-gear' + (onEdits ? " on" : "") +
    '" data-bank-overflow="1" data-bank-tab="edits" aria-label="Edits" title="Edits"' +
    (onEdits ? ' aria-current="true"' : "") + ">" + bankGearSvg() +
    (onEdits ? '<i class="bank-gear-mark" aria-hidden="true"></i>' : "") +
    "</button></div>";
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
    "</h2>" + pick + bankOverflowHtml(tab) + "</div>";
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

function bankTilesHtml(tiles, rollup, tileOpts) {
  if (!tiles.length) return '<p class="bank-empty">No accounts in this print.</p>';
  tileOpts = tileOpts || {};
  rollup = rollup || { value: null, pending: 0 };
  var cards = tiles.map(function (t) {
    return '<div data-acct="' + bankEsc(t.name) + '" data-balance="' + (t.missing ? "missing" : String(t.balance)) + '">' +
      "<span>" + bankEsc(t.name) + "</span> " +
      (t.mask ? '<i class="mask">' + bankEsc(t.mask) + "</i> " : "") +
      "<b>" + bankMoney(t.missing ? null : t.balance) + "</b></div>";
  }).join("");
  if (!tileOpts.hideTotal) {
    var totalMissing = rollup.value == null;
    var partial = !totalMissing && rollup.pending > 0;
    var state = totalMissing ? "missing" : (partial ? "partial" : "set");
    cards += '<div data-total="' + state + '"' +
      (rollup.pending > 0 ? ' data-pending="' + rollup.pending + '"' : "") + '><span>Total cash</span> <b>' +
      bankMoney(totalMissing ? null : rollup.value) + "</b> " + bankTotalPendingHtml(rollup.pending) + "</div>";
  }
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
  if (!histKey || bankMonthInProgress(snap, histKey)) {
    return bankHistChrome(snap, opts) + '<p class="bank-empty">No history in this print.</p>';
  }
  var histMonth = bankParseYm(histKey);
  if (!histMonth) {
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
  var s = bankNum(spent);
  var p = bankNum(plan);
  if (p == null) return s == null ? "\u2014" : bankMoney(s);
  return bankMoney(s) + " of " + bankMoney(p);
}

function bankTierLeftText(spent, plan, historical) {
  var s = bankNum(spent);
  var p = bankNum(plan);
  if (s == null || p == null) return "Left \u2014";
  var delta = bankRoundCents(p - s);
  if (delta < -0.004) return (historical ? "Over by " : "Over ") + bankMoney(bankRoundCents(-delta));
  return "Left " + bankMoney(delta);
}

function bankVsBarHtml(spent, plan) {
  var p = bankNum(plan);
  if (p == null || !(p > 0)) return "";
  var pct = bankVsPct(spent, plan);
  var tone = bankVsTone(spent, plan);
  var width = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var toneAttr = tone ? ' data-tone="' + tone + '"' : "";
  var pctAttr = pct == null ? "" : ' data-pct="' + pct.toFixed(1) + '"';
  return '<span class="mix-bar"' + toneAttr + pctAttr + '><span style="width:' +
    width.toFixed(1) + "%;background:" + bankVsColor(tone) + '"></span></span>';
}

function bankVsRowHtml(name, spent, plan, attrs, extraFig) {
  var tone = bankVsTone(spent, plan);
  var amtCls = tone === "stop" ? "mix-amt tone-stop" : "mix-amt";
  return '<div class="mix-leg"' + (attrs || "") + (tone ? ' data-tone="' + tone + '"' : "") + ">" +
    '<i style="background:' + bankVsColor(tone) + '"></i>' +
    '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(name) + "</span>" +
    bankVsBarHtml(spent, plan) + "</span> " +
    '<span class="mix-leg-fig"><span class="' + amtCls + '">' + bankEsc(bankOfText(spent, plan)) + "</span>" +
    (extraFig || "") + "</span></div>";
}

function bankBarsHtml(rows, note) {
  var caption = note ? '<p class="bank-bar-note">' + bankEsc(note) + "</p>" : "";
  if (!rows.length) return caption + '<p class="bank-empty">No category limits in this print.</p>';
  var items = rows.map(function (r) {
    var name = bankBillDisplayName(r.name, r.display_label);
    return bankVsRowHtml(name, r.actual, r.target, ' data-bar="' + bankEsc(r.name) + '"');
  }).join("");
  return caption + bankCapList('<div class="mix-legend">' + items + "</div>", rows.length, "Progress vs limits");
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
    if (!byDay[day]) byDay[day] = { day: day, pays: [], payChips: [], bills: [], items: [], subs: [], payNotes: [] };
    return byDay[day];
  }
  (cells || []).forEach(function (c) {
    if (!c || !c.day) return;
    var due = c.day;
    var place = due > dim ? dim : due;
    if (place < 1) return;
    var dest = slot(place);
    (c.pays || []).forEach(function (name, i) {
      dest.pays.push(bankClampDayLabel(name, due, dim, faces));
      dest.payChips.push((c.payChips && c.payChips[i]) || "");
    });
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
  (c.pays || []).forEach(function (name, i) {
    labels.push({ kind: "pay", name: name, chip: (c.payChips && c.payChips[i]) || "" });
  });
  (c.subs || []).forEach(function (name) { labels.push({ kind: "sub", name: name }); });
  (c.bills || []).forEach(function (name) { labels.push({ kind: "bill", name: name }); });
  (c.items || []).forEach(function (name) {
    if ((c.bills || []).indexOf(name) >= 0) return;
    labels.push({ kind: "bill", name: name });
  });
  return labels;
}

function bankDayLabelHtml(kind, name, extraClass, chip) {
  var esc = bankEsc(name);
  var shown = chip ? bankEsc(chip) : esc;
  var cls = kind === "pay" ? "pay" : (kind === "sub" ? "sub" : "");
  if (chip && kind === "pay") cls = cls ? cls + " pay-named" : "pay-named";
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

function bankDayCellHtml(c, tabIndex, ym, today) {
  var labels = bankDayLabels(c);
  var tab = tabIndex === 0 ? "0" : "-1";
  var aria = ' aria-label="' + bankEsc(bankDayAria(c, ym)) + '"';
  var todayAttr = today && ym && c && today.year === ym.year && today.month === ym.month && today.day === c.day ? ' aria-current="date"' : "";
  var notes = (c.notes || []).filter(Boolean).map(function (note) {
    return '<small class="bank-day-note">' + bankEsc(note) + "</small>";
  }).join(" ");
  if (!labels.length) {
    return '<div class="bank-day" tabindex="' + tab + '" role="button"' + aria + todayAttr + "><b>" + c.day + "</b>" +
      (notes ? " " + notes : "") + "</div>";
  }
  var list = labels.map(function (lab) { return lab.name; }).join(", ");
  var bits = labels.map(function (lab, i) {
    var extra = i === 1 ? "bank-day-second" : (i >= 2 ? "bank-day-rest" : "");
    return bankDayLabelHtml(lab.kind, lab.name, extra, lab.chip);
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
  return '<div class="bank-day has' + (payday ? " bank-day-pay" : "") + (multi ? " multi" : "") + '" tabindex="' + tab + '" role="button"' + title + aria + todayAttr + ">" + head + (bits ? " " + bits : "") + "</div>";
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
  for (i = 1; i <= dim; i++) slots.push(byDay[i] || { day: i, pays: [], payChips: [], bills: [], items: [], subs: [], payNotes: [] });
  while (slots.length % 7) slots.push(null);
  var weeks = "";
  var dayStop = 0;
  var ymCells = { year: year, month: month };
  var todayCell = opts.today || null;
  for (i = 0; i < slots.length; i += 7) {
    var row = "";
    for (var j = 0; j < 7; j++) {
      var slot = slots[i + j];
      if (!slot) row += '<div class="bank-cal-pad" aria-hidden="true"></div>';
      else {
        row += bankDayCellHtml(slot, dayStop === 0 ? 0 : -1, ymCells, todayCell);
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
  if (doc && typeof doc === "object" && !Array.isArray(doc) && (doc.rules || doc.plans || doc.bill_status || doc.manual_paid || doc.bill_account || doc.move_buffer != null)) return doc;
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
  bankPreparedSubs(snap).forEach(function (s) {
    if (!bankBillCounted(s) || bankBillRetired(s, ym)) return;
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
  bankPreparedSubs(snap).forEach(function (s) {
    if (!bankBillCounted(s) || bankBillRetired(s, ym)) return;
    bump(bankResolveTierPrinted(s.name, snap, ctx, s), bankResolveTier(s.name, snap, ctx, s), bankNum(s.amount), isCancelled(s, ym));
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
  bankPreparedSubs(snap).forEach(function (s) {
    if (!s || !bankBillCounted(s) || bankBillRetired(s, ym) || s.amount == null || !(s.amount > 0)) return;
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

/* Tier Summary is the only place these rows render. */
function bankTierLineRows(groups, opts) {
  opts = opts || {};
  var seenRaw = {};
  var seenPaidFace = {};
  var month = opts.month;
  if (typeof month === "string") month = bankParseYm(bankMonthKey(month));
  var mode = opts.mode || "plan";
  var today = opts.today || "";
  if (today && typeof today === "object") today = bankDateKey(today.year, today.month, today.day);
  var paidAmounts = {};
  var out = { required: [], needs: [], wants: [] };
  ["required", "needs", "wants"].forEach(function (tier) {
    ((groups && groups[tier]) || []).forEach(function (r) {
      if (!bankPaidThisMonth(r, month)) return;
      var face = bankTierKey(r && r.name);
      var amt = bankTierRowAmount(r, month, opts.edits);
      if (!face || amt == null) return;
      if (!paidAmounts[face]) paidAmounts[face] = [];
      paidAmounts[face].push(amt);
    });
  });
  ["required", "needs", "wants"].forEach(function (tier) {
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
    rows = rows.filter(function (r) {
      var rawKey = bankTierKey((r && (r.key || (r.bill && r.bill.name))) || "");
      var faceKey = bankTierKey(r && r.name);
      var amt = bankTierRowAmount(r, month, opts.edits);
      if (!rawKey || seenRaw[rawKey]) return false;
      var paidList = paidAmounts[faceKey] || [];
      var samePaid = paidList.some(function (n) { return amt != null && Math.abs(n - amt) < 0.02; });
      if (samePaid && !bankPaidThisMonth(r, month)) return false;
      var paidKey = faceKey + "|" + (amt == null ? "" : String(amt));
      if (samePaid && seenPaidFace[paidKey]) return false;
      seenRaw[rawKey] = true;
      if (samePaid) seenPaidFace[paidKey] = true;
      return true;
    });
    rows.forEach(function (r) {
      var day = null;
      if (r.bill) day = r.bill.typical_day != null ? r.bill.typical_day : r.bill.due_day;
      else if (r.typical_day != null) day = r.typical_day;
      else if (r.days && r.days.length) day = r.days[0];
      day = bankDay(day);
      r.when = day != null && month && month.month >= 1 && month.month <= 12
        ? BANK_MONTHS[month.month - 1] + " " + String(day) : "";
    });
    if (rows.length === 1 && bankTierKey(rows[0].key || rows[0].name) === "other") rows = [];
    out[tier] = rows;
  });
  return out;
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

function bankCategoryMtdSpent(snap, name) {
  var budget = (snap && snap.budget) || {};
  var bag = budget.mtd_actual_by_category;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return null;
  return bankCategoryActual({ by_category: bag }, name);
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
  var accounts = bankFundingAccounts(budget, { window: window, mirror: mirror, snap: view });
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
  if (bankCategoriesActive(snap) && (key === "required" || key === "needs" || key === "wants")) {
    var monthKey = bankMonthKey(ym);
    var groups = bankGroupRollup(snap, monthKey);
    var found = 0;
    groups.forEach(function (group) { if (group.tier === key) found = group.plan; });
    return found;
  }
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

function bankPaycheckEvents(snap, opts) {
  var ym = bankScreenMonth(snap, opts || {});
  var events = [];
  var seen = {};
  [-1, 0, 1, 2].forEach(function (shift) {
    var view = bankParseYm(bankShiftYm(ym, shift));
    bankCollectPayEvents(snap, view || ym).forEach(function (ev) {
      if (!ev || !ev.date) return;
      if (!(ev.kind === "Payroll" || bankIsPayrollIncome(ev.name))) return;
      var k = ev.date + "|" + (ev.name || "") + "|" + (ev.amount || "");
      if (seen[k]) return;
      seen[k] = true;
      events.push(ev);
    });
  });
  events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return events;
}

function bankDaysBetween(a, b) {
  var da = Date.parse(String(a || "") + "T12:00:00Z");
  var db = Date.parse(String(b || "") + "T12:00:00Z");
  if (!isFinite(da) || !isFinite(db)) return 0;
  return Math.round((db - da) / 86400000);
}

function bankPayrollCheckAmount(snap, schedule) {
  var amount = null;
  (schedule || []).forEach(function (ev) {
    if (amount != null || !ev) return;
    var n = bankNum(ev.amount);
    if (n != null && n > 0) amount = n;
  });
  if (amount != null) return amount;
  var budget = (snap && snap.budget) || {};
  bankNormalizeIncome(budget).forEach(function (inc) {
    if (amount != null || !inc || !bankIsPayrollIncome(inc.label)) return;
    if (Array.isArray(inc.deposits)) {
      inc.deposits.forEach(function (dep) {
        if (amount == null) amount = bankNum(dep && dep.amount);
      });
    }
    if (amount == null) amount = bankNum(inc.amount);
  });
  return amount;
}

/* Canonical 15th / last-day paydays around a date, already rolled back onto a business day. */
function bankCanonicalPayrollDates(iso) {
  var dates = [];
  var p = String(iso || "").match(/^(\d{4})-(\d{2})/);
  if (!p) return dates;
  var start = bankYm(Number(p[1]), Number(p[2]));
  var shift;
  for (shift = -2; shift <= 2; shift++) {
    var view = bankParseYm(bankShiftYm(start, shift));
    if (!view) continue;
    var days = bankJustinPayDays("Payroll", view) || [];
    days.forEach(function (day) {
      var key = bankDateKey(view.year, view.month, day);
      if (key && dates.indexOf(key) < 0) dates.push(key);
    });
  }
  dates.sort();
  return dates;
}

/* Schedule payroll, plus a posted check Forge already rolled off the schedule, plus a skipped 15th or last day. */
function bankPayrollAnchors(snap, opts) {
  opts = opts || {};
  var today = bankTodayIso(snap, opts);
  var schedule = bankPaycheckEvents(snap, opts);
  var amount = bankPayrollCheckAmount(snap, schedule);
  var byDate = {};
  var anchors = [];
  function add(ev) {
    if (!ev || !ev.date || byDate[ev.date]) return;
    byDate[ev.date] = ev;
    anchors.push(ev);
  }
  schedule.forEach(add);
  var origin = today || (schedule[0] && schedule[0].date) || "";
  var canonical = bankCanonicalPayrollDates(origin);
  canonical.forEach(function (iso) {
    if (!today || iso > today || byDate[iso]) return;
    var ev = { name: "Payroll", kind: "Payroll", date: iso, amount: amount, account: null };
    var hit = null;
    try { hit = bankIncomeTxMatchPosted(snap, ev); } catch (e2) { hit = null; }
    if (!hit) return;
    add(ev);
  });
  anchors.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var extras = [];
  var claimed = {};
  var canonSet = {};
  canonical.forEach(function (iso) { canonSet[iso] = true; });
  var i;
  for (i = 0; i < anchors.length - 1; i++) {
    if (bankDaysBetween(anchors[i].date, anchors[i + 1].date) <= 20) continue;
    /* A real payday that is not the 15th or last day keeps its own window.
       Oct 1 through Oct 30 must not grow a synthesized Oct 15. */
    if (!canonSet[anchors[i].date] || !canonSet[anchors[i + 1].date]) continue;
    canonical.forEach(function (iso) {
      if (claimed[iso] || byDate[iso]) return;
      if (iso > anchors[i].date && iso < anchors[i + 1].date) {
        claimed[iso] = true;
        extras.push({ name: "Payroll", kind: "Payroll", date: iso, amount: amount, account: null });
      }
    });
  }
  if (anchors.length) {
    var first = anchors[0].date;
    var prevCanon = "";
    canonical.forEach(function (iso) {
      if (iso < first) prevCanon = iso;
    });
    if (prevCanon && !byDate[prevCanon] && !claimed[prevCanon]) {
      var lead = bankDaysBetween(prevCanon, first);
      if (lead >= 13 && lead <= 18 && today && prevCanon >= today) {
        claimed[prevCanon] = true;
        extras.push({ name: "Payroll", kind: "Payroll", date: prevCanon, amount: amount, account: null });
      }
    }
  }
  extras.forEach(add);
  anchors.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return anchors;
}

/* The current window starts at the latest paycheck that has already posted.
   A rolled pay_schedule drops that check, so the match also looks at canonical paydays in history. */
function bankLatestPostedPay(snap, opts) {
  var today = bankTodayIso(snap, opts || {});
  if (!today) return null;
  var posted = null;
  bankPayrollAnchors(snap, opts).forEach(function (ev) {
    if (!ev || ev.date > today) return;
    var hit = null;
    try { hit = bankIncomeTxMatchPosted(snap, ev); } catch (e) { hit = null; }
    if (!hit) return;
    if (!posted || ev.date > posted.date) posted = ev;
  });
  return posted;
}

function bankPayPeriod(snap, opts) {
  opts = opts || {};
  var today = bankTodayIso(snap, opts);
  var anchors = bankAllDepositEvents(snap, opts);
  if (anchors.length) {
    var posted = null;
    anchors.forEach(function (ev) {
      if (!today || !ev || ev.date > today) return;
      var hit = null;
      try { hit = bankIncomeTxMatchPosted(snap, ev); } catch (eHit) { hit = null; }
      if (!hit) return;
      if (!posted || ev.date > posted.date) posted = ev;
    });
    function anchorAmount(ev) { return ev && ev.amount != null ? ev.amount : null; }
    function nextAfter(date) {
      var end = "";
      anchors.forEach(function (ev) {
        if (!end && ev.date > date) end = ev.date;
      });
      if (!end) {
        var syn = bankSynthesizePayroll(date, posted ? posted.amount : anchorAmount(anchors[0]));
        end = syn && syn.date ? syn.date : bankAddDays(date, 14);
      }
      return end;
    }
    if (posted && today) {
      return { focus: posted, end: nextAfter(posted.date), started: true, today: today, thisPay: true, expected: false };
    }
    var prev = null;
    var upcoming = null;
    anchors.forEach(function (ev) {
      if (today && ev.date <= today) prev = ev;
      if (!upcoming && today && ev.date > today) upcoming = ev;
    });
    var startEv = null;
    var endDate = "";
    var started = false;
    if (prev && upcoming && prev.date < upcoming.date) {
      startEv = prev;
      endDate = upcoming.date;
      started = true;
    }
    if (!startEv) {
      anchors.forEach(function (ev) {
        if (!startEv && (!today || ev.date >= today)) startEv = ev;
      });
      if (!startEv) startEv = anchors[anchors.length - 1];
      endDate = nextAfter(startEv.date);
      started = !!(today && endDate && today >= startEv.date && today < endDate);
    }
    if (!endDate) endDate = nextAfter(startEv.date);
    return { focus: startEv, end: endDate, started: started, today: today || "", thisPay: false, expected: true };
  }
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
  var payrollOnly = events.filter(function (ev) { return ev.kind === "Payroll" || bankIsPayrollIncome(ev.name); });
  if (payrollOnly.length) events = payrollOnly;
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
  return { focus: startEv, end: endDate, started: started, today: today || "", thisPay: !!started };
}

function bankPeriodBillRows(snap, opts, start, end) {
  var rows = [];
  var months = [];
  bankPeriodSlices(start, end).forEach(function (slice) {
    if (months.indexOf(slice.ym) < 0) months.push(slice.ym);
  });
  var ctx = bankKindContext(snap);
  var paidByMonth = {};
  function paidAmounts(month) {
    if (!paidByMonth[month]) {
      var bills = bankPreparedBills(snap, undefined).filter(function (b) {
        return b && !bankBillRetired(b, month);
      });
      paidByMonth[month] = bankPaidMonthAmounts(snap, bills, month, opts);
    }
    return paidByMonth[month];
  }
  bankPreparedBills(snap, undefined).forEach(function (b) {
    if (!b || b.set_aside || bankIsSetAside(b)) return;
    months.forEach(function (month) {
      if (bankBillRetired(b, month)) return;
      if (bankResolveTier(b.name, snap, ctx, b) !== "required") return;
      var ym = bankParseYm(month);
      if (!ym) return;
      var trust = bankTrustPaidStatus(snap, b, month, opts);
      var paid = trust ? bankBillPaidStatus(b, month) : "";
      var isPaid = paid === "paid" || paid === "paid_late";
      var part = trust ? bankBillPartial(b, month) : null;
      var days = part && !isPaid ? bankPartialOpenDays(b, ym, part) : bankBillDueDays(b, ym);
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
        if (amount == null || !(amount > 0)) return;
        var face = bankTierKey(bankBillDisplayName(b.name, b.display_label));
        if (!isPaid && bankSamePaidAmount(paidAmounts(month)[face], amount)) return;
        var paidOn = isPaid ? ((b.paid_current_month && b.paid_current_month.paid_date) || b.paid_date || "") : "";
        var pay = bankPayCheckState(b, month, trust);
        rows.push({
          name: bankBillDisplayName(b.name, b.display_label),
          due: due,
          amount: amount,
          paid: isPaid,
          pay: pay,
          phrase: isPaid ? bankDueInlineStatus(true, paid === "paid_late", paidOn, day, ym) : bankDueInlineStatus(false, false, "", day, ym)
        });
      });
    });
  });
  try {
    bankPreparedSubs(snap).forEach(function (s) {
      if (!s || s.set_aside || bankIsSetAside(s) || s.typical_day == null) return;
      months.forEach(function (month) {
        if (bankBillRetired(s, month)) return;
        var subYm = bankParseYm(month);
        if (!subYm) return;
        var trust = bankTrustPaidStatus(snap, s, month, opts);
        var paid = trust ? bankBillPaidStatus(s, month) : "";
        var isPaid = paid === "paid" || paid === "paid_late";
        var day = bankDay(s.typical_day);
        if (day == null) return;
        var due = bankDateKey(subYm.year, subYm.month, day);
        if (!due || due < start || due >= end) return;
        var amount = bankNum(s.amount);
        if (amount == null || !(amount > 0)) return;
        var paidOn = isPaid ? ((s.paid_current_month && s.paid_current_month.paid_date) || s.paid_date || "") : "";
        var pay = bankPayCheckState(s, month, trust);
        rows.push({
          name: bankBillDisplayName(s.name, s.display_label),
          due: due,
          amount: amount,
          paid: isPaid,
          pay: pay,
          phrase: isPaid ? bankDueInlineStatus(true, paid === "paid_late", paidOn, day, subYm) : bankDueInlineStatus(false, false, "", day, subYm)
        });
      });
    });
  } catch (eSub) {}
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

/* One stepper for the month list and for what is left of a check. */
function bankLeftAfter(balance, row) {
  if (balance == null) return null;
  if (!row || !row.counted || row.pending || row.amount == null) return balance;
  var amount = Math.abs(bankNum(row.amount) || 0);
  var signed = row.kind === "out" ? -amount : amount;
  return bankRoundCents(balance + signed);
}

var bankLedgerMemo = null;

function bankStashLedgerLeft(snap, rows) {
  var map = {};
  (rows || []).forEach(function (row) {
    if (!row || row.left == null || !row.date) return;
    var day = String(row.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    map[day] = row.left;
    if (row.name) map[day + "|" + row.name] = row.left;
  });
  bankLedgerMemo = { snap: snap, map: map };
}

function bankLedgerLeftOn(snap, iso, name) {
  if (!bankLedgerMemo || bankLedgerMemo.snap !== snap) return null;
  var day = String(iso || "").slice(0, 10);
  if (name && bankLedgerMemo.map[day + "|" + name] != null) return bankLedgerMemo.map[day + "|" + name];
  if (bankLedgerMemo.map[day] == null) return null;
  return bankLedgerMemo.map[day];
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
  var rows = [];
  function pushBillRow(b, due, day, phrase, marker, partial, counted, per, paidFlag, posted, planAmt) {
    if (per == null || !(per > 0)) return;
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
      actualDiff: posted && planAmt != null && per != null && Math.abs(per - planAmt) > 0.004,
      cancelKey: bankBillControlKey(b),
      pay: bankPayCheckState(b, ym, bankTrustPaidStatus(snap, b, ym, opts)),
      chargedAfter: bankItemChargedAfter(snap, b)
    });
  }
  function ledgerTier(row) {
    if (bankCategoriesActive(snap)) {
      var grouped = bankSpendGroupOf(row, snap);
      if (grouped) return grouped;
    }
    var explicit = bankTierWord(row && row.tier);
    if (explicit === "needs" || explicit === "wants") return explicit;
    return bankResolveTier(row && row.name, snap, tierCtx, row);
  }
  var seenRow = {};
  var paidFaces = {};
  (bills || []).forEach(function (b) {
    if (!b || bankBillRetired(b, ym)) return;
    var trust = bankTrustPaidStatus(snap, b, ym, opts);
    var status = bankPayStatusText(b, ym, today, trust);
    var paidFlag = trust && (status === "Paid" || (status && status.indexOf("Paid") === 0) || bankBillPaidStatus(b, ym) === "paid" || bankBillPaidStatus(b, ym) === "paid_late");
    if (!paidFlag) return;
    paidFaces[bankTierKey(bankLedgerFace(snap, bankBillDisplayName(b.name, b.display_label)))] = true;
  });
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
    var faceKey = bankTierKey(bankLedgerFace(snap, bankBillDisplayName(b.name, b.display_label)));
    /* A bill paid this month is one row on the paid date, never also an upcoming due row. */
    if (paidFlag && mode !== "historical") {
      var paidOn = (b.paid_current_month && b.paid_current_month.paid_date) || b.paid_date || "";
      var paidKey = bankCopyDate(paidOn) || "";
      if (paidKey && monthKey && bankMonthKey(paidKey) !== monthKey) paidKey = "";
      var paidDay = paidKey ? Number(String(paidKey).slice(8, 10)) : (dueDays[0] || null);
      var duePaid = paidKey || (paidDay != null && ymObj ? bankDateKey(ymObj.year, ymObj.month, paidDay) : "");
      var paidBits = phraseFor(paidDay);
      pushBillRow(b, duePaid, paidDay, paidBits.phrase, paidBits.marker, partial, counted, per, true, actual != null, planAmt);
      return;
    }
    if (!paidFlag && paidFaces[faceKey]) return;
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
    if (paidFaces[bankTierKey(name)]) return;
    var amount = bankNum(extra.amount != null ? extra.amount : extra.typical_amount);
    var tier = bankResolveTier(name, snap, tierCtx, extra);
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
    if (!s || isCancelled(s, ym) || bankBillRetired(s, ym)) return;
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
        paid: true,
        cancelKey: bankBillControlKey(s),
        pay: { on: true, bank: true, manual: false, key: "" },
        chargedAfter: bankItemChargedAfter(snap, s)
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
      pending: s.amount == null,
      cancelKey: bankBillControlKey(s),
      pay: bankPayCheckState(s, ym, trust),
      chargedAfter: bankItemChargedAfter(snap, s)
    });
  });
  bankLedgerDeposits(snap, bankParseYm(monthKey)).forEach(function (ev) {
    var postedIn = false;
    try { postedIn = !!bankIncomeTxMatch(snap, ev); } catch (eIn) { postedIn = false; }
    rows.push({
      date: ev.date,
      name: ev.kind || ev.name || "Deposit",
      amount: ev.amount,
      kind: "in",
      phrase: bankShortDate(ev.date) || ev.date,
      marker: "",
      chip: "",
      counted: true,
      pending: false,
      posted: postedIn
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
      if (!row || row.notFound) return false;
      if (row.paid) return row.amount == null || row.amount > 0;
      if (row.undated || !row.date || String(row.date).indexOf("999") === 0) return false;
      return true;
    });
  }
  var anchor = null;
  if (closed) {
    if (opening != null) anchor = opening;
  } else if (liveMonth) anchor = bankHeroNow(snap, opts);
  if (anchor == null && books.leftNow != null) anchor = books.leftNow;
  if (anchor == null && books.start != null) anchor = books.start;
  var balance = anchor;
  var listedByCat = {};
  function walkRows(list, startBal, track) {
    var bal = startBal;
    var inn = 0;
    var out = 0;
    (list || []).forEach(function (row) {
      if (!row) return;
      if (bal == null) {
        row.left = null;
        return;
      }
      if (row.counted && !row.pending && row.amount != null) {
        if (row.kind === "in") inn += row.amount;
        else if (row.kind === "out") out += row.amount;
      }
      bal = bankLeftAfter(bal, row);
      row.left = bal;
      if (track && !closed && row.kind === "out" && !row.rollup) {
        var catId = bankItemCategoryId(row, snap);
        if (catId) listedByCat[catId] = (listedByCat[catId] || 0) + row.amount;
      }
    });
    return { bal: bal, inn: bankRoundCents(inn), out: bankRoundCents(out) };
  }
  var beforeToday = [];
  var sameDay = [];
  var afterToday = [];
  if (liveMonth && todayIso) {
    rows.forEach(function (row) {
      /* Already posted, so the row is a label. Left now already includes it. */
      if (row.paid) row.counted = false;
      if (row.kind === "in" && row.posted && row.date && row.date <= todayIso) row.counted = false;
      /* An expected deposit dated before today has not landed, so it projects after Today. */
      if (row.kind === "in" && !row.posted && row.date && row.date < todayIso && String(row.date).indexOf("999") !== 0) {
        row.expected = true;
        row.phrase = row.phrase ? (row.phrase + " \u00b7 expected") : "expected";
        afterToday.push(row);
        return;
      }
      if (row.date && String(row.date).indexOf("999") !== 0 && row.date < todayIso) beforeToday.push(row);
      else if (row.date === todayIso) sameDay.push(row);
      else afterToday.push(row);
    });
  } else afterToday = rows.slice();
  function rowSortKey(row) {
    var d = row && row.date ? String(row.date) : "";
    if (!d || d.indexOf("999") === 0) return "9999-99-99";
    return d;
  }
  var forwardRows = sameDay.concat(afterToday);
  if (liveMonth && todayIso) {
    forwardRows.sort(function (a, b) {
      var ad = rowSortKey(a);
      var bd = rowSortKey(b);
      if (ad !== bd) return ad < bd ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === "in" ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
  }
  var histStart = books.start != null ? books.start : 0;
  walkRows(beforeToday, histStart, false);
  var nowBal = liveMonth ? anchor : (books.start != null ? books.start : anchor);
  beforeToday.forEach(function (row) {
    if (row && row.kind === "in" && row.posted) row.left = nowBal;
  });
  var todayRow = null;
  if (liveMonth && todayIso) {
    todayRow = {
      date: todayIso,
      name: "Today",
      amount: null,
      kind: "",
      phrase: "",
      marker: "",
      chip: "",
      counted: true,
      pending: true,
      today: true,
      left: nowBal
    };
  }
  var forward = walkRows(forwardRows, nowBal, true);
  balance = forward.bal;
  var bodyRows = beforeToday.slice();
  if (todayRow) bodyRows.push(todayRow);
  bodyRows = bodyRows.concat(forwardRows);
  var setAside = 0;
  var billsExtra = 0;
  if (!closed) {
    var listedRequired = {};
    bodyRows.forEach(function (row) {
      if (!row || row.kind !== "out" || row.rollup || row.tier !== "required" || row.amount == null) return;
      listedRequired[bankTierKey(row.name)] = true;
      listedRequired[bankBillKey(row.name)] = true;
    });
    var requiredBuckets = {};
    var requiredOrder = [];
    var requiredUnnamed = 0;
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
        var remainAmt = Math.max(0, plan - (paid || 0));
        sum += remainAmt;
        if (!(remainAmt > 0.004) || !bankCategoriesActive(snap)) return;
        var catId = "";
        try { catId = bankItemCategoryId(row || { name: name }, snap) || ""; } catch (eCat) { catId = ""; }
        var cat = catId ? bankSpendById(bankSpendCategories(snap), catId) : null;
        if (!cat || !cat.name) {
          requiredUnnamed += remainAmt;
          return;
        }
        if (!requiredBuckets[cat.name]) {
          requiredBuckets[cat.name] = 0;
          requiredOrder.push(cat.name);
        }
        requiredBuckets[cat.name] += remainAmt;
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
    var needsRemain = 0;
    var wantsRemain = 0;
    var figs = bankCategoryFigures(snap, monthKey);
    var tierParts = { required: [], needs: [], wants: [] };
    function pushPart(tier, name, remain, over) {
      tierParts[tier].push({
        tier: tier,
        name: name,
        remain: bankRoundCents(remain || 0),
        over: over > 0.004 ? bankRoundCents(over) : 0
      });
    }
    Object.keys(figs).forEach(function (id) {
      var row = figs[id];
      if (!row || (row.tier !== "needs" && row.tier !== "wants" && row.tier !== "required")) return;
      var plan = row.plan || 0;
      var spent = row.spent || 0;
      var listed = listedByCat[id] || 0;
      var over = spent - plan > 0.004 ? spent - plan : 0;
      var left = over ? 0 : Math.max(0, plan - spent - listed);
      if (row.tier === "needs") needsRemain += left;
      else if (row.tier === "wants") wantsRemain += left;
      var quiet = !(plan > 0.004) && !(spent > 0.004) && !(listed > 0.004);
      if (quiet) return;
      if (row.tier === "needs" || row.tier === "wants") pushPart(row.tier, row.name, left, over);
    });
    needsRemain = bankRoundCents(needsRemain);
    wantsRemain = bankRoundCents(wantsRemain);
    billsExtra = unlistedRequiredRemain();
    requiredOrder.forEach(function (name) {
      pushPart("required", name, requiredBuckets[name], 0);
    });
    if (requiredUnnamed > 0.004) tierParts.required = [];
    else {
      var requiredSum = 0;
      tierParts.required.forEach(function (part) { requiredSum += part.remain; });
      if (Math.abs(bankRoundCents(requiredSum) - billsExtra) > 0.009) tierParts.required = [];
    }
    ["needs", "wants"].forEach(function (tier) {
      tierParts[tier].sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    });
    tierParts.required.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    setAside = bankRoundCents(needsRemain + wantsRemain);
    [["Required", billsExtra, "required"], ["Needs", needsRemain, "needs"], ["Wants", wantsRemain, "wants"]].forEach(function (pair) {
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
        left: balance,
        rollup: pair[0] !== "Required",
        remainGroup: pair[2],
        breakouts: tierParts[pair[2]] || []
      });
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
  if (opts.flows && !closed) {
    var remainIn = forward && forward.inn ? forward.inn : 0;
    var datedOut = forward && forward.out ? forward.out : 0;
    var billsRemain = bankRoundCents(datedOut + (billsExtra || 0));
    var asideN = bankRoundCents(setAside || 0);
    var remainOut = bankRoundCents(billsRemain + asideN);
    var startN = books.start;
    var leftN = balance == null ? null : bankRoundCents(balance);
    var tileIn = bankRoundCents(remainIn);
    var tileOut = leftN == null || startN == null ? remainOut : bankRoundCents(startN + tileIn - leftN);
    var paidBills = 0;
    bodyRows.forEach(function (row) {
      if (row && row.paid && row.amount > 0) paidBills += row.amount;
    });
    var postedOut = 0;
    (books.accounts || []).forEach(function (acct) {
      (acct.rows || []).forEach(function (row) {
        if (!row || row.kind === "in" || !(row.amount > 0)) return;
        var day = bankDayKey(row.date);
        if (todayIso && day && day > todayIso) return;
        postedOut += row.amount;
      });
    });
    var planSum = 0;
    var spentSum = 0;
    var figRows = bankCategoryFigures(snap, monthKey);
    Object.keys(figRows).forEach(function (id) {
      planSum += figRows[id].plan || 0;
      spentSum += figRows[id].spent || 0;
    });
    opts.flows.ready = true;
    opts.flows.start = startN;
    opts.flows.inn = tileIn;
    opts.flows.out = bankRoundCents(tileOut);
    opts.flows.left = leftN;
    opts.flows.hasIn = remainIn > 0.004;
    opts.flows.hasOut = remainOut > 0.004;
    opts.flows.remainIn = bankRoundCents(remainIn);
    opts.flows.remainOut = remainOut;
    opts.flows.billsRemain = billsRemain;
    opts.flows.setAside = asideN;
    opts.flows.now = nowBal == null ? null : bankRoundCents(nowBal);
    opts.flows.postedOut = bankRoundCents(postedOut);
    var remainSpend = {};
    Object.keys(figRows).forEach(function (id) { remainSpend[id] = figRows[id].spent || 0; });
    var extraPaid = 0;
    bodyRows.forEach(function (row) {
      if (!row || !row.paid || !(row.amount > 0)) return;
      var catId = "";
      try { catId = bankItemCategoryId(row, snap) || ""; } catch (ePaid) { catId = ""; }
      var have = catId && remainSpend[catId] != null ? remainSpend[catId] : 0;
      if (have + 0.004 >= row.amount) {
        if (catId) remainSpend[catId] = bankRoundCents(have - row.amount);
        return;
      }
      extraPaid += row.amount;
    });
    var paidTotal = bankRoundCents(spentSum + extraPaid);
    opts.flows.paid = paidTotal;
    opts.flows.plan = bankRoundCents(planSum);
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
    var fromHtml = "";
    if (row.kind === "out" && !row.rollup && row.name) {
      try {
        var fromText = bankFromLabel(bankPayFromForName(snap, row.name));
        if (fromText) fromHtml = ' <span class="sub">' + bankEsc(fromText) + "</span>";
      } catch (eFrom) { fromHtml = ""; }
    }
    var meta = metaBits.length ? '<span class="sub">' + bankMetaHtml(metaBits.join(" \u00b7 ")) + "</span>" : "";
    var extras = [];
    if (row.marker) extras.push(row.marker);
    if (row.chip) extras.push(row.chip);
    if (row.chargedAfter) extras.push(bankChargedFlagHtml());
    var amt = row.closing || row.pending ? '<td class="num"><span class="sub">\u2014</span></td>' : (function () {
      var flow = bankFundSigned(row.amount, row.kind === "in" ? "in" : "out");
      return '<td class="num ' + flow.cls + '">' + bankEsc(flow.text) + "</td>";
    })();
    var leftCls = row.left < -0.0001 ? " num tone-stop" : " num";
    var rowMeta = ' data-bank-row-date="' + bankEsc(row.date || "") + '" data-bank-row-kind="' + bankEsc(row.kind || "") + '"';
    if (row.left != null && !row.notFound) rowMeta += ' data-bank-row-left="' + bankRoundCents(row.left) + '"';
    if (row.remainGroup) rowMeta += ' data-bank-remain-group="' + bankEsc(row.remainGroup) + '" data-bank-remain="' + bankRoundCents(row.amount) + '"';
    if (row.expected) rowMeta += ' data-bank-expected="1"';
    if (row.today && !closed) rowMeta += ' data-bank-today="1"';
    var classes = [];
    if (row.notFound) classes.push("tone-flat");
    if (row.remainGroup) classes.push("bank-fund-group bank-fund-remain");
    if (row.closing) classes.push("bank-fund-total");
    if (!row.remainGroup && !row.closing && row.kind === "out" && !row.rollup) classes.push("bank-fund-line");
    var rowCls = classes.length ? ' class="' + classes.join(" ") + '"' : "";
    var leftCell = showBalance && !row.notFound ? '<td class="' + leftCls.trim() + '">' + bankEsc(bankMoney(row.left)) + "</td>" : (showBalance ? '<td class="num"><span class="sub">\u2014</span></td>' : "");
    var nameBits = "<span class=\"sym\">" + bankEsc(row.name) + "</span>" +
      (meta ? " " + meta : "") + fromHtml + (extras.length ? " " + extras.join(" ") : "");
    var nameCell = "<td class=\"bank-fund-name\">" + nameBits + "</td>";
    if (row.pay && row.pay.key && row.kind === "out" && !row.rollup && !row.closing) {
      nameCell = "<td class=\"bank-fund-name\">" + bankPayTapHtml(row.pay, nameBits) + "</td>";
    }
    var main = "<tr" + rowMeta + rowCls + ">" + nameCell + amt + leftCell + "</tr>";
    var kids = (row.breakouts || []).map(function (part) {
      var over = part.over > 0.004;
      var kidAmt = over
        ? '<td class="num tone-stop">' + bankEsc("Over " + bankMoney(part.over)) + "</td>"
        : '<td class="num tone-flat">' + bankEsc(bankFundSigned(part.remain || 0, "out").text) + "</td>";
      var kidLeft = showBalance ? '<td class="num"></td>' : "";
      return '<tr class="tone-flat bank-fund-sub" data-bank-remain-cat="' + bankEsc(part.tier) + '" data-bank-remain="' + bankRoundCents(part.remain || 0) +
        '" data-bank-cat-over="' + bankRoundCents(part.over || 0) + '" data-bank-cat-name="' + bankEsc(part.name) +
        '"><td class="bank-fund-name"><span class="sub">' + bankEsc(part.name) + "</span></td>" + kidAmt + kidLeft + "</tr>";
    }).join("");
    return main + kids;
  }).join("");
  var head = showBalance
    ? "<tr><th>Item</th><th class=\"num\">Amount</th><th class=\"num\">Left after</th></tr>"
    : "<tr><th>Item</th><th class=\"num\">Amount</th></tr>";
  var cols = showBalance
    ? '<colgroup><col class="bank-fund-name"><col class="bank-fund-amt"><col class="bank-fund-left"></colgroup>'
    : '<colgroup><col class="bank-fund-name"><col class="bank-fund-amt"></colgroup>';
  var table = '<table class="book bank-fund-grid">' + cols + "<thead>" + head + "</thead><tbody>" + trs + "</tbody></table>";
  var ledgerEnd = "";
  var lastLeft = null;
  bodyRows.forEach(function (row) {
    if (row && row.left != null && !row.notFound) lastLeft = row.left;
  });
  if (lastLeft != null) ledgerEnd = ' data-bank-ledger-end="' + bankRoundCents(lastLeft) + '"';
  bankStashLedgerLeft(snap, bodyRows);
  return '<section class="bank-due-month"' + ledgerEnd + ">" + bankDueHeading(listTitle) +
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
  var droppedCancel = false;
  if (opts.snap) {
    events = events.filter(function (ev) {
      if (!bankFundingEventCancelled(opts.snap, ev)) return true;
      droppedCancel = true;
      return false;
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
    var printedBal = !droppedCancel && printedRows && printedRows[idx] ? bankNum(bankPickField(printedRows[idx], ["running_balance", "balance"])) : null;
    if (!droppedCancel && printedRows && printedRows.length) {
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
  var shortBy = droppedCancel ? null : bankNum(bankPickField(row, ["short_by", "shortfall", "short"]));
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
  var end = droppedCancel ? null : bankNum(bankPickField(row, ["end_balance", "ending_balance", "end", "projected_end"]));
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
  var flowBag = opts.flows && opts.flows.ready ? opts.flows : null;
  var innN = flowBag ? flowBag.inn : books.inn;
  var outN = flowBag ? flowBag.out : books.out;
  var leftN = flowBag ? flowBag.left : books.leftNow;
  var table = showBooks
    ? '<div hidden data-fund-start="' + bankEsc(books.start == null ? "" : String(books.start)) +
      '" data-fund-in="' + bankEsc(innN == null ? "" : String(innN)) + '" data-fund-out="' + bankEsc(outN == null ? "" : String(outN)) +
      '" data-fund-left="' + bankEsc(leftN == null ? "" : String(leftN)) + '"></div>' + short
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
  /* The allocation table is a later tip. Keep the move note, hide the grid. */
  var seenNote = {};
  var notes = [];
  accounts.forEach(function (acct) {
    var note = bankFundMoveNote(snap, acct);
    if (!note || seenNote[note]) return;
    seenNote[note] = true;
    notes.push(note);
  });
  var allocHtml = "";
  try { allocHtml = bankAllocMovesHtml(bankAllocate(snap, opts).moves); } catch (eAlloc) { allocHtml = ""; }
  return notes.join("") + allocHtml;
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

function bankFallbackPayEvents(budget, view) {
  var events = [];
  if (!view || !view.year) return events;
  bankNormalizeIncome(budget).forEach(function (inc) {
    bankIncomeFallbackMarks(inc, view).forEach(function (mark) {
      if (!mark || !mark.date) return;
      events.push({
        name: inc.label,
        kind: bankStreamKind(inc.label, inc),
        date: mark.date,
        amount: bankNum(mark.amount != null ? mark.amount : inc.amount),
        account: inc.usual_account || null,
        rolled_from: mark.rolled_from || ""
      });
    });
  });
  return events;
}

function bankCollectPayEvents(snap, ym) {
  var budget = (snap && snap.budget) || {};
  var events = [];
  var schedule = Array.isArray(budget.pay_schedule) ? budget.pay_schedule : [];
  if (schedule.length) {
    var covered = {};
    schedule.forEach(function (row) {
      if (!row || (!row.date && !row.pay_date)) return;
      var when = bankScheduleDate(row);
      if (!when) return;
      var nominal = bankScheduleNominal(row);
      var monthKey = bankMonthKey(when);
      if (monthKey) covered[monthKey] = true;
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
    var asked = ym && ym.year ? ym : bankCalendarMonth(snap);
    if (asked && asked.year && !covered[bankYm(asked.year, asked.month)]) {
      bankFallbackPayEvents(budget, asked).forEach(function (ev) { events.push(ev); });
    }
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
      amount: amount,
      rolled_from: ev.rolled_from || ""
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
    var paidAmounts = bankPaidMonthAmounts(snap, bills, month, opts);
    bills.forEach(function (b) {
      if (!b || bankBillRetired(b, month) || !bankBillCounted(b)) return;
      var trust = bankTrustPaidStatus(snap, b, month, opts);
      var paid = trust ? bankBillPaidStatus(b, month) : "";
      if (paid === "paid" || paid === "paid_late") return;
      var face = bankTierKey(bankBillDisplayName(b.name, b.display_label));
      var amt = bankBillLineAmount(b, month, opts.edits);
      if (bankSamePaidAmount(paidAmounts[face], amt)) return;
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

function bankIncomeTxMatchLists(lists, ev) {
  var hit = null;
  (lists || []).forEach(function (list) {
    (list || []).forEach(function (raw) {
      if (hit || !raw) return;
      var side = bankFlowSide(raw);
      if (side !== "in") return;
      var when = String(raw.date || "").slice(0, 10);
      if (!when || !ev || !ev.date) return;
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

function bankIncomeTxMatch(snap, ev) {
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  return bankIncomeTxMatchLists(lists, ev);
}

/* Posted-pay lookback also sees history. The month tape often starts after the last check. */
function bankIncomeTxMatchPosted(snap, ev) {
  var hit = null;
  try { hit = bankIncomeTxMatch(snap, ev); } catch (e) { hit = null; }
  if (hit) return hit;
  var wider = [];
  try { wider = bankHistoryTxLists(snap); } catch (e2) { wider = []; }
  return bankIncomeTxMatchLists(wider, ev);
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
  bankPreparedSubs(snap).forEach(function (s) {
    if (s.typical_day == null || isCancelled(s, focus.date.slice(0, 7))) return;
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

function bankIsScheduledDeposit(ev) {
  if (!ev) return false;
  var kind = ev.kind || "";
  var name = ev.name || "";
  if (kind === "Payroll" || kind === "Stipend") return true;
  if (bankIsPayrollIncome(kind) || bankIsFosteringIncome(kind)) return true;
  if (bankIsPayrollIncome(name) || bankIsFosteringIncome(name)) return true;
  return false;
}

/* Payroll anchors plus every other scheduled deposit. One-offs stay off this list. */
function bankAllDepositEvents(snap, opts) {
  opts = opts || {};
  var ym = bankScreenMonth(snap, opts);
  var events = [];
  var seen = {};
  function add(ev) {
    if (!ev || !ev.date || !bankIsScheduledDeposit(ev)) return;
    var k = ev.date + "|" + (ev.kind || ev.name || "");
    if (seen[k]) return;
    seen[k] = true;
    events.push(ev);
  }
  [-1, 0, 1, 2].forEach(function (shift) {
    var view = bankParseYm(bankShiftYm(ym, shift));
    bankCollectPayEvents(snap, view || ym).forEach(add);
  });
  bankPayrollAnchors(snap, opts).forEach(function (ev) {
    if (!ev || !ev.date) return;
    var payrollThere = false;
    events.forEach(function (row) {
      if (row.date === ev.date && (row.kind === "Payroll" || bankIsPayrollIncome(row.name))) payrollThere = true;
    });
    if (!payrollThere) add(ev);
  });
  events.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    var ak = a.kind || a.name || "";
    var bk = b.kind || b.name || "";
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
  return events;
}

function bankPayEvents(snap, opts) {
  opts = opts || {};
  var ym = bankScreenMonth(snap, opts);
  var events = [];
  var seen = {};
  [0, 1, 2].forEach(function (shift) {
    var view = bankParseYm(bankShiftYm(ym, shift));
    bankCollectPayEvents(snap, view || ym).forEach(function (ev) {
      if (!ev || !ev.date) return;
      var k = ev.date + "|" + (ev.name || "") + "|" + (ev.amount || "") + "|" + (ev.kind || "");
      if (seen[k]) return;
      seen[k] = true;
      events.push(ev);
    });
  });
  events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return events;
}

function bankSynthesizePayroll(afterDate, amount) {
  var p = String(afterDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return null;
  var year = Number(p[1]);
  var month = Number(p[2]);
  var guard = 0;
  while (guard < 4) {
    guard += 1;
    var days = bankJustinPayDays("Payroll", { year: year, month: month });
    var i;
    for (i = 0; i < days.length; i++) {
      var key = bankDateKey(year, month, days[i]);
      if (key && key > afterDate) {
        return { name: "Payroll", kind: "Payroll", date: key, amount: amount, account: null };
      }
    }
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return null;
}

function bankPayPeriods(snap, opts) {
  var first = bankPayPeriod(snap, opts);
  if (!first || !first.focus) return [];
  var anchors = bankAllDepositEvents(snap, opts);
  var events = bankPayEvents(snap, opts);
  var payroll = events.filter(function (ev) { return ev.kind === "Payroll" || bankIsPayrollIncome(ev.name); });
  var primary = anchors.length ? anchors : (payroll.length ? payroll : events.slice());
  var periods = [first];
  var screen = bankScreenMonth(snap, opts);
  var monthEnd = bankDateKey(screen.year, screen.month, bankMonthDim(screen.year, screen.month));
  function following(afterDate) {
    var start = null;
    primary.forEach(function (ev) {
      if (!start && ev.date > afterDate) start = ev;
    });
    if (!start) start = bankSynthesizePayroll(afterDate, first.focus.amount);
    return start;
  }
  function periodEnd(start) {
    var end = "";
    primary.forEach(function (ev) {
      if (!end && ev.date > start.date) end = ev.date;
    });
    if (!end) {
      var nxt = bankSynthesizePayroll(start.date, start.amount);
      if (nxt && nxt.date > start.date) end = nxt.date;
    }
    if (!end) end = bankAddDays(start.date, 14);
    return end;
  }
  var guard = 0;
  while (periods.length < 8 && guard < 12) {
    guard += 1;
    var prev = periods[periods.length - 1];
    var start = following(prev.focus.date);
    if (!start || !start.date || start.date === prev.focus.date) break;
    if (start.date > monthEnd) {
      if (periods.length < 2) periods.push({ focus: start, end: periodEnd(start), started: false, today: first.today || "", thisPay: false, expected: true });
      break;
    }
    periods.push({ focus: start, end: periodEnd(start), started: false, today: first.today || "", thisPay: false, expected: true });
  }
  var monthStart = bankDateKey(screen.year, screen.month, 1);
  var todayIso = first.today || "";
  var seenStart = {};
  periods.forEach(function (p) {
    if (p && p.focus && p.focus.date) seenStart[p.focus.date] = true;
  });
  var earlier = [];
  if (anchors.length && monthStart && monthEnd) {
    anchors.forEach(function (ev) {
      if (!ev || !ev.date || seenStart[ev.date]) return;
      if (first.focus && ev.date >= first.focus.date) return;
      var end = periodEnd(ev);
      if (!(ev.date <= monthEnd && end > monthStart)) return;
      var past = !!(todayIso && end <= todayIso);
      earlier.push({
        focus: ev,
        end: end,
        started: false,
        today: todayIso,
        thisPay: false,
        expected: !past,
        past: past
      });
    });
  }
  earlier.sort(function (a, b) {
    return a.focus.date < b.focus.date ? -1 : a.focus.date > b.focus.date ? 1 : 0;
  });
  if (earlier.length) periods = earlier.concat(periods);
  return periods;
}

function bankForOriginalNote(iso) {
  var p = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!p) return "";
  var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var y = Number(p[1]);
  var m = Number(p[2]);
  var d = Number(p[3]);
  return "(for " + names[bankDow(y, m, d)] + " " + bankOrdinal(d) + ")";
}

function bankDepositFace(ev) {
  if (!ev) return "Income";
  var kind = bankStreamKind(ev.name, ev);
  if (kind === "Stipend" || kind === "Payroll") return kind;
  return ev.name || kind || "Income";
}

function bankAlsoInDeposits(snap, period) {
  var out = [];
  if (!period || !period.focus) return out;
  var seen = {};
  bankPeriodSlices(period.focus.date, period.end).forEach(function (slice) {
    bankLedgerDeposits(snap, bankParseYm(slice.ym)).forEach(function (ev) {
      if (!ev || !ev.date || ev.amount == null) return;
      if (ev.date < period.focus.date || ev.date >= period.end) return;
      if (bankIsScheduledDeposit(ev)) return;
      var same = ev.date === period.focus.date && (ev.kind === period.focus.kind || ev.name === period.focus.name);
      if (same) return;
      var k = ev.date + "|" + (ev.kind || ev.name) + "|" + ev.amount;
      if (seen[k]) return;
      seen[k] = true;
      out.push(ev);
    });
  });
  return out;
}

function bankAlsoInAmount(snap, period) {
  var rows = bankAlsoInDeposits(snap, period);
  if (!rows.length) return 0;
  var sum = 0;
  rows.forEach(function (ev) { sum += Math.abs(ev.amount); });
  return bankRoundCents(sum);
}

function bankAlsoDepositHtml(ev) {
  var face = bankDepositFace(ev);
  var when = bankWeekDate(ev.date);
  var label = when ? face + " \u00b7 " + when : face;
  var note = ev && ev.rolled_from && ev.rolled_from !== ev.date ? bankForOriginalNote(ev.rolled_from) : "";
  var flow = bankFundSigned(Math.abs(ev.amount || 0), "in");
  return '<p class="bank-also-row" data-bank-also-row="' + bankEsc(ev.date || "") + '" data-bank-also-amt="' +
    (ev.amount == null ? "" : ev.amount) + '"><span class="sym">' + bankEsc(label) + "</span>" +
    (note ? ' <small>' + bankEsc(note) + "</small>" : "") +
    ' <b class="num tone-go">' + bankEsc(flow.text) + "</b></p>";
}

function bankNeedsKnown(snap, opts) {
  if (!snap) return false;
  if (bankCategoriesActive(snap)) return true;
  var budget = snap.budget || {};
  var tiers = budget.tiers && typeof budget.tiers === "object" ? budget.tiers : {};
  if (bankNum(tiers.needs_plan) != null || bankNum(tiers.needs) != null) return true;
  var plans = {};
  try { plans = bankTierDoc(snap).plans || {}; } catch (e) { plans = {}; }
  if (bankNum(plans.needs) != null || bankNum(plans.needs_plan) != null) return true;
  var planned = budget.planned_by_category;
  if (planned && typeof planned === "object" && !Array.isArray(planned) && Object.keys(planned).length) return true;
  return false;
}

function bankPeriodMath(snap, opts, period, carried) {
  var ev = period.focus;
  var bills = bankPeriodBillRows(snap, opts, ev.date, period.end);
  var billSum = 0;
  bills.forEach(function (row) {
    if (!row || row.amount == null) return;
    billSum += row.amount;
  });
  billSum = bankRoundCents(billSum);
  var known = bankNeedsKnown(snap, opts);
  var needsFull = known ? bankProratePlan(snap, ev.date, period.end, "needs", opts) : null;
  var spent = known ? bankNeedsSpentInPeriod(snap, ev.date, period.end, period.today, period.started) : 0;
  var needs = needsFull == null ? null : bankRoundCents(Math.max(0, needsFull - spent));
  var aside = needs == null && !(billSum > 0) ? null : bankRoundCents(billSum + (needs || 0));
  var deposit = bankNum(ev.amount);
  var also = bankAlsoInAmount(snap, period);
  var carriedN = carried == null ? 0 : bankRoundCents(Number(carried) || 0);
  var step = { kind: "in", amount: 0, counted: true, pending: false };
  var left = carriedN;
  step.kind = "in";
  step.amount = deposit == null ? 0 : deposit;
  left = bankLeftAfter(left, step);
  step.amount = also || 0;
  left = bankLeftAfter(left, step);
  step.kind = "out";
  step.amount = billSum;
  left = bankLeftAfter(left, step);
  step.amount = needs || 0;
  left = bankLeftAfter(left, step);
  if (deposit == null && !carriedN && !(also > 0) && !(billSum > 0) && !(needs > 0)) left = null;
  return { bills: bills, needs: needs, aside: aside, deposit: deposit, also: also, carried: carriedN, left: left };
}

/* Last-4 on a print account. suffix wins. last4 is the same four digits when the print stores them there. */
function bankAccountSuffix(row) {
  if (!row || typeof row !== "object") return "";
  if (row.suffix != null && String(row.suffix).trim() !== "") return bankLast4Digits(row.suffix);
  return bankLast4Digits(row.last4 != null && row.last4 !== "" ? row.last4 : (row.last_4 || row.mask));
}

function bankPrintAccounts(snap) {
  var out = [];
  var seen = {};
  bankAccounts(snap).forEach(function (row) {
    if (!row) return;
    var suffix = bankAccountSuffix(row);
    if (!suffix || seen[suffix]) return;
    var nick = String(row.nickname || row.name || row.label || "").trim();
    if (/overdraft/i.test(nick)) return;
    seen[suffix] = true;
    out.push({ suffix: suffix, nickname: nick, last4: suffix });
  });
  return out;
}

function bankKnownSuffix(snap, last4) {
  var suffix = bankLast4Digits(last4);
  if (!suffix) return false;
  var ok = false;
  bankPrintAccounts(snap).forEach(function (acct) {
    if (acct.suffix === suffix) ok = true;
  });
  return ok;
}

function bankSuffixTag(acct) {
  if (!acct) return "";
  var mask = bankAccountMask(acct.suffix || acct.last4);
  var nick = String(acct.nickname || "").trim();
  if (nick && mask) return nick + " " + mask;
  return mask || nick || "";
}

function bankFromLabel(acct) {
  var tag = bankSuffixTag(acct);
  return tag ? "from " + tag : "";
}

function bankFromMask(acct) {
  if (!acct) return "";
  var mask = bankAccountMask(acct.suffix || acct.last4);
  return mask ? "from " + mask : "";
}

function bankResolvePrintAccount(snap, last4, nick) {
  var suffix = bankLast4Digits(last4);
  var wantNick = String(nick || "").trim();
  var found = null;
  bankPrintAccounts(snap).forEach(function (acct) {
    if (found) return;
    if (suffix && acct.suffix === suffix) found = acct;
  });
  if (!found && wantNick) {
    bankPrintAccounts(snap).forEach(function (acct) {
      if (found || !acct.nickname) return;
      if (bankTierKey(acct.nickname) === bankTierKey(wantNick)) found = acct;
    });
  }
  if (!found) {
    try {
      bankFundingAccounts((snap && snap.budget) || {}).forEach(function (acct) {
        if (found) return;
        var last = bankLast4Digits(acct.last4);
        var sameLast = suffix && last && suffix === last;
        var sameNick = wantNick && acct.nickname && bankTierKey(acct.nickname) === bankTierKey(wantNick);
        if (!sameLast && !sameNick) return;
        found = { suffix: last || suffix, nickname: acct.nickname || wantNick, last4: last || suffix };
      });
    } catch (eFund) {}
  }
  if (found && found.suffix) {
    return { suffix: found.suffix, nickname: found.nickname || wantNick, last4: found.suffix };
  }
  if (!suffix) return null;
  return { suffix: suffix, nickname: wantNick, last4: suffix };
}

function bankAccountFromAny(snap, acct) {
  if (acct == null || acct === "") return null;
  if (typeof acct === "string") {
    var digits = bankLast4Digits(acct);
    if (digits) return bankResolvePrintAccount(snap, digits, "");
    return bankResolvePrintAccount(snap, "", acct);
  }
  if (typeof acct !== "object") return null;
  return bankResolvePrintAccount(snap, acct.suffix || acct.last4 || acct.last_4 || acct.mask, acct.nickname || acct.name || "");
}

function bankMoveBuffer(snap) {
  var doc = null;
  try { doc = bankTierDoc(snap); } catch (e) { doc = null; }
  if (!doc || !Object.prototype.hasOwnProperty.call(doc, "move_buffer")) return 0;
  var n = bankNum(doc.move_buffer);
  if (n == null || n < 0 || n > 1e5) return 0;
  return n;
}

function bankBillAccountMap(snap) {
  var bag = null;
  try { bag = bankTierDoc(snap).bill_account; } catch (e) { bag = null; }
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) return {};
  return bag;
}

/* Saved pay-from wins when it is a last-4 on accounts[].suffix. Null means history. */
function bankBillAccountOverride(snap, row) {
  var bag = bankBillAccountMap(snap);
  if (!row) return "";
  var id = "";
  try { id = bankStatusPostId(row, snap, bankBillControlKey(row)); } catch (e) { id = ""; }
  if (id && Object.prototype.hasOwnProperty.call(bag, id)) {
    if (bag[id] == null || bag[id] === "") return "";
    var canonical = bankLast4Digits(bag[id]);
    if (canonical && bankKnownSuffix(snap, canonical)) return canonical;
    return "";
  }
  var found = null;
  try { found = bankBagLookupBill(bag, row); } catch (e2) { found = null; }
  if (!found || found.value == null || found.value === "") return "";
  var digits = bankLast4Digits(found.value);
  if (!digits || !bankKnownSuffix(snap, digits)) return "";
  return digits;
}

function bankAllocTxLists(snap) {
  var lists = [];
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.recent_tx)) lists.push(cur.recent_tx);
  if (cur && Array.isArray(cur.edits_tx)) lists.push(cur.edits_tx);
  if (cur && Array.isArray(cur.history_tx)) lists.push(cur.history_tx);
  var hist = snap && snap.history;
  if (hist && Array.isArray(hist.tx)) lists.push(hist.tx);
  return lists;
}

function bankTxMatchesBill(row, raw) {
  if (!row || !raw) return false;
  if (bankBillMatchesKey(row, raw.category || "")) return true;
  if (bankBillMatchesKey(row, raw.desc || "")) return true;
  if (bankBillMatchesKey(row, raw.description || "")) return true;
  if (bankBillMatchesKey(row, raw.name || "")) return true;
  if (bankBillMatchesKey(row, raw.merchant_key || "")) return true;
  if (raw.bill_id && bankBillMatchesKey(row, raw.bill_id)) return true;
  if (raw.sub_id && bankBillMatchesKey(row, raw.sub_id)) return true;
  return false;
}

/* The account that actually paid this bill most recently. usual_account is the fallback. */
function bankHistoryPayFrom(snap, row) {
  if (!row) return null;
  var hits = [];
  function push(date, last4, nick) {
    var digits = bankLast4Digits(last4);
    if (!digits) return;
    hits.push({ date: bankDayKey(date) || String(date || "").slice(0, 10), last4: digits, nick: nick || "" });
  }
  try {
    bankMatchHits(row).forEach(function (hit) {
      var acct = hit.account && typeof hit.account === "object" ? hit.account : null;
      push(hit.date, hit.account_last4 || hit.last4 || (acct && (acct.suffix || acct.last4)), acct && (acct.nickname || acct.name));
    });
  } catch (eHit) {}
  bankAllocTxLists(snap).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) === "in") return;
      if (!bankTxMatchesBill(row, raw)) return;
      push(raw.date, bankAccountLast4(snap, raw), "");
    });
  });
  var today = "";
  try { today = bankTodayIso(snap, {}); } catch (eToday) { today = ""; }
  try {
    bankFundingAccounts((snap && snap.budget) || {}).forEach(function (acct) {
      (acct.rows || []).forEach(function (line) {
        if (!line || line.kind === "in") return;
        if (!bankBillMatchesKey(row, line.name || "")) return;
        var day = bankDayKey(line.date);
        if (today && day && day >= today) return;
        push(line.date, acct.last4, acct.nickname);
      });
    });
  } catch (eFund) {}
  hits.sort(function (a, b) {
    if (!a.date !== !b.date) return a.date ? -1 : 1;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return 0;
  });
  if (hits.length) return bankResolvePrintAccount(snap, hits[0].last4, hits[0].nick);
  var usual = row.usual_account;
  if (usual && typeof usual === "object") return bankAccountFromAny(snap, usual);
  return null;
}

function bankPayFrom(snap, row) {
  var over = "";
  try { over = bankBillAccountOverride(snap, row); } catch (e) { over = ""; }
  if (over) return bankResolvePrintAccount(snap, over, "");
  try { return bankHistoryPayFrom(snap, row); } catch (e2) { return null; }
}

function bankPayFromForName(snap, name) {
  if (!name) return null;
  var found = null;
  try {
    bankPreparedBills(snap, undefined).forEach(function (b) {
      if (found || !b) return;
      var face = bankBillDisplayName(b.name, b.display_label);
      if (bankNamesMatch(face, name) || bankNamesMatch(b.name, name) || bankTierKey(face) === bankTierKey(name)) found = b;
    });
  } catch (e) {}
  if (!found) {
    try {
      bankPreparedSubs(snap).forEach(function (s) {
        if (found || !s) return;
        var face = bankBillDisplayName(s.name, s.display_label);
        if (bankNamesMatch(face, name) || bankNamesMatch(s.name, name) || bankTierKey(face) === bankTierKey(name)) found = s;
      });
    } catch (e2) {}
  }
  if (!found) return null;
  return bankPayFrom(snap, found);
}

function bankDepositAccount(snap, ev) {
  if (!ev) return null;
  if (ev.account) {
    var direct = bankAccountFromAny(snap, ev.account);
    if (direct && direct.suffix) return direct;
  }
  var best = null;
  bankAllocTxLists(snap).forEach(function (list) {
    list.forEach(function (raw) {
      if (!raw || bankFlowSide(raw) !== "in") return;
      var blob = bankFoldName((raw.desc || "") + " " + (raw.category || "") + " " + (raw.name || ""));
      var stream = bankFoldName(ev.name || "");
      var kind = bankFoldName(ev.kind || "");
      var ok = (stream && blob.indexOf(stream) >= 0) || (kind && blob.indexOf(kind) >= 0);
      if (!ok && (ev.kind === "Payroll" || bankIsPayrollIncome(ev.name)) && /pay/.test(blob)) ok = true;
      if (!ok) return;
      var suffix = bankAccountLast4(snap, raw);
      if (!suffix) return;
      var date = bankDayKey(raw.date);
      if (!best || (date && date > best.date)) best = { date: date, suffix: suffix };
    });
  });
  if (best) return bankResolvePrintAccount(snap, best.suffix, "");
  try {
    var fundHit = null;
    bankFundingAccounts((snap && snap.budget) || {}).forEach(function (acct) {
      (acct.rows || []).forEach(function (line) {
        if (fundHit || !line || line.kind === "out") return;
        if (!bankNamesMatch(line.name, ev.name) && !bankNamesMatch(line.name, ev.kind)) return;
        fundHit = bankResolvePrintAccount(snap, acct.last4, acct.nickname);
      });
    });
    if (fundHit && fundHit.suffix) return fundHit;
  } catch (eFund) {}
  return null;
}

function bankAllocOpening(snap, opts) {
  opts = opts || {};
  var today = "";
  try { today = bankTodayIso(snap, opts); } catch (e) { today = ""; }
  var map = {};
  function put(suffix, nick, balance, lock) {
    suffix = bankLast4Digits(suffix);
    if (!suffix) return;
    if (!map[suffix]) map[suffix] = { suffix: suffix, nickname: nick || "", balance: 0, lock: false };
    if (nick && !map[suffix].nickname) map[suffix].nickname = nick;
    if (balance != null && (!map[suffix].lock || lock)) {
      map[suffix].balance = bankRoundCents(balance);
      if (lock) map[suffix].lock = true;
    }
  }
  bankPrintAccounts(snap).forEach(function (acct) { put(acct.suffix, acct.nickname, null, false); });
  var books = null;
  var raws = [];
  try { books = bankCombinedBooks(snap, opts); } catch (eBooks) { books = null; }
  try { raws = bankHeroRawRows((snap && snap.budget) || {}); } catch (eRaw) { raws = []; }
  ((books && books.accounts) || []).forEach(function (acct) {
    var suffix = bankLast4Digits(acct.last4);
    if (!suffix) return;
    var explicit = null;
    try { explicit = bankHeroExplicit(raws, { nickname: acct.nickname, last4: suffix }); } catch (eEx) { explicit = null; }
    var amount = explicit && explicit.balance != null ? explicit.balance : bankFundingBalanceOn(acct, today);
    if (amount == null) amount = acct.start;
    put(suffix, acct.nickname, amount, amount != null);
  });
  var bals = (snap && snap.current && snap.current.balances) || [];
  bals.forEach(function (row) {
    if (!row) return;
    var suffix = bankAccountSuffix(row) || bankAccountLast4(snap, row);
    var n = bankNum(row.balance != null ? row.balance : row.current_balance);
    if (n == null) return;
    put(suffix, row.nickname || row.name, n, false);
  });
  return map;
}

function bankAllocMoveLine(move) {
  if (!move || !(move.amount > 0)) return "";
  var from = bankAccountMask(move.fromLast4 || move.from);
  var to = bankAccountMask(move.toLast4 || move.to);
  if (!from || !to) return "";
  var when = move.date ? (bankShortDate(move.date) || "") : "";
  return "Move " + bankMoney(move.amount) + " " + from + " \u2192 " + to + (when ? " by " + when : "");
}

function bankAllocMoveHtml(move) {
  var line = bankAllocMoveLine(move);
  if (!line) return "";
  var names = [];
  (move.bills || []).forEach(function (name) {
    if (name && names.indexOf(name) < 0) names.push(name);
  });
  var nameHtml = names.map(function (name) {
    return '<p class="mix-hint">' + bankEsc(name) + "</p>";
  }).join("");
  return '<div data-bank-move="1" data-bank-move-amount="' + bankRoundCents(move.amount) +
    '" data-bank-move-from="' + bankEsc(move.fromLast4 || move.from || "") +
    '" data-bank-move-to="' + bankEsc(move.toLast4 || move.to || "") +
    '" data-bank-move-date="' + bankEsc(move.date || "") + '">' +
    '<p class="mix-leg wrap"><span class="mix-leg-name">' + bankEsc(line) + "</span></p>" +
    nameHtml + "</div>";
}

function bankAllocMovesHtml(moves) {
  var list = (moves || []).filter(function (mv) { return bankAllocMoveLine(mv); });
  if (!list.length) return '<p class="mix-leg wrap" data-bank-moves="none"><span class="mix-leg-name">No moves needed</span></p>';
  return '<div data-bank-moves="1">' + list.map(bankAllocMoveHtml).join("") + "</div>";
}

/* One schedule for Next pay, By account, and the hero. Advice only: balances on the page stay put. */
function bankAllocate(snap, opts) {
  opts = opts || {};
  var buffer = bankMoveBuffer(snap);
  var today = "";
  try { today = bankTodayIso(snap, opts); } catch (eToday) { today = ""; }
  var opening = bankAllocOpening(snap, opts);
  var state = {};
  Object.keys(opening).forEach(function (k) { state[k] = opening[k].balance; });
  var periods = [];
  try { periods = bankPayPeriods(snap, opts); } catch (ePer) { periods = []; }
  var allMoves = [];
  var beforeBills = [];
  var periodOut = [];
  function ensure(suffix, nick) {
    suffix = bankLast4Digits(suffix);
    if (!suffix) return "";
    if (state[suffix] == null) state[suffix] = 0;
    if (!opening[suffix]) opening[suffix] = { suffix: suffix, nickname: nick || "", balance: state[suffix], lock: false };
    else if (nick && !opening[suffix].nickname) opening[suffix].nickname = nick;
    return suffix;
  }
  periods.forEach(function (period) {
    if (!period || !period.focus || !period.focus.date) return;
    var deposit = null;
    try { deposit = bankDepositAccount(snap, period.focus); } catch (eDep) { deposit = null; }
    var depSuffix = deposit && deposit.suffix ? ensure(deposit.suffix, deposit.nickname) : "";
    var depDate = period.focus.date;
    var depAmt = bankNum(period.focus.amount) || 0;
    var addDep = !!(depSuffix && depAmt > 0 && depDate && (!today || depDate >= today));
    if (addDep && today && depDate === today) {
      var landed = false;
      try { landed = !!bankIncomeTxMatch(snap, period.focus); } catch (eLand) { landed = false; }
      if (landed) addDep = false;
    }
    var rows = [];
    try { rows = bankPeriodBillRows(snap, opts, period.focus.date, period.end); } catch (eRows) { rows = []; }
    var bills = [];
    rows.forEach(function (row) {
      if (!row || row.paid || !(row.amount > 0)) return;
      if (today && row.due && row.due < today) return;
      var src = null;
      try { src = bankPayFromForName(snap, row.name); } catch (eSrc) { src = null; }
      if (!src || !src.suffix) return;
      var suffix = ensure(src.suffix, src.nickname);
      if (!suffix) return;
      bills.push({ name: row.name, due: row.due, amount: bankRoundCents(row.amount), suffix: suffix });
    });
    bills.sort(function (a, b) {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
    var groups = {};
    var order = [];
    bills.forEach(function (b) {
      if (!groups[b.suffix]) {
        groups[b.suffix] = [];
        order.push(b.suffix);
      }
      groups[b.suffix].push(b);
    });
    order.sort(function (a, b) { return groups[a][0].due < groups[b][0].due ? -1 : groups[a][0].due > groups[b][0].due ? 1 : 0; });
    var moves = [];
    function shadowAt(date) {
      var bal = {};
      Object.keys(state).forEach(function (k) { bal[k] = state[k]; });
      if (addDep && depSuffix && depDate && (!date || depDate <= date)) bal[depSuffix] = bankRoundCents((bal[depSuffix] || 0) + depAmt);
      moves.forEach(function (mv) {
        if (!mv.date || (date && mv.date > date)) return;
        bal[mv.from] = bankRoundCents((bal[mv.from] || 0) - mv.amount);
        bal[mv.to] = bankRoundCents((bal[mv.to] || 0) + mv.amount);
      });
      bills.forEach(function (b) {
        if (!b.due || !date || b.due >= date) return;
        bal[b.suffix] = bankRoundCents((bal[b.suffix] || 0) - b.amount);
      });
      return bal;
    }
    order.forEach(function (suffix) {
      var list = groups[suffix];
      var earliest = list[0].due;
      var moveDate = bankAddDays(earliest, -1) || earliest;
      var bal = shadowAt(moveDate);
      var have = bal[suffix] || 0;
      if (addDep && depSuffix === suffix && depDate && earliest && depDate > moveDate && depDate <= earliest) have = bankRoundCents(have + depAmt);
      var need = buffer;
      list.forEach(function (b) { need += b.amount; });
      var short = bankRoundCents(need - have);
      if (!(short > 0.004)) return;
      var sources = Object.keys(bal).filter(function (k) { return k && k !== suffix; });
      sources.sort(function (a, b) {
        if (a === depSuffix) return -1;
        if (b === depSuffix) return 1;
        return (bal[b] || 0) - (bal[a] || 0);
      });
      sources.forEach(function (src) {
        if (!(short > 0.004)) return;
        var live = shadowAt(moveDate);
        var srcBal = live[src] || 0;
        var later = 0;
        (groups[src] || []).forEach(function (b) {
          if (!b.due || b.due > moveDate) later += b.amount;
        });
        var spare = bankRoundCents(srcBal - later - buffer);
        if (!(spare > 0.004)) spare = bankRoundCents(Math.max(0, srcBal - later));
        if (!(spare > 0.004)) return;
        var take = bankRoundCents(Math.min(short, spare));
        if (!(take > 0.004)) return;
        var existing = null;
        moves.forEach(function (mv) {
          if (mv.from === src && mv.to === suffix) existing = mv;
        });
        if (existing) {
          existing.amount = bankRoundCents(existing.amount + take);
          if (moveDate && (!existing.date || moveDate < existing.date)) existing.date = moveDate;
        } else {
          existing = {
            from: src,
            to: suffix,
            fromLast4: src,
            toLast4: suffix,
            amount: take,
            date: moveDate,
            bills: []
          };
          moves.push(existing);
        }
        list.forEach(function (b) {
          if (b.name && existing.bills.indexOf(b.name) < 0) existing.bills.push(b.name);
        });
        short = bankRoundCents(short - take);
      });
    });
    var events = [];
    if (addDep && depDate) events.push({ date: depDate, kind: "dep" });
    moves.forEach(function (mv) { events.push({ date: mv.date || depDate || "", kind: "move", move: mv }); });
    bills.forEach(function (b) { events.push({ date: b.due || "", kind: "bill", bill: b }); });
    events.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      var rank = { dep: 0, move: 1, bill: 2 };
      return (rank[a.kind] || 9) - (rank[b.kind] || 9);
    });
    var countedDep = false;
    events.forEach(function (ev) {
      if (ev.kind === "dep") {
        state[depSuffix] = bankRoundCents((state[depSuffix] || 0) + depAmt);
        countedDep = true;
      } else if (ev.kind === "move") {
        state[ev.move.from] = bankRoundCents((state[ev.move.from] || 0) - ev.move.amount);
        state[ev.move.to] = bankRoundCents((state[ev.move.to] || 0) + ev.move.amount);
      } else if (ev.kind === "bill") {
        var before = state[ev.bill.suffix] || 0;
        beforeBills.push({
          name: ev.bill.name,
          due: ev.bill.due,
          suffix: ev.bill.suffix,
          amount: ev.bill.amount,
          before: bankRoundCents(before)
        });
        state[ev.bill.suffix] = bankRoundCents(before - ev.bill.amount);
      }
    });
    periodOut.push({
      date: period.focus.date,
      end: period.end,
      deposit: deposit,
      depositAmount: depAmt,
      depositCounted: countedDep,
      moves: moves,
      bills: bills
    });
    allMoves = allMoves.concat(moves);
  });
  return {
    buffer: buffer,
    opening: opening,
    periods: periodOut,
    moves: allMoves,
    beforeBills: beforeBills
  };
}

function bankPayFromOptions(snap, row) {
  var selected = "";
  try { selected = bankBillAccountOverride(snap, row); } catch (e) { selected = ""; }
  var html = '<option value="">Default (history)</option>';
  bankPrintAccounts(snap).forEach(function (acct) {
    var label = bankSuffixTag(acct) || bankAccountMask(acct.suffix);
    html += '<option value="' + bankEsc(acct.suffix) + '"' + (selected === acct.suffix ? " selected" : "") + ">" + bankEsc(label) + "</option>";
  });
  return html;
}

function bankNextPayCardHtml(snap, opts, period, index, withHint, math, carried, alloc) {
  if (!math) math = bankPeriodMath(snap, opts, period, carried);
  var ev = period.focus;
  var bills = math.bills;
  var needs = math.needs;
  var aside = math.aside;
  var deposit = math.deposit;
  var left = math.left;
  if (!alloc) {
    try { alloc = bankAllocate(snap, opts); } catch (eAlloc) { alloc = null; }
  }
  var periodAlloc = null;
  if (alloc && alloc.periods) {
    alloc.periods.forEach(function (p) {
      if (!periodAlloc && p && ev && p.date === ev.date) periodAlloc = p;
    });
  }
  var dest = "account TBD";
  if (ev.account) dest = bankAccountTag(ev.account);
  if (dest === "account TBD" && periodAlloc && periodAlloc.deposit && periodAlloc.deposit.suffix) {
    dest = bankAccountTag({ nickname: periodAlloc.deposit.nickname || "", last4: periodAlloc.deposit.suffix });
  }
  var payFlow = bankFundSigned(deposit || 0, "in");
  var payLine = '<p><span class="' + payFlow.cls + '">' + bankEsc(deposit == null ? "\u2014" : payFlow.text) +
    '</span> <span class="sep"> \u00b7 </span> <span>to ' + bankEsc(dest) + "</span></p>";
  var movesHtml = "";
  try { movesHtml = bankAllocMovesHtml(periodAlloc ? periodAlloc.moves : []); } catch (eMoves) { movesHtml = ""; }
  var shown = bills.slice(0, 10);
  var billTr = shown.map(function (row) {
    var flow = bankFundSigned(row.amount || 0, "out");
    var due = row.phrase || (row.due ? ("due " + (bankShortDate(row.due) || row.due)) : "");
    var paid = !!row.paid;
    var pay = row.pay || { on: paid, bank: paid, manual: false, key: "" };
    var nameCls = paid ? "sym tone-flat" : "sym";
    var amtCls = paid ? "num tone-flat" : ("num " + flow.cls);
    var fromHtml = "";
    try {
      var fromText = bankFromMask(bankPayFromForName(snap, row.name));
      if (fromText) fromHtml = ' <span class="sub' + (paid ? " tone-flat" : "") + '">' + bankEsc(fromText) + "</span>";
    } catch (eFrom) { fromHtml = ""; }
    var inner = '<span class="' + nameCls + '">' + bankEsc(row.name) + '</span> <span class="sub' + (paid ? " tone-flat" : "") + '">' +
      bankEsc(due) + "</span>" + fromHtml + ' <b class="' + amtCls + '">' + bankEsc(row.amount == null ? "\u2014" : flow.text) + "</b>";
    var body = pay.bank ? inner + ' <span class="tone-go" aria-label="Paid">\u2713</span>' : bankPayTapHtml(pay, inner);
    return "<tr" + (paid ? ' class="tone-flat" data-bank-bill-paid="1"' : ' data-bank-bill-paid="0"') + "><td colspan=\"2\">" + body + "</td></tr>";
  }).join("");
  var carriedN = index > 0 ? (math.carried != null ? math.carried : (carried || 0)) : 0;
  function moneyRow(label, amount, bold) {
    var name = bold ? "<b>" + bankEsc(label) + "</b>" : '<span class="sym">' + bankEsc(label) + "</span>";
    var cell;
    if (amount == null) cell = '<td class="num"><span class="sub">\u2014</span></td>';
    else if (!(amount > 0)) cell = '<td class="num">' + bankEsc(bankMoney(0)) + "</td>";
    else {
      var flow = bankFundSigned(amount, "out");
      cell = '<td class="num ' + flow.cls + '">' + bankEsc(flow.text) + "</td>";
    }
    return "<tr><td>" + name + "</td>" + cell + "</tr>";
  }
  var leftFlow = left == null ? { text: "\u2014", cls: "tone-flat" } : (left < -0.004 ? bankFundSigned(Math.abs(left), "out") : bankFundSigned(Math.abs(left), "in"));
  var sharedLeft = bankLedgerLeftOn(snap, ev.date);
  var leftAttr = sharedLeft == null ? "" : ' data-bank-left-after="' + sharedLeft + '"';
  var carriedRow = "";
  if (index > 0) {
    var carriedFlow = carriedN < -0.004 ? bankFundSigned(Math.abs(carriedN), "out") : bankFundSigned(Math.abs(carriedN), "in");
    carriedRow = '<tr data-bank-carried="' + carriedN + '"><td><span class="sym">Carried over</span></td><td class="num ' +
      carriedFlow.cls + '">' + bankEsc(carriedFlow.text) + "</td></tr>";
  }
  var alsoRows = "";
  try {
    bankAlsoInDeposits(snap, period).forEach(function (ev) { alsoRows += bankAlsoDepositHtml(ev); });
  } catch (eAlsoRows) { alsoRows = ""; }
  var foot = moneyRow("Needs (groceries, etc.)", needs, false) +
    moneyRow("Set aside", aside, true);
  var billTable = '<table class="book bank-next-bills"><thead><tr><th>Bill</th><th class="num">Amount</th></tr></thead><tbody>' +
    carriedRow + billTr + "</tbody><tfoot>" + foot + "</tfoot></table>";
  if (bills.length > 10) billTable = bankCapList(billTable, bills.length, "Next pay bills");
  var hints = "";
  if (withHint) {
    var lastDay = period.end ? bankAddDays(period.end, -1) : "";
    var windowHint = "This check covers " + bankShortPayDate(ev.date) + (lastDay ? " through " + bankShortPayDate(lastDay) : "") + ".";
    if (period.started) windowHint = "This period has started. " + windowHint;
    var roll = "";
    if (ev.holiday_name && ev.rolled_from) roll = "Moved from " + bankShortPayDate(ev.rolled_from) + " (" + ev.holiday_name + ")";
    else if (ev.rolled_from) roll = "Rolled back from " + bankShortPayDate(ev.rolled_from);
    if (roll) windowHint = windowHint + " " + roll;
    hints = '<p class="hint">' + bankEsc(windowHint) + "</p>";
  }
  var face = bankDepositFace(ev);
  var week = bankWeekDate(ev.date);
  var rollNote = ev.rolled_from && ev.rolled_from !== ev.date ? " " + bankForOriginalNote(ev.rolled_from) : "";
  var title = face + (week ? " \u00b7 " + week : "") + rollNote;
  var expectedAttr = period.expected && !period.past ? ' data-bank-expected="1"' : "";
  var pastAttr = period.past ? ' data-bank-past="1"' : "";
  var head;
  if (period.thisPay) {
    head = '<p class="mix-hint" data-bank-this-pay="1">This pay <span>' + bankEsc(title) + "</span></p>";
  } else if (period.past) {
    head = '<p class="mix-hint">' + bankEsc(title) + "</p>";
  } else {
    head = '<p class="mix-hint">' + bankEsc(title) + (period.expected ? ' <span class="sub">expected</span>' : "") + "</p>";
  }
  var hero = '<div class="overall-strip" data-bank-check-left="' + (left == null ? "" : left) + '"' + leftAttr +
    '><div class="ov-hero"><span>Left from this pay</span> <b class="' + leftFlow.cls + '">' + bankEsc(leftFlow.text) + "</b></div></div>";
  return '<div class="card" data-bank-next-card="' + (index + 1) + '" data-bank-next-date="' + bankEsc(ev.date) + '"' + expectedAttr + pastAttr + '>' +
    head + hero + payLine + alsoRows + movesHtml + billTable + hints + "</div>";
}

function bankNextPayHtml(snap, opts) {
  opts = opts || {};
  var periods = bankPayPeriods(snap, opts);
  if (!periods.length) return "";
  var alloc = null;
  try { alloc = bankAllocate(snap, opts); } catch (eAlloc) { alloc = null; }
  var current = opts.nextIndex;
  if (typeof current !== "number" || !(current >= 0) || current >= periods.length) {
    current = 0;
    periods.forEach(function (period, i) {
      if (period.thisPay) current = i;
    });
  }
  var carried = 0;
  var cards = periods.map(function (period, i) {
    var math = bankPeriodMath(snap, opts, period, i === 0 ? 0 : carried);
    var html = bankNextPayCardHtml(snap, opts, period, i, i === 0, math, i === 0 ? 0 : carried, alloc);
    carried = math.left == null ? 0 : math.left;
    return html;
  }).join("");
  var dots = periods.map(function (period, i) {
    var on = i === current;
    return '<button type="button" class="book-chip' + (on ? " on" : "") + '" data-bank-next-dot="' + i + '"' +
      (on ? ' aria-current="true"' : "") + ' aria-label="Check ' + (i + 1) + '">' + (i + 1) + "</button>";
  }).join(" ");
  var trackClass = "pay-carousel" + (periods.length >= 3 ? " pay-wide" : "");
  return '<section class="bank-next" aria-roledescription="carousel" aria-labelledby="bank-next-title" data-bank-next-count="' + periods.length + '">' +
    '<h2 id="bank-next-title">Next pay</h2>' +
    '<div class="' + trackClass + '" tabindex="0" data-bank-next-track="1">' + cards + "</div>" +
    '<div class="pay-dots" data-bank-next-dots="1">' + dots + "</div></section>";
}

function bankNextPaySection(snap, opts) {
  return bankNextPayHtml(snap, opts || {});
}

function bankDayStateText(row, ym) {
  if (!row) return "Estimated";
  var text = bankPayStatusText(row, ym, null);
  if (text && text.indexOf("Paid") === 0) return text;
  return "Estimated";
}

function bankDayCategoryLabel(snap, row) {
  row = row || {};
  if (row.category) {
    var cats = bankSpendCategories(snap);
    if (cats) {
      var id = bankSpendResolvePrinted(cats, row.category);
      var hit = id ? bankSpendById(cats, id) : null;
      if (hit && hit.name) return hit.name;
    }
    return String(row.category);
  }
  if (bankCategoriesActive(snap)) {
    var mapped = bankMapSpendCategory(row, snap);
    if (mapped && mapped.id) {
      var cat = bankSpendById(bankSpendCategories(snap), mapped.id);
      if (cat && cat.name) return cat.name;
    }
  }
  return row.type || "Bill";
}

function bankDayItems(snap, ym, day, edits) {
  var budget = (snap && snap.budget) || {};
  var bills = bankPreparedBills(snap, bankHasDueMap(snap) ? bankDueMap(snap) : undefined)
    .filter(function (b) { return !bankBillRetired(b, ym); });
  var incomes = bankAttachIncomePlan(bankNormalizeIncome(budget), ym);
  var subs = bankPreparedSubs(snap).filter(function (s) { return s && !bankBillRetired(s, ym); });
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
      amount: inc && inc.amount != null ? bankMoney(inc.amount) : "",
      flow: "in",
      type: "Income",
      category: "Income",
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
      flow: "out",
      type: "Subscription",
      category: bankDayCategoryLabel(snap, sub || { name: name, category: "subscriptions" }),
      state: bankDayStateText(sub, ym),
      account: bankAccountFace(sub && sub.usual_account),
      pay: sub ? bankPayCheckState(sub, ym, bankTrustPaidStatus(snap, sub, ym, {})) : null
    });
  });
  (cell.bills || []).forEach(function (name) {
    var bill = null;
    bills.forEach(function (b) { if (bankNamesMatch(b.name, name) || bankChipKey(b.name) === bankChipKey(name)) bill = b; });
    var amountN = bill ? bankBillLineAmount(bill, ym, edits) : null;
    pushItem({
      name: bill ? bankBillDisplayName(bill.name, bill.display_label) : bankBillDisplayName(name),
      amount: amountN == null ? "" : bankMoney(amountN),
      flow: "out",
      type: "Bill",
      category: bankDayCategoryLabel(snap, bill || { name: name }),
      state: bankDayStateText(bill, ym),
      account: bankAccountFace(bill && bill.usual_account),
      pay: bill ? bankPayCheckState(bill, ym, bankTrustPaidStatus(snap, bill, ym, {})) : null
    });
  });
  (cell.items || []).forEach(function (name) {
    if (bankListHasChip(cell.bills, name) || bankListHasChip(cell.subs, name)) return;
    pushItem({
      name: bankBillDisplayName(name),
      amount: "",
      flow: "out",
      type: "Bill",
      category: bankDayCategoryLabel(snap, { name: name }),
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
    var catName = it.category || it.type || "";
    var last4 = "";
    var acct = String(it.account || "");
    var digits = acct.match(/(\d{4})\s*$/);
    if (digits) last4 = "\u00b7\u00b7" + digits[1];
    var meta = [catName, last4].filter(Boolean).join(" \u00b7 ");
    var amt = it.amount ? '<b class="' + (it.flow === "in" ? "tone-go" : "tone-stop") + '">' + bankEsc(it.amount) + "</b>" : "";
    var inner = '<span class="ret-take"><b data-bank-day-name="1">' + bankEsc(it.name) + "</b>" +
      (meta ? '<i data-bank-day-meta="1">' + bankEsc(meta) + "</i>" : "") + "</span> " + amt;
    var face = it.pay ? bankPayTapHtml(it.pay, inner) : '<details class="fills-more"><summary>' + inner + "</summary></details>";
    return '<li data-bank-day-item="1">' + face + "</li>";
  }).join("") + "</ul>", items.length, "Day items") : '<p class="bank-empty">Nothing scheduled</p>';
  return '<div class="bank-day-scrim" data-bank-day-scrim="1"></div><div class="bank-day-dialog" role="dialog" aria-modal="true" aria-labelledby="bank-day-title" tabindex="-1">' +
    '<h3 id="bank-day-title">' + bankEsc(BANK_MONTHS[(ym && ym.month ? ym.month : 1) - 1] + " " + day) + "</h3>" + body +
    '<button type="button" class="book-chip" data-bank-day-close="1">Close</button></div>';
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

/* A hand mark counts even when the print's paid month tag is missing. A bank match still needs that tag. */
function bankTrustPaidStatus(snap, row, ym, opts) {
  var view = bankMonthKey(ym);
  var manual = row && row.manual_paid;
  if (manual && view && bankMonthKey(manual.month) === view) return true;
  var marked = row && row.paid_current_month;
  if (marked && String(marked.source || "").toLowerCase() === "manual" && view && bankMonthKey(marked.month) === view) return true;
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

function bankPayCheckState(row, ym, trust) {
  var month = bankMonthKey(ym);
  var paid = row && row.paid_current_month;
  var status = paid ? String(paid.status || "") : "";
  var paidNow = !!(paid && month && bankMonthKey(paid.month) === month && (status === "paid" || status === "paid_late"));
  var source = String((paid && paid.source) || "").toLowerCase();
  var manualBag = !!(row && row.manual_paid && month && bankMonthKey(row.manual_paid.month) === month);
  if (manualBag && source !== "bank") return { on: true, bank: false, manual: true, key: bankBillControlKey(row) };
  if (paidNow && source === "manual") return { on: true, bank: false, manual: true, key: bankBillControlKey(row) };
  if ((paidNow || manualBag) && source === "bank" && trust !== false) return { on: true, bank: true, manual: false, key: bankBillControlKey(row) };
  return { on: false, bank: false, manual: false, key: row ? bankBillControlKey(row) : "" };
}

function bankPayTapHtml(state, inner) {
  state = state || {};
  var box = state.on
    ? '<span class="tone-go" aria-label="Paid">\u2713</span>'
    : '<span class="bank-pay-box" aria-hidden="true"></span>';
  if (state.bank || !state.key) return inner + box;
  var attr = state.manual ? "data-bank-status-undo" : "data-bank-paid-month";
  return '<button type="button" class="bank-pay-tap" ' + attr + '="' + bankEsc(state.key) + '">' +
    inner + box + "</button>";
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
  bankMonths(snap).forEach(function (row) {
    if (row && row.month && !bankOpenMonth(row)) add(row.month);
  });
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
  var keys = bankPickerMonths(snap).filter(function (ym) { return !bankMonthInProgress(snap, ym); });
  var asof = bankAsofMonthKey(snap);
  var i;
  for (i = 0; i < keys.length; i++) {
    if (!asof || keys[i] < asof) return keys[i];
  }
  return keys.length ? keys[0] : "";
}

function bankHistMonthKey(snap, opts) {
  opts = opts || {};
  var picked = bankMonthKey(opts.histMonth);
  if (!picked && /^\d{4}-\d{2}$/.test(String(opts.month || ""))) picked = bankMonthKey(opts.month);
  if (picked && bankMonthInProgress(snap, picked)) picked = "";
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
  var subs = bankPreparedSubs(view).filter(function (s) { return s && !bankBillRetired(s, month); });
  var dueOpts = { now: opts && opts.now, mode: mode, listTitle: listTitle, flows: opts && opts.flows };
  return bankDueMonthHtml(view, month, edits, subs, bills, dueOpts);
}

function bankCalendarHeading(mode) {
  if (mode === "plan") return "Due calendar \u00b7 plan";
  if (mode === "current") return "Due calendar \u00b7 this month";
  return "Due calendar";
}

function bankPaidMonthAmounts(snap, bills, month, opts) {
  var faces = {};
  (bills || []).forEach(function (b) {
    if (!b) return;
    var trust = bankTrustPaidStatus(snap, b, month, opts || {});
    var paid = trust ? bankBillPaidStatus(b, month) : "";
    if (paid !== "paid" && paid !== "paid_late") return;
    var face = bankTierKey(bankBillDisplayName(b.name, b.display_label));
    var amt = bankBillLineAmount(b, month, opts && opts.edits);
    if (!face || amt == null) return;
    if (!faces[face]) faces[face] = [];
    faces[face].push(amt);
  });
  return faces;
}

function bankSamePaidAmount(list, amount) {
  return (list || []).some(function (n) { return amount != null && Math.abs(n - amount) < 0.02; });
}

/* A bill paid this month is marked on its paid date. An unpaid bill with the same name and amount is not also due. */
function bankPaidCalendarBills(snap, bills, month, opts) {
  var amounts = bankPaidMonthAmounts(snap, bills, month, opts);
  var out = [];
  (bills || []).forEach(function (b) {
    if (!b) return;
    var trust = bankTrustPaidStatus(snap, b, month, opts);
    var paid = trust ? bankBillPaidStatus(b, month) : "";
    var isPaid = paid === "paid" || paid === "paid_late";
    var face = bankTierKey(bankBillDisplayName(b.name, b.display_label));
    var amt = bankBillLineAmount(b, month, opts && opts.edits);
    if (!isPaid && bankSamePaidAmount(amounts[face], amt)) return;
    if (isPaid) {
      var paidOn = (b.paid_current_month && b.paid_current_month.paid_date) || b.paid_date || "";
      var key = bankCopyDate(paidOn) || "";
      var day = key ? bankDay(String(key).slice(8, 10)) : null;
      if (day != null && bankMonthKey(key) === bankMonthKey(month)) {
        var copy = {};
        Object.keys(b).forEach(function (k) { copy[k] = b[k]; });
        copy.typical_day = day;
        copy.typical_days = [day];
        copy.due_day = day;
        copy.schedule = null;
        out.push(copy);
        return;
      }
    }
    out.push(b);
  });
  return out;
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
  var subs = bankPreparedSubs(view).filter(function (s) { return s && bankBillCounted(s) && !bankBillRetired(s, month); });
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
  var cells = bankDayCells(bankPaidCalendarBills(view, bills, month, opts), incomes, calendar, month);
  bankPlaceSubs(cells, subs, month);
  return '<section class="bank-cal"><h2>' + heading + '</h2><div class="card span">' +
    bankCalendarHtml(cells, bankHasDueDays(cells), month, bankBillCalendarAmounts(bills, month, edits), bankBillFaceMap(bills), { hideNav: mode === "current", today: bankScreenToday(view, opts) }) +
    "</div></section>";
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

/* A paid flag counts only in the month it was paid. */
function bankPaidThisMonth(row, month) {
  var bill = row && (row.bill || row);
  var paid = bill && bill.paid_current_month;
  if (!paid || typeof paid !== "object") return false;
  var st = String(paid.status || "").toLowerCase();
  if (st !== "paid" && st !== "paid_late") return false;
  var paidMonth = bankMonthKey(paid.month);
  var viewMonth = bankMonthKey(month);
  if (paidMonth && viewMonth && paidMonth !== viewMonth) return false;
  return true;
}

/* Bill plan for this month. Twice-monthly and set-asides keep the collected month plan.
   Everyone else uses the effective bill amount, never the 3-month typical average. */
function bankTierBillPlan(row, month, edits) {
  if (!row || !row.bill) return null;
  var bill = row.bill;
  if (bankIsTwiceBill(bill) || bankIsSetAside(bill)) return bankNum(row.amount);
  var user = bankUserBillAmount(edits, bill);
  if (user != null && user > 0) return user;
  var amount = bankBillAmountForMonth(bill, month);
  if (amount != null && amount > 0) return amount;
  return null;
}

function bankTierRowAmount(row, month, edits) {
  var plan = row && row.bill ? bankTierBillPlan(row, month, edits) : null;
  if (plan != null && plan > 0) return plan;
  var n = bankNum(row && row.amount);
  return n != null && n > 0 ? n : null;
}

function bankTierItemSpent(snap, row, month, mode, edits) {
  var names = [];
  function add(v) { if (v && names.indexOf(v) < 0) names.push(v); }
  add(row && row.key);
  add(row && row.name);
  if (row && row.bill) {
    add(row.bill.name);
    add(row.bill.category);
  }
  var found = null;
  if (mode === "historical") {
    var histBag = bankActualBag(snap, month) || bankActualsMap(snap)[bankMonthKey(month)];
    names.forEach(function (nm) {
      if (found != null) return;
      found = bankCategoryActual(histBag, nm);
    });
  } else {
    names.forEach(function (nm) {
      if (found != null) return;
      found = bankCategoryMtdSpent(snap, nm);
    });
    if (found == null) {
      names.forEach(function (nm) {
        if (found != null) return;
        found = bankCategorySpendActual(snap, nm, month);
      });
    }
    if ((found == null || !(found > 0)) && bankPaidThisMonth(row, month)) found = bankTierBillPlan(row, month, edits);
  }
  var n = bankNum(found);
  return n != null && n > 0 ? n : 0;
}

function bankTierDueIso(row, month) {
  var day = null;
  if (row && row.bill) day = row.bill.typical_day != null ? row.bill.typical_day : row.bill.due_day;
  else if (row && row.typical_day != null) day = row.typical_day;
  else if (row && row.days && row.days.length) day = row.days[0];
  day = bankDay(day);
  if (day == null || !month || !month.year) return "";
  return bankSortMonthDate(month, day);
}

/* Spent uses the same plan amount as the list row. A posted actual wins.
   Otherwise a bill paid this month, or already due in the open month, counts as spent. */
function bankTierLineSpent(snap, row, month, mode, edits, todayIso) {
  var names = [];
  function add(v) { if (v && names.indexOf(v) < 0) names.push(v); }
  add(row && row.key);
  add(row && row.name);
  if (row && row.bill) {
    add(row.bill.name);
    add(row.bill.category);
  }
  var found = null;
  if (mode === "historical") {
    var histBag = bankActualBag(snap, month) || bankActualsMap(snap)[bankMonthKey(month)];
    names.forEach(function (nm) {
      if (found != null) return;
      found = bankCategoryActual(histBag, nm);
    });
    var hist = bankNum(found);
    return hist != null && hist > 0 ? hist : 0;
  }
  names.forEach(function (nm) {
    if (found != null) return;
    found = bankCategoryMtdSpent(snap, nm);
  });
  if (found == null) {
    names.forEach(function (nm) {
      if (found != null) return;
      found = bankCategorySpendActual(snap, nm, month);
    });
  }
  if (found != null && found > 0) return found;
  var plan = bankNum(row && row.amount);
  if (!(plan > 0)) return 0;
  if (bankPaidThisMonth(row, month)) return plan;
  var due = bankTierDueIso(row, month);
  var view = bankMonthKey(month);
  var todayMonth = todayIso ? bankMonthKey(todayIso) : "";
  if (due && todayIso && view && view === todayMonth && due <= todayIso) return plan;
  return 0;
}

/* tip ek — category budgets under Required, Needs, and Wants.
   A tiers.json without categories leaves the tier list as it was.
   Saves POST the full categories list, cookie only, to /data/banking/tiers.json.
   Budgets in this file are 0. Real amounts stay in Worker KV. */

var BANK_SPEND_ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
var BANK_SPEND_MAX = 30;
var BANK_SPEND_NAME_MAX = 40;
var BANK_SPEND_BUDGET_MAX = 1e7;
var BANK_SPEND_RULE_CAP = 500;
var BANK_SPEND_STARTERS = [
  { id: "mortgage", name: "Mortgage", tier: "required" },
  { id: "utilities", name: "Utilities", tier: "required" },
  { id: "phone-internet", name: "Phone & Internet", tier: "required" },
  { id: "car-insurance-loans", name: "Car, Insurance & Loans", tier: "required" },
  { id: "education", name: "Education", tier: "required" },
  { id: "groceries", name: "Groceries", tier: "needs" },
  { id: "gas-fuel", name: "Gas/Fuel", tier: "needs" },
  { id: "household-health", name: "Household & Health", tier: "needs" },
  { id: "education-needs", name: "Education (Needs)", tier: "needs" },
  { id: "dining", name: "Dining", tier: "wants" },
  { id: "subscriptions", name: "Subscriptions", tier: "wants" },
  { id: "kids-activities", name: "Kids & Activities", tier: "wants" },
  { id: "shopping", name: "Shopping", tier: "wants" },
  { id: "other", name: "Other", tier: "wants" }
];

function bankSpendIdOk(id) {
  return BANK_SPEND_ID_RE.test(String(id || ""));
}

function bankSpendStarters() {
  return BANK_SPEND_STARTERS.map(function (row) {
    return { id: row.id, name: row.name, tier: row.tier, budget: 0, merged_into: "" };
  });
}

function bankSpendErrorCode(body) {
  if (!body || typeof body !== "object") return "";
  if (body.code != null && String(body.code).trim()) return String(body.code).trim();
  if (typeof body.error === "string" && body.error.trim()) return body.error.trim();
  if (body.error && typeof body.error === "object" && body.error.code) return String(body.error.code);
  if (body.reason != null && String(body.reason).trim()) return String(body.reason).trim();
  if (Array.isArray(body.errors) && body.errors.length) {
    var first = body.errors[0];
    if (typeof first === "string") return first;
    if (first && first.code) return String(first.code);
  }
  return "";
}

function bankSpendErrorLine(code) {
  var key = String(code || "");
  var lines = {
    bad_category: "Check that category and try again.",
    bad_category_id: "That category cannot be saved. Try a simpler name.",
    bad_category_name: "Use a name up to 40 characters.",
    bad_category_tier: "Pick Required, Needs, or Wants.",
    bad_category_budget: "Enter a budget as a number, from zero on up.",
    duplicate_category_id: "That category is already on the list.",
    bad_merged_into: "Choose a category to merge into.",
    merged_into_cycle: "Those categories cannot fold into each other.",
    bad_category_ref: "Choose a category for that rule.",
    unknown_category: "That category is not on the list.",
    too_many_rules: "There are too many rules. Remove one and try again."
  };
  if (lines[key]) return lines[key];
  if (key.indexOf("bad_category") === 0) return lines.bad_category;
  return "That change did not save. It is still on this screen.";
}

function bankCategoryDoc(snap) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  var docs = [];
  if (snap.tier_doc && typeof snap.tier_doc === "object" && !Array.isArray(snap.tier_doc)) docs.push(snap.tier_doc);
  var feed = null;
  try { feed = bankFeedTierDoc(snap); } catch (e) { feed = null; }
  if (feed && docs.indexOf(feed) < 0) docs.push(feed);
  var i;
  for (i = 0; i < docs.length; i++) {
    if (Object.prototype.hasOwnProperty.call(docs[i], "categories")) return docs[i];
  }
  return null;
}

function bankCategoriesActive(snap) {
  var doc = bankCategoryDoc(snap);
  return !!(doc && Array.isArray(doc.categories));
}

function bankSpendLive(snap) {
  if (!bankCategoriesActive(snap)) return false;
  return bankSpendVisible(bankSpendCategories(snap) || []).length > 0;
}

function bankSpendById(cats, id) {
  var want = String(id || "");
  var found = null;
  (cats || []).forEach(function (row) {
    if (!found && row && row.id === want) found = row;
  });
  return found;
}

function bankSpendCategories(snap) {
  var doc = bankCategoryDoc(snap);
  if (!doc || !Array.isArray(doc.categories)) return null;
  var out = [];
  var seen = {};
  doc.categories.forEach(function (raw) {
    if (!raw || typeof raw !== "object") return;
    var id = String(raw.id == null ? "" : raw.id).trim();
    if (!bankSpendIdOk(id) || seen[id]) return;
    seen[id] = true;
    var name = String(raw.name == null ? "" : raw.name).trim();
    if (!name) name = id;
    if (name.length > BANK_SPEND_NAME_MAX) name = name.slice(0, BANK_SPEND_NAME_MAX);
    var tier = raw.tier === "required" || raw.tier === "needs" || raw.tier === "wants" ? raw.tier : "wants";
    var budget = 0;
    if (typeof raw.budget === "number" && isFinite(raw.budget) && raw.budget >= 0) {
      budget = raw.budget > BANK_SPEND_BUDGET_MAX ? BANK_SPEND_BUDGET_MAX : raw.budget;
    }
    var merged = raw.merged_into == null || raw.merged_into === "" ? "" : String(raw.merged_into);
    out.push({ id: id, name: name, tier: tier, budget: budget, merged_into: merged });
  });
  return out;
}

function bankSpendResolveId(cats, id) {
  var seen = {};
  var cur = String(id || "");
  var guard = 0;
  while (cur && guard < 40) {
    if (seen[cur]) return String(id || "");
    seen[cur] = true;
    var row = bankSpendById(cats, cur);
    if (!row || !row.merged_into) return cur;
    if (!bankSpendById(cats, row.merged_into)) return cur;
    cur = row.merged_into;
    guard += 1;
  }
  return String(id || "");
}

function bankSpendVisible(cats) {
  return (cats || []).filter(function (row) {
    if (!row) return false;
    if (!row.merged_into) return true;
    return !bankSpendById(cats, row.merged_into);
  });
}

function bankSpendMatchName(cats, name) {
  var key = bankTierKey(name);
  if (!key) return "";
  var found = "";
  (cats || []).forEach(function (row) {
    if (found || !row) return;
    if (bankTierKey(row.name) === key || row.id === bankBillSlug(name)) found = row.id;
  });
  return found;
}

function bankSpendKeyword(name) {
  var s = String(name || "").toLowerCase();
  if (!s) return "";
  if (/mortgage|\brent\b|housing/.test(s)) return "mortgage";
  if (/utility|electric|water|sewer|trash|\bpower\b/.test(s)) return "utilities";
  if (/phone|internet|\bmobile\b|cable/.test(s)) return "phone-internet";
  if (/insurance|\bloan\b|installment|\bcar\b|\bauto\b/.test(s)) return "car-insurance-loans";
  if (/grocer/.test(s)) return "groceries";
  if (/fuel|gas\/fuel|\bgas\b/.test(s)) return "gas-fuel";
  if (/household|health|medical|pharm/.test(s)) return "household-health";
  if (/education|tuition|childcare/.test(s)) return "education-needs";
  if (/dining|restaurant|cafe|coffee/.test(s)) return "dining";
  if (/subscri/.test(s)) return "subscriptions";
  if (/kids|entertainment/.test(s)) return "kids-activities";
  if (/shop/.test(s)) return "shopping";
  return "";
}

function bankSpendBillCategory(bill, cats) {
  if (!bill) return "";
  var explicit = bill.category_id || bill.spend_category || "";
  if (explicit && bankSpendById(cats, String(explicit))) return String(explicit);
  var billId = String(bill.bill_id || "").trim();
  var name = bill.name || bill.label || "";
  if ((billId === "education" || bankBillKey(name) === "education") && bankSpendById(cats, "education")) return "education";
  if (billId === "childcare" || bankBillKey(name) === "childcare") {
    if (bankSpendById(cats, "education")) return "education";
  }
  var slug = bankBillSlug(billId || name);
  if (slug && bankSpendById(cats, slug)) return slug;
  var named = bankSpendMatchName(cats, name);
  if (named) return named;
  var word = bankSpendKeyword(name);
  if (word && bankSpendById(cats, word)) return word;
  return "";
}

function bankSpendExcluded(row, snap) {
  if (!row || typeof row !== "object") return true;
  if (bankTxDepositLocked(row)) return true;
  if (bankTxOffSpendBasis(row) && bankSpendSavedCategoryId(row, snap)) return false;
  if (String(row.category_basis || "") === "not_spend") return true;
  if (row.transfer === true || row.internal === true || row.payoff === true) return true;
  if (bankTruthyFlag(row.one_off) || bankTruthyFlag(row.exclude_from_spend_avg)) return true;
  var label = [row.desc, row.category, row.merchant, row.name].join(" ");
  if (bankIsTransferName(label)) return true;
  if (bankIsIncomeName(row.category || "", null) || bankIsIncomeName(row.desc || "", null) || bankIsIncomeName(row.name || "", null)) return true;
  if (snap && bankTxExcludedFromSpend(row, snap)) return true;
  return false;
}

function bankSpendAmount(row) {
  var n = bankNum(row && row.amount);
  if (n == null) return 0;
  var refund = row.refund === true || String(row.kind || "").toLowerCase() === "refund";
  if (refund) return -Math.abs(n);
  if (bankFlowSide(row) === "in") return -Math.abs(n);
  return n;
}

function bankRowIsInstallment(row) {
  if (!row) return false;
  if (row.installment === true) return true;
  var kind = String(row.kind || row.type || "").toLowerCase();
  if (kind === "installment" || kind === "installments") return true;
  var cat = String(row.category || "").trim().toLowerCase();
  return cat === "installment" || cat === "installments";
}

function bankRowIsSubscription(row, snap) {
  if (!row || bankRowIsInstallment(row)) return false;
  if (row.kind === "subscription" || row.subscription === true) return true;
  var name = row.name || row.desc || row.merchant || "";
  try { return bankIsSubName(name, snap); } catch (e) { return false; }
}

function bankSpendTxHit(doc, row) {
  var bag = doc && doc.category_tx;
  if (!bag || typeof bag !== "object" || Array.isArray(bag) || !row) return "";
  var key = "";
  if (row.tx_override_key && bankTxOverrideKeyOk(row.tx_override_key)) key = String(row.tx_override_key);
  else {
    try { key = bankTxBagKey(row) || ""; } catch (e) { key = ""; }
  }
  if (!key || !Object.prototype.hasOwnProperty.call(bag, key) || bag[key] == null) return "";
  return String(bag[key]);
}

function bankSpendMerchantKey(row) {
  if (!row) return "";
  if (row.merchant_key != null && String(row.merchant_key).trim()) return String(row.merchant_key).trim();
  return bankTierKey(bankTxMerchantName(row));
}

function bankSpendMerchantHit(doc, row) {
  var bag = doc && doc.category_rules;
  if (!bag || typeof bag !== "object" || Array.isArray(bag) || !row) return "";
  var key = bankSpendMerchantKey(row);
  if (!key || !Object.prototype.hasOwnProperty.call(bag, key) || bag[key] == null) return "";
  return String(bag[key]);
}

function bankSpendBillHit(row, snap, cats) {
  if (!row) return "";
  var bills = [];
  try { bills = bankPreparedBills(snap, undefined); } catch (e) { bills = []; }
  var i;
  for (i = 0; i < bills.length; i++) {
    var bill = bills[i];
    if (!bill) continue;
    var linked = false;
    if (row.bill_id && (String(bill.bill_id || "") === String(row.bill_id) || bankBillMatchesKey(bill, row.bill_id))) linked = true;
    if (!linked && row.category && bankBillMatchesKey(bill, row.category)) linked = true;
    if (!linked) continue;
    var id = bankSpendBillCategory(bill, cats);
    if (id) return id;
  }
  if (row.bill_id) return bankSpendBillCategory({ bill_id: row.bill_id, name: row.name || row.category || "" }, cats);
  return "";
}

function bankSpendFeedHit(row) {
  var cat = String(row && row.category || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!cat) return "";
  var table = {
    "food/drink": "dining",
    "food and drink": "dining",
    "food & drink": "dining",
    "dining": "dining",
    "restaurants": "dining",
    "groceries": "groceries",
    "grocery": "groceries",
    "transportation": "gas-fuel",
    "gas": "gas-fuel",
    "fuel": "gas-fuel",
    "gas/fuel": "gas-fuel",
    "entertainment": "kids-activities",
    "shopping": "shopping",
    "merchandise": "shopping",
    "general merchandise": "shopping",
    "utilities": "utilities",
    "utilities/bills": "utilities",
    "bills & utilities": "utilities",
    "mortgage": "mortgage",
    "rent": "mortgage",
    "rent/mortgage": "mortgage",
    "housing": "mortgage",
    "phone": "phone-internet",
    "internet": "phone-internet",
    "phone & internet": "phone-internet",
    "insurance": "car-insurance-loans",
    "loans": "car-insurance-loans",
    "car": "car-insurance-loans",
    "auto": "car-insurance-loans",
    "education": "education-needs",
    "tuition": "education-needs",
    "childcare": "education-needs",
    "health": "household-health",
    "medical": "household-health",
    "household": "household-health",
    "household & health": "household-health",
    "kids": "kids-activities",
    "kids & activities": "kids-activities",
    "subscriptions": "subscriptions",
    "subscription": "subscriptions"
  };
  return table[cat] || "";
}

function bankSpendResolvePrinted(cats, raw) {
  var text = String(raw == null ? "" : raw).trim();
  if (!text) return "";
  if (bankSpendById(cats, text)) return text;
  var named = bankSpendMatchName(cats, text);
  if (named) return named;
  var slug = "";
  try { slug = bankBillSlug(text); } catch (e) { slug = ""; }
  if (slug && bankSpendById(cats, slug)) return slug;
  var feed = bankSpendFeedHit({ category: text });
  if (feed && bankSpendById(cats, feed)) return feed;
  return "";
}

function bankSpendSavedCategoryId(row, snap) {
  if (!row) return "";
  var cats = null;
  try { cats = bankSpendCategories(snap); } catch (e) { cats = null; }
  if (!cats) return "";
  var doc = bankCategoryDoc(snap) || {};
  var picked = "";
  try { picked = bankSpendTxHit(doc, row) || ""; } catch (e2) { picked = ""; }
  if (!picked) {
    try { picked = bankSpendMerchantHit(doc, row) || ""; } catch (e3) { picked = ""; }
  }
  var resolved = bankSpendResolvePrinted(cats, picked);
  if (!resolved) return "";
  return bankSpendResolveId(cats, resolved) || "";
}

/* A saved category wins, including on a row the print left out of spending. The print's category is next. */
function bankMapSpendCategory(row, snap) {
  if (!row || bankTxDepositLocked(row)) return null;
  var cats = bankSpendCategories(snap);
  if (!cats) return null;
  var doc = bankCategoryDoc(snap) || {};
  function take(id, via) {
    var resolved = bankSpendResolvePrinted(cats, id);
    if (!resolved) return null;
    return { id: resolved, via: via };
  }
  var found = take(bankSpendTxHit(doc, row), "tx");
  if (found) return found;
  found = take(bankSpendMerchantHit(doc, row), "merchant");
  if (found) return found;
  if (String(row.category_basis || "") === "not_spend") return null;
  if (bankSpendExcluded(row, snap)) return null;
  var printed = Object.prototype.hasOwnProperty.call(row, "category") || Object.prototype.hasOwnProperty.call(row, "category_basis");
  if (printed) {
    if (row.category != null && String(row.category).trim() !== "") {
      found = take(row.category, "print");
      if (found) return found;
    }
    if (row.feed_category) {
      found = take(row.feed_category, "feed");
      if (found) return found;
    }
    return { id: "", via: "uncategorized" };
  }
  found = take(bankSpendBillHit(row, snap, cats), "bill");
  if (found) return found;
  if (bankRowIsInstallment(row)) {
    found = take("car-insurance-loans", "installment");
    if (found) return found;
  }
  if (bankRowIsSubscription(row, snap)) {
    found = take("subscriptions", "subscription");
    if (found) return found;
  }
  found = take(bankSpendFeedHit(row), "feed");
  if (found) return found;
  found = take(bankSpendLegacyCategory(row, snap, cats), "legacy");
  if (found) return found;
  return { id: "", via: "uncategorized" };
}

function bankSpendLegacyCategory(row, snap, cats) {
  var tier = "";
  try { tier = bankTxOverrideTier(snap, row) || ""; } catch (e) { tier = ""; }
  if (!tier) {
    try { tier = bankLookupTierRule(snap, bankTxMerchantName(row)) || ""; } catch (e2) { tier = ""; }
  }
  if (tier !== "required" && tier !== "needs" && tier !== "wants") return "";
  var feed = bankSpendFeedHit(row) || bankSpendKeyword(bankTxMerchantName(row) || (row && row.category) || "");
  if (!feed || !bankSpendById(cats, feed)) return "";
  var hit = bankSpendById(cats, feed);
  return hit && hit.tier === tier ? feed : "";
}

function bankItemCategoryId(row, snap) {
  if (!row || !bankCategoriesActive(snap)) return "";
  var cats = bankSpendCategories(snap);
  if (!cats) return "";
  var mapped = bankMapSpendCategory(row, snap);
  if (mapped && mapped.id) return bankSpendResolveId(cats, mapped.id);
  var named = bankSpendMatchName(cats, row.name || row.merchant || row.desc || "");
  return named ? bankSpendResolveId(cats, named) : "";
}

function bankSpendGroupOf(row, snap) {
  var id = bankItemCategoryId(row, snap);
  if (!id) return "";
  var cat = bankSpendById(bankSpendCategories(snap), id);
  return cat && cat.tier ? cat.tier : "";
}

function bankSpendTxRows(snap) {
  var rows = [];
  var seen = {};
  function add(raw) {
    if (!raw || typeof raw !== "object") return;
    var keys = [];
    if (raw.tx_key) keys.push("k:" + raw.tx_key);
    if (raw.tx_id) keys.push("i:" + raw.tx_id);
    if (raw.tx_override_key) keys.push("o:" + raw.tx_override_key);
    keys.push("d:" + [raw.date || "", raw.id || "", raw.amount == null ? "" : raw.amount, raw.desc || raw.merchant || ""].join("|"));
    var i;
    for (i = 0; i < keys.length; i++) if (seen[keys[i]]) return;
    for (i = 0; i < keys.length; i++) seen[keys[i]] = true;
    rows.push(raw);
  }
  var cur = snap && snap.current;
  if (cur && Array.isArray(cur.edits_tx)) cur.edits_tx.forEach(add);
  if (cur && Array.isArray(cur.recent_tx)) cur.recent_tx.forEach(add);
  if (cur && Array.isArray(cur.history_tx)) cur.history_tx.forEach(add);
  var months = snap && snap.history && snap.history.months;
  if (Array.isArray(months)) {
    months.forEach(function (month) {
      if (!month) return;
      if (Array.isArray(month.tx)) month.tx.forEach(add);
      if (Array.isArray(month.transactions)) month.transactions.forEach(add);
    });
  }
  return rows;
}

function bankSpendScan(snap, monthKey, cats) {
  var totals = {};
  var unsorted = 0;
  var key = bankMonthKey(monthKey);
  bankSpendTxRows(snap).forEach(function (raw) {
    if (key && bankMonthKey(raw.date) !== key) return;
    if (bankSpendExcluded(raw, snap)) return;
    var mapped = bankMapSpendCategory(raw, snap);
    if (!mapped) return;
    var id = mapped.id ? bankSpendResolveId(cats, mapped.id) : "";
    if (id) totals[id] = (totals[id] || 0) + bankSpendAmount(raw);
    if (!id) unsorted += 1;
  });
  Object.keys(totals).forEach(function (id) { totals[id] = bankRoundCents(totals[id]); });
  return { totals: totals, unsorted: unsorted };
}

function bankSpendRowsForMonth(snap, cats, monthKey, mode) {
  if (mode !== "historical") {
    return bankSpendVisible(cats).map(function (row) {
      return { id: row.id, name: row.name, tier: row.tier, budget: row.budget, showBudget: true };
    });
  }
  var shot = bankSnapshotFor(snap, monthKey);
  var frozen = shot && Array.isArray(shot.categories) ? shot.categories : null;
  if (!frozen) {
    return bankSpendVisible(cats).map(function (row) {
      return { id: row.id, name: row.name, tier: row.tier, budget: null, showBudget: false };
    });
  }
  var rows = [];
  frozen.forEach(function (raw) {
    if (!raw || typeof raw !== "object") return;
    var id = String(raw.id || "").trim();
    if (!bankSpendIdOk(id)) id = bankSpendMatchName(cats, raw.name || raw.category || "");
    if (!id) return;
    var live = bankSpendById(cats, id);
    var name = live && live.name ? live.name : String(raw.name || raw.category || id);
    var tier = live && (live.tier === "required" || live.tier === "needs" || live.tier === "wants") ? live.tier : raw.tier;
    if (tier !== "required" && tier !== "needs" && tier !== "wants") tier = "wants";
    var budget = typeof raw.budget === "number" && isFinite(raw.budget) ? raw.budget : null;
    rows.push({ id: id, name: name, tier: tier, budget: budget, showBudget: budget != null });
  });
  return rows;
}

function bankSpendTone(spent, budget) {
  var pct = bankVsPct(spent, budget);
  if (pct == null) return "";
  if (pct > 100) return "stop";
  if (pct >= 80) return "warn";
  return "go";
}

function bankSpendBarHtml(spent, budget) {
  var plan = bankNum(budget);
  var spentN = bankNum(spent) || 0;
  if ((plan == null || !(plan > 0)) && spentN > 0.004) {
    return '<span class="mix-bar" data-tone="stop" data-pct="100"><span style="width:100%;background:' + bankVsColor("stop") + '"></span></span>';
  }
  if (plan == null || !(plan > 0)) return "";
  var pct = bankVsPct(spent, plan);
  var tone = bankSpendTone(spent, plan);
  var width = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var toneAttr = tone ? ' data-tone="' + tone + '"' : "";
  var pctAttr = pct == null ? "" : ' data-pct="' + pct.toFixed(1) + '"';
  return '<span class="mix-bar"' + toneAttr + pctAttr + '><span style="width:' +
    width.toFixed(1) + "%;background:" + bankVsColor(tone) + '"></span></span>';
}

function bankSpendFigText(spent, budget, showBudget) {
  if (!showBudget || budget == null) return bankMoney(spent);
  return bankMoney(spent) + " of " + bankMoney(budget);
}

function bankCategoryFigureBag(snap) {
  var budget = (snap && snap.budget) || {};
  var tiers = budget.tiers && typeof budget.tiers === "object" ? budget.tiers : {};
  var mtd = budget.tiers_mtd && typeof budget.tiers_mtd === "object" ? budget.tiers_mtd : {};
  var plan = tiers.by_category && typeof tiers.by_category === "object" && !Array.isArray(tiers.by_category) ? tiers.by_category : null;
  var spent = mtd.by_category && typeof mtd.by_category === "object" && !Array.isArray(mtd.by_category) ? mtd.by_category : null;
  return { plan: plan, spent: spent };
}

function bankCategoryCellNum(cell, key) {
  if (cell == null) return null;
  if (typeof cell === "number") return key === "spent" ? null : bankNum(cell);
  if (typeof cell !== "object") return bankNum(cell);
  if (key && bankNum(cell[key]) != null) return bankNum(cell[key]);
  return null;
}

function bankCategoryMonthLive(snap, monthKey) {
  var key = bankMonthKey(monthKey);
  if (!key) return true;
  var cur = snap && snap.current && snap.current.month ? bankMonthKey(snap.current.month) : "";
  if (cur) return key === cur;
  return true;
}

/* The print's category spent leaves out skipped outflows. Add them back when a saved category now counts them. */
function bankSpendOffSpendLift(snap, monthKey, cats) {
  var totals = {};
  var key = bankMonthKey(monthKey);
  bankSpendTxRows(snap).forEach(function (raw) {
    if (!raw) return;
    if (key && bankMonthKey(raw.date) !== key) return;
    if (bankTxDepositLocked(raw)) return;
    if (!bankTxOffSpendBasis(raw)) return;
    var id = bankSpendSavedCategoryId(raw, snap);
    if (!id) return;
    id = bankSpendResolveId(cats, id);
    if (!id) return;
    totals[id] = (totals[id] || 0) + bankSpendAmount(raw);
  });
  Object.keys(totals).forEach(function (id) { totals[id] = bankRoundCents(totals[id]); });
  return totals;
}

function bankCategoryFigures(snap, monthKey) {
  var cats = bankSpendCategories(snap) || [];
  var key = bankMonthKey(monthKey);
  var live = bankCategoryMonthLive(snap, key);
  var monthRows = bankSpendRowsForMonth(snap, cats, key, live ? "budget" : "historical");
  var bag = live ? bankCategoryFigureBag(snap) : { plan: null, spent: null };
  var scan = bankSpendScan(snap, key, cats);
  var lift = live ? bankSpendOffSpendLift(snap, key, cats) : {};
  var drop = bankCancelledCategoryDrop(snap, key);
  var out = {};
  monthRows.forEach(function (row) {
    var show = !!row.showBudget;
    var plan = show ? row.budget : null;
    var spent = scan.totals[row.id] || 0;
    var fromBag = false;
    if (live && bag.plan && Object.prototype.hasOwnProperty.call(bag.plan, row.id)) {
      var cell = bag.plan[row.id];
      var planN = bankCategoryCellNum(cell, "plan");
      if (planN != null) plan = planN;
      if (!(bag.spent && Object.prototype.hasOwnProperty.call(bag.spent, row.id))) {
        var spentN = bankCategoryCellNum(cell, "spent");
        if (spentN != null) {
          spent = spentN;
          fromBag = true;
        }
      }
      show = true;
    }
    if (live && bag.spent && Object.prototype.hasOwnProperty.call(bag.spent, row.id)) {
      var spentCell = bankCategoryCellNum(bag.spent[row.id], "spent");
      if (spentCell == null && typeof bag.spent[row.id] === "number") spentCell = bankNum(bag.spent[row.id]);
      if (spentCell != null) {
        spent = spentCell;
        fromBag = true;
      }
    }
    if (fromBag) spent = (spent || 0) + (lift[row.id] || 0);
    if (plan != null && drop[row.id]) plan = Math.max(0, bankRoundCents((plan || 0) - drop[row.id]));
    out[row.id] = {
      id: row.id,
      name: row.name,
      tier: row.tier,
      plan: show ? bankRoundCents(plan || 0) : null,
      spent: bankRoundCents(spent || 0),
      showBudget: show
    };
  });
  return out;
}

function bankGroupRollup(snap, monthKey) {
  var figs = bankCategoryFigures(snap, monthKey);
  return ["required", "needs", "wants"].map(function (tier) {
    var rows = [];
    var plan = 0;
    var spent = 0;
    Object.keys(figs).forEach(function (id) {
      var row = figs[id];
      if (!row || row.tier !== tier) return;
      rows.push(row);
      if (row.showBudget) plan += row.plan || 0;
      spent += row.spent || 0;
    });
    rows.sort(function (a, b) {
      var ap = a.plan > 0 ? a.spent / a.plan : (a.spent > 0 ? 2 : 0);
      var bp = b.plan > 0 ? b.spent / b.plan : (b.spent > 0 ? 2 : 0);
      if (bp !== ap) return bp - ap;
      return String(a.name).localeCompare(String(b.name));
    });
    return { tier: tier, plan: bankRoundCents(plan), spent: bankRoundCents(spent), rows: rows };
  });
}

function bankUncatItems(snap) {
  var items = [];
  var seen = {};
  function push(raw) {
    if (!raw || typeof raw !== "object") return;
    if (String(raw.category_basis || "") === "not_spend") return;
    if (bankSpendExcluded(raw, snap) && String(raw.category_basis || "") !== "spend") {
      if (!(Object.prototype.hasOwnProperty.call(raw, "category") && (raw.category == null || String(raw.category).trim() === ""))) return;
    }
    if (!bankCategoriesActive(snap)) {
      if (bankSpendExcluded(raw, snap)) return;
    } else {
      var mapped = bankMapSpendCategory(raw, snap);
      if (!mapped || mapped.id || mapped.via === "not_spend") return;
    }
    var key = raw.tx_key || raw.tx_id || raw.bill_id || raw.sub_id || [raw.date || "", raw.desc || raw.name || "", raw.amount == null ? "" : raw.amount].join("|");
    if (seen[key]) return;
    seen[key] = true;
    items.push(raw);
  }
  var budget = (snap && snap.budget) || {};
  if (Array.isArray(budget.uncategorized_items)) budget.uncategorized_items.forEach(push);
  bankSpendTxRows(snap).forEach(push);
  try { bankPreparedBills(snap, undefined).forEach(push); } catch (e) {}
  try { bankNormalizeSubs(budget).forEach(push); } catch (e2) {}
  return items;
}

function bankUncatBadge(snap) {
  var budget = (snap && snap.budget) || {};
  var n = bankNum(budget.uncategorized_count);
  if (n == null) n = bankNum(budget.uncategorized_items_count);
  if (n == null) n = bankUncatItems(snap).length;
  return Math.max(0, Math.round(n));
}

function bankUncatMonthCount(snap, monthKey) {
  var key = bankMonthKey(monthKey);
  var items = bankUncatItems(snap).filter(function (raw) {
    var when = bankMonthKey(raw && (raw.date || raw.month));
    if (!key) return true;
    return when === key;
  });
  return items.length;
}

function bankSpendRowHtml(row, spent, unsorted) {
  var show = !!row.showBudget && row.budget != null;
  var planN = show ? (bankNum(row.budget) || 0) : null;
  var tone = show && (planN > 0 || spent > 0.004) ? bankSpendTone(spent, planN > 0 ? planN : (spent > 0 ? 0 : null)) : "";
  if (show && !(planN > 0) && spent > 0.004) tone = "stop";
  var over = "";
  if (show && spent - planN > 0.004) {
    over = '<span class="mix-amt tone-stop"> ' + bankEsc("Over " + bankMoney(bankRoundCents(spent - planN))) + "</span>";
  }
  var nudge = "";
  if (row.id === "other" && unsorted > 0) {
    nudge = '<span class="mix-amt"> ' + bankEsc(String(unsorted) + " to sort") + "</span>";
  }
  var amtCls = tone === "stop" ? "mix-amt tone-stop" : "mix-amt";
  var attrs = ' data-bank-cat-row="' + bankEsc(row.id) + '" data-spent="' + bankRoundCents(spent) + '"';
  if (show) attrs += ' data-budget="' + bankRoundCents(row.budget) + '"';
  if (tone) attrs += ' data-tone="' + tone + '"';
  if (!tone) attrs += ' style="grid-template-columns:minmax(0,1fr) auto"';
  return '<button type="button" class="mix-leg"' + attrs + ">" +
    (tone ? '<i style="background:' + bankVsColor(tone) + '"></i>' : "") +
    '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(row.name) + "</span>" +
    (show ? bankSpendBarHtml(spent, row.budget) : "") + "</span> " +
    '<span class="mix-leg-fig"><span class="' + amtCls + '">' + bankEsc(bankSpendFigText(spent, row.budget, show)) + "</span>" +
    over + nudge + "</span></button>";
}

function bankSpendHeadHtml(tier, spent, plan, hasPlan) {
  var show = !!hasPlan;
  var tone = show && plan > 0 ? bankSpendTone(spent, plan) : "";
  var over = "";
  if (show && plan > 0 && spent - plan > 0.004) {
    over = '<span class="mix-amt tone-stop"> ' + bankEsc("Over " + bankMoney(bankRoundCents(spent - plan))) + "</span>";
  } else if (show && plan != null) {
    var left = bankRoundCents(plan - spent);
    over = '<span class="mix-amt"> ' + bankEsc(left < -0.004 ? ("Over " + bankMoney(bankRoundCents(-left))) : ("Left " + bankMoney(Math.max(0, left)))) + "</span>";
  }
  var attrs = ' data-tier="' + tier + '" data-spent="' + bankRoundCents(spent) + '"';
  if (show && plan != null) attrs += ' data-plan="' + bankRoundCents(plan) + '"';
  if (tone) attrs += ' data-tone="' + tone + '"';
  var amtCls = tone === "stop" ? "mix-amt tone-stop" : "mix-amt";
  return '<div class="mix-leg"' + attrs + (tone ? "" : ' style="grid-template-columns:minmax(0,1fr) auto"') + ">" +
    (tone ? '<i style="background:' + bankVsColor(tone) + '"></i>' : "") +
    '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(bankTierLabel(tier)) + "</span>" +
    (show && plan > 0 ? bankSpendBarHtml(spent, plan) : "") + "</span> " +
    '<span class="mix-leg-fig"><span class="' + amtCls + '">' + bankEsc(bankSpendFigText(spent, plan, show)) + "</span>" +
    over + "</span></div>";
}

function bankGroupHeadHtml(group) {
  var plan = group.plan;
  var spent = group.spent;
  var tone = plan > 0 || spent > 0.004 ? bankSpendTone(spent, plan > 0 ? plan : 0) : "";
  if (!(plan > 0) && spent > 0.004) tone = "stop";
  var over = spent - plan > 0.004
    ? '<span class="mix-amt tone-stop"> ' + bankEsc("Over " + bankMoney(bankRoundCents(spent - plan))) + "</span>"
    : "";
  var attrs = ' data-bank-group="' + group.tier + '" data-tier="' + group.tier + '" data-spent="' + spent + '" data-plan="' + plan + '"';
  if (tone) attrs += ' data-tone="' + tone + '"';
  var amtCls = tone === "stop" ? "mix-amt tone-stop" : "mix-amt";
  return '<button type="button" class="mix-leg"' + attrs + ">" +
    (tone ? '<i style="background:' + bankVsColor(tone) + '"></i>' : '<i></i>') +
    '<span class="mix-leg-meta"><span class="mix-leg-name">' + bankEsc(bankTierLabel(group.tier)) + "</span>" +
    (plan > 0 || spent > 0.004 ? bankSpendBarHtml(spent, plan) : "") + "</span> " +
    '<span class="mix-leg-fig"><span class="' + amtCls + '">' + bankEsc(bankMoney(spent) + " of " + bankMoney(plan)) + "</span>" +
    over + ' <i class="cf-chev" aria-hidden="true"></i></span></button>';
}

function bankCategorySummaryHtml(snap, opts, mode, month) {
  var cats = bankSpendCategories(snap);
  if (!cats || !cats.length) return "";
  var monthKey = bankMonthKey(month);
  var groups = bankGroupRollup(snap, monthKey);
  var warn = bankUncatMonthCount(snap, monthKey);
  var body = groups.map(bankGroupHeadHtml).join("");
  if (warn > 0) {
    body += '<button type="button" class="mix-leg" data-bank-uncat-open="1" data-count="' + warn + '">' +
      '<i></i><span class="mix-leg-meta"><span class="mix-leg-name">Uncategorized</span></span> ' +
      '<span class="mix-leg-fig"><span class="fresh-chip">' + warn + '</span> <i class="cf-chev" aria-hidden="true"></i></span></button>';
  }
  var line = opts && opts.catError && !(opts.catOpen)
    ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.catError) + "</p>"
    : '<p class="hint">Tap a group to see its categories.</p>';
  return '<section class="bank-tier-summary"><h2>Tier summary</h2><div class="card span">' + line +
    '<div class="mix-legend">' + body + "</div></div></section>";
}

function bankSpendOpenMonth(snap, opts) {
  opts = opts || {};
  if (opts.catMonth) return bankMonthKey(opts.catMonth);
  if (opts.tab === "historical" || opts.histMonth) {
    var hist = bankMonthKey(opts.histMonth);
    if (hist) return hist;
  }
  var ym = bankScreenMonth(snap, opts);
  return bankYm(ym.year, ym.month);
}

function bankSpendPopupModel(snap, id, monthKey) {
  var cats = bankSpendCategories(snap) || [];
  var row = bankSpendById(cats, id);
  if (!row) return null;
  var liveId = bankSpendResolveId(cats, id);
  var live = bankSpendById(cats, liveId) || row;
  var shot = bankSnapshotFor(snap, monthKey);
  var frozen = shot && Array.isArray(shot.categories) ? shot.categories : null;
  var budget = live.budget;
  var showBudget = true;
  if (frozen) {
    showBudget = false;
    budget = null;
    frozen.forEach(function (item) {
      if (!item || String(item.id || "") !== live.id) return;
      if (typeof item.budget === "number" && isFinite(item.budget)) {
        budget = item.budget;
        showBudget = true;
      }
    });
  }
  var nowScan = bankSpendScan(snap, monthKey, cats);
  var prevKey = bankShiftYm(monthKey, -1);
  var prev2Key = bankShiftYm(monthKey, -2);
  var spent = nowScan.totals[live.id] || 0;
  var prevSpent = prevKey ? (bankSpendScan(snap, prevKey, cats).totals[live.id] || 0) : 0;
  var prev2Spent = prev2Key ? (bankSpendScan(snap, prev2Key, cats).totals[live.id] || 0) : 0;
  var pct = showBudget ? bankVsPct(spent, budget) : null;
  var left = showBudget && budget != null ? bankRoundCents(budget - spent) : null;
  return {
    id: live.id,
    name: live.name,
    budget: showBudget ? budget : null,
    showBudget: showBudget,
    spent: spent,
    left: left,
    pct: pct,
    prevKey: prevKey,
    prevSpent: prevSpent,
    prev2Key: prev2Key,
    prev2Spent: prev2Spent
  };
}

function bankSpendMonthName(key) {
  var parsed = bankParseYm(key);
  if (!parsed) return "";
  return bankMonthTitle(parsed.year, parsed.month);
}

function bankSpendMonthItems(snap, catId, monthKey) {
  var cats = bankSpendCategories(snap) || [];
  var want = bankSpendResolveId(cats, catId);
  var items = [];
  bankSpendTxRows(snap).forEach(function (raw) {
    if (monthKey && bankMonthKey(raw.date) !== monthKey) return;
    if (bankSpendExcluded(raw, snap)) return;
    var mapped = bankMapSpendCategory(raw, snap);
    if (!mapped || !mapped.id) return;
    if (bankSpendResolveId(cats, mapped.id) !== want) return;
    items.push(raw);
  });
  return items;
}

function bankSpendItemRowHtml(snap, raw) {
  var when = bankShortDate(raw.date) || raw.date || "";
  var last = "";
  try { last = bankAccountMask(raw.last4 || bankAccountLast4(snap, raw)); } catch (e) { last = raw.last4 ? bankAccountMask(raw.last4) : ""; }
  var name = bankTxMerchantName(raw);
  var amount = bankSpendAmount(raw);
  var tone = amount < -0.004 ? "tone-go" : "tone-stop";
  var flow = bankFundSigned(Math.abs(amount), amount < -0.004 ? "in" : "out");
  var openKey = "";
  try { openKey = bankTxOpenKey(raw); } catch (e2) { openKey = name; }
  var chip = bankTxChipLabel(snap, raw);
  var meta = [when, last].filter(Boolean).join(" \u00b7 ");
  var flag = "";
  try { if (bankTxChargedAfter(snap, raw)) flag = " " + bankChargedFlagHtml(); } catch (e4) { flag = ""; }
  return '<li data-bank-cat-item="1" data-last4="' + bankEsc(last) + '">' +
    '<span data-bank-item-name="1">' + bankEsc(name) + "</span>" +
    (meta ? '<i data-bank-item-meta="1">' + bankEsc(meta) + "</i>" : "") +
    '<b class="' + tone + '">' + bankEsc(flow.text) + "</b>" +
    '<button type="button" class="fresh-chip" data-bank-cat-item-open="' + bankEsc(openKey) + '">' + bankEsc(chip) + "</button>" +
    flag + "</li>";
}

function bankPopupItemDue(snap, raw, today) {
  var name = bankTxMerchantName(raw);
  var hit = null;
  try {
    bankPreparedBills(snap, undefined).forEach(function (b) {
      if (hit || !b) return;
      if (bankNamesMatch(b.name, name) || bankBillKey(b.name) === bankBillKey(name)) hit = b;
    });
  } catch (e) { hit = null; }
  if (!hit) {
    try {
      bankPreparedSubs(snap).forEach(function (s) {
        if (hit || !s) return;
        if (bankNamesMatch(s.name, name) || bankBillKey(s.name) === bankBillKey(name)) hit = s;
      });
    } catch (e2) { hit = null; }
  }
  if (hit) {
    var due = bankNextDueIso(hit, today);
    if (due) return due;
  }
  return String(raw && raw.date || "");
}

function bankSpendPopupHtml(snap, opts) {
  opts = opts || {};
  if (!opts.catOpen || !bankCategoriesActive(snap)) return "";
  var monthKey = bankSpendOpenMonth(snap, opts);
  var model = bankSpendPopupModel(snap, opts.catOpen, monthKey);
  if (!model) return "";
  var figs = bankCategoryFigures(snap, monthKey)[model.id];
  if (figs) {
    model.spent = figs.spent;
    model.showBudget = !!figs.showBudget;
    if (model.showBudget) {
      model.budget = figs.plan;
      model.left = bankRoundCents((figs.plan || 0) - figs.spent);
      model.pct = bankVsPct(figs.spent, figs.plan);
    } else {
      model.budget = null;
      model.left = null;
      model.pct = null;
    }
  }
  var draft = opts.catDraft && opts.catDraft.id === model.id ? opts.catDraft.budget : null;
  var shownBudget = draft != null ? String(draft) : (model.budget == null ? "" : String(model.budget));
  var leftText = "\u2014";
  if (model.left != null && model.left < -0.004) leftText = "Over " + bankMoney(bankRoundCents(-model.left));
  else if (model.left != null) leftText = bankMoney(model.left);
  var showBar = !!(model.showBudget && (model.budget > 0 || model.spent > 0.004));
  var pctText = !showBar || model.pct == null ? (model.spent > 0 && !(model.budget > 0) ? "Over" : "\u2014") : (model.pct > 999 ? "999%+" : (Math.round(model.pct) + "%"));
  var err = opts.catError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.catError) + "</p>" : '<p class="hint">Monthly budget for this category.</p>';
  function monthRow(key, amount) {
    if (!key) return "";
    return '<tr data-cat-fig="' + bankEsc(key) + '"><td>' + bankEsc(bankSpendMonthName(key)) + '</td><td class="num">' +
      bankMoney(amount) + "</td></tr>";
  }
  var months = '<table class="book"><tbody>' + monthRow(model.prevKey, model.prevSpent) + monthRow(model.prev2Key, model.prev2Spent) + "</tbody></table>";
  function fig(label, text, attr) {
    return '<div data-cat-fig="' + attr + '"><span>' + bankEsc(label) + "</span> <b>" + bankEsc(text) + "</b></div>";
  }
  var tiles = '<div class="kpi" data-cat-figs="1" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    fig("Spent", bankMoney(model.spent), "spent") +
    fig("Left", leftText, "left") +
    fig("Used", pctText, "pct") + "</div>";
  var live = bankSpendById(bankSpendCategories(snap), model.id);
  var tierVal = live ? live.tier : "needs";
  var items = bankSpendMonthItems(snap, model.id, monthKey);
  var itemToday = bankTodayIso(snap, opts);
  items.sort(function (a, b) {
    var da = bankPopupItemDue(snap, a, itemToday);
    var db = bankPopupItemDue(snap, b, itemToday);
    if (da !== db) return da < db ? -1 : 1;
    var an = bankTxMerchantName(a);
    var bn = bankTxMerchantName(b);
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  var list = items.map(function (raw) { return bankSpendItemRowHtml(snap, raw); }).join("");
  var itemHtml = items.length
    ? bankCapList('<ul data-bank-cat-items="1">' + list + "</ul>", items.length, model.name)
    : '<p class="hint">No items this month.</p>';
  var sheet = "";
  if (opts.txOpen) {
    items.forEach(function (raw) {
      var key = "";
      try { key = bankTxOpenKey(raw); } catch (e) { key = ""; }
      if (String(key) === String(opts.txOpen)) sheet = bankTxSheetHtml(snap, raw, opts);
    });
  }
  return '<div class="books-overlay on sheet-bottom" data-bank-cat-pop="1">' +
    '<div class="books-sheet" role="dialog" aria-modal="true" aria-label="' + bankEsc(model.name) + '">' +
    '<div class="books-head"><h2>' + bankEsc(model.name) + "</h2>" +
    '<button type="button" class="book-chip" data-bank-cat-close="1">Close</button></div>' +
    err + tiles +
    (showBar ? bankSpendBarHtml(model.spent, model.budget > 0 ? model.budget : 0) : "") +
    months + itemHtml +
    '<label>Group <select data-bank-cat-tier="' + bankEsc(model.id) + '" aria-label="Group">' + bankSpendTierOptions(tierVal) + "</select></label> " +
    '<label>Monthly budget <input data-bank-cat-budget="' + bankEsc(model.id) + '" inputmode="decimal" aria-label="Monthly budget" value="' +
    bankEsc(shownBudget) + '"></label> ' +
    '<button type="button" class="act" data-bank-cat-save="' + bankEsc(model.id) + '">Save</button>' +
    sheet + "</div></div>";
}

function bankGroupPopupHtml(snap, opts) {
  opts = opts || {};
  if (!opts.groupOpen || !bankCategoriesActive(snap)) return "";
  var tier = opts.groupOpen;
  if (tier !== "required" && tier !== "needs" && tier !== "wants") return "";
  var monthKey = bankSpendOpenMonth(snap, opts);
  var groups = bankGroupRollup(snap, monthKey);
  var group = null;
  groups.forEach(function (row) { if (row.tier === tier) group = row; });
  if (!group) return "";
  var rows = group.rows.map(function (row) {
    var view = { id: row.id, name: row.name, tier: row.tier, budget: row.showBudget ? row.plan : null, showBudget: !!row.showBudget };
    return bankSpendRowHtml(view, row.spent, 0);
  }).join("");
  var label = bankTierLabel(tier) + " " + bankMoney(group.spent) + " of " + bankMoney(group.plan);
  return '<div class="books-overlay on sheet-bottom" data-bank-cat-pop="1" data-bank-group-pop="' + tier + '">' +
    '<div class="books-sheet" role="dialog" aria-modal="true" aria-label="' + bankEsc(bankTierLabel(tier)) + '">' +
    '<div class="books-head"><h2>' + bankEsc(label) + "</h2>" +
    '<button type="button" class="book-chip" data-bank-cat-close="1">Close</button></div>' +
    bankSpendBarHtml(group.spent, group.plan > 0 ? group.plan : 0) +
    '<div class="mix-legend">' + rows + "</div></div></div>";
}

function bankSpendTierOptions(selected) {
  return ["required", "needs", "wants"].map(function (tier) {
    return '<option value="' + tier + '"' + (tier === selected ? " selected" : "") + ">" + bankEsc(bankTierLabel(tier)) + "</option>";
  }).join(" ");
}

function bankSpendChoiceOptions(cats, skipId, selected) {
  var html = "";
  bankSpendVisible(cats).forEach(function (row) {
    if (!row || row.id === skipId) return;
    html += '<option value="' + bankEsc(row.id) + '"' + (row.id === selected ? " selected" : "") + ">" + bankEsc(row.name) + "</option>";
  });
  return html;
}

function bankSpendSheetHtml(snap, opts) {
  opts = opts || {};
  var open = opts.spendOpen || "";
  if (!open || !bankCategoriesActive(snap)) return "";
  var cats = bankSpendCategories(snap) || [];
  var isNew = open === "new";
  var row = isNew ? null : bankSpendById(cats, open);
  if (!isNew && !row) return "";
  var draft = opts.catDraft && String(opts.catDraft.id || "") === String(open) ? opts.catDraft : null;
  var nameVal = draft && draft.name != null ? draft.name : (row ? row.name : "");
  var tierVal = draft && draft.tier ? draft.tier : (row ? row.tier : "needs");
  var budgetVal = draft && draft.budget != null ? draft.budget : (row ? String(row.budget) : "0");
  var id = isNew ? "new" : row.id;
  var title = isNew ? "New category" : row.name;
  var err = opts.catError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.catError) + "</p>" : '<p class="hint">Name, group, and monthly budget.</p>';
  var more = "";
  if (!isNew) {
    more = '<details><summary>More</summary>' +
      '<label>Merge into <select data-bank-spend-into="' + bankEsc(id) + '" aria-label="Merge ' + bankEsc(row.name) + ' into">' +
      bankSpendChoiceOptions(cats, id, "") + "</select></label> " +
      '<button type="button" data-bank-spend-merge="' + bankEsc(id) + '">Merge</button> ' +
      '<label>Move spending to <select data-bank-spend-dest="' + bankEsc(id) + '" aria-label="Move ' + bankEsc(row.name) + ' spending">' +
      bankSpendChoiceOptions(cats, id, "other") + "</select></label> " +
      '<label class="check"><input type="radio" name="bank-spend-keep" data-bank-spend-keep="' + bankEsc(id) + '" value="add" checked> Add it on</label>' +
      '<label class="check"><input type="radio" name="bank-spend-keep" data-bank-spend-keep="' + bankEsc(id) + '" value="drop"> Drop it</label>' +
      '<button type="button" data-bank-spend-delete="' + bankEsc(id) + '">Delete</button></details>';
  }
  var budgetOk = bankSpendParseBudget(budgetVal) != null;
  var save = isNew
    ? '<button type="button" class="act" data-bank-spend-add="1"' + (budgetOk ? "" : " disabled") + ">Save</button>"
    : '<button type="button" class="act" data-bank-spend-save="' + bankEsc(id) + '"' + (budgetOk ? "" : " disabled") + ">Save</button>";
  return '<div class="books-overlay on sheet-bottom" data-bank-cat-pop="1" data-bank-spend-sheet="1">' +
    '<div class="books-sheet" role="dialog" aria-modal="true" aria-label="' + bankEsc(title) + '">' +
    '<div class="books-head"><h2>' + bankEsc(title) + "</h2>" +
    '<button type="button" class="book-chip" data-bank-cat-close="1">Close</button></div>' +
    err +
    '<label>Name <input data-bank-spend-name="' + bankEsc(id) + '" maxlength="40" aria-label="Category name" value="' + bankEsc(nameVal) + '"></label> ' +
    '<label>Group <select data-bank-spend-tier="' + bankEsc(id) + '" aria-label="Group">' + bankSpendTierOptions(tierVal) + "</select></label> " +
    '<label>Monthly budget <input data-bank-spend-budget="' + bankEsc(id) + '" inputmode="decimal" aria-label="Monthly budget" value="' +
    bankEsc(budgetVal) + '"' + (isNew ? " autofocus" : "") + "></label> " + save + more + "</div></div>";
}

function bankSpendEditorHtml(snap, opts) {
  if (!bankCategoriesActive(snap)) return "";
  var cats = bankSpendCategories(snap) || [];
  opts = opts || {};
  var line = opts.catError && !opts.spendOpen
    ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.catError) + "</p>"
    : '<span class="hint">Tap a row to change it.</span>';
  var badge = bankUncatBadge(snap);
  var uncat = "";
  if (badge > 0) {
    var openList = "";
    if (opts.uncatOpen) {
      var rows = bankUncatItems(snap).map(function (raw) {
        var key = "";
        try { key = bankTxOpenKey(raw); } catch (e) { key = bankTxMerchantName(raw); }
        var when = bankShortDate(raw.date) || "";
        return '<li><button type="button" class="mix-leg wrap" data-bank-cat-item-open="' + bankEsc(key) + '">' +
          '<span class="mix-leg-name">' + bankEsc(bankTxMerchantName(raw) || raw.name || "Item") + "</span> " +
          '<span class="sub">' + bankEsc(when) + "</span></button></li>";
      }).join("");
      openList = rows ? '<ul class="bank-edit-list" data-bank-uncat-list="1">' + rows + "</ul>" : "";
    }
    uncat = '<li><button type="button" class="mix-leg wrap" data-bank-uncat-open="1">' +
      '<span class="mix-leg-name">Uncategorized</span> <span class="fresh-chip" data-bank-uncat-badge="' + badge + '">' + badge + "</span></button>" +
      openList + "</li>";
  }
  var add = '<li><button type="button" class="mix-leg wrap" data-bank-spend-open="new">' +
    '<span class="mix-leg-name">Add a category</span></button></li>';
  var items = bankSpendVisible(cats).map(function (row) {
    return '<li><button type="button" class="mix-leg wrap" data-bank-cat-jump="' + bankEsc(row.id) + '">' +
      '<span class="mix-leg-name">' + bankEsc(row.name) + '</span>' +
      '<span class="fresh-chip">' + bankEsc(bankTierLabel(row.tier)) + '</span>' +
      '<span class="mix-amt">' + bankEsc(bankMoney(row.budget)) + "</span></button></li>";
  }).join("");
  var list = bankCapList('<ul class="bank-edit-list">' + uncat + add + items + "</ul>", bankSpendVisible(cats).length + 1 + (badge > 0 ? 1 : 0), "Categories");
  return '<section data-bank-spend-cats="1"><h2>Categories</h2><div class="card span">' + line + list + "</div></section>" +
    bankSpendSheetHtml(snap, opts);
}

function bankSpendCatSelectHtml(snap, raw, opts) {
  var cats = bankSpendVisible(bankSpendCategories(snap) || []);
  opts = opts || {};
  var key = "";
  try { key = bankTxOverrideKey(raw) || bankTxBagKey(raw) || ""; } catch (e) { key = ""; }
  var narrow = opts.all ? "" : (opts.catNarrow && String(opts.catNarrow.key || "") === String(key || bankTxMerchantName(raw)) ? opts.catNarrow.tier : "");
  var mapped = bankMapSpendCategory(raw, snap);
  var current = mapped && mapped.id ? bankSpendResolveId(bankSpendCategories(snap), mapped.id) : "";
  var currentRow = bankSpendById(bankSpendCategories(snap), current);
  if (!opts.all && !narrow && currentRow) narrow = currentRow.tier;
  var options = "";
  var seen = false;
  cats.forEach(function (row) {
    if (narrow && row.tier !== narrow) return;
    if (row.id === current) seen = true;
    options += '<option value="' + bankEsc(row.id) + '"' + (row.id === current ? " selected" : "") + ">" + bankEsc(row.name) + "</option>";
  });
  if (!seen && !(opts.offSpend && !current)) options = '<option value="" selected>Choose</option> ' + options;
  if (opts.offSpend) {
    options = '<option value="' + bankOffSpendValue() + '"' + (!current ? " selected" : "") + ">" + bankOffSpendLabel() + "</option> " + options;
  }
  var merchant = bankSpendMerchantKey(raw);
  return '<select data-bank-tx-cat="' + bankEsc(key || merchant) + '" data-bank-tx-merchant="' + bankEsc(merchant) +
    '" aria-label="Category">' + options + "</select>";
}

function bankSpendWire(list) {
  return (list || []).map(function (row) {
    var out = {
      id: row.id,
      name: row.name,
      tier: row.tier,
      budget: typeof row.budget === "number" && isFinite(row.budget) ? row.budget : 0
    };
    if (row.merged_into) out.merged_into = row.merged_into;
    return out;
  });
}

function bankSpendListIssue(list) {
  if (!Array.isArray(list)) return "bad_category";
  if (list.length > BANK_SPEND_MAX) return "bad_category";
  var ids = {};
  var i;
  for (i = 0; i < list.length; i++) {
    var row = list[i];
    if (!row || typeof row !== "object") return "bad_category";
    if (!bankSpendIdOk(row.id)) return "bad_category_id";
    if (ids[row.id]) return "duplicate_category_id";
    ids[row.id] = true;
    if (typeof row.name !== "string" || row.name.length < 1 || row.name.length > BANK_SPEND_NAME_MAX) return "bad_category_name";
    if (row.tier !== "required" && row.tier !== "needs" && row.tier !== "wants") return "bad_category_tier";
    if (typeof row.budget !== "number" || !isFinite(row.budget) || row.budget < 0 || row.budget > BANK_SPEND_BUDGET_MAX) return "bad_category_budget";
  }
  for (i = 0; i < list.length; i++) {
    var merged = list[i].merged_into;
    if (merged == null || merged === "") continue;
    if (!ids[merged] || merged === list[i].id) return "bad_merged_into";
  }
  for (i = 0; i < list.length; i++) {
    var seen = {};
    var cur = list[i].id;
    var guard = 0;
    while (cur && guard < list.length + 2) {
      if (seen[cur]) return "merged_into_cycle";
      seen[cur] = true;
      var next = "";
      var j;
      for (j = 0; j < list.length; j++) if (list[j].id === cur) next = list[j].merged_into || "";
      if (!next) break;
      cur = next;
      guard += 1;
    }
  }
  return "";
}

function bankSpendRefIssue(list, rulesPatch, txPatch) {
  var ids = {};
  (list || []).forEach(function (row) { if (row && row.id) ids[row.id] = true; });
  function check(bag, tx) {
    if (!bag) return "";
    var keys = Object.keys(bag);
    var i;
    for (i = 0; i < keys.length; i++) {
      var value = bag[keys[i]];
      if (value == null) continue;
      if (tx && !bankTxOverrideKeyOk(keys[i])) return "bad_category_ref";
      if (typeof value !== "string" || !ids[value]) return "unknown_category";
    }
    return "";
  }
  return check(rulesPatch, false) || check(txPatch, true);
}

function bankSpendRuleCount(doc, rulesPatch, txPatch) {
  var rules = doc && doc.rules && typeof doc.rules === "object" && !Array.isArray(doc.rules) ? doc.rules : {};
  var catRules = {};
  var tx = {};
  var baseRules = doc && doc.category_rules && typeof doc.category_rules === "object" ? doc.category_rules : {};
  var baseTx = doc && doc.category_tx && typeof doc.category_tx === "object" ? doc.category_tx : {};
  Object.keys(baseRules).forEach(function (k) { if (baseRules[k] != null) catRules[k] = baseRules[k]; });
  Object.keys(baseTx).forEach(function (k) { if (baseTx[k] != null) tx[k] = baseTx[k]; });
  function apply(bag, patch) {
    if (!patch) return;
    Object.keys(patch).forEach(function (k) {
      if (patch[k] == null) delete bag[k];
      else bag[k] = patch[k];
    });
  }
  apply(catRules, rulesPatch);
  apply(tx, txPatch);
  return Object.keys(rules).length + Object.keys(catRules).length + Object.keys(tx).length;
}

function bankSpendParseBudget(raw) {
  if (typeof raw === "number") {
    if (!isFinite(raw) || raw < 0 || raw > BANK_SPEND_BUDGET_MAX) return null;
    return raw;
  }
  if (typeof raw !== "string") return null;
  var text = raw.trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  var n = Number(text);
  if (!isFinite(n) || n < 0 || n > BANK_SPEND_BUDGET_MAX) return null;
  return n;
}

function bankSpendSlug(name, cats) {
  var slug = String(name || "").trim().toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug || !/^[a-z0-9]/.test(slug)) slug = slug ? ("c-" + slug) : "category";
  if (slug.length > 40) slug = slug.slice(0, 40).replace(/-+$/, "");
  var id = slug || "category";
  var n = 2;
  while (bankSpendById(cats, id) && n < 100) {
    var suffix = "-" + n;
    id = (slug.slice(0, 40 - suffix.length) + suffix).replace(/^-+/, "c");
    n += 1;
  }
  return bankSpendIdOk(id) ? id : "";
}

function bankSpendClone(list) {
  return (list || []).map(function (row) {
    return { id: row.id, name: row.name, tier: row.tier, budget: row.budget, merged_into: row.merged_into || "" };
  });
}

function bankSpendUndoSnap(doc) {
  doc = doc || {};
  var rules = {};
  var tx = {};
  var catRules = doc.category_rules && typeof doc.category_rules === "object" ? doc.category_rules : {};
  var catTx = doc.category_tx && typeof doc.category_tx === "object" ? doc.category_tx : {};
  Object.keys(catRules).forEach(function (k) { if (catRules[k] != null) rules[k] = catRules[k]; });
  Object.keys(catTx).forEach(function (k) { if (catTx[k] != null) tx[k] = catTx[k]; });
  return {
    categories: bankSpendClone(bankSpendCategories({ tier_doc: doc }) || []),
    category_rules: rules,
    category_tx: tx
  };
}

function bankSpendDiffMap(prev, current) {
  prev = prev || {};
  current = current || {};
  var seen = {};
  Object.keys(prev).forEach(function (k) { seen[k] = true; });
  Object.keys(current).forEach(function (k) { seen[k] = true; });
  var patch = {};
  Object.keys(seen).forEach(function (k) {
    var hasPrev = Object.prototype.hasOwnProperty.call(prev, k);
    var hasNow = Object.prototype.hasOwnProperty.call(current, k);
    var before = hasPrev ? prev[k] : undefined;
    var after = hasNow ? current[k] : undefined;
    if (before === after) return;
    patch[k] = before === undefined ? null : before;
  });
  return patch;
}

function bankSpendApply(snap, body) {
  if (!snap || typeof snap !== "object") return;
  if (!snap.tier_doc || typeof snap.tier_doc !== "object" || Array.isArray(snap.tier_doc)) snap.tier_doc = { plans: {}, rules: {} };
  if (body && Array.isArray(body.categories)) snap.tier_doc.categories = body.categories;
  function merge(field, patch) {
    if (!patch) return;
    if (!snap.tier_doc[field] || typeof snap.tier_doc[field] !== "object" || Array.isArray(snap.tier_doc[field])) snap.tier_doc[field] = {};
    Object.keys(patch).forEach(function (k) {
      if (patch[k] == null) delete snap.tier_doc[field][k];
      else snap.tier_doc[field][k] = patch[k];
    });
  }
  merge("category_rules", body && body.category_rules);
  merge("category_tx", body && body.category_tx);
}

function bankSpendFail(root, code, draft) {
  if (!root || !root._bank) return Promise.resolve(false);
  root._bank.catError = bankSpendErrorLine(code);
  if (draft) root._bank.catDraft = draft;
  if (typeof bankPaint === "function") bankPaint(root);
  return Promise.resolve(false);
}

function bankSpendCommit(root, nextList, rulesPatch, txPatch) {
  if (!root || !root._bank) return Promise.resolve(false);
  var snap = root._bank.data || {};
  var doc = bankCategoryDoc(snap) || snap.tier_doc || { rules: {}, category_rules: {}, category_tx: {} };
  var list = nextList || bankSpendClone(bankSpendCategories(snap) || []);
  var wire = bankSpendWire(list);
  var issue = bankSpendListIssue(wire);
  if (issue) return bankSpendFail(root, issue, root._bank.catDraft);
  var ref = bankSpendRefIssue(wire, rulesPatch, txPatch);
  if (ref) return bankSpendFail(root, ref, root._bank.catDraft);
  if (bankSpendRuleCount(doc, rulesPatch, txPatch) > BANK_SPEND_RULE_CAP) return bankSpendFail(root, "too_many_rules", root._bank.catDraft);
  var body = { categories: wire };
  if (rulesPatch && Object.keys(rulesPatch).length) body.category_rules = rulesPatch;
  if (txPatch && Object.keys(txPatch).length) body.category_tx = txPatch;
  var undo = bankSpendUndoSnap(doc);
  var posted = JSON.stringify(body);
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: posted
  })).then(function (res) {
    if (!root._bank) return false;
    var status = res && Number(res.status);
    function finish(err) {
      bankSpendApply(root._bank.data || snap, body);
      root._bank.catUndo = undo;
      root._bank.catError = err || "";
      if (!err) {
        root._bank.catDraft = null;
        root._bank.spendOpen = "";
        root._bank.txOpen = "";
      }
      if (typeof bankPaint === "function") bankPaint(root);
      return !err;
    }
    if (status === 400) {
      return bankReadJson(res).then(function (payload) {
        return finish(bankSpendErrorLine(bankSpendErrorCode(payload)));
      });
    }
    var failed = !res || res.ok !== true || res.type === "opaqueredirect";
    if (failed) return finish("That change did not save. It is still on this screen.");
    return finish("");
  }).catch(function () {
    if (!root._bank) return false;
    bankSpendApply(root._bank.data || snap, body);
    root._bank.catUndo = undo;
    root._bank.catError = "That change did not save. It is still on this screen.";
    if (typeof bankPaint === "function") bankPaint(root);
    return false;
  });
}

function bankSpendSaveBudget(root, id, raw) {
  if (!root || !root._bank) return Promise.resolve(false);
  var amount = bankSpendParseBudget(raw);
  if (amount == null) {
    return bankSpendFail(root, "bad_category_budget", { id: id, budget: raw == null ? "" : String(raw) });
  }
  var list = bankSpendClone(bankSpendCategories(root._bank.data) || []);
  var row = bankSpendById(list, id);
  if (!row) return bankSpendFail(root, "unknown_category");
  row.budget = amount;
  root._bank.catDraft = null;
  return bankSpendCommit(root, list, null, null);
}

function bankSpendSaveRow(root, id, name, tier, rawBudget) {
  if (!root || !root._bank) return Promise.resolve(false);
  var list = bankSpendClone(bankSpendCategories(root._bank.data) || []);
  var row = bankSpendById(list, id);
  if (!row) return bankSpendFail(root, "unknown_category");
  var nextName = String(name == null ? "" : name).trim();
  var nextTier = tier === "required" || tier === "needs" || tier === "wants" ? tier : "";
  var amount = bankSpendParseBudget(rawBudget);
  root._bank.catDraft = { id: id, name: name == null ? "" : String(name), tier: tier, budget: rawBudget == null ? "" : String(rawBudget) };
  if (!nextName || nextName.length > BANK_SPEND_NAME_MAX) return bankSpendFail(root, "bad_category_name", root._bank.catDraft);
  if (!nextTier) return bankSpendFail(root, "bad_category_tier", root._bank.catDraft);
  if (amount == null) return bankSpendFail(root, "bad_category_budget", root._bank.catDraft);
  row.name = nextName;
  row.tier = nextTier;
  row.budget = amount;
  return bankSpendCommit(root, list, null, null);
}

function bankSpendAdd(root, name, tier, rawBudget) {
  if (!root || !root._bank) return Promise.resolve(false);
  var list = bankSpendClone(bankSpendCategories(root._bank.data) || []);
  if (list.length >= BANK_SPEND_MAX) return bankSpendFail(root, "bad_category", { id: "new", name: name == null ? "" : String(name) });
  var nextName = String(name == null ? "" : name).trim();
  var nextTier = tier === "required" || tier === "needs" || tier === "wants" ? tier : "needs";
  var amount = bankSpendParseBudget(rawBudget);
  root._bank.catDraft = { id: "new", name: name == null ? "" : String(name), tier: nextTier, budget: rawBudget == null ? "" : String(rawBudget) };
  if (!nextName || nextName.length > BANK_SPEND_NAME_MAX) return bankSpendFail(root, "bad_category_name", root._bank.catDraft);
  if (amount == null) return bankSpendFail(root, "bad_category_budget", root._bank.catDraft);
  var id = bankSpendSlug(nextName, list);
  if (!id) return bankSpendFail(root, "bad_category_id", root._bank.catDraft);
  list.push({ id: id, name: nextName, tier: nextTier, budget: amount, merged_into: "" });
  return bankSpendCommit(root, list, null, null);
}

function bankSpendRepoint(doc, fromId, toId) {
  var rules = {};
  var tx = {};
  var catRules = doc && doc.category_rules && typeof doc.category_rules === "object" ? doc.category_rules : {};
  var catTx = doc && doc.category_tx && typeof doc.category_tx === "object" ? doc.category_tx : {};
  Object.keys(catRules).forEach(function (k) {
    if (String(catRules[k]) === fromId) rules[k] = toId;
  });
  Object.keys(catTx).forEach(function (k) {
    if (String(catTx[k]) === fromId) tx[k] = toId;
  });
  return { rules: rules, tx: tx };
}

function bankSpendMerge(root, fromId, toId) {
  if (!root || !root._bank) return Promise.resolve(false);
  var list = bankSpendClone(bankSpendCategories(root._bank.data) || []);
  var source = bankSpendById(list, fromId);
  var target = bankSpendById(list, toId);
  if (!source || !target || source.id === target.id) return bankSpendFail(root, "bad_merged_into");
  source.merged_into = target.id;
  list.forEach(function (row) {
    if (row && row.merged_into === source.id) row.merged_into = target.id;
  });
  var moved = bankSpendRepoint(bankCategoryDoc(root._bank.data), source.id, target.id);
  return bankSpendCommit(root, list, moved.rules, moved.tx);
}

function bankSpendDelete(root, id, destId, keep) {
  if (!root || !root._bank) return Promise.resolve(false);
  var list = bankSpendClone(bankSpendCategories(root._bank.data) || []);
  var source = bankSpendById(list, id);
  var dest = bankSpendById(list, destId);
  if (!source || !dest || source.id === dest.id) return bankSpendFail(root, "bad_merged_into");
  if (keep === "add") {
    var sum = bankRoundCents((dest.budget || 0) + (source.budget || 0));
    dest.budget = sum > BANK_SPEND_BUDGET_MAX ? BANK_SPEND_BUDGET_MAX : sum;
  }
  list.forEach(function (row) {
    if (row && row.merged_into === source.id) row.merged_into = dest.id;
  });
  var next = list.filter(function (row) { return row.id !== source.id; });
  var moved = bankSpendRepoint(bankCategoryDoc(root._bank.data), source.id, dest.id);
  return bankSpendCommit(root, next, moved.rules, moved.tx);
}

function bankSpendSaveRule(root, merchant, catId) {
  if (!root || !root._bank) return Promise.resolve(false);
  var key = String(merchant || "").trim();
  if (!key) return bankSpendFail(root, "bad_category_ref");
  if (catId != null && !bankSpendById(bankSpendCategories(root._bank.data), catId)) return bankSpendFail(root, "unknown_category");
  var patch = {};
  patch[key] = catId == null ? null : catId;
  return bankSpendCommit(root, null, patch, null);
}

function bankSpendSaveTx(root, rawKey, catId) {
  if (!root || !root._bank) return Promise.resolve(false);
  if (catId != null && !bankSpendById(bankSpendCategories(root._bank.data), catId)) return bankSpendFail(root, "unknown_category");
  return bankTxOverrideHash(rawKey).then(function (clean) {
    if (!root._bank) return false;
    if (!bankTxOverrideKeyOk(clean)) return bankSpendFail(root, "bad_category_ref");
    var patch = {};
    patch[clean] = catId == null ? null : catId;
    return bankSpendCommit(root, null, null, patch);
  });
}

function bankSpendUndo(root) {
  if (!root || !root._bank || !root._bank.catUndo) return Promise.resolve(false);
  var prev = root._bank.catUndo;
  var doc = bankCategoryDoc(root._bank.data) || {};
  var rulesPatch = bankSpendDiffMap(prev.category_rules, doc.category_rules || {});
  var txPatch = bankSpendDiffMap(prev.category_tx, doc.category_tx || {});
  return bankSpendCommit(root, bankSpendClone(prev.categories), rulesPatch, txPatch);
}

function bankSpendField(root, selector) {
  if (!root || !root.querySelector) return null;
  return root.querySelector(selector);
}

function bankSpendRead(el) {
  if (!el) return "";
  return el.value == null ? "" : String(el.value);
}

function bankTierSummaryHtml(snap, opts, mode, month, view, actuals, missing, shot) {
  if (bankCategoriesActive(snap)) {
    var catHtml = bankCategorySummaryHtml(snap, opts, mode, month);
    if (catHtml) return catHtml;
  }
  if (mode === "historical" && missing) {
    return '<section class="bank-tier-summary"><h2>Tier summary</h2><div class="card span"><p class="bank-empty">No saved budget for this month.</p></div></section>';
  }
  var groups = { required: [], needs: [], wants: [] };
  try { groups = bankAlignTierGroups(bankCollectTierRows(view || snap, month, opts && opts.edits, false) || groups, snap, month); } catch (e2) {}
  var edits = opts && opts.edits;
  var today = bankScreenToday(view || snap, opts || {});
  var todayIso = today ? bankDateKey(today.year, today.month, today.day) : "";
  var lines = bankTierLineRows(groups, {
    today: todayIso,
    mode: mode === "historical" ? "historical" : (mode || "plan"),
    month: month,
    edits: edits
  });
  var body = ["required", "needs", "wants"].map(function (key) {
    var items = lines[key] || [];
    items.forEach(function (r) {
      r._tierPlan = bankNum(r.amount);
      r._tierSpent = bankTierLineSpent(snap, r, month, mode, edits, todayIso);
    });
    var plan = 0;
    var spent = 0;
    var any = false;
    items.forEach(function (r) {
      if (!(r._tierPlan > 0)) return;
      any = true;
      plan += r._tierPlan;
      spent += r._tierSpent || 0;
    });
    plan = any ? bankRoundCents(plan) : null;
    spent = any ? bankRoundCents(spent) : null;
    var s = bankNum(spent);
    var p = bankNum(plan);
    var neg = s != null && p != null && p - s < -0.0001;
    var leftSpan = '<span class="mix-amt' + (neg ? " tone-stop" : "") + '"> ' + bankEsc(bankTierLeftText(spent, plan, mode === "historical")) + "</span>";
    var attrs = ' data-tier="' + key + '"';
    if (p != null) attrs += ' data-plan="' + p + '"';
    if (s != null) attrs += ' data-spent="' + s + '"';
    var head = bankVsRowHtml(bankTierLabel(key), spent, plan, attrs, leftSpan);
    var rows = items.map(function (r) {
      var over = r._tierPlan != null && r._tierSpent - r._tierPlan > 0.004;
      var extra = "";
      if (over) {
        extra = '<span class="mix-amt tone-stop"> ' + bankEsc("Over " + bankMoney(bankRoundCents(r._tierSpent - r._tierPlan))) + "</span>";
      }
      return bankVsRowHtml(r.name, r._tierSpent, r._tierPlan, ' data-bar="' + bankEsc(r.key || r.name) + '"', extra);
    }).join("");
    var nest = rows ? '<div class="mix-legend nest">' + rows + "</div>" : "";
    return head + nest;
  }).join("");
  return '<section class="bank-tier-summary"><h2>Tier summary</h2><div class="card span"><div class="mix-legend">' +
    body + "</div></div></section>";
}

function bankHistBalanceTiles(snap, month) {
  var key = bankMonthKey(month);
  var found = null;
  bankMonths(snap).forEach(function (m) {
    if (!m || String(m.month) !== key) return;
    if (m.end_balances && typeof m.end_balances === "object" && !Array.isArray(m.end_balances)) found = m.end_balances;
  });
  if (!found) return "";
  var accounts = bankAccounts(snap);
  var tiles = [];
  accounts.forEach(function (acct) {
    if (!acct) return;
    var raw = Object.prototype.hasOwnProperty.call(found, acct.id) ? found[acct.id] : null;
    var n = bankNum(raw);
    if (n == null) return;
    var mask = acct.suffix || acct.last4 || "";
    tiles.push({
      name: acct.name || acct.id,
      mask: mask ? "\u00b7\u00b7" + String(mask).slice(-4) : "",
      balance: n,
      missing: false
    });
  });
  if (!tiles.length) return "";
  return bankTilesHtml(tiles, null, { hideTotal: true });
}

function bankLiveAccountTiles(snap) {
  var tiles = bankPairBalances(bankAccounts(snap), (snap.current && snap.current.balances) || []);
  if (!tiles.length) return "";
  return bankTilesHtml(tiles, null, { hideTotal: true });
}

function bankMoreDetailsHtml(snap, opts, mode, month, view, actuals, missing) {
  opts = opts || {};
  var bits = [];
  if (mode === "historical") {
    var histTiles = bankHistBalanceTiles(snap, month);
    if (histTiles) bits.push(bankMixMore("By account", histTiles));
  } else {
    var blocks = bankFundingAccountBlocks(snap, { monthKey: bankMonthKey(month), now: opts.now });
    var liveTiles = mode === "plan" ? "" : bankLiveAccountTiles(snap);
    var byBody = (liveTiles || "") + (blocks || "");
    if (byBody) bits.push(bankMixMore("By account", byBody));
  }
  if (mode === "plan") {
    var budget = (snap && snap.budget) || {};
    var insights = bankNormalizeInsights(budget);
    if (insights.length) {
      bits.push('<section class="bank-insight-block"><h2>Insights</h2><ul class="bank-insights">' +
        insights.map(function (row) {
          var cls = "bank-insight" + (row.severity ? " sev-" + row.severity : "");
          return '<li class="' + cls + '">' + bankEsc(bankInsightText(row)) + "</li>";
        }).join("") + "</ul></section>");
    }
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

function bankMonthToDateCard(snap, opts, month) {
  var flow = bankMonthFlow(snap, month) || {};
  var income = bankMtdIncome(snap, month);
  var line = "Posted so far · Received " + bankMoney(income) + " · In " + bankMoney(flow.inSum) + " · Out " + bankMoney(flow.outSum);
  var recent = bankRecent(snap, month);
  var table = '<p class="bank-empty">No recent activity in this print.</p>';
  if (recent.length) {
    table = '<table class="book bank-tape"><tbody>' + recent.map(function (r) {
      var label = bankItemLabel(r.desc);
      var cat = r.category || "Other";
      return "<tr><td>" + bankEsc(r.date) + '</td><td><div class="bank-tx-main"><span class="bank-merchant">' +
        bankEsc(label) + '</span> <span class="fresh-chip">' + bankEsc(cat) + "</span></div></td><td class=\"num\">" +
        bankMoney(r.amount) + "</td></tr>";
    }).join("") + "</tbody></table>";
    table = bankCapList(table, recent.length, "Recent activity");
  }
  var recentHtml = '<details class="fills-more"><summary><span class="fills-sum">Recent activity</span> ' +
    '<span class="fills-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
    '<span class="fills-dot">\u00b7 </span><span class="fills-lab-show">Show</span> <span class="fills-lab-hide">Hide</span></span></summary>' +
    table + "</details>";
  return '<section class="bank-mtd-card"><h2>Month to date</h2><div class="card span"><p class="hint">' + bankEsc(line) +
    "</p>" + recentHtml + "</div></section>";
}

function bankHeroAsof(asof) {
  var t = bankParseTime(asof);
  if (t == null) return "";
  try {
    var text = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(t));
    return "as of " + text;
  } catch (e) {
    return "";
  }
}

function bankHeroRawRows(budget) {
  var raw = budget && budget.account_funding;
  var list = [];
  if (Array.isArray(raw)) list = raw.slice();
  else if (raw && typeof raw === "object") {
    Object.keys(raw).forEach(function (k) {
      var row = raw[k];
      if (row && typeof row === "object" && !Array.isArray(row)) list.push(row);
    });
  }
  return list;
}

function bankHeroExplicit(raws, acct) {
  var last = String(acct && acct.last4 || "");
  var found = null;
  (raws || []).forEach(function (row) {
    if (found || !row) return;
    var rowLast = String(bankPickField(row, ["last4", "last_4", "mask"]) || "").replace(/\D/g, "");
    if (rowLast.length > 4) rowLast = rowLast.slice(-4);
    var rowNick = String(bankPickField(row, ["nickname", "name", "label"]) || "").trim();
    var sameLast = last && rowLast && last === rowLast;
    var sameNick = acct.nickname && rowNick && bankTierKey(acct.nickname) === bankTierKey(rowNick);
    if (!sameLast && !sameNick) return;
    var n = bankNum(bankPickField(row, ["current_balance", "latest_balance", "balance", "running_balance"]));
    var asof = row.current_balance_asof == null || row.current_balance_asof === "" ? "" : String(row.current_balance_asof);
    if (n == null && !asof) return;
    found = { balance: n, asof: asof };
  });
  return found;
}

function bankHeroWhen(rows, snap) {
  var best = null;
  var raw = "";
  (rows || []).forEach(function (row) {
    if (!row || !row.asof) return;
    var t = bankParseTime(row.asof);
    if (t == null) return;
    if (best == null || t < best) {
      best = t;
      raw = row.asof;
    }
  });
  if (raw) return bankHeroAsof(raw);
  return bankHeroAsof(snap && snap.asof);
}

function bankHeroRows(snap, opts) {
  opts = opts || {};
  var budget = (snap && snap.budget) || {};
  var monthKey = bankMonthKey(opts.month || bankScreenMonth(snap, opts));
  var books = bankCombinedBooks(snap, { monthKey: monthKey, now: opts.now });
  var raws = bankHeroRawRows(budget);
  var today = "";
  if (opts.now) {
    var et = bankEtYmd(opts.now);
    if (et) today = bankDateKey(et.year, et.month, et.day);
  }
  if (!today) today = bankTodayIso(snap, opts);
  var out = [];
  (books.accounts || []).forEach(function (acct) {
    if (!acct) return;
    var nick = String(acct.nickname || "").trim();
    if (/overdraft/i.test(nick)) return;
    var explicit = bankHeroExplicit(raws, acct);
    var amount = explicit && explicit.balance != null ? explicit.balance : bankFundingBalanceOn(acct, today);
    if (amount == null) amount = acct.start;
    var mask = bankAccountMask(acct.last4);
    var label = nick && mask ? nick + " " + mask : (mask || nick || "Account");
    out.push({
      label: label,
      balance: amount == null ? null : bankRoundCents(amount),
      asof: explicit && explicit.asof ? explicit.asof : "",
      source: explicit && explicit.balance != null ? "field" : "derived"
    });
  });
  return out;
}

function bankHeroNow(snap, opts) {
  var rows = bankHeroRows(snap, opts || {});
  var now = 0;
  var anyNow = false;
  rows.forEach(function (row) {
    if (!row || row.balance == null) return;
    now += row.balance;
    anyNow = true;
  });
  now = anyNow ? bankRoundCents(now) : null;
  var combined = bankNum(snap && snap.budget && snap.budget.account_funding_combined);
  if (combined != null) now = bankRoundCents(combined);
  return now;
}

function bankAllocMoveTotal(snap, opts) {
  var total = 0;
  try {
    (bankAllocate(snap, opts).moves || []).forEach(function (mv) {
      if (mv && mv.amount > 0) total += mv.amount;
    });
  } catch (e) { total = 0; }
  return bankRoundCents(total);
}

function bankHeroHtml(snap, opts, flows) {
  opts = opts || {};
  flows = flows || {};
  var rows = bankHeroRows(snap, opts);
  var now = bankHeroNow(snap, opts);
  var end = flows.left == null ? null : bankRoundCents(flows.left);
  var stillOut = bankRoundCents(flows.remainOut || 0);
  var stillIn = bankRoundCents(flows.remainIn || 0);
  var billsN = flows.billsRemain == null ? stillOut : bankRoundCents(flows.billsRemain);
  var asideN = bankRoundCents(flows.setAside || 0);
  var paid = bankRoundCents(flows.paid != null ? flows.paid : (flows.postedOut || 0));
  var plan = bankRoundCents(flows.plan != null ? flows.plan : (paid + stillOut));
  var asof = bankHeroWhen(rows, snap);
  var nowCls = now != null && now < -0.004 ? "tone-stop" : "";
  var endCls = end != null && end < -0.004 ? "tone-stop" : "";
  var outFlow = stillOut > 0.004 ? bankFundSigned(stillOut, "out") : { text: bankMoney(0), cls: "" };
  var inFlow = stillIn > 0.004 ? bankFundSigned(stillIn, "in") : { text: bankMoney(0), cls: "" };
  function fig(label, text, cls, attr) {
    return "<div><span>" + bankEsc(label) + '</span> <b class="' + bankEsc(cls || "") + '"' + attr + ">" + bankEsc(text) + "</b></div>";
  }
  var accounts = rows.map(function (row) {
    var neg = row.balance != null && row.balance < -0.004;
    return '<tr data-bank-hero-acct="1" data-balance="' + (row.balance == null ? "" : String(row.balance)) +
      '"><td><span class="sym">' + bankEsc(row.label) + '</span></td><td class="num' + (neg ? " tone-stop" : "") + '">' +
      bankEsc(bankMoney(row.balance)) + "</td></tr>";
  }).join("");
  var split = "Bills " + bankMoney(billsN) + " + Needs/Wants left " + bankMoney(asideN);
  var list = accounts
    ? '<table class="book" data-bank-hero-accounts="1"><tbody>' + accounts + "</tbody></table>"
    : "";
  var over = paid - plan > 0.004;
  var bar = "";
  if (plan > 0.004 || paid > 0.004) bar = bankSpendBarHtml(Math.min(paid, plan > 0 ? plan : paid), plan > 0 ? plan : paid);
  var barLabel = over
    ? '<span class="tone-stop" data-bank-hero-bar="1" data-bank-hero-paid="' + paid + '" data-bank-hero-plan="' + plan + '">Over by ' + bankEsc(bankMoney(bankRoundCents(paid - plan))) + "</span>"
    : '<span data-bank-hero-bar="1" data-bank-hero-paid="' + paid + '" data-bank-hero-plan="' + plan + '">Paid ' + bankEsc(bankMoney(paid)) + " of " + bankEsc(bankMoney(plan)) + " planned</span>";
  var monthKey = bankMonthKey(opts.month || bankScreenMonth(snap, opts));
  var pill = "";
  try { pill = bankChargedPillHtml(snap); } catch (ePill) { pill = ""; }
  var warnN = bankUncatMonthCount(snap, monthKey);
  var warn = warnN > 0
    ? '<p class="hint" data-bank-uncat-warn="' + warnN + '"><button type="button" class="book-chip" data-bank-tab="edits" data-bank-uncat-open="1">' +
      warnN + (warnN === 1 ? " item needs a category" : " items need a category") + "</button></p>"
    : "";
  var allocTotal = bankAllocMoveTotal(snap, opts);
  if (!rows.length && flows.left == null) {
    if (!pill && !warn) return "";
    return '<section data-bank-hero="1" data-bank-alloc-total="' + allocTotal + '">' + (pill ? '<div class="card span">' + pill + "</div>" : "") + warn + "</section>";
  }
  return '<section data-bank-hero="1" data-bank-alloc-total="' + allocTotal + '"><div class="card span">' + pill +
    '<div class="overall-strip">' +
    '<div class="ov-hero"><span>In the bank now</span> <b data-bank-hero-now="' + (now == null ? "" : String(now)) + '" class="' + nowCls + '">' +
    bankEsc(bankMoney(now)) + "</b></div></div>" +
    list +
    (asof ? '<p class="hint">' + bankEsc(asof) + "</p>" : "") +
    '<div class="kpi" data-bank-hero-figs="1" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    fig("To pay & set aside", outFlow.text, outFlow.cls, ' data-bank-hero-out="' + stillOut + '"') +
    fig("Coming in", inFlow.text, inFlow.cls, ' data-bank-hero-in="' + stillIn + '"') +
    fig("Month-end", bankMoney(end), endCls, ' data-bank-hero-end="' + (end == null ? "" : String(end)) + '"') +
    "</div>" + bar +
    '<p class="hint help-pair">' + barLabel + ' <span class="help-extra" data-bank-hero-split="1">' + bankEsc(split) + "</span></p>" +
    warn + "</div></section>";
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
  var flows = {};
  var fundOpts = { monthKey: monthKey, now: opts.now, past: past, monthTitle: "Account funding", hideMoves: past, flows: flows };
  var ledgerOpts = Object.assign({}, opts, { listTitle: listTitle, past: past, flows: flows });
  var ledger = bankRenderDueList(planView, ledgerOpts, mode, month, missing);
  var incomeOpts = Object.assign({}, opts, { edits: past ? null : opts.edits });
  var parts = [];
  if (mode !== "historical") {
    var hero = mode === "plan" ? bankHeroHtml(snap, Object.assign({}, opts, { month: month }), flows) : "";
    parts.push(bankPart("next", mode, (hero || "") + bankRenderNextPay(snap, opts, mode)));
  }
  parts.push(bankPart("calendar", mode, bankRenderCalendar(planView, opts, mode, month, missing)));
  parts.push(bankPart("funding", mode, bankFundingHtml(past ? planView : snap, fundOpts, ledger)));
  if (mode === "plan") parts.push(bankPart("mtd", mode, bankMonthToDateCard(snap, opts, month)));
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
  if (key && !bankMonthInProgress(snap, key) && keys.indexOf(key) < 0) keys.push(key);
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
  if (!b) return "";
  var cancel = b.cancel_key == null ? "" : String(b.cancel_key).trim();
  if (cancel) return cancel;
  var sub = b.sub_id == null ? "" : String(b.sub_id).trim();
  if (sub) return sub;
  if (b.bill_id) return String(b.bill_id).trim();
  return bankBillKey(b.name);
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

function bankNextDueIso(row, today) {
  var todayIso = "";
  if (today && typeof today === "object" && today.year) todayIso = bankDateKey(today.year, today.month, today.day);
  else todayIso = String(today || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(todayIso)) todayIso = "";
  var month = todayIso ? { year: Number(todayIso.slice(0, 4)), month: Number(todayIso.slice(5, 7)) } : null;
  var days = [];
  try { days = bankBillDueDays(row, month); } catch (e) { days = []; }
  if (!days.length && row && row.typical_day != null) {
    var one = bankDay(row.typical_day);
    if (one != null) days = [one];
  }
  return bankSortNextDay(days, todayIso, month);
}

function bankSortByNextDue(rows, today) {
  var list = (rows || []).slice();
  list.sort(function (a, b) {
    var da = bankNextDueIso(a, today);
    var db = bankNextDueIso(b, today);
    if (!da !== !db) return da ? -1 : 1;
    if (da && db && da !== db) return da < db ? -1 : 1;
    var an = String(bankBillDisplayName(a && a.name, a && a.display_label) || "");
    var bn = String(bankBillDisplayName(b && b.name, b && b.display_label) || "");
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  return list;
}

function bankEditBillHtml(bills, ym, edits, confirm, snap, opts) {
  var today = bankTodayIso(snap, opts || {});
  var active = bankSortByNextDue((bills || []).filter(function (b) { return b && !isCancelled(b, ym); }), today);
  if (!active.length) return '<p class="bank-empty">No bills in this print.</p>';
  var items = active.map(function (b) {
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
    var tierPick = bankCategoriesActive(snap)
      ? bankSpendItemCatHtml(snap, b, label)
      : '<select class="bank-chip" data-bank-kind="' + bankEsc(b.name) + '" aria-label="Tier for ' +
        bankEsc(label) + '">' + bankKindOptions(tier) + "</select>";
    var control = bankBillControlKey(b);
    var openAttr = (!bankBillRetired(b, ym) || isCancelled(b, ym)) && control
      ? ' data-bank-cancel-open="1" data-bank-cancel="' + bankEsc(control) + '"'
      : "";
    return "<li" + flag + "><details class=\"fills-more\"" + openAttr + "><summary><span class=\"fills-sum\"><span class=\"bank-merchant\">" + bankEsc(label) +
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

function bankCancelledListHtml(snap, ym, edits, confirm, opts) {
  opts = opts || {};
  var bills = [];
  var subs = [];
  try { bills = bankPreparedBills(snap, undefined).filter(function (row) { return row && isCancelled(row, ym); }); } catch (e) { bills = []; }
  try { subs = bankPreparedSubs(snap).filter(function (row) { return row && isCancelled(row, ym); }); } catch (e2) { subs = []; }
  if (!bills.length && !subs.length) return "";
  var billHtml = bills.map(function (b) {
    return bankCancelledItemHtml(snap, b, ym, edits, confirm);
  }).join("");
  var subHtml = subs.map(function (s) {
    return bankCancelledItemHtml(snap, s, ym, edits, confirm);
  }).join("");
  var open = opts.reviewCancel ? " open" : "";
  return '<details data-bank-cancelled="1"' + open + '><summary>Cancelled</summary><ul class="bank-edit-list">' +
    billHtml + subHtml + "</ul></details>";
}

function bankCancelledItemHtml(snap, row, ym, edits, confirm) {
  var key = bankBillControlKey(row);
  var label = bankBillDisplayName(row.name, row.display_label);
  var amount = null;
  try { amount = row.sub_id ? bankNum(row.amount) : bankBillLineAmount(row, ym, edits); } catch (e) { amount = bankNum(row.amount); }
  var flag = "";
  try { if (bankItemChargedAfter(snap, row)) flag = " " + bankChargedFlagHtml(); } catch (e2) { flag = ""; }
  var paidCap = "";
  try { paidCap = bankBillPaidCaption(row, ym); } catch (e3) { paidCap = ""; }
  var dayText = row.typical_day != null ? ("day " + row.typical_day) : "";
  return "<li><details class=\"fills-more\" data-bank-cancel-open=\"1\" data-bank-cancel=\"" + bankEsc(key) + "\"><summary><span class=\"fills-sum\"><span class=\"bank-merchant\">" +
    bankEsc(label) + "</span></span> " + (dayText ? '<span class="sub">' + bankEsc(dayText) + "</span> " : "") +
    "<b>" + bankEsc(bankBillAmount(amount)) + "</b>" +
    (paidCap ? ' <span class="sub">' + bankMetaHtml(paidCap) + "</span>" : "") + flag +
    ' <span class="fills-affordance"><i class="cf-chev" aria-hidden="true"></i>' +
    '<span class="fills-lab-show">Show</span> <span class="fills-lab-hide">Hide</span></span></summary>' +
    '<div class="bank-edit-side">' + bankBillStatusControls(row, ym, confirm) + "</div></details></li>";
}

function bankEditSubSection(snap, ym, opts) {
  var subs = [];
  try { subs = bankPreparedSubs(snap); } catch (e) { subs = []; }
  subs = subs.filter(function (s) { return s && !isCancelled(s, ym); });
  subs = bankSortByNextDue(subs, bankTodayIso(snap, opts || {}));
  if (!subs.length) return "";
  var items = subs.map(function (s) {
    var key = bankBillControlKey(s);
    var label = bankBillDisplayName(s.name);
    var flag = "";
    try { if (bankItemChargedAfter(snap, s)) flag = " " + bankChargedFlagHtml(); } catch (e2) { flag = ""; }
    return '<li><button type="button" class="mix-leg wrap" data-bank-cancel-open="1" data-bank-cancel="' + bankEsc(key) + '">' +
      '<span class="mix-leg-name">' + bankEsc(label) + '</span> <span class="mix-amt">' + bankMoney(s.amount) + "</span>" + flag + "</button></li>";
  }).join("");
  return '<section class="bank-edit-block"><h2>Subscriptions</h2><div class="card span"><ul class="bank-edit-list">' + items + "</ul></div></section>";
}

function bankCancelAppearance(snap, row) {
  var hits = [];
  try { hits = bankMatchHits(row); } catch (e) { hits = []; }
  if (!hits.length) {
    try { hits = bankTxFallbackHits(snap, row); } catch (e2) { hits = []; }
  }
  var hit = hits[0] || {};
  var desc = String(hit.description || (row && (row.bank_match && row.bank_match.descriptors && row.bank_match.descriptors[0]) || "") || "");
  var when = bankShortDate(hit.date) || "";
  var paidAmt = bankNum(hit.amount);
  var amt = paidAmt == null ? "" : bankMoney(Math.abs(paidAmt));
  var last = "";
  try { last = bankAccountMask(hit.account_last4 || ""); } catch (e3) { last = ""; }
  return [desc, when, amt, last].filter(Boolean).join(" \u00b7 ");
}

function bankCancelSheetHtml(snap, opts) {
  opts = opts || {};
  var sheet = opts.cancelSheet;
  if (!sheet || !sheet.key) return "";
  var row = bankDeskRowByKey(snap, sheet.key) || { name: sheet.name || sheet.key };
  var label = sheet.name || bankBillDisplayName(row.name, row.display_label);
  var month = bankMonthKey(opts.planMonth || opts.month || bankScreenMonth(snap, opts));
  var cancelled = isCancelled(row, month);
  var choice = sheet.fromChoice === "next" ? "next" : "this";
  if (!sheet.fromChoice) choice = bankMonthHasCharge(snap, row, month) ? "next" : "this";
  var look = "";
  try { look = bankCancelAppearance(snap, row); } catch (e) { look = ""; }
  function chip(value, text) {
    var on = choice === value;
    return '<button type="button" class="book-chip' + (on ? " on" : "") + '" data-bank-cancel-from="' + value +
      '" aria-pressed="' + (on ? "true" : "false") + '">' + text + "</button>";
  }
  var key = bankBillControlKey(row) || sheet.key;
  var payKey = key;
  try { payKey = bankStatusPostId(row, snap, key) || key; } catch (ePay) { payKey = key; }
  var fromNow = "";
  try { fromNow = bankFromLabel(bankPayFrom(snap, row)); } catch (eFrom) { fromNow = ""; }
  var payError = opts.billAccountError || "";
  var paySaved = !payError && opts.billAccountSaved ? opts.billAccountSaved : "";
  var payStatus = payError
    ? '<p class="hint tone-stop" role="status" data-bank-payfrom-error="1">' + bankEsc(payError) + "</p>"
    : (paySaved ? '<p class="hint" role="status" data-bank-payfrom-saved="1">' + bankEsc(paySaved) + "</p>" : "");
  var payBlock = '<section data-bank-payfrom-row="1"><h2>Pay from</h2>' +
    '<p class="mix-leg wrap"><span class="mix-leg-name">' + bankEsc(label) + "</span>" +
    (fromNow ? ' <span class="sub">' + bankEsc(fromNow) + "</span>" : "") + "</p>" +
    '<label><select data-bank-payfrom="' + bankEsc(payKey) + '" aria-label="Pay from">' +
    bankPayFromOptions(snap, row) + "</select></label>" +
    payStatus + "</section>";
  var cancelBlock = cancelled
    ? '<section data-bank-cancel-block="1"><button type="button" class="act" data-bank-status-undo="' + bankEsc(key) +
      '" aria-label="Reactivate ' + bankEsc(label) + '">Reactivate</button></section>'
    : '<section data-bank-cancel-block="1"><h2>Cancel this bill</h2>' +
      '<p class="hint">Marks it cancelled here; it doesn\'t cancel with the company.</p>' +
      '<span class="sub">Stop from</span> ' + chip("this", "This month") + " " + chip("next", "Next month") +
      ' <button type="button" class="act" data-bank-cancel-go="1">Cancel bill</button></section>';
  var title = cancelled ? label : ("Cancel " + label);
  return '<div class="books-overlay on sheet-bottom" data-bank-cancel-sheet="1">' +
    '<div class="books-sheet" role="dialog" aria-modal="true" aria-label="' + bankEsc(title) + '">' +
    '<div class="books-head"><h2>' + bankEsc(label) + "</h2>" +
    '<button type="button" class="book-chip" data-bank-cancel-close="1">Close</button></div>' +
    (look ? '<span class="sub" data-bank-cancel-look="1">' + bankEsc(look) + "</span>" : "") +
    payBlock + cancelBlock + "</div></div>";
}

function bankCancelToastHtml(toast) {
  if (!toast || !toast.key) return "";
  return '<p class="hint" role="status" data-bank-cancel-toast="1">Cancelled. <button type="button" class="book-chip" data-bank-status-undo="' +
    bankEsc(toast.key) + '">Undo</button></p>';
}

function bankChargedAlertHtml(snap) {
  return bankChargedPillHtml(snap);
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
  if (bankCategoriesActive(snap)) return "";
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

function bankSpendItemCatHtml(snap, row, label) {
  var cats = bankSpendVisible(bankSpendCategories(snap) || []);
  var mapped = bankMapSpendCategory(row, snap);
  var current = mapped && mapped.id ? bankSpendResolveId(bankSpendCategories(snap), mapped.id) : "";
  var options = '<option value="">Choose</option> ';
  cats.forEach(function (cat) {
    options += '<option value="' + bankEsc(cat.id) + '"' + (cat.id === current ? " selected" : "") + ">" + bankEsc(cat.name) + "</option>";
  });
  var key = row && (row.name || row.bill_id || label) || label;
  return '<select class="bank-chip" data-bank-item-cat="' + bankEsc(key) + '" aria-label="Category for ' + bankEsc(label) + '">' + options + "</select>";
}

function bankTierEditSections(snap, ym, edits, confirm, opts) {
  opts = opts || {};
  if (bankCategoriesActive(snap)) return { rules: "", other: "" };
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
  if (bankCategoriesActive(snap)) {
    if (bankFlowSide(raw) === "in") return "other_income";
    return bankSpendGroupOf(raw, snap) || "";
  }
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

function bankTxSpendView(raw) {
  raw = raw || {};
  if (!Object.prototype.hasOwnProperty.call(raw, "printed_category")) return raw;
  return {
    desc: raw.desc,
    description: raw.description,
    merchant: raw.merchant,
    name: raw.merchant || raw.desc,
    amount: raw.amount,
    flow: raw.flow,
    date: raw.date,
    category: raw.printed_category,
    category_basis: raw.category_basis,
    feed_category: raw.feed_category,
    tx_key: raw.tx_key,
    tx_id: raw.tx_id,
    tx_override_key: raw.tx_override_key,
    last4: raw.last4,
    one_off: raw.one_off,
    exclude_from_spend_avg: raw.exclude_from_spend_avg,
    transfer: raw.transfer,
    internal: raw.internal,
    payoff: raw.payoff,
    refund: raw.refund,
    kind: raw.kind
  };
}

function bankTxCategoryLabel(snap, raw) {
  if (!bankCategoriesActive(snap)) return "";
  var mapped = null;
  try { mapped = bankMapSpendCategory(bankTxSpendView(raw), snap); } catch (e) { mapped = null; }
  if (!mapped || !mapped.id) return "";
  var row = bankSpendById(bankSpendCategories(snap), mapped.id);
  return row && row.name ? String(row.name) : "";
}

function bankTxUncategorizedSpend(snap, raw) {
  var view = bankTxSpendView(raw);
  if (!view || String(view.category_basis || "") === "not_spend") return false;
  if (bankSpendExcluded(view, snap)) return false;
  var mapped = null;
  try { mapped = bankMapSpendCategory(view, snap); } catch (e) { mapped = null; }
  return !!(mapped && !mapped.id && mapped.via === "uncategorized");
}

function bankTxCategoryPick(snap, raw, want) {
  var picked = String(want || "");
  if (!picked) return true;
  if (picked === "uncategorized") return bankTxUncategorizedSpend(snap, raw);
  var label = bankTxCategoryLabel(snap, raw);
  if (!label) return false;
  if (bankTierKey(label) === bankTierKey(picked)) return true;
  var mapped = null;
  try { mapped = bankMapSpendCategory(bankTxSpendView(raw), snap); } catch (e2) { mapped = null; }
  return !!(mapped && mapped.id && (mapped.id === picked || bankTierKey(mapped.id) === bankTierKey(picked)));
}

function bankTxQueryHit(raw, query, snap) {
  var q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  var name = bankTxMerchantName(raw).toLowerCase();
  var desc = String(raw.desc || "").toLowerCase();
  var description = String(raw.description || "").toLowerCase();
  if (name.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || description.indexOf(q) >= 0) return true;
  var catName = snap ? bankTxCategoryLabel(snap, raw).toLowerCase() : "";
  if (catName && catName.indexOf(q) >= 0) return true;
  if (bankTxAmountHit(raw.amount, q)) return true;
  if (bankTxDateHit(raw.date, q)) return true;
  return false;
}

/* Money in stays locked unless it is already a refund. The name is not what locks it. */
function bankTxDepositLocked(raw) {
  if (!raw) return false;
  var refund = raw.refund === true || String(raw.kind || "").toLowerCase() === "refund";
  return bankFlowSide(raw) === "in" && !refund;
}

/* Skipped spending until a saved category says otherwise: not-spend, transfer, payoff, or a transfer-like name. */
function bankTxOffSpendBasis(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (String(raw.category_basis || "") === "not_spend") return true;
  if (raw.transfer === true || raw.internal === true || raw.payoff === true) return true;
  var label = [raw.desc, raw.category, raw.merchant, raw.name, raw.description].join(" ");
  return bankIsTransferName(label);
}

/* Search can recategorize a one-off and a skipped outflow. Money in stays locked unless it is a refund. A closed month stays locked. */
function bankTxSearchLocked(snap, raw) {
  if (!raw) return true;
  if (bankTxDepositLocked(raw)) return true;
  if (snap && bankMonthIsClosed(snap, raw.date)) return true;
  return false;
}

function bankTxSearchRows(snap, opts) {
  opts = opts || {};
  var tier = bankTierWord(opts.tier || "");
  var month = bankMonthKey(opts.month || "");
  var cat = String(opts.category || "");
  var acct = String(opts.account || "").replace(/\D/g, "");
  if (acct.length > 4) acct = acct.slice(-4);
  var rows = bankTxRows(snap).filter(function (raw) {
    if (!bankTxQueryHit(raw, opts.q || "", snap)) return false;
    if (!bankTxCategoryPick(snap, raw, cat)) return false;
    if (tier && bankTxShownTier(snap, raw) !== tier && !(bankFlowSide(raw) === "in" && tier === "other_income")) return false;
    if (month && bankMonthKey(raw.date) !== month) return false;
    if (acct && raw.last4 !== acct) return false;
    return true;
  });
  var order = opts.order === "asc" ? "asc" : (opts.order === "amount" ? "amount" : "desc");
  rows.sort(function (a, b) {
    if (order === "amount") {
      var aa = Math.abs(Number(a.amount) || 0);
      var bb = Math.abs(Number(b.amount) || 0);
      if (aa !== bb) return bb - aa;
    }
    if (a.date !== b.date) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      var olderFirst = order === "asc";
      return olderFirst ? (a.date < b.date ? -1 : 1) : (a.date < b.date ? 1 : -1);
    }
    return order === "asc" ? a.i - b.i : b.i - a.i;
  });
  return rows;
}

/* Stay on the raw tx_key. The hash is filled in after search warms, and a flipped key hides the sheet. */
function bankTxOpenKey(raw) {
  var source = "";
  try { source = bankTxOverrideSource(raw) || ""; } catch (e) { source = ""; }
  if (source) return source;
  var hashed = "";
  try { hashed = bankTxOverrideKey(raw) || ""; } catch (e2) { hashed = ""; }
  if (hashed) return hashed;
  return bankTxMerchantName(raw);
}

function bankTxSheetHint(category) {
  var noun = "pur" + "ch" + "ase";
  return category ? ("Pick a category for this " + noun + ".") : ("Pick a group for this " + noun + ".");
}

function bankOffSpendLabel() {
  return "Not a pur" + "ch" + "ase";
}

function bankOffSpendValue() {
  return "not-pur" + "ch" + "ase";
}

function bankTxResultChip(snap, raw) {
  if (snap && bankMonthIsClosed(snap, raw && raw.date)) return "Closed month";
  if (bankTxDepositLocked(raw)) return bankOffSpendLabel();
  if (bankTxOffSpendBasis(raw)) {
    var id = bankSpendSavedCategoryId(raw, snap);
    var row = id ? bankSpendById(bankSpendCategories(snap), id) : null;
    if (row && row.name) return row.name;
    return bankOffSpendLabel();
  }
  return bankTxChipLabel(snap, raw);
}

function bankTxChipLabel(snap, raw) {
  if (bankSpendLive(snap)) {
    var mapped = bankMapSpendCategory(raw, snap);
    var id = mapped && mapped.id ? bankSpendResolveId(bankSpendCategories(snap), mapped.id) : "";
    var row = id ? bankSpendById(bankSpendCategories(snap), id) : null;
    return row && row.name ? row.name : "Other";
  }
  if (bankFlowSide(raw) === "in" || bankTxShownTier(snap, raw) === "other_income") return "Other income";
  return bankTierLabel(bankTxShownTier(snap, raw)) || "Needs";
}

function bankTxScopeHtml(scope, keyOk) {
  var picked = !keyOk || scope === "merchant" ? "merchant" : "one";
  function chip(value, label, off) {
    var on = !off && picked === value;
    return '<button type="button" class="book-chip' + (on ? " on" : "") + '" data-bank-tx-scope="' + value +
      '" aria-pressed="' + (on ? "true" : "false") + '"' + (off ? " disabled" : "") + ">" + label + "</button>";
  }
  return '<div class="book-nav-chips">' + chip("one", "Just this one", !keyOk) + " " +
    chip("merchant", "All from this merchant", false) + "</div>";
}

function bankTxChosenScope(sheet, fallback) {
  var chosen = "";
  if (sheet && sheet.querySelectorAll) {
    var nodes = sheet.querySelectorAll("[data-bank-tx-scope]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var on = !!(node.classList && node.classList.contains("on"));
      if (!on && node.getAttribute && node.getAttribute("aria-pressed") === "true") on = true;
      if (!on && node.checked) on = true;
      if (!on) continue;
      chosen = node.getAttribute ? (node.getAttribute("data-bank-tx-scope") || node.value || "") : (node.value || "");
    }
  }
  if (chosen === "one" || chosen === "merchant") return chosen;
  return fallback === "merchant" ? "merchant" : "one";
}

function bankTxSheetHtml(snap, raw, opts) {
  if (!raw || bankTxSearchLocked(snap, raw)) return "";
  opts = opts || {};
  var source = "";
  try { source = bankTxOverrideSource(raw) || ""; } catch (e2) { source = ""; }
  var hash = "";
  try { hash = bankTxOverrideKey(raw) || ""; } catch (e3) { hash = ""; }
  var merchant = bankTxMerchantName(raw);
  var saveKey = source || hash || merchant;
  var keyOk = !!(source || hash);
  var ruleKey = bankSpendMerchantKey(raw);
  var catsOn = bankCategoriesActive(snap);
  var current = bankTxShownTier(snap, raw);
  if (current !== "required" && current !== "needs" && current !== "wants") current = "needs";
  var offSpend = bankTxOffSpendBasis(raw);
  var savedId = bankSpendSavedCategoryId(raw, snap);
  var picker = catsOn
    ? bankSpendCatSelectHtml(snap, raw, { all: true, offSpend: offSpend })
    : '<select data-bank-tx-pick="' + bankEsc(saveKey) + '" data-bank-tx-merchant="' + bankEsc(merchant) + '" aria-label="Tier">' +
      ["required", "needs", "wants"].map(function (name) {
        return '<option value="' + name + '"' + (name === current ? " selected" : "") + ">" + bankTierLabel(name) + "</option>";
      }).join("") + "</select>";
  var hint = bankTxSheetHint(catsOn);
  if (offSpend && !savedId) hint = "Not counted as spending now";
  var scope = opts.txScope === "merchant" ? "merchant" : "one";
  return '<div class="books-overlay on sheet-bottom" data-bank-cat-pop="1" data-bank-tx-sheet="1">' +
    '<div class="books-sheet" role="dialog" aria-modal="true" aria-label="' + bankEsc(merchant) + '">' +
    '<div class="books-head"><h2>' + bankEsc(merchant) + "</h2>" +
    '<button type="button" class="book-chip" data-bank-cat-close="1">Close</button></div>' +
    '<p class="hint">' + hint + "</p>" +
    picker +
    bankTxScopeHtml(scope, keyOk) +
    '<button type="button" class="act" data-bank-tx-save="1" data-bank-tx-key="' + bankEsc(saveKey) + '" data-bank-tx-merchant="' +
    bankEsc(catsOn ? ruleKey : merchant) + '">Save</button></div></div>';
}

function bankTxResultsHtml(snap, opts) {
  opts = opts || {};
  var q = opts.txQuery == null ? (opts.q || "") : opts.txQuery;
  var tier = opts.txTier || "";
  var account = opts.txAcct || "";
  var month = opts.txMonth || "";
  var category = opts.txCat || "";
  var order = opts.txOrder === "asc" ? "asc" : (opts.txOrder === "amount" ? "amount" : "desc");
  var rows = bankTxSearchRows(snap, { q: q, tier: tier, account: account, month: month, category: category, order: order });
  var note = bankTxMovesOn(snap) && opts.txNote ? '<p class="bank-tx-note">' + bankEsc(opts.txNote) + "</p>" : "";
  var sheet = "";
  var list = rows.map(function (raw) {
    var when = bankShortDate(raw.date) || raw.date || "";
    var last = "";
    try { last = bankAccountMask(raw.last4 || ""); } catch (e) { last = raw.last4 ? bankAccountMask(raw.last4) : ""; }
    var name = bankTxMerchantName(raw);
    var amount = bankNum(raw.amount);
    var inflow = bankFlowSide(raw) === "in";
    var tone = inflow ? "tone-go" : "tone-stop";
    var flow = bankFundSigned(Math.abs(amount || 0), inflow ? "in" : "out");
    var openKey = bankTxOpenKey(raw);
    var locked = bankTxSearchLocked(snap, raw);
    var chip = bankTxResultChip(snap, raw);
    var meta = [when, last].filter(Boolean).join(" \u00b7 ");
    if (!locked && opts.txOpen && String(opts.txOpen) === String(openKey)) sheet = bankTxSheetHtml(snap, raw, opts);
    var change = locked ? "" : ' <span class="bank-tx-change">Change \u203a</span>';
    var body = '<span class="bank-tx-line"><span data-bank-item-name="1">' + bankEsc(name) + "</span> " +
      '<b class="' + tone + '">' + bankEsc(flow.text) + "</b></span> " +
      '<span class="bank-tx-line"><i data-bank-item-meta="1">' + bankEsc(meta) + "</i> " +
      '<span class="bank-tx-end"><span class="fresh-chip">' + bankEsc(chip) + "</span>" + change + "</span></span>";
    if (locked) {
      return '<li class="bank-tx-quiet" data-bank-cat-item="1" data-last4="' + bankEsc(last) + '">' + body + "</li>";
    }
    return '<li data-bank-cat-item="1" data-last4="' + bankEsc(last) + '">' +
      '<button type="button" class="bank-tx-hit" data-bank-tx-open="' + bankEsc(openKey) + '">' +
      body + "</button></li>";
  }).join("");
  var body = rows.length
    ? bankCapList('<ul class="bank-tx-results" data-bank-cat-items="1">' + list + "</ul>", rows.length, "Transactions")
    : '<p class="hint">No matching transactions.</p>';
  return note + body + sheet;
}

function bankTxSearchHtml(snap, opts) {
  opts = opts || {};
  var q = opts.txQuery == null ? (opts.q || "") : opts.txQuery;
  var tier = opts.txTier || "";
  var account = opts.txAcct || "";
  var month = opts.txMonth || "";
  var category = opts.txCat || "";
  var order = opts.txOrder === "asc" ? "asc" : (opts.txOrder === "amount" ? "amount" : "desc");
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
  var catRows = bankSpendVisible(bankSpendCategories(snap) || []).slice().sort(function (a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  var catOpts = catRows.map(function (row) {
    var on = category === row.id || bankTierKey(category) === bankTierKey(row.name);
    return '<option value="' + bankEsc(row.id) + '"' + (on ? " selected" : "") + ">" + bankEsc(row.name) + "</option>";
  }).join(" ");
  var assign = bankSpendLive(snap) ? "" : (opts.txAssign || "");
  return '<section class="bank-tx-search"><h2>Transactions</h2><div class="card span">' +
    '<label>Search <input type="search" data-bank-find value="' + bankEsc(q) + '" aria-label="Search" autocomplete="off"></label>' +
    '<div class="row2">' +
    '<select data-bank-find-filter="tier" aria-label="Group"><option value="">Any group</option> ' +
    '<option value="required"' + (tier === "required" ? " selected" : "") + ">Required</option> " +
    '<option value="needs"' + (tier === "needs" ? " selected" : "") + ">Needs</option> " +
    '<option value="wants"' + (tier === "wants" ? " selected" : "") + ">Wants</option></select> " +
    '<select data-bank-find-filter="category" aria-label="Category"><option value="">Any category</option> ' +
    catOpts +
    '<option value="uncategorized"' + (category === "uncategorized" ? " selected" : "") + ">Uncategorized</option></select> " +
    '<select data-bank-find-filter="account" aria-label="Account"><option value="">Any account</option> ' + acctOpts + "</select> " +
    '<select data-bank-find-filter="month" aria-label="Month"><option value="">Any month</option> ' + monthOpts + "</select> " +
    '<select data-bank-find-filter="order" aria-label="Sort">' +
    '<option value="desc"' + (order === "desc" ? " selected" : "") + ">Newest</option> " +
    '<option value="asc"' + (order === "asc" ? " selected" : "") + ">Oldest</option> " +
    '<option value="amount"' + (order === "amount" ? " selected" : "") + ">Largest</option></select></div>" +
    '<div data-bank-find-results>' + bankTxResultsHtml(snap, opts) + "</div>" +
    assign + "</div></section>";
}

/* The results slot stays put while search redraws its list. The listener has to live on that slot. */
function bankBindTxResults(root) {
  if (!root || !root.querySelector) return;
  var slot = root.querySelector("[data-bank-find-results]");
  if (!slot || slot._bankTxBound || !slot.addEventListener) return;
  slot._bankTxBound = true;
  slot.addEventListener("click", function (e) {
    var t = e && e.target;
    if (!t || !t.closest || !root._bank) return;
    var txRow = t.closest("[data-bank-tx-open]");
    if (!txRow || !txRow.getAttribute) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    var txKey = txRow.getAttribute("data-bank-tx-open");
    var opening = root._bank.txOpen !== txKey;
    root._bank.txOpen = opening ? txKey : "";
    if (opening) root._bank.txScope = "one";
    root._bank.spendOpen = "";
    root._bank.tab = "edits";
    bankPaint(root);
  });
}

/* Refresh the results list without replacing the search input, so a phone keyboard stays up. */
function bankPaintTxResults(root) {
  if (!root || !root._bank || !root.querySelector) return;
  var slot = root.querySelector("[data-bank-find-results]");
  if (!slot) return;
  var st = root._bank;
  var input = root.querySelector("[data-bank-find]");
  var start = input && typeof input.selectionStart === "number" ? input.selectionStart : null;
  var end = input && typeof input.selectionEnd === "number" ? input.selectionEnd : null;
  var focused = input && typeof document !== "undefined" && document.activeElement === input;
  slot.innerHTML = bankTxResultsHtml(st.data, {
    txQuery: st.txQuery || "",
    txTier: st.txTier || "",
    txAcct: st.txAcct || "",
    txMonth: st.txMonth || "",
    txCat: st.txCat || "",
    txOrder: st.txOrder || "",
    txNote: st.txNote || "",
    txOpen: st.txOpen || "",
    txScope: st.txScope || "",
    catUndo: st.catUndo || null,
    txUndo: st.txUndo || null
  });
  if (typeof MPListCap !== "undefined" && MPListCap && MPListCap.refresh) {
    try { MPListCap.refresh(root); } catch (e) {}
  }
  bankBindTxResults(root);
  if (!input) return;
  if (focused && document.activeElement !== input && input.focus) {
    try { input.focus({ preventScroll: true }); } catch (e) { try { input.focus(); } catch (e2) {} }
  }
  if (start != null && end != null && input.setSelectionRange) {
    try { input.setSelectionRange(start, end); } catch (e) {}
  }
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
  var catErr = opts.overrideError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.overrideError) + "</p>" : "";
  var addErr = opts.categoryError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.categoryError) + "</p>" : "";
  var dueErr = opts.dueError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.dueError) + "</p>" : "";
  var kindErr = opts.kindError ? '<p class="hint tone-stop" role="status">' + bankEsc(opts.kindError) + "</p>" : "";
  var saveErr = opts.tierSaveError ? '<p class="bank-save-notice" role="status">' + bankEsc(opts.tierSaveError) + "</p>" : "";
  var tiers = bankTierEditSections(snap, ym, opts.edits, opts.statusConfirm, Object.assign({}, opts, { editCat: picked }));
  var txAssign = bankSpendLive(snap) ? "" : bankEditTxListHtml(rows, known, picked, opts.rowAdd);
  var undo = "";
  if (bankCategoriesActive(snap) && opts.catUndo) {
    undo = '<p class="hint">Updated. <button type="button" class="book-chip" data-bank-spend-undo="1">Undo</button></p>';
  } else if (opts.txUndo && opts.txUndo.key) {
    undo = '<p class="hint">Updated. <button type="button" class="book-chip" data-bank-tx-undo="' + bankEsc(opts.txUndo.key) +
      '" data-bank-tx-merchant="' + bankEsc(opts.txUndo.merchant || "") + '">Undo</button></p>';
  }
  var more = bankMixMore("More details",
    "<section><h2>Categories</h2><div class=\"card span\">" + catErr + addErr +
    '<p class="hint">Categories sync across your seats.</p>' +
    bankAddCategoryHtml() + bankCatPickerHtml(known, picked) + "</div></section>" +
    "<section><h2>Income</h2><div class=\"card span\">" +
    '<p class="hint">A blank amount or day stays blank.</p>' +
    bankEditIncomeHtml(incomes, ym) + "</div></section>" +
    bankUnmatchedStatusHtml(snap));
  var pill = "";
  try { pill = bankChargedPillHtml(snap); } catch (ePill) { pill = ""; }
  var rulesBody = (kindNote || "") + kindErr +
    (bankCategoriesActive(snap) ? "" : ('<div class="bank-tier-plans">' + bankPlanFieldHtml(snap, ym, "required", "Required plan") + " " +
    bankPlanFieldHtml(snap, ym, "needs", "Needs plan") + " " + bankPlanFieldHtml(snap, ym, "wants", "Wants plan") + "</div>")) +
    bankKindEditHtml(snap);
  var rulesText = String(rulesBody || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  var rulesSection = rulesText
    ? '<div class="bank-edit-rules">' + (tiers.rules || "") +
      "<section><h2>Rules</h2><div class=\"card span\">" + rulesBody + "</div></section></div>"
    : (tiers.rules ? '<div class="bank-edit-rules">' + tiers.rules + "</div>" : "");
  return '<div class="bank-edit-grid">' + pill + saveErr + undo + bankTxSearchHtml(snap, Object.assign({}, opts, { txAssign: txAssign })) +
    bankSpendEditorHtml(snap, opts) +
    '<section class="bank-edit-block"><h2>Bills</h2><div class="card span">' + dueNote + dueErr +
    bankEditBillHtml(bills, ym, opts.edits, opts.statusConfirm, snap, opts) +
    bankCancelledListHtml(snap, ym, opts.edits, opts.statusConfirm, opts) + "</div></section>" +
    bankEditSubSection(snap, ym, opts) +
    (tiers.other || "") +
    rulesSection + more + "</div>";
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
  var notice = "";
  if (opts.tierSaveError && tab !== "edits") {
    notice = '<p class="hint tone-stop" role="status">' + bankEsc(opts.tierSaveError) + "</p>";
  }
  return bankNavHtml(tab, opts.menuOpen, title, snap || {}, opts) + '<div class="bank-panel" data-panel="' + tab + '" aria-labelledby="bank-view-title">' +
    bankCancelToastHtml(opts.cancelToast) + notice + bankTierStaleHtml(snap) + panel + "</div>" +
    bankGroupPopupHtml(snap || {}, Object.assign({ tab: tab }, opts)) +
    bankSpendPopupHtml(snap || {}, Object.assign({ tab: tab }, opts)) +
    bankCancelSheetHtml(snap || {}, Object.assign({ tab: tab }, opts));
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
    txCat: st.txCat || "",
    txOrder: st.txOrder || "",
    txNote: st.txNote || "",
    catOpen: st.catOpen || "",
    catMonth: st.catMonth || "",
    catError: st.catError || "",
    catDraft: st.catDraft || null,
    catUndo: st.catUndo || null,
    catNarrow: st.catNarrow || null,
    spendOpen: st.spendOpen || "",
    txOpen: st.txOpen || "",
    txScope: st.txScope || "",
    txUndo: st.txUndo || null,
    heroOpen: !!st.heroOpen,
    groupOpen: st.groupOpen || "",
    uncatOpen: !!st.uncatOpen,
    cancelSheet: st.cancelSheet || null,
    billAccountError: st.billAccountError || "",
    billAccountSaved: st.billAccountSaved || "",
    cancelToast: st.cancelToast || null,
    reviewCancel: !!st.reviewCancel,
    nextIndex: typeof st.nextIndex === "number" ? st.nextIndex : undefined
  });
  bankPaintTicker(st.data, { now: st.now });
  if (typeof MPListCap !== "undefined" && MPListCap && MPListCap.refresh) {
    try { MPListCap.refresh(root); } catch (e) {}
  }
  bankScrollLedgerToToday(root);
  bankScrollNextPay(root);
  bankBindTxResults(root);
  if (st.reviewCancel && st.tab === "edits" && root.querySelector) {
    var reviewRow = root.querySelector("[data-bank-cancelled]");
    if (reviewRow && reviewRow.scrollIntoView) {
      try { reviewRow.scrollIntoView({ block: "nearest" }); } catch (eRev) {}
    }
  }
  if (st.tab !== "edits") st.reviewCancel = false;
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

function bankNextScrollLeft(track, card) {
  if (!track || !card) return 0;
  if (card.getBoundingClientRect && track.getBoundingClientRect) {
    var delta = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    return Math.max(0, (track.scrollLeft || 0) + delta);
  }
  return card.offsetLeft || 0;
}

function bankSyncNextPayDots(root) {
  if (!root || !root.querySelector) return;
  var track = root.querySelector("[data-bank-next-track]");
  if (!track || !track.querySelectorAll) return;
  var cards = track.querySelectorAll("[data-bank-next-card]");
  if (!cards || !cards.length) return;
  var left = track.scrollLeft || 0;
  var best = 0;
  var bestDist = Infinity;
  var i;
  for (i = 0; i < cards.length; i++) {
    var dist = Math.abs(bankNextScrollLeft(track, cards[i]) - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  if (root._bank) root._bank.nextIndex = best;
  var dots = root.querySelectorAll("[data-bank-next-dot]");
  for (i = 0; i < dots.length; i++) {
    if (i === best) {
      dots[i].setAttribute("aria-current", "true");
      if (dots[i].classList) dots[i].classList.add("on");
    } else {
      dots[i].removeAttribute("aria-current");
      if (dots[i].classList) dots[i].classList.remove("on");
    }
  }
}

/* Align to the active dot. A scroll event before layout, or a later repaint, must not
   treat a snap as a swipe and leave the track on a later card. */
function bankPlaceNextPay(root, force) {
  if (!root || !root.querySelector) return;
  var track = root.querySelector("[data-bank-next-track]");
  if (!track || !track.querySelectorAll) return;
  if (!force && track._bankNextUser) return;
  var cards = track.querySelectorAll("[data-bank-next-card]");
  if (!cards || !cards.length) return;
  var dots = root.querySelectorAll("[data-bank-next-dot]");
  var current = 0;
  var i;
  for (i = 0; i < dots.length; i++) {
    if (dots[i].getAttribute && dots[i].getAttribute("aria-current") === "true") current = i;
  }
  if (current < 0 || current >= cards.length) current = 0;
  if (root._bank && typeof root._bank.nextIndex !== "number") root._bank.nextIndex = current;
  var left = bankNextScrollLeft(track, cards[current]);
  if (Math.abs((track.scrollLeft || 0) - left) <= 1) return;
  track.scrollLeft = left;
}

function bankScrollNextPay(root) {
  if (!root || !root.querySelector) return;
  var track = root.querySelector("[data-bank-next-track]");
  if (!track) return;
  bankPlaceNextPay(root);
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bankPlaceNextPay(root); });
    });
  }
  if (track._bankNextScroll || !track.addEventListener) return;
  track._bankNextScroll = true;
  function arm() { track._bankNextUser = true; }
  track.addEventListener("pointerdown", arm);
  track.addEventListener("touchstart", arm);
  track.addEventListener("wheel", arm);
  track.addEventListener("scroll", function () {
    if (!track._bankNextUser) return;
    bankSyncNextPayDots(root);
  });
}

function bankFocusNoScroll(el) {
  if (!el || !el.focus) return;
  try { el.focus({ preventScroll: true }); } catch (e) {
    try { el.focus(); } catch (e2) {}
  }
}

function bankPaintTicker(snap, opts) {
  var el = typeof document !== "undefined" && document.getElementById ? document.getElementById("mp-ticker") : null;
  if (!el || typeof MPTicker === "undefined" || !MPTicker.render) return;
  try { MPTicker.render(el, snap, bankTierDoc(snap), bankScreenToday(snap, opts || {})); } catch (e) {}
}

function bankFocusDayDialog(root) {
  var el = root && root.querySelector && root.querySelector(".bank-day-dialog");
  bankFocusNoScroll(el);
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
    bankFocusNoScroll(cell);
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
  return bankDeskRowByKey(snap, key);
}

function bankStatusPostId(row, snap, key) {
  if (row) {
    var cancel = row.cancel_key == null ? "" : String(row.cancel_key).trim();
    if (cancel) return cancel;
    var sub = row.sub_id == null ? "" : String(row.sub_id).trim();
    if (sub) return sub;
    var id = row.bill_id == null ? "" : String(row.bill_id).trim();
    if (id) return id;
    if (row.name) return String(row.name);
  }
  return bankBillNameFromKey(snap, key);
}

function bankStatusErrorLine(code) {
  var lines = {
    bad_status: "Pick cancelled or paid off.",
    bad_month: "Use a month like 2026-10.",
    bad_note: "Shorten the note and try again.",
    too_many_status: "Too many status entries. Remove one and try again."
  };
  return lines[String(code || "")] || "";
}

function bankValidateStatus(snap, id, entry) {
  if (entry == null) return "";
  var status = bankBillStatus(entry);
  if (status !== "cancelled" && status !== "paid_off") return "bad_status";
  if (!/^\d{4}-\d{2}$/.test(String(entry.from || ""))) return "bad_month";
  if (entry.note != null && String(entry.note).length > 200) return "bad_note";
  var bag = {};
  try { bag = (bankTierDoc(snap).bill_status) || {}; } catch (e) { bag = {}; }
  var n = 0;
  var exists = false;
  Object.keys(bag).forEach(function (k) {
    if (!bag[k]) return;
    n += 1;
    if (id && bankKeysMatch(k, id)) exists = true;
  });
  if (!exists && n >= 200) return "too_many_status";
  return "";
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
  if (!snap.tier_doc.bill_account || typeof snap.tier_doc.bill_account !== "object" || Array.isArray(snap.tier_doc.bill_account)) snap.tier_doc.bill_account = {};
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
    function finish(line) {
      if (!root._bank) return false;
      if (!root._bank.data || typeof root._bank.data !== "object" || Array.isArray(root._bank.data)) root._bank.data = {};
      applyLocal(root._bank.data, failed);
      root._bank.tierSaveError = failed ? (line || "Could not save tiers.json. The change is still on this screen.") : "";
      bankPaint(root);
      return !failed;
    }
    if (failed && res && typeof res.json === "function") {
      return bankReadJson(res).then(function (payload) {
        return finish(bankStatusErrorLine(bankSpendErrorCode(payload)));
      });
    }
    return finish("");
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
  var row = bankDeskRowByKey(snap, key);
  var id = bankStatusPostId(row, snap, key);
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

function bankSaveBillAccount(root, key, suffix) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var snap = root._bank.data;
  var row = null;
  try { row = bankDeskRowByKey(snap, key); } catch (eRow) { row = null; }
  var id = "";
  try { id = bankStatusPostId(row, snap, key); } catch (eId) { id = ""; }
  if (!id) id = String(key);
  if (suffix != null && suffix !== "") {
    var digits = bankLast4Digits(suffix);
    if (!digits || !bankKnownSuffix(snap, digits)) {
      root._bank.billAccountError = "bad_account";
      root._bank.billAccountSaved = "";
      bankPaint(root);
      return Promise.resolve(false);
    }
    suffix = digits;
  } else suffix = null;
  var bag = bankBillAccountMap(snap);
  var n = 0;
  var exists = false;
  Object.keys(bag).forEach(function (k) {
    if (bag[k] == null || bag[k] === "") return;
    n += 1;
    if (bankKeysMatch(k, id)) exists = true;
  });
  if (suffix != null && !exists && n >= 200) {
    root._bank.billAccountError = "too_many_accounts";
    root._bank.billAccountSaved = "";
    bankPaint(root);
    return Promise.resolve(false);
  }
  var posted = {};
  posted[id] = suffix;
  var body = { bill_account: posted };
  return fetch(BANK_TIERS_URL, bankFetchInit({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).then(function (res) {
    var failed = !res || res.ok !== true || res.type === "opaqueredirect";
    function fail(payload) {
      var code = bankSpendErrorCode(payload);
      if (code === "bad_account" || code === "too_many_accounts") root._bank.billAccountError = code;
      else root._bank.billAccountError = "Could not save tiers.json. The change is still on this screen.";
      root._bank.billAccountSaved = "";
      bankPaint(root);
      return false;
    }
    if (failed) return bankReadJson(res).then(fail);
    var doc = bankEnsureTierBags(root._bank.data);
    if (doc) {
      if (!doc.bill_account || typeof doc.bill_account !== "object" || Array.isArray(doc.bill_account)) doc.bill_account = {};
      if (suffix == null) delete doc.bill_account[id];
      else doc.bill_account[id] = suffix;
    }
    root._bank.billAccountError = "";
    root._bank.billAccountSaved = "Saved";
    bankPaint(root);
    return true;
  }).catch(function () {
    if (!root._bank) return false;
    root._bank.billAccountError = "Could not save tiers.json. The change is still on this screen.";
    root._bank.billAccountSaved = "";
    bankPaint(root);
    return false;
  });
}

function bankSaveBillStatus(root, key, entry) {
  if (!root || !root._bank || !key) return Promise.resolve(false);
  var posted = bankTierPostBag(root._bank.data, key, entry, "bill_status");
  var code = bankValidateStatus(root._bank.data, posted.id, entry);
  if (code) {
    root._bank.tierSaveError = bankStatusErrorLine(code);
    root._bank.cancelToast = null;
    bankPaint(root);
    return Promise.resolve(false);
  }
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
  var early = bankEnsureTierBags(root._bank.data);
  if (early) {
    Object.keys(posted.bag).forEach(function (k) {
      if (posted.bag[k] == null) bankWriteTierBag(early, "manual_paid", k, null);
    });
    bankWriteTierBag(early, "manual_paid", posted.id, entry);
    bankMarkLocalKey(root._bank.data, "manual_paid", posted.id, true);
    bankPaint(root);
  }
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
  var earlyDoc = bankEnsureTierBags(root._bank.data);
  if (earlyDoc) {
    Object.keys(nullBag).forEach(function (k) {
      if (body.bill_status) bankWriteTierBag(earlyDoc, "bill_status", k, null);
      if (body.manual_paid) bankWriteTierBag(earlyDoc, "manual_paid", k, null);
    });
    bankMarkLocalKey(root._bank.data, "bill_status", id, false);
    bankMarkLocalKey(root._bank.data, "manual_paid", id, false);
    bankPaint(root);
  }
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
  if (payload.schema === "banking-tiers/v1" || doc.rules || doc.plans || doc.bill_status || doc.manual_paid || doc.bill_account || doc.move_buffer != null ||
    Object.prototype.hasOwnProperty.call(doc, "tx_overrides") ||
    Object.prototype.hasOwnProperty.call(doc, "categories") ||
    Object.prototype.hasOwnProperty.call(doc, "category_rules") ||
    Object.prototype.hasOwnProperty.call(doc, "category_tx")) return doc;
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
    if (res && (Number(res.status) === 401 || Number(res.status) === 403)) {
      st.data._tiersFromGet = false;
      st.data._tiersGetFailed = false;
      bankPaint(root);
      return false;
    }
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
    catOpen: opts.catOpen || "",
    catMonth: opts.catMonth || "",
    catError: opts.catError || "",
    catDraft: opts.catDraft || null,
    catUndo: opts.catUndo || null,
    catNarrow: opts.catNarrow || null,
    spendOpen: opts.spendOpen || "",
    txOpen: opts.txOpen || "",
    txUndo: opts.txUndo || null,
    heroOpen: !!opts.heroOpen,
    groupOpen: opts.groupOpen || "",
    uncatOpen: !!opts.uncatOpen,
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
  root.addEventListener("click", function (e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var tabBtn = t.closest("[data-bank-tab]");
    if (tabBtn && tabBtn.getAttribute) {
      if (root._bank) {
        root._bank.menuOpen = false;
        if (tabBtn.getAttribute("data-bank-uncat-open") != null) root._bank.uncatOpen = true;
        if (tabBtn.getAttribute("data-bank-charged-review") != null) root._bank.reviewCancel = true;
      }
      bankActivate(root, tabBtn.getAttribute("data-bank-tab"));
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
      root._bank.txUndo = null;
      if (bankCategoriesActive(root._bank.data)) {
        var catScope = root._bank.txScope === "merchant" ? "merchant" : "one";
        if (catScope === "one") return bankSpendSaveTx(root, txUndo.getAttribute("data-bank-tx-undo"), null);
        return bankSpendSaveRule(root, txUndo.getAttribute("data-bank-tx-merchant"), null);
      }
      return bankUndoTxMove(root, txUndo.getAttribute("data-bank-tx-undo"), txUndo.getAttribute("data-bank-tx-merchant"));
    }
    var catClose = t.closest("[data-bank-cat-close]");
    if (catClose && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.catOpen = "";
      root._bank.groupOpen = "";
      root._bank.spendOpen = "";
      root._bank.txOpen = "";
      root._bank.catDraft = null;
      root._bank.catError = "";
      bankPaint(root);
      return;
    }
    if (t.getAttribute && t.getAttribute("data-bank-cat-pop") != null && root._bank) {
      root._bank.catOpen = "";
      root._bank.groupOpen = "";
      root._bank.spendOpen = "";
      root._bank.txOpen = "";
      root._bank.catDraft = null;
      root._bank.catError = "";
      bankPaint(root);
      return;
    }
    var heroToggle = t.closest("[data-bank-hero-toggle]");
    if (heroToggle && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.heroOpen = !root._bank.heroOpen;
      bankPaint(root);
      return;
    }
    var groupBtn = t.closest("[data-bank-group]");
    if (groupBtn && groupBtn.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var groupName = groupBtn.getAttribute("data-bank-group");
      root._bank.groupOpen = root._bank.groupOpen === groupName ? "" : groupName;
      root._bank.catOpen = "";
      root._bank.txOpen = "";
      bankPaint(root);
      return;
    }
    var uncatBtn = t.closest("[data-bank-uncat-open]");
    if (uncatBtn && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.uncatOpen = !root._bank.uncatOpen;
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    var itemOpen = t.closest("[data-bank-cat-item-open]");
    if (itemOpen && itemOpen.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var itemKey = itemOpen.getAttribute("data-bank-cat-item-open");
      var openingItem = root._bank.txOpen !== itemKey;
      root._bank.txOpen = openingItem ? itemKey : "";
      if (openingItem) root._bank.txScope = "one";
      bankPaint(root);
      return;
    }
    var catJump = t.closest("[data-bank-cat-jump]");
    if (catJump && catJump.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.catOpen = catJump.getAttribute("data-bank-cat-jump");
      root._bank.groupOpen = "";
      root._bank.spendOpen = "";
      root._bank.catMonth = bankMonthKey(root._bank.planMonth || bankCalendarMonth(root._bank.data));
      bankPaint(root);
      return;
    }
    var spendEdit = t.closest("[data-bank-spend-edit]");
    if (spendEdit && spendEdit.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.spendOpen = spendEdit.getAttribute("data-bank-spend-edit");
      root._bank.catOpen = "";
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    var scopeBtn = t.closest("[data-bank-tx-scope]");
    if (scopeBtn && scopeBtn.getAttribute && root._bank && !scopeBtn.disabled) {
      if (e.preventDefault) e.preventDefault();
      var nextScope = scopeBtn.getAttribute("data-bank-tx-scope");
      if (nextScope === "one" || nextScope === "merchant") root._bank.txScope = nextScope;
      bankPaint(root);
      return;
    }
    var txRow = t.closest("[data-bank-tx-open]");
    if (txRow && txRow.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var txKey = txRow.getAttribute("data-bank-tx-open");
      var openingTx = root._bank.txOpen !== txKey;
      root._bank.txOpen = openingTx ? txKey : "";
      if (openingTx) root._bank.txScope = "one";
      root._bank.spendOpen = "";
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    var txSave = t.closest("[data-bank-tx-save]");
    if (txSave && txSave.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var sheet = txSave.closest ? txSave.closest("[data-bank-tx-sheet]") : null;
      var txScope = bankTxChosenScope(sheet, root._bank.txScope);
      root._bank.txScope = txScope;
      var txMerchant = txSave.getAttribute("data-bank-tx-merchant") || "";
      var txSaveKey = txSave.getAttribute("data-bank-tx-key") || txMerchant;
      if (bankCategoriesActive(root._bank.data)) {
        var catNode = sheet && sheet.querySelector ? sheet.querySelector("[data-bank-tx-cat]") : null;
        var catRaw = catNode && catNode.value != null ? String(catNode.value) : "";
        if (!catRaw) return;
        var catPick = catRaw === bankOffSpendValue() ? null : catRaw;
        root._bank.txUndo = null;
        if (txScope === "one") return bankSpendSaveTx(root, txSaveKey, catPick);
        return bankSpendSaveRule(root, txMerchant, catPick);
      }
      var tierNode = sheet && sheet.querySelector ? sheet.querySelector("[data-bank-tx-pick]") : null;
      var tierPick = bankTierWord(tierNode && tierNode.value);
      root._bank.txUndo = { key: txSaveKey, merchant: txMerchant };
      if (txScope === "one") return bankSaveTxOverride(root, txSaveKey, tierPick);
      return bankSaveTier(root, txMerchant || txSaveKey, tierPick);
    }
    var spendOpenBtn = t.closest("[data-bank-spend-open]");
    if (spendOpenBtn && spendOpenBtn.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.spendOpen = spendOpenBtn.getAttribute("data-bank-spend-open");
      root._bank.txOpen = "";
      root._bank.catError = "";
      root._bank.catDraft = null;
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    var catSave = t.closest("[data-bank-cat-save]");
    if (catSave && catSave.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var catId = catSave.getAttribute("data-bank-cat-save");
      var catInput = root.querySelector ? root.querySelector('[data-bank-cat-budget="' + catId + '"]') : null;
      var catTier = root.querySelector ? root.querySelector('[data-bank-cat-tier="' + catId + '"]') : null;
      if (catTier && catTier.value) {
        var liveRow = bankSpendById(bankSpendCategories(root._bank.data), catId);
        return bankSpendSaveRow(root, catId, liveRow ? liveRow.name : catId, catTier.value, catInput ? catInput.value : "");
      }
      return bankSpendSaveBudget(root, catId, catInput ? catInput.value : "");
    }
    var catRow = t.closest("[data-bank-cat-row]");
    if (catRow && catRow.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.catOpen = catRow.getAttribute("data-bank-cat-row");
      root._bank.groupOpen = "";
      root._bank.catError = "";
      root._bank.catDraft = null;
      var catMonth = root._bank.tab === "historical" ? root._bank.histMonth : (root._bank.planMonth || bankMonthKey(bankCalendarMonth(root._bank.data)));
      root._bank.catMonth = bankMonthKey(catMonth);
      bankPaint(root);
      return;
    }
    var spendUndo = t.closest("[data-bank-spend-undo]");
    if (spendUndo && root._bank) {
      if (e.preventDefault) e.preventDefault();
      return bankSpendUndo(root);
    }
    var spendAdd = t.closest("[data-bank-spend-add]");
    if (spendAdd && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var addName = bankSpendRead(bankSpendField(root, '[data-bank-spend-name="new"]'));
      var addTier = bankSpendRead(bankSpendField(root, '[data-bank-spend-tier="new"]'));
      return bankSpendAdd(root, addName, addTier, bankSpendRead(bankSpendField(root, '[data-bank-spend-budget="new"]')));
    }
    var spendSave = t.closest("[data-bank-spend-save]");
    if (spendSave && spendSave.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var saveId = spendSave.getAttribute("data-bank-spend-save");
      return bankSpendSaveRow(root, saveId,
        bankSpendRead(bankSpendField(root, '[data-bank-spend-name="' + saveId + '"]')),
        bankSpendRead(bankSpendField(root, '[data-bank-spend-tier="' + saveId + '"]')),
        bankSpendRead(bankSpendField(root, '[data-bank-spend-budget="' + saveId + '"]')));
    }
    var spendMerge = t.closest("[data-bank-spend-merge]");
    if (spendMerge && spendMerge.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var mergeId = spendMerge.getAttribute("data-bank-spend-merge");
      return bankSpendMerge(root, mergeId, bankSpendRead(bankSpendField(root, '[data-bank-spend-into="' + mergeId + '"]')));
    }
    var spendDelete = t.closest("[data-bank-spend-delete]");
    if (spendDelete && spendDelete.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var deleteId = spendDelete.getAttribute("data-bank-spend-delete");
      var keep = "add";
      if (root.querySelectorAll) {
        var keepNodes = root.querySelectorAll('[data-bank-spend-keep="' + deleteId + '"]');
        var ki;
        for (ki = 0; ki < keepNodes.length; ki++) if (keepNodes[ki].checked) keep = keepNodes[ki].value || "add";
      }
      return bankSpendDelete(root, deleteId,
        bankSpendRead(bankSpendField(root, '[data-bank-spend-dest="' + deleteId + '"]')),
        keep);
    }
    var dayClose = t.closest("[data-bank-day-close], [data-bank-day-scrim]");
    if (dayClose) {
      if (e.preventDefault) e.preventDefault();
      bankCloseDay(root);
      return;
    }
    var cancelOpen = t.closest("[data-bank-cancel-open]");
    if (cancelOpen && cancelOpen.getAttribute && root._bank) {
      var skipOpen = t.closest(".fills-affordance, input, select, textarea, button, a, label");
      var blockedOpen = skipOpen && skipOpen !== cancelOpen && (!cancelOpen.contains || cancelOpen.contains(skipOpen));
      if (!blockedOpen) {
        if (e.preventDefault) e.preventDefault();
        var openKey = cancelOpen.getAttribute("data-bank-cancel");
        var openRow = bankDeskRowByKey(root._bank.data, openKey);
        var screenYm = bankMonthKey(root._bank.planMonth || bankCalendarMonth(root._bank.data));
        var fromChoice = openRow && bankMonthHasCharge(root._bank.data, openRow, screenYm) ? "next" : "this";
        root._bank.billAccountSaved = "";
        root._bank.billAccountError = "";
        root._bank.cancelSheet = {
          key: openKey,
          name: openRow ? bankBillDisplayName(openRow.name, openRow.display_label) : openKey,
          fromChoice: fromChoice
        };
        bankPaint(root);
        return;
      }
    }
    var cancelFrom = t.closest("[data-bank-cancel-from]");
    if (cancelFrom && cancelFrom.getAttribute && root._bank && root._bank.cancelSheet) {
      if (e.preventDefault) e.preventDefault();
      root._bank.cancelSheet.fromChoice = cancelFrom.getAttribute("data-bank-cancel-from") === "next" ? "next" : "this";
      bankPaint(root);
      return;
    }
    var cancelGo = t.closest("[data-bank-cancel-go]");
    if (cancelGo && root._bank && root._bank.cancelSheet) {
      if (e.preventDefault) e.preventDefault();
      var pendingSheet = root._bank.cancelSheet;
      var screenYm = bankMonthKey(root._bank.planMonth || bankCalendarMonth(root._bank.data));
      var fromMonth = pendingSheet.fromChoice === "next" ? bankShiftYm(screenYm, 1) : screenYm;
      root._bank.cancelToast = { key: pendingSheet.key, name: pendingSheet.name };
      root._bank.cancelSheet = null;
      return bankSaveBillStatus(root, pendingSheet.key, { status: "cancelled", from: fromMonth });
    }
    var cancelClose = t.closest("[data-bank-cancel-close]");
    if (cancelClose && root._bank) {
      if (e.preventDefault) e.preventDefault();
      root._bank.cancelSheet = null;
      bankPaint(root);
      return;
    }
    var nextDot = t.closest("[data-bank-next-dot]");
    if (nextDot && nextDot.getAttribute && root._bank) {
      if (e.preventDefault) e.preventDefault();
      var dotIndex = Number(nextDot.getAttribute("data-bank-next-dot"));
      if (!(dotIndex >= 0)) dotIndex = 0;
      root._bank.nextIndex = dotIndex;
      if (root.querySelectorAll) {
        var dotNodes = root.querySelectorAll("[data-bank-next-dot]");
        var cardNodes = root.querySelectorAll("[data-bank-next-card]");
        var di;
        for (di = 0; di < dotNodes.length; di++) {
          if (di === dotIndex) {
            dotNodes[di].setAttribute("aria-current", "true");
            if (dotNodes[di].classList) dotNodes[di].classList.add("on");
          } else {
            dotNodes[di].removeAttribute("aria-current");
            if (dotNodes[di].classList) dotNodes[di].classList.remove("on");
          }
        }
        bankPlaceNextPay(root, true);
        return;
      }
      bankPaint(root);
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
      if (root._bank) root._bank.cancelToast = null;
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
  });
  root.addEventListener("change", function (e) {
    var el = e && e.target;
    if (!el || !el.getAttribute) return;
    if (el.getAttribute("data-bank-payfrom") != null) {
      var rawPay = el.value == null ? "" : String(el.value);
      return bankSaveBillAccount(root, el.getAttribute("data-bank-payfrom"), rawPay === "" ? null : rawPay);
    }
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
      if (which === "category") root._bank.txCat = el.value || "";
      if (which === "order") root._bank.txOrder = el.value === "asc" || el.value === "amount" ? el.value : "desc";
      root._bank.tab = "edits";
      bankPaint(root);
      return;
    }
    if (el.getAttribute("data-bank-tx-scope")) {
      if (root._bank) root._bank.txScope = el.value === "merchant" ? "merchant" : "one";
      return;
    }
    if (el.getAttribute("data-bank-tx-pick")) {
      if (el.closest && el.closest("[data-bank-tx-sheet]")) return;
      if (el.getAttribute("data-bank-tx-narrow") === "1" && root._bank && bankCategoriesActive(root._bank.data)) {
        root._bank.catNarrow = { key: el.getAttribute("data-bank-tx-pick"), tier: bankTierWord(el.value) || "" };
        root._bank.tab = "edits";
        bankPaint(root);
        return;
      }
      var picked = bankTierWord(el.value);
      var scopeEl = el.parentNode && el.parentNode.querySelector ? el.parentNode.querySelector("[data-bank-tx-scope]") : null;
      var scope = scopeEl && scopeEl.value ? scopeEl.value : (root._bank && root._bank.txScope) || "one";
      if (scope === "one") return bankSaveTxOverride(root, el.getAttribute("data-bank-tx-pick"), picked);
      return bankSaveTier(root, el.getAttribute("data-bank-tx-merchant") || el.getAttribute("data-bank-tx-pick"), picked);
    }
    if (el.getAttribute("data-bank-tx-cat")) {
      if (el.closest && el.closest("[data-bank-tx-sheet]")) return;
      var catRaw = el.value == null ? "" : String(el.value);
      if (!catRaw || !root._bank) return;
      var catPick = catRaw === bankOffSpendValue() ? null : catRaw;
      var catScopeEl = el.parentNode && el.parentNode.querySelector ? el.parentNode.querySelector("[data-bank-tx-scope]") : null;
      var catScope = catScopeEl && catScopeEl.value ? catScopeEl.value : (root._bank.txScope || "one");
      if (catScope === "one") return bankSpendSaveTx(root, el.getAttribute("data-bank-tx-cat"), catPick);
      return bankSpendSaveRule(root, el.getAttribute("data-bank-tx-merchant"), catPick);
    }
    if (el.getAttribute("data-bank-item-cat")) {
      var itemCat = el.value == null ? "" : String(el.value);
      if (!itemCat) return;
      var itemKey = bankTierKey(el.getAttribute("data-bank-item-cat")) || el.getAttribute("data-bank-item-cat");
      return bankSpendSaveRule(root, itemKey, itemCat);
    }
    if (bankCategoriesActive(root._bank && root._bank.data) && (el.getAttribute("data-bank-kind") || el.getAttribute("data-bank-row-tier") || el.getAttribute("data-bank-plan-tier") || el.getAttribute("data-bank-tx-pick"))) return;
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
      root._bank.txSeq = (root._bank.txSeq || 0) + 1;
      var seq = root._bank.txSeq;
      root._bank.txTimer = setTimeout(function () {
        if (!root._bank || root._bank.txSeq !== seq) return;
        root._bank.txTimer = 0;
        var snap = root._bank.data;
        bankWarmTxOverrideKeys(snap).then(function () {
          if (!root._bank || root._bank.txSeq !== seq) return;
          bankPaintTxResults(root);
        }, function () {
          if (!root._bank || root._bank.txSeq !== seq) return;
          bankPaintTxResults(root);
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
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && root._bank && el.closest) {
      var typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      var track = el.getAttribute && el.getAttribute("data-bank-next-track") ? el : el.closest("[data-bank-next-track], [data-bank-next-card], [data-bank-next-dot]");
      if (!typing && track) {
        if (e.preventDefault) e.preventDefault();
        var step = e.key === "ArrowRight" ? 1 : -1;
        var countNode = root.querySelector ? root.querySelector("[data-bank-next-count]") : null;
        var count = countNode ? Number(countNode.getAttribute("data-bank-next-count")) : 0;
        var idx = (root._bank.nextIndex || 0) + step;
        if (idx < 0) idx = 0;
        if (count && idx >= count) idx = count - 1;
        root._bank.nextIndex = idx;
        if (root.querySelectorAll) {
          var cards = root.querySelectorAll("[data-bank-next-card]");
          var dots = root.querySelectorAll("[data-bank-next-dot]");
          var ki;
          for (ki = 0; ki < dots.length; ki++) {
            if (ki === idx) {
              dots[ki].setAttribute("aria-current", "true");
              if (dots[ki].classList) dots[ki].classList.add("on");
            } else {
              dots[ki].removeAttribute("aria-current");
              if (dots[ki].classList) dots[ki].classList.remove("on");
            }
          }
          bankPlaceNextPay(root, true);
          return;
        }
        bankPaint(root);
        return;
      }
    }
    if (e.key === "Escape" && root._bank && root._bank.cancelSheet) {
      if (e.preventDefault) e.preventDefault();
      root._bank.cancelSheet = null;
      bankPaint(root);
      return;
    }
    if (e.key === "Escape" && root._bank && (root._bank.catOpen || root._bank.groupOpen || root._bank.spendOpen || root._bank.txOpen)) {
      if (e.preventDefault) e.preventDefault();
      root._bank.catOpen = "";
      root._bank.groupOpen = "";
      root._bank.spendOpen = "";
      root._bank.txOpen = "";
      root._bank.catDraft = null;
      root._bank.catError = "";
      bankPaint(root);
      return;
    }
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
          bankFocusNoScroll(last);
        } else if (!e.shiftKey && el === last) {
          if (e.preventDefault) e.preventDefault();
          bankFocusNoScroll(first);
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
          bankFocusNoScroll(next);
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
