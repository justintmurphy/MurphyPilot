/* Pay and Taxes desk.
   GET /data/pay and GET /data/taxes, each once per page load, kept on this module.
   Summary cards render first. A check's lines render only after that row is tapped. */
var PAY_URL = "/data/pay";
var TAX_URL = "/data/taxes";
var PAY_SCHEMA = "pay/v1";
var TAX_SCHEMA = "taxes/v1";
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var SECTION = {
  earnings: "Earnings",
  taxes: "Tax",
  pretax: "Pre-tax",
  posttax: "Post-tax",
  employer: "Employer"
};
var mem = { pay: null, taxes: null };
var flight = { pay: null, taxes: null };
var epoch = 0;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function grouped(n) {
  var abs = Math.abs(Number(n)).toFixed(2);
  var bits = abs.split(".");
  bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return bits[0] + "." + bits[1];
}

function moneyText(n, mode) {
  if (n == null || n === "" || !isFinite(Number(n))) return { text: "\u2014", tone: "tone-flat" };
  var v = Number(n);
  var body = grouped(v);
  if (mode === "out") {
    if (v === 0) return { text: "$0.00", tone: "tone-flat" };
    return { text: "-$" + body, tone: "tone-stop" };
  }
  if (mode === "in") {
    if (v === 0) return { text: "$0.00", tone: "tone-flat" };
    if (v < 0) return { text: "-$" + body, tone: "tone-stop" };
    return { text: "+$" + body, tone: "tone-go" };
  }
  if (mode === "signed") {
    if (v < 0) return { text: "-$" + body, tone: "tone-stop" };
    if (v > 0) return { text: "+$" + body, tone: "tone-go" };
    return { text: "$0.00", tone: "tone-flat" };
  }
  if (v < 0) return { text: "-$" + body, tone: "tone-flat" };
  return { text: "$" + body, tone: "tone-flat" };
}

function moneyTd(n, mode) {
  var m = moneyText(n, mode);
  return '<td class="num ' + m.tone + '">' + m.text + "</td>";
}

function dashTd() {
  return '<td class="num tone-flat">\u2014</td>';
}

function nullableMoneyTd(n, mode) {
  if (n == null || n === "") return dashTd();
  return moneyTd(n, mode);
}

function pctText(n, signed) {
  if (n == null || n === "" || !isFinite(Number(n))) return "\u2014";
  var v = Number(n);
  var abs = Math.abs(v).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  var text = abs;
  if (v < 0) text = "-" + abs;
  else if (signed && v > 0) text = "+" + abs;
  return text + "%";
}

function deltaExtra(pct, invert) {
  if (pct == null || pct === "" || !isFinite(Number(pct))) return { text: "\u2014", tone: "tone-flat" };
  var v = Number(pct);
  var tone = "tone-flat";
  if (v > 0) tone = invert ? "tone-stop" : "tone-go";
  else if (v < 0) tone = invert ? "tone-go" : "tone-stop";
  return { text: pctText(v, true), tone: tone };
}

function pctTd(n, invert) {
  var extra = deltaExtra(n, !!invert);
  return '<td class="num ' + extra.tone + '">' + extra.text + "</td>";
}

function textKpi(label, text) {
  return '<div><span>' + esc(label) + "</span> <b>" + esc(text) + "</b></div>";
}

function moneyKpi(label, n, mode, extra) {
  var m = moneyText(n, mode);
  var sub = extra ? ' <small class="dod ' + extra.tone + '">' + extra.text + "</small>" : "";
  return '<div><span>' + esc(label) + '</span> <b class="' + m.tone + '">' + m.text + "</b>" + sub + "</div>";
}

function hint(text) {
  if (!text) return "";
  return '<p class="hint">' + esc(text) + "</p>";
}

function card(title, id, inner) {
  return "<h2>" + esc(title) + '</h2><div class="card span" data-card="' + id + '">' + inner + "</div>";
}

function fmtDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "\u2014";
  var month = MONTHS[Number(m[2]) - 1];
  if (!month) return "\u2014";
  return month + " " + String(Number(m[3])) + ", " + m[1];
}

function checkYear(c) {
  var m = /^(\d{4})-/.exec(String(c && c.pay_date || ""));
  return m ? Number(m[1]) : NaN;
}

function typeLabel(type) {
  var map = {
    regular: "Regular",
    regular_bonus: "Regular bonus",
    bonus: "Bonus",
    noncash: "Noncash",
    other: "Other"
  };
  return map[type] || "Other";
}

