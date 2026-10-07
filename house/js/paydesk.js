/* Pay and Taxes desk.
   GET /data/pay and GET /data/taxes, each once per page load, kept on this module.
   Summary charts render first. Check lines render only after that row is tapped. */
var PAY_URL = "/data/pay";
var TAX_URL = "/data/taxes";
var PAY_SCHEMA = "pay/v1";
var TAX_SCHEMA = "taxes/v1";
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MIX = ["var(--mix-a)", "var(--mix-b)", "var(--mix-c)", "var(--mix-d)", "var(--mix-e)", "var(--go)"];
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
    return { text: "\u2212$" + body, tone: "tone-stop" };
  }
  if (mode === "in") {
    if (v === 0) return { text: "$0.00", tone: "tone-flat" };
    if (v < 0) return { text: "\u2212$" + body, tone: "tone-stop" };
    return { text: "+$" + body, tone: "tone-go" };
  }
  if (mode === "signed") {
    if (v < 0) return { text: "\u2212$" + body, tone: "tone-stop" };
    if (v > 0) return { text: "+$" + body, tone: "tone-go" };
    return { text: "$0.00", tone: "tone-flat" };
  }
  if (v < 0) return { text: "\u2212$" + body, tone: "tone-flat" };
  return { text: "$" + body, tone: "tone-flat" };
}

function moneyTd(n, mode) {
  var m = moneyText(n, mode);
  return '<td class="num ' + m.tone + '">' + m.text + "</td>";
}

function dashTd() {
  return '<td class="num tone-flat">\u2014</td>';
}