function yearsOf(rows) {
  var out = [];
  (rows || []).forEach(function (r) {
    if (!r || r.year == null) return;
    var y = Number(r.year);
    if (!isFinite(y) || out.indexOf(y) >= 0) return;
    out.push(y);
  });
  out.sort(function (a, b) { return a - b; });
  return out;
}

function pickYear(years, wanted, asof) {
  if (wanted != null && wanted !== "" && years.indexOf(Number(wanted)) >= 0) return Number(wanted);
  if (years.length) return years[years.length - 1];
  var y = Number(String(asof || "").slice(0, 4));
  return isFinite(y) ? y : "";
}

function titleRow(kind, year, years) {
  var name = kind === "taxes" ? "Taxes" : "Pay";
  var shown = year === "" || year == null ? "\u2014" : String(year);
  var title = name + " \u00b7 " + shown;
  var pick = "";
  if (years.length) {
    var opts = years.map(function (y) {
      var sel = Number(y) === Number(year) ? " selected" : "";
      return '<option value="' + esc(y) + '"' + sel + ">" + esc(y) + "</option>";
    }).join("");
    pick = '<label>Year <select data-year-pick="' + (kind === "taxes" ? "taxes" : "pay") + '">' + opts + "</select></label>";
  }
  return '<div class="row2"><h2>' + esc(title) + "</h2>" + pick + "</div>";
}

function capWrap(inner, count, label) {
  var api = typeof MPListCap !== "undefined" ? MPListCap : null;
  if (api && api.capHtml) return api.capHtml(inner, { count: count, max: 10, label: label });
  if (!(count > 10)) return inner;
  return '<div class="list-cap" style="--list-cap-rows:10" tabindex="0" role="region" aria-label="' + esc(label) + '">' +
    inner + '</div><p class="list-cap-note">Showing 10 of ' + count + ", scroll for more</p>";
}

function moreBlock(inner, open) {
  return '<details class="fills-more"' + (open ? " open" : "") + ">" +
    '<summary><span class="fills-sum">More details</span> <span class="fills-affordance"><i class="cf-chev" aria-hidden="true"></i><span class="fills-dot"> \u00b7 </span><span class="fills-lab-show">Show</span> <span class="fills-lab-hide">Hide</span></span></summary>' +
    inner + "</details>";
}