function pctText(n, signed) {
  if (n == null || n === "" || !isFinite(Number(n))) return "\u2014";
  var v = Number(n);
  var abs = Math.abs(v).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  var text = abs;
  if (v < 0) text = "\u2212" + abs;
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

function pageTitle(text) {
  return '<div class="bank-nav"><h2 class="bank-view-title" id="bank-view-title">' + esc(text) + "</h2></div>";
}

function shortMoney(n) {
  var v = Number(n);
  if (!isFinite(v)) return "\u2014";
  var neg = v < 0;
  var abs = Math.abs(v);
  var body;
  if (abs >= 1000) {
    var k = Math.round((abs / 1000) * 10) / 10;
    body = (k % 1 === 0 ? String(k) : k.toFixed(1)) + "k";
  } else body = String(Math.round(abs));
  return (neg ? "\u2212$" : "$") + body;
}

function shareText(pct) {
  if (pct > 0 && pct < 1) return "<1%";
  return pct.toFixed(0) + "%";
}

function axisMonth(iso) {
  var m = /^(\d{4})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  var month = MONTHS[Number(m[2]) - 1];
  return month ? month + " " + m[1] : "";
}

function dayIndex(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return null;
  return Number(m[1]) * 372 + Number(m[2]) * 31 + Number(m[3]);
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
  var raw = String(type || "").replace(/_/g, " ");
  if (!raw) return "\u2014";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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

function findYearRow(rows, year) {
  var i;
  for (i = 0; i < (rows || []).length; i++) {
    if (Number(rows[i].year) === Number(year)) return rows[i];
  }
  return null;
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

function yearPick(kind, year, years) {
  if (!years.length) return "";
  var opts = years.map(function (y) {
    var sel = Number(y) === Number(year) ? " selected" : "";
    return '<option value="' + esc(y) + '"' + sel + ">" + esc(y) + "</option>";
  }).join("");
  return '<div class="card span" data-card="year"><label>Year <select data-year-pick="' + esc(kind) + '">' +
    opts + "</select></label></div>";
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

function sortedChecks(doc) {
  return (doc.checks || []).slice().sort(function (a, b) {
    return String(a.pay_date || "").localeCompare(String(b.pay_date || ""));
  });
}

function moneyForYear(doc, year) {
  var stub = doc.ytd && doc.ytd.this_year;
  var row = findYearRow(doc.by_year, year);
  if (stub && Number(stub.year) === Number(year)) {
    return {
      gross: stub.gross,
      taxes: stub.taxes,
      k401: stub.k401 && stub.k401.employee_total,
      net: stub.net,
      basis: "stub",
      checks: stub.checks,
      through: stub.through,
      onFile: row && row.checks != null ? row.checks : stub.checks,
      pretax: stub.pretax,
      posttax: stub.posttax,
      k401split: stub.k401 || null,
      partial: true
    };
  }
  if (!row) return null;
  return {
    gross: row.gross,
    taxes: row.taxes,
    k401: row.k401 && row.k401.employee_total,
    net: row.net,
    basis: "file",
    checks: row.checks,
    through: row.last_pay_date,
    onFile: row.checks,
    buckets: row.buckets || null,
    partial: true,
    lastPay: row.last_pay_date
  };
}

function scalePair(valsList) {
  var flat = [];
  valsList.forEach(function (vals) {
    vals.forEach(function (v) { if (isFinite(v)) flat.push(v); });
  });
  if (!flat.length) return { mn: 0, mx: 1 };
  var mn = Math.min.apply(null, flat);
  var mx = Math.max.apply(null, flat);
  if (mx === mn) {
    var pad = Math.max(Math.abs(mx) * 0.01, 0.5);
    mn -= pad;
    mx += pad;
  }
  return { mn: mn, mx: mx };
}

function polyPoints(vals, box, scale) {
  var span = scale.mx - scale.mn || 1;
  return vals.map(function (v, i) {
    var x = box.pL + i * (box.w - box.pL - box.pR) / Math.max(vals.length - 1, 1);
    var y = box.pT + (box.h - box.pT - box.pB) * (1 - (v - scale.mn) / span);
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
}

function trendChart(checks) {
  var rows = sortedChecks({ checks: checks }).slice(-24);
  if (!rows.length) return hint("No checks for this chart.");
  var gross = rows.map(function (c) { return Number(c.gross) || 0; });
  var net = rows.map(function (c) { return Number(c.net) || 0; });
  var box = { w: 360, h: 108, pL: 8, pR: 72, pT: 16, pB: 22 };
  var scale = scalePair([gross, net]);
  var span = scale.mx - scale.mn || 1;
  var last = rows[rows.length - 1];
  var lastNet = Number(last.net) || 0;
  var xLast = box.pL + (rows.length - 1) * (box.w - box.pL - box.pR) / Math.max(rows.length - 1, 1);
  var yLast = box.pT + (box.h - box.pT - box.pB) * (1 - (lastNet - scale.mn) / span);
  var endLabel = '<text x="' + (xLast + 4).toFixed(1) + '" y="' + yLast.toFixed(1) +
    '" fill="var(--go)" font-size="12">' + esc(moneyText(lastNet, "in").text) + "</text> ";
  var ticks = '<text x="' + box.pL + '" y="' + (box.h - 4) + '" fill="var(--ink-soft)" font-size="12">' +
    esc(axisMonth(rows[0].pay_date)) + '</text> <text x="' + (box.w - box.pR) + '" y="' + (box.h - 4) +
    '" text-anchor="end" fill="var(--ink-soft)" font-size="12">' + esc(axisMonth(last.pay_date)) + "</text>";
  return '<div class="tape-plot"><svg class="ov-line-svg" viewBox="0 0 ' + box.w + " " + box.h +
    '" role="img" aria-label="Net and gross per check">' +
    '<polyline fill="none" stroke="var(--ink-soft)" stroke-opacity="0.35" stroke-width="2" points="' +
    polyPoints(gross, box, scale) + '"></polyline>' +
    '<polyline fill="none" stroke="var(--go)" stroke-width="2" points="' +
    polyPoints(net, box, scale) + '"></polyline>' + endLabel + ticks + "</svg></div>";
}

function stepChart(history) {
  history = history || [];
  if (!history.length) return "";
  var vals = history.map(function (row) { return Number(row.annual) || 0; });
  var box = { w: 360, h: 128, pL: 8, pR: 8, pT: 36, pB: 22 };
  var scale = scalePair([vals]);
  var span = scale.mx - scale.mn || 1;
  var n = history.length;
  var d = "";
  var labels = "";
  history.forEach(function (row, i) {
    var v = Number(row.annual) || 0;
    var x0 = box.pL + i * (box.w - box.pL - box.pR) / Math.max(n, 1);
    var x1 = box.pL + (i + 1) * (box.w - box.pL - box.pR) / Math.max(n, 1);
    var y = box.pT + (box.h - box.pT - box.pB) * (1 - (v - scale.mn) / span);
    d += (i ? " L" : "M") + x0.toFixed(1) + " " + y.toFixed(1) + " L" + x1.toFixed(1) + " " + y.toFixed(1);
    var year = String(row.first_pay_date || row.effective || "").slice(0, 4);
    labels += '<text x="' + x1.toFixed(1) + '" y="' + Math.max(y - 16, 14).toFixed(1) +
      '" text-anchor="end" fill="var(--ink)" font-size="12">' + esc(year) + " " + esc(shortMoney(v)) + "</text> ";
  });
  var first = history[0];
  var last = history[history.length - 1];
  labels += '<text x="' + box.pL + '" y="' + (box.h - 4) + '" fill="var(--ink-soft)" font-size="12">' +
    esc(axisMonth(first.effective || first.first_pay_date)) + "</text> ";
  labels += '<text x="' + (box.w - box.pR) + '" y="' + (box.h - 4) + '" text-anchor="end" fill="var(--ink-soft)" font-size="12">' +
    esc(axisMonth(last.effective || last.first_pay_date)) + "</text> ";
  return '<div class="tape-plot"><svg class="axis-svg" viewBox="0 0 ' + box.w + " " + box.h +
    '" role="img" aria-label="Salary by year">' +
    '<path d="' + d + '" fill="none" stroke="var(--mix-a)" stroke-width="2"></path>' + labels + "</svg></div>";
}

function raisesLine(history) {
  var bits = [];
  var sum = 0;
  var n = 0;
  (history || []).forEach(function (row) {
    if (!row || row.change_pct == null || !isFinite(Number(row.change_pct))) return;
    var year = String(row.first_pay_date || row.effective || "").slice(0, 4);
    bits.push((year ? year + " " : "") + pctText(row.change_pct, true));
    sum += Number(row.change_pct);
    n += 1;
  });
  if (!n) return "";
  return hint("Raises: " + bits.join(", ") + ". Average " + pctText(sum / n, true) + " per year.");
}

function yearAgoCheck(rows, latest) {
  if (!latest) return null;
  var target = dayIndex(latest.pay_date);
  if (target == null) return null;
  target -= 372;
  var best = null;
  var bestDist = 1e9;
  rows.forEach(function (row) {
    if (!row || row === latest) return;
    var d = dayIndex(row.pay_date);
    if (d == null) return;
    var dist = Math.abs(d - target);
    if (dist < bestDist) { bestDist = dist; best = row; }
  });
  return best;
}

function donutPath(cx, cy, r0, r1, a0, a1) {
  var large = a1 - a0 > Math.PI ? 1 : 0;
  function p(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  var p0 = p(r1, a0), p1 = p(r1, a1), p2 = p(r0, a1), p3 = p(r0, a0);
  return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + " A" + r1 + " " + r1 + " 0 " + large + " 1 " +
    p1[0].toFixed(2) + " " + p1[1].toFixed(2) + " L" + p2[0].toFixed(2) + " " + p2[1].toFixed(2) +
    " A" + r0 + " " + r0 + " 0 " + large + " 0 " + p3[0].toFixed(2) + " " + p3[1].toFixed(2) + " Z";
}

function payParts(doc, year) {
  var sum = moneyForYear(doc, year);
  if (!sum) return [];
  var parts = [];
  function add(key, label, value, color, mode) {
    var n = Number(value);
    if (!isFinite(n) || n === 0) return;
    parts.push({ key: key, label: label, value: Math.abs(n), color: color, mode: mode });
  }
  if (sum.basis === "stub") {
    var k = sum.k401split || {};
    add("taxes", "Taxes", sum.taxes, MIX[0], "out");
    add("k401", "401(k)", sum.k401, "var(--mix-d)", "out");
    add("insurance", "Insurance/HSA", Number(sum.pretax) - Number(k.pretax || 0), MIX[2], "out");
    add("loan", "Loan", Number(sum.posttax) - Number(k.roth || 0) - Number(k.aftertax || 0), "var(--mix-e)", "out");
    add("net", "Net", sum.net, "var(--go)", "in");
    return parts;
  }
  var b = sum.buckets || {};
  add("taxes", "Taxes", sum.taxes, MIX[0], "out");
  add("k401", "401(k)", sum.k401, "var(--mix-d)", "out");
  add("insurance", "Insurance/HSA", b.insurance_hsa, MIX[2], "out");
  add("loan", "Loan", b.loan_401k, "var(--mix-e)", "out");
  add("net", "Net", sum.net, "var(--go)", "in");
  return parts;
}

function groupLines(check, key) {
  return ((check && check.lines) || []).filter(function (line) {
    if (line == null || line.current == null || Number(line.current) === 0) return false;
    if (key === "taxes") return line.section === "taxes";
    if (key === "k401") return line.bucket === "k401_pretax" || line.bucket === "k401_roth" || line.bucket === "k401_aftertax";
    if (key === "insurance") return line.bucket === "insurance_hsa" && line.section !== "employer";
    if (key === "loan") return line.bucket === "loan_401k" || line.code === "loan_401k";
    return false;
  });
}

function lineRows(lines, mode) {
  return lines.map(function (line) {
    var use = mode || (line.section === "taxes" || line.section === "pretax" || line.section === "posttax" ? "out" : "plain");
    if (line.section === "earnings" && line.cash !== false) use = "in";
    return "<tr><td><span class=\"sym\">" + esc(line.label || "Line") + "</span></td>" + moneyTd(line.current, use) + "</tr>";
  }).join("");
}

function whereCard(doc, year, checks, openGroup) {
  var parts = payParts(doc, year);
  if (!parts.length) return card("Where your pay goes", "where", hint("No year totals."));
  var total = 0;
  parts.forEach(function (p) { total += p.value; });
  var a = -Math.PI / 2;
  var paths = parts.map(function (p) {
    var da = total ? (p.value / total) * Math.PI * 2 : 0;
    var span = Math.max(da - 0.02, 0.02);
    var d = donutPath(70, 70, 38, 64, a + 0.01, a + 0.01 + span);
    a += da;
    p.pct = total ? (p.value / total) * 100 : 0;
    p.d = d;
    return p;
  });
  var centerPart = null;
  paths.forEach(function (p) { if (p.key === "net") centerPart = p; });
  if (!centerPart) centerPart = paths.slice().sort(function (x, y) { return y.value - x.value; })[0];
  var centerMoney = moneyText(centerPart.value, centerPart.mode);
  var svg = '<div class="mix-ring"><svg class="mix-svg" viewBox="0 0 140 140" aria-hidden="true">' +
    paths.map(function (p) {
      return '<path d="' + p.d + '" fill="' + p.color + '"></path>';
    }).join("") +
    '</svg><div class="mix-center"><b class="' + centerMoney.tone + '">' + centerMoney.text + "</b> <span>" +
    esc(centerPart.label) + "</span></div></div>";
  var latest = checks[0] || null;
  var legend = paths.map(function (p) {
    var on = openGroup === p.key;
    var m = moneyText(p.mode === "in" ? p.value : p.value, p.mode);
    return '<button type="button" class="mix-leg' + (on ? " on" : "") + '" data-pay-group="' + esc(p.key) + '">' +
      '<i style="background:' + p.color + '"></i>' +
      '<span class="mix-leg-meta"><span class="mix-leg-name">' + esc(p.label) + "</span>" +
      '<span class="mix-bar"><span style="width:' + Math.max(p.pct, 2).toFixed(1) + "%;background:" + p.color + '"></span></span></span> ' +
      "<b>" + shareText(p.pct) + " \u00b7 " + '<span class="' + m.tone + '">' + m.text + "</span></b></button>";
  }).join("");
  var lines = "";
  if (openGroup && latest) {
    var got = groupLines(latest, openGroup);
    if (got.length) {
      lines = '<table class="book"><thead><tr><th>Line</th><th class="num">Amount</th></tr></thead><tbody>' +
        lineRows(got) + "</tbody></table>";
    }
  }
  return card("Where your pay goes", "where", '<div class="mix-compact">' + svg +
    '<div class="mix-legend">' + legend + "</div></div>" + lines);
}

function salaryHero(doc) {
  var salary = doc.salary || {};
  var hist = salary.history || [];
  var lastRaise = null;
  hist.forEach(function (row) {
    if (row && row.change_pct != null && isFinite(Number(row.change_pct))) lastRaise = row.change_pct;
  });
  var kpis = '<div class="kpi">' +
    moneyKpi("Annual", salary.current_annual, "plain") +
    textKpi("Last raise", pctText(lastRaise, true)) +
    "</div>";
  return card("Salary", "salary", kpis + stepChart(hist) + raisesLine(hist));
}

function ytdCard(doc, year) {
  var sum = moneyForYear(doc, year);
  if (!sum) return card("Year to date", "ytd", hint("No year totals."));
  var same = doc.ytd && doc.ytd.last_year_same_point;
  var delta = doc.ytd && doc.ytd.delta;
  var comparable = sum.basis === "stub" && same && Number(same.checks) === Number(sum.checks) && delta;
  function cell(label, value, mode, pct, invert) {
    return moneyKpi(label, value, mode, comparable ? deltaExtra(pct, invert) : null);
  }
  var kpis = '<div class="kpi" data-basis="' + sum.basis + '">' +
    cell("Gross", sum.gross, "in", delta && delta.gross_pct, false) +
    cell("Taxes", sum.taxes, "out", delta && delta.taxes_pct, true) +
    moneyKpi("401(k)", sum.k401, "out") +
    cell("Net", sum.net, "in", delta && delta.net_pct, false) +
    "</div>";
  var line = "";
  if (sum.basis === "stub") {
    line = "Stub through " + fmtDate(sum.through) + ".";
    if (comparable) line += " Versus " + sum.checks + " checks through " + fmtDate(same.through) + ", vs last year.";
  } else {
    line = "partial \u00b7 " + sum.onFile + " checks on file.";
    if (sum.lastPay) line += " Last check of " + String(year) + ".";
  }
  return card("Year to date", "ytd", kpis + hint(line));
}

function k401Row(doc, year) {
  var rows = (doc.k401 && doc.k401.by_year) || [];
  var i;
  for (i = 0; i < rows.length; i++) {
    if (Number(rows[i].year) === Number(year)) return rows[i];
  }
  return null;
}

function electedHint(pct) {
  pct = pct || {};
  var bits = [];
  if (pct.pretax != null && isFinite(Number(pct.pretax))) bits.push(pctText(pct.pretax, false) + " pre-tax");
  if (pct.roth != null && isFinite(Number(pct.roth))) bits.push(pctText(pct.roth, false) + " Roth");
  if (pct.aftertax != null && isFinite(Number(pct.aftertax)) && Number(pct.aftertax) !== 0) bits.push(pctText(pct.aftertax, false) + " after-tax");
  if (!bits.length) return "";
  return hint("Elected " + bits.join(" \u00b7 "));
}

function electedTotal(pct) {
  pct = pct || {};
  var n = 0;
  var any = false;
  ["pretax", "roth", "aftertax"].forEach(function (key) {
    if (pct[key] == null || !isFinite(Number(pct[key]))) return;
    any = true;
    n += Number(pct[key]);
  });
  return any ? n : null;
}

function k401Card(doc, year, latest) {
  var elected = (doc.k401 && doc.k401.current_elected_pct) || (latest && latest.k401_elected_pct) || {};
  var row = k401Row(doc, year) || {};
  var sum = moneyForYear(doc, year);
  var split = (sum && sum.basis === "stub" && sum.k401split) ? sum.k401split : row;
  var match = row.employer_match_on_stub;
  var showMatch = match != null && isFinite(Number(match)) && Number(match) !== 0;
  var tiles;
  if (showMatch) {
    tiles = moneyKpi("Pre-tax", split.pretax, "out") +
      moneyKpi("Roth", split.roth, "out") +
      moneyKpi("YTD", split.employee_total, "out") +
      moneyKpi("Match", match, "in");
  } else {
    tiles = textKpi("Elected %", pctText(electedTotal(elected), false)) +
      moneyKpi("YTD", split.employee_total != null ? split.employee_total : sum && sum.k401, "out") +
      moneyKpi("Pre-tax", split.pretax, "out") +
      moneyKpi("Roth", split.roth, "out");
  }
  var note = electedHint(elected);
  if (!showMatch) note += hint("No employer match shows on recent stubs");
  return card("401(k)", "k401", note + '<div class="kpi">' + tiles + "</div>");
}

function flagsBlock(flags, max) {
  flags = flags || [];
  var shown = max == null ? flags : flags.slice(0, max);
  if (!shown.length) return card("Flags", "flags", hint("No flags."));
  var body = shown.map(function (flag) {
    var when = flag.date ? fmtDate(flag.date) : (flag.year != null ? String(flag.year) : "\u2014");
    return "<tr><td>" + esc(when) + "</td><td>" + esc(flag.text || "") + "</td></tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>When</th><th>Note</th></tr></thead><tbody>' + body + "</tbody></table>";
  return card("Flags", "flags", capWrap(table, shown.length, "Flags"));
}

function sectionOf(line) {
  if (!line) return "";
  if (line.bucket === "loan_401k" || line.code === "loan_401k") return "posttax";
  if (line.section === "pretax" || line.section === "taxes" || line.section === "posttax") return line.section;
  return "";
}

function groupedLines(check) {
  var order = [
    ["pretax", "Pre-tax"],
    ["taxes", "Taxes"],
    ["posttax", "Post-tax"]
  ];
  var lines = ((check && check.lines) || []).filter(function (line) {
    return line && line.current != null && Number(line.current) !== 0 && sectionOf(line);
  });
  return order.map(function (pair) {
    var rows = lines.filter(function (line) { return sectionOf(line) === pair[0]; });
    if (!rows.length) return "";
    return '<p class="mix-hint">' + pair[1] + '</p><table class="book"><thead><tr><th>Line</th><th class="num">Amount</th></tr></thead><tbody>' +
      lineRows(rows, "out") + "</tbody></table>";
  }).join("");
}

function latestDetail(check) {
  if (!check) return card("Latest check", "latest", hint("No check for this year."));
  var title = "Latest check \u00b7 " + fmtDate(check.pay_date) + " \u00b7 " + typeLabel(check.type);
  var kpis = '<div class="kpi">' + moneyKpi("Gross", check.gross, "in") + moneyKpi("Net", check.net, "in") + "</div>";
  var note = check.reconciles === false ? hint("This check does not add up to gross.") : "";
  return card(title, "latest", kpis + groupedLines(check) + note);
}

function checksCard(checks, latestId, openId) {
  if (!checks.length) return card("Checks", "checks", hint("No checks for this year."));
  var open = null;
  var body = checks.map(function (c) {
    var on = c.id === openId;
    if (on) open = c;
    var chip = c.id === latestId ? ' <span class="sub">Latest</span>' : "";
    return '<tr data-check-id="' + esc(c.id) + '"' + (on ? ' class="on"' : "") +
      ' tabindex="0" role="button" aria-expanded="' + (on ? "true" : "false") + '"><td>' +
      esc(fmtDate(c.pay_date)) + chip + "</td><td>" + esc(typeLabel(c.type)) + "</td>" +
      moneyTd(c.gross, "in") + moneyTd(c.net, "in") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Date</th><th>Type</th><th class="num">Gross</th><th class="num">Net</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  var lines = "";
  if (open) {
    lines = '<div data-check-lines="' + esc(open.id) + '">' + groupedLines(open) + "</div>";
  }
  return card("Checks", "checks", capWrap(table, checks.length, "Checks") + lines + hint("Tap a row for its lines."));
}

function salaryTable(doc) {
  var hist = (doc.salary && doc.salary.history) || [];
  if (!hist.length) return card("Salary history", "salary-table", hint("No salary history."));
  var body = hist.map(function (row) {
    var pct = row.change_pct == null ? dashTd() : '<td class="num">' + esc(pctText(row.change_pct, true)) + "</td>";
    return "<tr><td>" + esc(fmtDate(row.effective)) + "</td><td>" + esc(fmtDate(row.first_pay_date)) + "</td>" +
      moneyTd(row.annual, "plain") + pct + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Effective</th><th>First pay</th><th class="num">Annual</th><th class="num">Change</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Salary history", "salary-table", table);
}

function byYearCard(doc, selected) {
  var rows = (doc.by_year || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  var body = rows.map(function (row) {
    var sum = moneyForYear(doc, row.year) || {};
    var mark = "partial \u00b7 " + (sum.onFile != null ? sum.onFile : row.checks) + " checks on file";
    var last = "";
    if (sum.basis !== "stub" && row.last_pay_date) last = ' <span class="sub">Last check of ' + esc(row.year) + "</span>";
    return '<tr data-year="' + esc(row.year) + '"><td><span class="sym">' + esc(row.year) + '</span> <span class="sub">' +
      esc(mark) + "</span>" + last + "</td><td class=\"num\">" + esc(sum.onFile != null ? sum.onFile : row.checks) + "</td>" +
      moneyTd(sum.gross, "in") + moneyTd(sum.taxes, "out") + moneyTd(sum.net, "in") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Year</th><th class="num">Checks</th><th class="num">Gross</th><th class="num">Taxes</th><th class="num">Net</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("By year", "by-year", capWrap(table, rows.length, "Years"));
}

function payHtml(doc, state) {
  state = state || {};
  var years = yearsOf(doc.by_year);
  var year = state.year != null && years.indexOf(Number(state.year)) >= 0 ? Number(state.year) : (years.length ? years[years.length - 1] : "");
  var checks = checksForYear(doc, year);
  var latest = checks[0] || null;
  var openId = state.openCheckId;
  if (openId == null) openId = latest ? latest.id : "";
  else if (openId && !checks.some(function (c) { return c.id === openId; })) openId = "";
  var flags = doc.flags || [];
  var extraFlags = flags.length > 3 ? flagsBlock(flags.slice(3), 10) : "";
  var trendRows = sortedChecks(doc).slice(-24);
  var trendLast = trendRows.length ? trendRows[trendRows.length - 1] : null;
  var trendPrior = yearAgoCheck(trendRows, trendLast);
  var trendDelta = null;
  if (trendLast && trendPrior && Number(trendPrior.net)) {
    trendDelta = ((Number(trendLast.net) - Number(trendPrior.net)) / Math.abs(Number(trendPrior.net))) * 100;
  }
  var trendTile = trendLast
    ? '<div class="kpi kpi-equity">' + moneyKpi("Latest net", trendLast.net, "in", trendDelta == null ? null : deltaExtra(trendDelta, false)) + "</div>"
    : "";
  var trendNote = "Net per check, gross behind.";
  if (trendPrior) trendNote += " Change vs a year ago.";
  return pageTitle("Pay") +
    '<div class="split-two">' +
    salaryHero(doc) +
    card("Take-home trend", "trend", trendTile + trendChart(trendRows) + hint(trendNote)) +
    "</div>" +
    whereCard(doc, year, checks, state.openGroup) +
    ytdCard(doc, year) +
    flagsBlock(flags, 3) +
    k401Card(doc, year, latest) +
    moreBlock(
      yearPick("pay", year, years) +
      checksCard(checks, latest && latest.id, openId) +
      salaryTable(doc) +
      byYearCard(doc, year) +
      extraFlags,
      !!state.detailsOpen
    );
}

function baseScenario(doc) {
  var rows = (doc.estimate && doc.estimate.scenarios) || [];
  var i;
  for (i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].is_base) return rows[i];
  }
  return null;
}

function estimateCard(doc) {
  var est = doc.estimate || {};
  var fed = est.federal || {};
  var state = est.state || {};
  var local = est.local || {};
  var total = Number(fed.refund_or_owed || 0) + Number(state.refund_or_owed || 0) + Number(local.refund_or_owed || 0);
  if (!isFinite(total)) total = fed.refund_or_owed;
  var big = moneyText(total, "signed");
  var word = Number(total) < 0 ? "Owed" : "Refund";
  var hero = '<div class="kpi kpi-equity"><div><span>' + word + '</span> <b class="' + big.tone + '">' + big.text + "</b></div></div>";
  var scenarios = est.scenarios || [];
  var nets = [];
  scenarios.forEach(function (row) {
    if (row && row.refund_or_owed != null && isFinite(Number(row.refund_or_owed))) nets.push(Number(row.refund_or_owed));
  });
  var range = "";
  if (nets.length) {
    var hi = Math.max.apply(null, nets);
    var lo = Math.min.apply(null, nets);
    range = moneyText(hi, "signed").text + " to " + moneyText(lo, "signed").text + ". ";
  }
  var extra = fed.extra_per_check_to_break_even;
  var extraText = extra != null && isFinite(Number(extra)) && Number(extra) !== 0
    ? "Extra per check: " + moneyText(extra, "plain").text + "."
    : "No extra needed.";
  var extraLine = hint(range + extraText);
  var withheld = est.stub_adjustment && est.stub_adjustment.withholding_projected;
  function row(label, cell) {
    return "<tr><td><span class=\"sym\">" + esc(label) + "</span></td>" + cell + "</tr>";
  }
  function nonzero(n) { return n != null && isFinite(Number(n)) && Number(n) !== 0; }
  var body = row("Projected tax", moneyTd(fed.total_tax, "out")) +
    row("Withheld", moneyTd(withheld, "plain"));
  if (nonzero(state.refund_or_owed)) body += row("State", moneyTd(state.refund_or_owed, "signed"));
  if (nonzero(local.refund_or_owed)) body += row("Local", moneyTd(local.refund_or_owed, "signed"));
  var table = '<table class="book"><thead><tr><th>Piece</th><th class="num">Amount</th></tr></thead><tbody>' + body + "</tbody></table>";
  var heading = "Estimate";
  if (est.year != null) heading = String(est.year) + " estimate";
  return card(heading, "estimate", hero + extraLine + table);
}

function scenariosCard(doc, state) {
  var base = baseScenario(doc);
  var rows = ((doc.estimate && doc.estimate.scenarios) || []).filter(function (row) {
    return row && !row.is_base;
  });
  if (!rows.length) return "";
  var openId = state && state.openScenario;
  var body = rows.map(function (row) {
    var change = base && row.refund_or_owed != null && base.refund_or_owed != null
      ? Number(row.refund_or_owed) - Number(base.refund_or_owed)
      : null;
    var open = openId && String(openId) === String(row.id);
    var more = open
      ? '<tr class="scenario-more"><td colspan="6"><span class="sub">AGI ' + moneyText(row.agi, "plain").text +
        " \u00b7 Tax " + moneyText(row.total_tax, "out").text +
        " \u00b7 Withheld " + moneyText(row.withholding, "plain").text + "</span></td></tr>"
      : "";
    function wide(n, mode) {
      return moneyTd(n, mode).replace('class="num ', 'class="num wide-col ');
    }
    return '<tr data-scenario="' + esc(row.id) + '"' + (open ? ' class="on"' : "") +
      ' tabindex="0" role="button" aria-expanded="' + (open ? "true" : "false") + '"><td><span class="sym">' +
      esc(row.label || "") + "</span></td>" +
      wide(row.agi, "plain") + wide(row.total_tax, "out") + wide(row.withholding, "plain") +
      moneyTd(row.refund_or_owed, "signed") +
      moneyTd(change, "signed") + "</tr>" + more;
  }).join("");
  var table = '<table class="book"><thead><tr><th>Scenario</th><th class="num wide-col">AGI</th><th class="num wide-col">Tax</th><th class="num wide-col">Withheld</th><th class="num">Refund / owed</th><th class="num">Refund vs base</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Scenarios", "scenarios", table + hint("Tap a row for AGI, tax, and withheld."));
}

function yearBars(rows) {
  if (!rows.length) return "";
  var w = 360, h = 168, pL = 28, pR = 8, pT = 18, pB = 22;
  var nets = rows.map(function (row) { return Number(row.net) || 0; });
  var maxAbs = Math.max.apply(null, nets.map(function (n) { return Math.abs(n); }).concat([1]));
  var mid = pT + (h - pT - pB) / 2;
  var slot = (w - pL - pR) / Math.max(rows.length, 1);
  var barW = Math.min(28, slot * 0.46);
  var parts = ['<line x1="' + pL + '" y1="' + mid + '" x2="' + (w - pR) + '" y2="' + mid + '" stroke="var(--rule)"></line>'];
  var rates = [];
  rows.forEach(function (row) {
    if (row.effective_rate_pct != null && isFinite(Number(row.effective_rate_pct))) rates.push(Number(row.effective_rate_pct));
  });
  var rmin = rates.length ? Math.min.apply(null, rates) : 0;
  var rmax = rates.length ? Math.max.apply(null, rates) : 1;
  if (rmax === rmin) { rmin -= 1; rmax += 1; }
  var rspan = rmax - rmin || 1;
  var pts = [];
  var lastRate = null;
  var lastCx = null;
  var lastRy = null;
  rows.forEach(function (row, i) {
    var net = Number(row.net) || 0;
    var cx = pL + slot * i + slot / 2;
    var bh = (Math.abs(net) / maxAbs) * ((h - pT - pB) / 2 - 16);
    var y = net >= 0 ? mid - bh : mid;
    var fill = net < 0 ? "var(--stop)" : "var(--go)";
    parts.push('<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) +
      '" height="' + Math.max(bh, 1).toFixed(1) + '" fill="' + fill + '"></rect>');
    var labelY = net >= 0 ? Math.max(y - 4, 12) : y + bh + 12;
    parts.push('<text x="' + cx.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="var(--ink)" font-size="11">' +
      esc(shortMoney(net)) + "</text>");
    parts.push('<text x="' + cx.toFixed(1) + '" y="' + (h - 4) + '" text-anchor="middle" fill="var(--ink-soft)" font-size="12">' +
      esc(row.year) + "</text>");
    if (row.effective_rate_pct != null && isFinite(Number(row.effective_rate_pct))) {
      var ry = pT + (h - pT - pB) * (1 - (Number(row.effective_rate_pct) - rmin) / rspan);
      pts.push(cx.toFixed(1) + "," + ry.toFixed(1));
      lastRate = Number(row.effective_rate_pct);
      lastCx = cx;
      lastRy = ry;
    }
  });
  if (pts.length) {
    parts.push('<polyline fill="none" stroke="var(--mix-c)" stroke-width="2" points="' + pts.join(" ") + '"></polyline>');
    parts.push('<text x="4" y="' + (lastRy || pT).toFixed(1) + '" fill="var(--mix-c)" font-size="11">' +
      esc("Eff. rate " + pctText(lastRate, false)) + "</text>");
  }
  return '<div class="tape-plot"><svg class="axis-svg" viewBox="0 0 ' + w + " " + h +
    '" role="img" aria-label="Refund or owed by year">' + parts.join(" ") + "</svg></div>";
}

function barsCard(doc) {
  var rows = (doc.years || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  return card("Refund or owed", "bars", yearBars(rows) + hint("Green refund, red owed, and the effective rate."));
}

function energyCard(doc) {
  var credits = doc.credits || {};
  var year = doc.estimate && doc.estimate.year;
  var title = "Energy credit left";
  if (year != null) title = "Energy credit left for " + year;
  var amount = credits.energy_carryforward_remaining;
  return card(title, "energy", '<div class="kpi">' + moneyKpi("Remaining", amount, "in") + "</div>");
}

function amendedNote(doc, year) {
  var notes = [];
  (doc.flags || []).forEach(function (flag) {
    if (!flag || Number(flag.year) !== Number(year)) return;
    if (flag.kind === "amended" && flag.text) notes.push(flag.text);
  });
  return notes.join(" ");
}

function yearsTable(doc, selected) {
  var rows = (doc.years || []).slice().sort(function (a, b) { return Number(a.year) - Number(b.year); });
  var body = rows.map(function (row) {
    var net = row.net != null ? row.net : (Number(row.refund) || 0) - (Number(row.owed) || 0);
    var withheld = row.payments && row.payments.withholding;
    var picked = Number(row.year) === Number(selected);
    return '<tr data-tax-year="' + esc(row.year) + '"' + (picked ? ' class="on"' : "") + '"><td><span class="sym">' +
      esc(row.year) + "</span></td>" + moneyTd(row.agi, "plain") + moneyTd(row.total_tax, "out") + moneyTd(withheld, "plain") +
      moneyTd(net, "signed") + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Year</th><th class="num">AGI</th><th class="num">Total tax</th><th class="num">Withheld</th><th class="num">Refund / owed</th></tr></thead><tbody>' +
    body + "</tbody></table>";
  return card("Years", "years", capWrap(table, rows.length, "Tax years"));
}

function yearLines(doc, year) {
  var row = findYearRow(doc.years, year);
  if (!row) return "";
  var lines = (row.lines || []).filter(function (line) { return line && line.label; });
  if (!lines.length) return "";
  var body = lines.map(function (line) {
    var mode = Number(line.amount) < 0 ? "out" : "plain";
    return "<tr><td><span class=\"sym\">" + esc(line.label) + "</span></td>" + moneyTd(line.amount, mode) + "</tr>";
  }).join("");
  var table = '<table class="book"><thead><tr><th>Line</th><th class="num">Amount</th></tr></thead><tbody>' + body + "</tbody></table>";
  return card(String(year) + " lines", "year-lines", capWrap(table, lines.length, "Year lines"));
}

function taxesHtml(doc, state) {
  state = state || {};
  var years = yearsOf(doc.years);
  var year = state.year != null && years.indexOf(Number(state.year)) >= 0 ? Number(state.year) : (years.length ? years[years.length - 1] : "");
  return pageTitle("Taxes") +
    estimateCard(doc) +
    scenariosCard(doc, state) +
    '<div class="split-two">' +
    barsCard(doc) +
    energyCard(doc) +
    "</div>" +
    moreBlock(
      yearPick("taxes", year, years) +
      yearsTable(doc, year) +
      yearLines(doc, year) +
      flagsBlock(doc.flags, null),
      !!state.detailsOpen
    );
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
  try {
    if (typeof document !== "undefined" && document) document.title = kind === "taxes" ? "Taxes" : "Pay";
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
    var group = target.closest("[data-pay-group]");
    if (group && (!root.contains || root.contains(group))) {
      var key = group.getAttribute("data-pay-group");
      var gstate = root._paydeskState;
      gstate.openGroup = gstate.openGroup === key ? "" : key;
      if (mem[kind]) paint(root, kind, { ok: true, doc: mem[kind] });
      return;
    }
    var scenario = target.closest("tr[data-scenario]");
    if (scenario && (!root.contains || root.contains(scenario))) {
      var sid = scenario.getAttribute("data-scenario");
      var sstate = root._paydeskState;
      sstate.openScenario = sstate.openScenario === sid ? "" : sid;
      if (mem[kind]) paint(root, kind, { ok: true, doc: mem[kind] });
      return;
    }
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
    state.openCheckId = null;
    state.openGroup = "";
    state.openScenario = "";
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