function checksForYear(doc, year) {
  return (doc.checks || []).filter(function (c) {
    return checkYear(c) === Number(year);
  }).slice().sort(function (a, b) {
    var d = String(b.pay_date || "").localeCompare(String(a.pay_date || ""));
    if (d) return d;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function summaryYear(doc, year) {
  var ytd = doc.ytd || {};
  var cur = ytd.this_year;
  if (cur && Number(cur.year) === Number(year)) {
    return {
      gross: cur.gross,
      taxes: cur.taxes,
      k401: cur.k401 && cur.k401.employee_total,
      net: cur.net,
      delta: ytd.delta || null,
      samePoint: true
    };
  }
  var rows = doc.by_year || [];
  var i;
  for (i = 0; i < rows.length; i++) {
    if (Number(rows[i].year) === Number(year)) {
      return {
        gross: rows[i].gross,
        taxes: rows[i].taxes,
        k401: rows[i].k401 && rows[i].k401.employee_total,
        net: rows[i].net,
        delta: null,
        samePoint: false
      };
    }
  }
  return null;
}

function k401ForYear(doc, year) {
  var rows = (doc.k401 && doc.k401.by_year) || [];
  var i;
  for (i = 0; i < rows.length; i++) {
    if (Number(rows[i].year) === Number(year)) return rows[i];
  }
  var cur = doc.ytd && doc.ytd.this_year;
  if (cur && Number(cur.year) === Number(year)) return cur.k401 || null;
  return null;
}

function latestCard(check) {
  if (!check) return card("Latest check", "latest", hint("No check for this year."));
  var kpis = '<div class="kpi">' +
    textKpi("Date", fmtDate(check.pay_date)) +
    textKpi("Type", typeLabel(check.type)) +
    moneyKpi("Gross", check.gross, "in") +
    moneyKpi("Net", check.net, "in") +
    "</div>";
  var rows = [
    ["Federal", "federal"],
    ["Social Security", "fica_ss"],
    ["Medicare", "medicare"],
    ["State", "state"],
    ["Local", "local"],
    ["401(k) pre-tax", "k401_pretax"],
    ["401(k) after-tax", "k401_aftertax"],
    ["401(k) Roth", "k401_roth"],
    ["Insurance / HSA", "insurance_hsa"],
    ["401(k) loan", "loan_401k"],
    ["Other", "other"]
  ];
  var buckets = check.buckets || {};
  var body = rows.map(function (pair) {
    return "<tr><td>" + pair[0] + "</td>" + moneyTd(buckets[pair[1]], "out") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Where it went</th><th class="num">Amount</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  var note = check.reconciles === false ? hint("This check does not add up to gross.") : "";
  return card("Latest check", "latest", kpis + table + note);
}

function ytdCard(doc, year) {
  var sum = summaryYear(doc, year);
  if (!sum) return card("Year to date", "ytd", hint("No year totals."));
  var delta = sum.delta || {};
  function cell(label, value, mode, pct, invert) {
    return moneyKpi(label, value, mode, sum.samePoint ? deltaExtra(pct, invert) : null);
  }
  var kpis = '<div class="kpi">' +
    cell("Gross", sum.gross, "in", delta.gross_pct, false) +
    cell("Taxes", sum.taxes, "out", delta.taxes_pct, true) +
    moneyKpi("401(k)", sum.k401, "out") +
    cell("Net", sum.net, "in", delta.net_pct, false) +
    "</div>";
  var line = sum.samePoint ? "Versus the same calendar point last year." : "Full-year totals for the selected year.";
  return card(sum.samePoint ? "Year to date" : "Full year", "ytd", kpis + hint(line));
}

function k401Card(doc, year, latest) {
  var elected = (latest && latest.k401_elected_pct) || {};
  var row = k401ForYear(doc, year) || {};
  var match = row.employer_match_on_stub;
  var elect = '<p class="mix-hint">Elected</p><div class="kpi">' +
    textKpi("Pre-tax", pctText(elected.pretax, false)) +
    textKpi("Roth", pctText(elected.roth, false)) +
    textKpi("After-tax", pctText(elected.aftertax, false)) +
    "</div>";
  var put = '<p class="mix-hint">Contributions</p><div class="kpi">' +
    moneyKpi("Pre-tax", row.pretax, "out") +
    moneyKpi("Roth", row.roth, "out") +
    moneyKpi("After-tax", row.aftertax, "out") +
    moneyKpi("Match on stub", match, match ? "in" : "plain") +
    "</div>";
  return card("401(k)", "k401", elect + put + hint("On stub understates the match."));
}

function lineMode(line) {
  var section = line && line.section;
  if (section === "taxes" || section === "pretax" || section === "posttax") return "out";
  if (section === "earnings" && line.cash !== false) return "in";
  return "plain";
}

function linesTable(check) {
  var lines = (check && check.lines) || [];
  var body = lines.map(function (line) {
    var section = SECTION[line.section] || "Line";
    return '<tr><td><span class="sym">' + esc(line.label || "Line") + '</span> <span class="sub">' + esc(section) + "</span></td>" +
      moneyTd(line.current, lineMode(line)) + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Line</th><th class="num">Amount</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return capWrap(table, lines.length, "Check lines");
}

function checksCard(checks, latest, openId) {
  if (!checks.length) return card("Checks", "checks", hint("No checks for this year."));
  var body = checks.map(function (c) {
    var onCard = !!(latest && c.id === latest.id);
    var gross = onCard ? '<td class="num"><span class="sub">On the card</span></td>' : moneyTd(c.gross, "in");
    var net = onCard ? '<td class="num"><span class="sub">On the card</span></td>' : moneyTd(c.net, "in");
    var expanded = c.id === openId;
    var row = '<tr data-check-id="' + esc(c.id) + '" tabindex="0" role="button" aria-expanded="' +
      (expanded ? "true" : "false") + '"><td>' + esc(fmtDate(c.pay_date)) + "</td><td>" + esc(typeLabel(c.type)) +
      "</td>" + gross + net + "</tr>";
    if (!expanded) return row;
    return row + '<tr data-check-lines="' + esc(c.id) + '"><td colspan="4">' + linesTable(c) + "</td></tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Date</th><th>Type</th><th class="num">Gross</th><th class="num">Net</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Checks", "checks", capWrap(table, checks.length, "Checks") + hint("Tap a row for its lines."));
}

function salaryCard(doc) {
  var hist = (doc.salary && doc.salary.history) || [];
  if (!hist.length) return card("Salary", "salary", hint("No salary history."));
  var body = hist.map(function (row) {
    return "<tr><td>" + esc(fmtDate(row.effective)) + "</td><td>" + esc(fmtDate(row.first_pay_date)) + "</td>" +
      moneyTd(row.annual, "plain") + pctTd(row.change_pct, false) + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Effective</th><th>First pay</th><th class="num">Annual</th><th class="num">Change</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Salary", "salary", table);
}

function byYearCard(doc, selected) {
  var rows = (doc.by_year || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  var stub = doc.ytd && doc.ytd.this_year ? Number(doc.ytd.this_year.year) : NaN;
  var body = rows.map(function (row) {
    var hide = Number(row.year) === Number(selected) && Number(selected) !== stub;
    return '<tr><td><span class="sym">' + esc(row.year) + '</span></td><td class="num">' + esc(row.checks) + "</td>" +
      (hide ? dashTd() : moneyTd(row.gross, "in")) +
      (hide ? dashTd() : moneyTd(row.taxes, "out")) +
      (hide ? dashTd() : moneyTd(row.net, "in")) + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Year</th><th class="num">Checks</th><th class="num">Gross</th><th class="num">Taxes</th><th class="num">Net</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("By year", "by-year", capWrap(table, rows.length, "Years"));
}

function flagsCard(flags, mode) {
  flags = flags || [];
  if (!flags.length) return card("Flags", "flags", hint("No flags."));
  var head = mode === "tax" ? "Year" : "Date";
  var body = flags.map(function (flag) {
    var when = mode === "tax" ? (flag.year != null ? String(flag.year) : "\u2014") : fmtDate(flag.date);
    return "<tr><td>" + esc(when) + "</td><td>" + esc(flag.text || "") + "</td></tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>' + head + "</th><th>Note</th></tr></thead><tbody>" + body + "</tbody></table>";
  return card("Flags", "flags", table);
}

function payHtml(doc, state) {
  var years = yearsOf(doc.by_year);
  var year = pickYear(years, state.year, doc.asof);
  var checks = checksForYear(doc, year);
  var latest = checks[0] || null;
  var openId = "";
  if (state.openCheckId && checks.some(function (c) { return c.id === state.openCheckId; })) openId = state.openCheckId;
  return titleRow("pay", year, years) +
    latestCard(latest) +
    ytdCard(doc, year) +
    '<div class="split-two"><div>' + k401Card(doc, year, latest) + "</div><div>" +
    checksCard(checks, latest, openId) + "</div></div>" +
    moreBlock(salaryCard(doc) + byYearCard(doc, year) + flagsCard(doc.flags, "pay"), !!state.detailsOpen);
}

function methodLine(method) {
  if (method === "projection_adjusted_by_stubs") return "Projection adjusted by stubs.";
  return "Estimate.";
}

function estimateCard(doc) {
  var est = doc.estimate || {};
  var fed = est.federal || {};
  var state = est.state || {};
  var local = est.local || {};
  var heading = "Estimate";
  if (est.year != null) heading += " \u00b7 " + est.year;
  var kpis = '<div class="kpi">' +
    moneyKpi("Federal", fed.refund_or_owed, "signed") +
    moneyKpi("State", state.refund_or_owed, "signed") +
    moneyKpi("Local", local.refund_or_owed, "signed") +
    "</div>";
  var body = (est.scenarios || []).map(function (row) {
    return '<tr><td><span class="sym">' + esc(row.label || "Scenario") + "</span></td>" +
      moneyTd(row.refund_or_owed, "signed") +
      moneyTd(row.extra_per_check_to_break_even, "plain") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Scenario</th><th class="num">Refund / owed</th><th class="num">Extra per check</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card(heading, "estimate", kpis + table + hint(methodLine(est.method)));
}

function yearsCard(doc, selected) {
  var rows = (doc.years || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  var body = rows.map(function (row) {
    var net = row.net != null ? row.net : (Number(row.refund) || 0) - (Number(row.owed) || 0);
    var mark = Number(row.year) === Number(selected) ? ' <span class="sub">Selected</span>' : "";
    return '<tr><td><span class="sym">' + esc(row.year) + "</span>" + mark + "</td>" +
      moneyTd(row.agi, "plain") + moneyTd(row.total_tax, "out") + moneyTd(net, "signed") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Year</th><th class="num">AGI</th><th class="num">Total tax</th><th class="num">Refund / owed</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Years", "years", capWrap(table, rows.length, "Tax years"));
}

function energyCard(doc) {
  var credits = doc.credits || {};
  var used = (credits.energy_used_by_year || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  var body = used.map(function (row) {
    return "<tr><td>" + esc(row.year) + "</td>" + nullableMoneyTd(row.amount, "in") + "</tr>";
  }).join("");
  body += '<tr data-carry="used-next"><td>Used next</td>' + nullableMoneyTd(credits.energy_carryforward_used_next, "in") + "</tr>";
  body += '<tr data-carry="remaining"><td>Remaining</td>' + nullableMoneyTd(credits.energy_carryforward_remaining, "in") + "</tr>";
  var table = '<table class="book"><thead><tr><th>Year</th><th class="num">Amount</th></tr></thead><tbody>' + body + "</tbody></table>";
  return card("Energy credit", "energy", table);
}

function taxesHtml(doc, state) {
  var years = yearsOf(doc.years);
  var year = pickYear(years, state.year, doc.asof);
  return titleRow("taxes", year, years) +
    '<div class="split-two"><div>' + estimateCard(doc) + "</div><div>" + yearsCard(doc, year) + "</div></div>" +
    moreBlock(energyCard(doc) + flagsCard(doc.flags, "tax"), !!state.detailsOpen);
}

function pageHtml(kind, doc, state) {
  state = state || {};
  if (!doc || doc.schema !== (kind === "taxes" ? TAX_SCHEMA : PAY_SCHEMA)) return gateHtml(kind, "error");
  if (kind === "taxes") return taxesHtml(doc, state);
  return payHtml(doc, state);
}

function gateHtml(kind, gate) {
  var name = kind === "taxes" ? "Taxes" : "Pay";
  if (gate === "signin") {
    return '<h2>Sign in</h2><div class="card span" data-gate="401"><p class="hint">Sign in with the one-time passcode on this site, then reload.</p></div>';
  }
  if (gate === "seat") {
    return '<h2>Not available</h2><div class="card span" data-gate="403"><p class="hint">Not available for this seat</p></div>';
  }
  if (gate === "empty") {
    var empty = kind === "taxes" ? "No taxes data loaded yet" : "No pay data loaded yet";
    return "<h2>" + name + '</h2><div class="card span" data-gate="404"><p class="hint">' + empty + "</p></div>";
  }
  return "<h2>" + name + '</h2><div class="card span" data-gate="error"><p class="hint">The feed did not answer.</p></div>';
}

function settle(kind, res, ticket) {
  if (ticket !== epoch) return Promise.resolve({ ok: false, status: 0, gate: "error" });
  var status = res && Number(res.status);
  if (status === 401) return Promise.resolve({ ok: false, status: 401, gate: "signin" });
  if (status === 403) return Promise.resolve({ ok: false, status: 403, gate: "seat" });
  if (status === 404) {
    var readMissing = res && res.json ? res.json() : Promise.resolve(null);
    return Promise.resolve(readMissing).then(function (body) {
      if (ticket !== epoch) return { ok: false, status: 0, gate: "error" };
      if (body && body.error === "not_loaded") return { ok: false, status: 404, gate: "empty" };
      return { ok: false, status: 404, gate: "error" };
    }, function () {
      return { ok: false, status: 404, gate: "error" };
    });
  }
  if (!res || status !== 200) return Promise.resolve({ ok: false, status: status || 0, gate: "error" });
  var read = res.json ? res.json() : Promise.reject(new Error("json"));
  return Promise.resolve(read).then(function (doc) {
    if (ticket !== epoch) return { ok: false, status: 0, gate: "error" };
    var expect = kind === "taxes" ? TAX_SCHEMA : PAY_SCHEMA;
    if (!doc || doc.schema !== expect) return { ok: false, status: 200, gate: "error" };
    mem[kind] = doc;
    return { ok: true, status: 200, doc: doc };
  }, function () {
    return { ok: false, status: 200, gate: "error" };
  });
}

function load(kind, fetcher) {
  if (kind !== "pay" && kind !== "taxes") return Promise.resolve({ ok: false, status: 0, gate: "error" });
  if (mem[kind]) return Promise.resolve({ ok: true, status: 200, doc: mem[kind], cached: true });
  if (flight[kind]) return flight[kind];
  var fetchFn = typeof fetcher === "function" ? fetcher : (typeof fetch === "function" ? fetch : null);
  if (!fetchFn) return Promise.resolve({ ok: false, status: 0, gate: "error" });
  var url = kind === "pay" ? PAY_URL : TAX_URL;
  var ticket = epoch;
  var init = { credentials: "same-origin", cache: "no-store" };
  var pending = Promise.resolve().then(function () {
    return fetchFn(url, init);
  }).then(function (res) {
    return settle(kind, res, ticket);
  });
  var done = pending.then(function (out) {
    if (flight[kind] === done) flight[kind] = null;
    return out;
  }, function () {
    if (flight[kind] === done) flight[kind] = null;
    return { ok: false, status: 0, gate: "error" };
  });
  flight[kind] = done;
  return done;
}

function reset() {
  epoch += 1;
  mem.pay = null;
  mem.taxes = null;
  flight.pay = null;
  flight.taxes = null;
}

function afterLayout(root) {
  var api = typeof MPListCap !== "undefined" ? MPListCap : null;
  if (!api || !root || !api.refresh) return;
  try { api.refresh(root); } catch (e) {}
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      try { api.refresh(root); } catch (e2) {}
    });
  }
}

function paint(root, kind, result) {
  if (!root) return;
  var state = root._paydeskState || (root._paydeskState = {});
  var html = result && result.ok ? pageHtml(kind, result.doc, state) : gateHtml(kind, result && result.gate);
  root.innerHTML = html;
  var year = "";
  var title = root.querySelector ? root.querySelector("h2") : null;
  if (title && title.textContent) year = title.textContent;
  try {
    if (typeof document !== "undefined" && document && year) document.title = year;
  } catch (e) {}
  afterLayout(root);
}

function bind(root, kind) {
  if (!root || root._paydeskBound) return;
  root._paydeskBound = true;
  root._paydeskState = root._paydeskState || {};
  root.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var row = target.closest("tr[data-check-id]");
    if (!row || (root.contains && !root.contains(row))) return;
    var id = row.getAttribute("data-check-id");
    var state = root._paydeskState;
    state.openCheckId = state.openCheckId === id ? "" : id;
    if (!mem[kind]) return;
    paint(root, kind, { ok: true, doc: mem[kind] });
  });
  root.addEventListener("keydown", function (e) {
    if (!e || (e.key !== "Enter" && e.key !== " ")) return;
    var target = e.target;
    if (!target || !target.closest) return;
    var row = target.closest("tr[data-check-id]");
    if (!row) return;
    e.preventDefault();
    if (typeof row.click === "function") row.click();
  });
  root.addEventListener("change", function (e) {
    var sel = e.target;
    if (!sel || !sel.getAttribute || !sel.getAttribute("data-year-pick")) return;
    var state = root._paydeskState;
    state.year = Number(sel.value);
    state.openCheckId = "";
    if (!mem[kind]) return;
    paint(root, kind, { ok: true, doc: mem[kind] });
  });
  root.addEventListener("toggle", function (e) {
    var details = e.target;
    if (!details || !details.classList || !details.classList.contains("fills-more")) return;
    root._paydeskState.detailsOpen = !!details.open;
  }, true);
}

function start() {
  var doc = typeof document === "undefined" ? null : document;
  if (!doc || !doc.getElementById) return;
  var payRoot = doc.getElementById("payDesk");
  var taxRoot = doc.getElementById("taxDesk");
  var root = payRoot || taxRoot;
  if (!root) return;
  var kind = payRoot ? "pay" : "taxes";
  bind(root, kind);
  root.innerHTML = '<p class="hint">Loading\u2026</p>';
  load(kind).then(function (result) { paint(root, kind, result); });
}

var apiRoot = typeof window !== "undefined" ? window : this;
apiRoot.paydeskHtml = pageHtml;
apiRoot.paydeskGate = gateHtml;
apiRoot.paydeskLoad = load;
apiRoot.paydeskReset = reset;
apiRoot.paydeskUrls = { pay: PAY_URL, taxes: TAX_URL };
apiRoot.paydeskStart = start;

if (typeof document !== "undefined" && document && document.getElementById &&
    (document.getElementById("payDesk") || document.getElementById("taxDesk"))) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
