/* Historical month and year records.
   Loaded before banking.js. Numbers come from the signed-in feed.
   This file does not embed balances, account numbers, or institution names. */

var BANK_RECORD_INDEX = "/data/banking/records/index.json";
var REC_COLORS = ["var(--go)", "var(--ink)", "var(--warn)", "var(--stop)", "var(--ink-soft)"];
var REC_FLOOR = 100;

function bankRecordMonthPath(ym) {
  return /^\d{4}-\d{2}$/.test(String(ym || "")) ? "/data/banking/months/" + ym + ".json" : "";
}

function bankRecordYearPath(year) {
  return /^\d{4}$/.test(String(year || "")) ? "/data/banking/years/" + year + ".json" : "";
}

function bankRecordsDefaultMonth(index) {
  var months = index && Array.isArray(index.months) ? index.months : [];
  var closed = "";
  var any = "";
  months.forEach(function (row) {
    var ym = row && row.month;
    if (!/^\d{4}-\d{2}$/.test(String(ym || ""))) return;
    if (!any || ym > any) any = ym;
    if (row.status === "closed" && (!closed || ym > closed)) closed = ym;
  });
  return closed || any || "";
}

function recYearList(index) {
  var years = [];
  function add(year) {
    var y = String(year == null ? "" : year);
    if (/^\d{4}$/.test(y) && years.indexOf(y) < 0) years.push(y);
  }
  var list = index && Array.isArray(index.years) ? index.years : [];
  list.forEach(function (row) {
    if (typeof row === "string" || typeof row === "number") add(row);
    else if (row && row.year != null) add(row.year);
  });
  var months = index && Array.isArray(index.months) ? index.months : [];
  months.forEach(function (row) { add(String(row && row.month || "").slice(0, 4)); });
  years.sort();
  return years;
}

function recCompleteLabel(code) {
  if (code === "full") return "Full";
  if (code === "in_progress") return "In progress";
  if (code === "partial") return "Partial";
  if (code === "aggregates_only") return "Totals only";
  return "";
}

function recBadge(code) {
  var label = recCompleteLabel(code);
  if (!label) return "";
  return '<span class="bank-rec-badge" data-completeness="' + bankEsc(code || "") + '">' + bankEsc(label) + "</span>";
}

function recMonthTitle(ym) {
  var key = typeof bankMonthKey === "function" ? bankMonthKey(ym) : String(ym || "");
  if (key && typeof bankParseYm === "function" && typeof bankMonthTitle === "function") {
    var parsed = bankParseYm(key);
    if (parsed) return bankMonthTitle(parsed.year, parsed.month);
  }
  return key || String(ym || "");
}

function recDayLabel(iso) {
  var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var month = Number(m[2]);
  if (month < 1 || month > 12) return "";
  return names[month - 1] + " " + Number(m[3]) + ", " + m[1];
}

function recMonthShort(ym) {
  var m = String(ym || "").match(/^\d{4}-(\d{2})/);
  if (!m) return String(ym || "");
  var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var month = Number(m[1]);
  return month >= 1 && month <= 12 ? names[month - 1] : String(ym || "");
}

function recSuffix(raw) {
  var text = String(raw == null ? "" : raw).trim();
  var digits = text.replace(/\D/g, "");
  if (digits) {
    if (digits.length > 4) digits = digits.slice(-4);
    return "\u00b7\u00b7" + digits;
  }
  if (!/^[A-Za-z0-9]{1,6}$/.test(text)) return "";
  return "\u00b7\u00b7" + text;
}

function recKindLabel(kind) {
  var map = { payroll: "Payroll", stipend: "Stipend", other: "Other", "401k_payment": "401k payment" };
  if (map[kind]) return map[kind];
  var s = String(kind || "").replace(/_/g, " ").trim();
  if (!/^[A-Za-z0-9 ]{1,32}$/.test(s)) return "Other";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function recTierLabel(tier) {
  var word = String(tier || "").toLowerCase();
  if (word === "required") return "Required";
  if (word === "needs") return "Needs";
  if (word === "wants") return "Wants";
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
}

function recTierColor(tier) {
  var word = String(tier || "").toLowerCase();
  if (word === "required") return "var(--ink)";
  if (word === "needs") return "var(--go)";
  if (word === "wants") return "var(--warn)";
  return "var(--ink-soft)";
}

function recMoneyTone(n) {
  if (n == null) return "";
  if (n < -0.004) return "stop";
  if (n > 0.004) return "go";
  return "";
}

function recPct(v) {
  var n = bankNum(v);
  if (n == null) return { text: "\u2014", tone: "", n: null };
  var pct = Math.abs(n) <= 1.5 ? n * 100 : n;
  var rounded = Math.round(pct * 10) / 10;
  var body = Math.abs(rounded).toFixed(1).replace(/\.0$/, "");
  return { text: (rounded < 0 ? "\u2212" : "") + body + "%", tone: rounded < -0.05 ? "stop" : (rounded > 0 ? "go" : ""), n: rounded };
}

function recFlow(n, kind) {
  if (n == null) return { text: "\u2014", tone: "" };
  if (typeof bankSignedFlow === "function") {
    var flow = bankSignedFlow(Math.abs(n), kind);
    return { text: flow.text, tone: kind === "out" ? "stop" : "go" };
  }
  return { text: bankMoney(n), tone: "" };
}

function recKpi(key, label, text, tone) {
  var cls = tone ? ' class="tone-' + tone + '"' : "";
  return '<div data-k="' + bankEsc(key) + '"><span>' + bankEsc(label) + "</span> <b" + cls + ">" + bankEsc(text) + "</b></div>";
}

function recCoverageNote(doc) {
  if (!doc || doc.completeness === "full") return "";
  var note = doc.coverage && doc.coverage.note;
  if (note) return String(note);
  if (doc.completeness === "aggregates_only") return "Totals only. Transaction detail is not in this record.";
  if (doc.completeness === "partial") return "This record is partial.";
  if (doc.completeness === "in_progress") return "This month is still in progress.";
  return "";
}

function recChartHead(title, doc) {
  var note = recCoverageNote(doc);
  return "<h3>" + bankEsc(title) + "</h3>" + (note ? '<p class="bank-bar-note">' + bankEsc(note) + "</p>" : "");
}

function recUnavailable(kind) {
  return '<p class="bank-empty" data-bank-rec-unavailable="' + bankEsc(kind) + '">Not enough detail for this chart.</p>';
}

function recNothing() {
  return '<p class="bank-empty">Nothing to plot in this record.</p>';
}

function recBalRows(raw) {
  var rows = [];
  if (Array.isArray(raw)) {
    raw.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      var amount = row.amount != null ? row.amount : (row.balance != null ? row.balance : row.value);
      rows.push({ suffix: String(row.account_suffix || row.suffix || row.account || ""), amount: bankNum(amount) });
    });
    return rows;
  }
  if (raw && typeof raw === "object") {
    Object.keys(raw).forEach(function (key) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return;
      var val = raw[key];
      if (val && typeof val === "object") {
        rows.push({
          suffix: String(val.account_suffix || val.suffix || key),
          amount: bankNum(val.amount != null ? val.amount : val.balance)
        });
      } else rows.push({ suffix: String(key), amount: bankNum(val) });
    });
  }
  return rows;
}

function recBalSum(raw) {
  var any = false;
  var sum = 0;
  recBalRows(raw).forEach(function (row) {
    if (row.amount == null) return;
    any = true;
    sum += row.amount;
  });
  return any ? sum : null;
}

function recSum(list, field) {
  var any = false;
  var sum = 0;
  (list || []).forEach(function (row) {
    var n = bankNum(row && row[field]);
    if (n == null) return;
    any = true;
    sum += Math.abs(n);
  });
  return any ? sum : null;
}

function recLen(list, fallback) {
  if (Array.isArray(list)) return list.length;
  return bankNum(fallback);
}

function recAutoSummary(doc, nums) {
  var written = doc && doc.insights && doc.insights.summary;
  if (written) return String(written);
  var bits = [];
  if (nums.inn != null) bits.push("In " + bankMoney(nums.inn));
  if (nums.out != null) bits.push("out " + bankMoney(nums.out));
  if (nums.net != null) bits.push("net " + bankMoney(nums.net));
  if (!bits.length) return "No summary in this record.";
  return bits.join(", ") + ".";
}

function recMonthNums(doc) {
  var inn = recSum(doc.income, "amount");
  if (inn == null) inn = recSum(doc.cycles, "income");
  var out = recSum(doc.transactions, "amount");
  if (out == null) out = recSum(doc.cycles, "outflows");
  var net = bankNum(doc.net_cash_flow);
  if (net == null && inn != null && out != null) net = inn - out;
  var operating = bankNum(doc.net_operating);
  return {
    inn: inn,
    out: out,
    net: net,
    operating: operating,
    save: bankNum(doc.savings_rate),
    saveOp: bankNum(doc.savings_rate_operating),
    late: recLen(doc.insights && doc.insights.late_bills, null),
    nsf: recLen(doc.insights && doc.insights.nsf_or_returned, null),
    start: recBalSum(doc.start_bal),
    end: recBalSum(doc.end_bal)
  };
}

function recThrough(doc) {
  var day = recDayLabel(doc && doc.through_date);
  if (!day) return "";
  var status = doc.status === "in_progress" ? "In progress" : (doc.status === "closed" ? "Closed" : "");
  return '<p class="bank-rec-asof">' + bankEsc(status ? status + " through " + day : "Through " + day) + "</p>";
}

function recLows(doc) {
  var lows = doc && doc.insights && Array.isArray(doc.insights.account_lows) ? doc.insights.account_lows : [];
  if (!lows.length) return "";
  var bits = lows.map(function (row) {
    var who = recSuffix(row.account || row.account_suffix || "");
    var when = recDayLabel(row.date);
    var text = (who || "Account") + " low " + bankMoney(row.low);
    if (when) text += " on " + when;
    if (row.below_floor) text += ", below the floor";
    var days = bankNum(row.negative_days);
    if (days) text += ", " + Math.round(days) + " negative days";
    return text;
  });
  return '<p class="bank-bar-note" data-bank-rec-lows>' + bankEsc(bits.join(". ")) + ".</p>";
}

function recSummary(doc) {
  var nums = recMonthNums(doc);
  var inn = recFlow(nums.inn, "in");
  var out = recFlow(nums.out, "out");
  var save = recPct(nums.save);
  var saveOp = recPct(nums.saveOp);
  var cards = [
    recKpi("in", "In", inn.text, inn.tone),
    recKpi("out", "Out", out.text, out.tone),
    recKpi("net", "Net", bankMoney(nums.net), recMoneyTone(nums.net)),
    recKpi("net_operating", "Net, operating", bankMoney(nums.operating), recMoneyTone(nums.operating)),
    recKpi("savings", "Savings rate", save.text, save.tone),
    recKpi("savings_operating", "Savings, operating", saveOp.text, saveOp.tone),
    recKpi("late", "Late bills", nums.late == null ? "\u2014" : String(nums.late), nums.late > 0 ? "stop" : ""),
    recKpi("nsf", "Returned", nums.nsf == null ? "\u2014" : String(nums.nsf), nums.nsf > 0 ? "stop" : ""),
    recKpi("start", "Start cash", bankMoney(nums.start), ""),
    recKpi("end", "End cash", bankMoney(nums.end), "")
  ].join("");
  return '<div data-bank-rec-summary><p class="bank-rec-summary">' + bankEsc(recAutoSummary(doc, nums)) + "</p>" +
    recThrough(doc) + '<div class="bank-kpi bank-rec-kpis">' + cards + "</div>" + recLows(doc) + "</div>";
}

function recFloor(chart) {
  var n = chart && bankNum(chart.floor);
  return n == null ? REC_FLOOR : n;
}

function recBudgetRows(doc, chart) {
  if (chart && chart.available === false) return { off: true, rows: [] };
  var names = chart && Array.isArray(chart.categories) ? chart.categories : null;
  var series = chart && Array.isArray(chart.series) ? chart.series : null;
  if (names && series && series.length) {
    var budget = null;
    var actual = null;
    series.forEach(function (row) {
      var name = String(row && row.name || "");
      if (/budget/i.test(name)) budget = row;
      else if (/actual/i.test(name)) actual = row;
    });
    if (!budget) budget = series[0];
    if (!actual) actual = series[1] || series[0];
    return {
      off: false,
      rows: names.map(function (name, i) {
        return {
          name: String(name),
          budget: budget && budget.values ? budget.values[i] : null,
          actual: actual && actual.values ? actual.values[i] : null
        };
      })
    };
  }
  var rows = [];
  (doc && doc.categories || []).forEach(function (row) {
    if (row && row.name) rows.push({ name: row.name, budget: row.budget, actual: row.actual });
  });
  if (!rows.length) return { off: false, rows: [] };
  return { off: false, rows: rows };
}

function recGrouped(rows) {
  return rows.map(function (row) {
    var budget = bankNum(row.budget);
    var actual = bankNum(row.actual);
    var max = Math.max(budget || 0, actual || 0);
    var over = budget != null && actual != null && actual > budget + 0.004;
    var actualColor = over ? "var(--stop)" : "var(--go)";
    var vs = "";
    try { if (typeof bankVsBarHtml === "function") vs = bankVsBarHtml(actual, budget); } catch (eVs) { vs = ""; }
    function track(label, value, color, overClass) {
      var width = max > 0 && value != null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      return '<div class="bank-bar' + overClass + '"><div class="bank-bar-k"><span>' + bankEsc(label) +
        "</span> <b>" + bankEsc(bankMoney(value)) + '</b></div><div class="bank-bar-track"><span class="fill" style="width:' +
        width.toFixed(1) + "%;background:" + color + '"></span></div></div>';
    }
    return '<div class="bank-rec-group" data-bar="' + bankEsc(row.name) + '"><span class="bank-rec-group-name">' +
      bankEsc(row.name) + '</span><div class="bank-rec-group-bars">' +
      track("Budget", budget, "var(--ink-soft)", "") +
      track("Actual", actual, actualColor, over ? " over" : "") +
      vs + "</div></div>";
  }).join("");
}

function recBarsSection(kind, title, doc, chart) {
  var built = recBudgetRows(doc, chart);
  var body = built.off ? recUnavailable(kind) : (built.rows.length ? recGrouped(built.rows) : recNothing());
  return '<section class="bank-bars" data-bank-rec-chart="' + bankEsc(kind) + '">' + recChartHead(title, doc) + body + "</section>";
}

function recExtent(nums) {
  var min = null;
  var max = null;
  nums.forEach(function (n) {
    if (n == null || !isFinite(n)) return;
    if (min == null || n < min) min = n;
    if (max == null || n > max) max = n;
  });
  if (min == null) return null;
  if (min === max) { min -= 1; max += 1; }
  var pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

function recLabelIndexes(n) {
  if (n <= 6) {
    var all = [];
    var i;
    for (i = 0; i < n; i++) all.push(i);
    return all;
  }
  return [0, Math.floor((n - 1) / 2), n - 1];
}

function recLineSvg(spec) {
  var dates = spec.dates || [];
  if (dates.length < 1) return "";
  var width = 640;
  var height = 200;
  var left = 44;
  var right = 12;
  var top = 16;
  var bottom = 28;
  var plotW = width - left - right;
  var plotH = height - top - bottom;
  var ext = recExtent(spec.values || []);
  if (!ext) return "";
  function xAt(i) {
    if (dates.length === 1) return left + plotW / 2;
    return left + (plotW * i) / (dates.length - 1);
  }
  function yAt(n) {
    var t = (n - ext.min) / (ext.max - ext.min);
    return top + plotH - t * plotH;
  }
  var svg = '<svg class="bank-rec-svg" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + bankEsc(spec.label || "Chart") + '">';
  svg += '<line x1="' + left + '" y1="' + (top + plotH) + '" x2="' + (width - right) + '" y2="' + (top + plotH) + '" stroke="var(--rule)"></line>';
  if (spec.floor != null && spec.floor >= ext.min && spec.floor <= ext.max) {
    var fy = yAt(spec.floor);
    svg += '<line x1="' + left + '" y1="' + fy.toFixed(1) + '" x2="' + (width - right) + '" y2="' + fy.toFixed(1) +
      '" stroke="var(--warn)" stroke-dasharray="4 3"></line>';
    svg += '<text x="' + (width - right) + '" y="' + Math.max(12, fy - 4).toFixed(1) + '" text-anchor="end" fill="var(--warn)" font-size="11">' +
      bankEsc(bankMoney(spec.floor)) + "</text>";
  }
  (spec.markers || []).forEach(function (iso) {
    var at = dates.indexOf(iso);
    if (at < 0) return;
    var x = xAt(at);
    svg += '<line x1="' + x.toFixed(1) + '" y1="' + top + '" x2="' + x.toFixed(1) + '" y2="' + (top + plotH) +
      '" stroke="var(--rule)" stroke-dasharray="2 3"></line>';
  });
  (spec.series || []).forEach(function (series, s) {
    var color = series.color || REC_COLORS[s % REC_COLORS.length];
    var dash = series.dash ? ' stroke-dasharray="' + series.dash + '"' : "";
    var cmds = [];
    var pen = false;
    dates.forEach(function (_d, i) {
      var n = series.values ? series.values[i] : null;
      if (n == null || !isFinite(n)) { pen = false; return; }
      var stroke = series.stopBelow && n < 0 ? "var(--stop)" : color;
      var x = xAt(i);
      var y = yAt(n);
      if (!pen) {
        if (cmds.length) {
          svg += '<polyline fill="none" stroke="' + cmds[0].stroke + '" stroke-width="2"' + dash + ' points="' +
            cmds.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"></polyline>';
        }
        cmds = [{ x: x, y: y, stroke: stroke }];
        pen = true;
        return;
      }
      var prev = cmds[cmds.length - 1];
      if (prev.stroke !== stroke) {
        svg += '<polyline fill="none" stroke="' + prev.stroke + '" stroke-width="2"' + dash + ' points="' +
          cmds.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + " " +
          x.toFixed(1) + "," + y.toFixed(1) + '"></polyline>';
        cmds = [{ x: x, y: y, stroke: stroke }];
      } else cmds.push({ x: x, y: y, stroke: stroke });
    });
    if (cmds.length === 1) {
      svg += '<circle cx="' + cmds[0].x.toFixed(1) + '" cy="' + cmds[0].y.toFixed(1) + '" r="3" fill="' + cmds[0].stroke + '"></circle>';
    } else if (cmds.length) {
      svg += '<polyline fill="none" stroke="' + cmds[0].stroke + '" stroke-width="2"' + dash + ' points="' +
        cmds.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"></polyline>';
    }
  });
  recLabelIndexes(dates.length).forEach(function (i) {
    svg += '<text x="' + xAt(i).toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle" fill="var(--ink-soft)" font-size="11">' +
      bankEsc(spec.labels ? spec.labels[i] : dates[i]) + "</text>";
  });
  svg += "</svg>";
  return svg;
}

function recAlign(dates, points, field) {
  var by = {};
  (points || []).forEach(function (row) {
    if (!row) return;
    by[row.date || row.month || ""] = bankNum(row[field]);
  });
  return dates.map(function (d) { return Object.prototype.hasOwnProperty.call(by, d) ? by[d] : null; });
}

function recDailySection(doc) {
  var chart = doc.charts && doc.charts.daily_balances;
  var head = recChartHead("Daily balances", doc);
  if (chart && chart.available === false) {
    return '<section class="bank-bars" data-bank-rec-chart="daily_balances">' + head + recUnavailable("daily_balances") + "</section>";
  }
  var series = chart && Array.isArray(chart.series) ? chart.series : [];
  var dates = [];
  series.forEach(function (row) {
    (row && row.points || []).forEach(function (pt) {
      var day = pt && pt.date;
      if (day && dates.indexOf(day) < 0) dates.push(day);
    });
  });
  dates.sort();
  if (!dates.length) {
    return '<section class="bank-bars" data-bank-rec-chart="daily_balances">' + head + recNothing() + "</section>";
  }
  var floor = recFloor(chart);
  var values = [floor];
  var drawn = series.map(function (row, i) {
    var vals = recAlign(dates, row.points, "value");
    vals.forEach(function (n) { if (n != null) values.push(n); });
    return { name: recSuffix(row.account || row.name || ""), values: vals, color: REC_COLORS[i % REC_COLORS.length] };
  });
  var markers = [];
  (chart && chart.markers || []).forEach(function (mark) {
    var day = typeof mark === "string" ? mark : (mark && (mark.date || mark.at));
    if (day) markers.push(day);
  });
  if (!markers.length && Array.isArray(doc.cycles)) {
    doc.cycles.forEach(function (cycle) { if (cycle && cycle.start) markers.push(cycle.start); });
  }
  var svg = recLineSvg({
    label: "Daily balances",
    dates: dates,
    labels: dates.map(recDayLabel),
    values: values,
    floor: floor,
    markers: markers,
    series: drawn
  });
  var legend = '<ul class="bank-legend">' + drawn.map(function (row, i) {
    return '<li><i style="background:' + REC_COLORS[i % REC_COLORS.length] + '"></i>' + bankEsc(row.name || "Account") + "</li>";
  }).join("") + '<li><i style="background:var(--warn)"></i>Floor</li></ul>';
  return '<section class="bank-bars" data-bank-rec-chart="daily_balances">' + head + svg + legend + "</section>";
}

function recColumnSvg(spec) {
  var cols = spec.columns || [];
  if (!cols.length) return "";
  var width = 640;
  var height = 220;
  var left = 44;
  var right = 12;
  var top = 16;
  var bottom = 32;
  var up = 0;
  var down = 0;
  cols.forEach(function (col) {
    var inn = bankNum(col.inn);
    var out = bankNum(col.out);
    var net = bankNum(col.net);
    if (inn != null) up = Math.max(up, Math.abs(inn));
    if (out != null) down = Math.max(down, Math.abs(out));
    if (net != null && net > 0) up = Math.max(up, net);
    if (net != null && net < 0) down = Math.max(down, -net);
  });
  if (!(up + down > 0)) return "";
  var plotW = width - left - right;
  var plotH = height - top - bottom;
  var span = up + down;
  function yAt(n) {
    var t = (up - n) / span;
    return top + t * plotH;
  }
  var zero = yAt(0);
  var step = plotW / cols.length;
  var svg = '<svg class="bank-rec-svg" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + bankEsc(spec.label || "In and out") + '">';
  svg += '<line x1="' + left + '" y1="' + zero.toFixed(1) + '" x2="' + (width - right) + '" y2="' + zero.toFixed(1) + '" stroke="var(--rule)"></line>';
  var netPts = [];
  cols.forEach(function (col, i) {
    var x = left + step * i + step / 2;
    var inn = bankNum(col.inn);
    var out = bankNum(col.out);
    var net = bankNum(col.net);
    var barW = Math.max(4, Math.min(18, step * 0.28));
    if (inn != null && inn !== 0) {
      var y = yAt(Math.abs(inn));
      svg += '<rect x="' + (x - barW - 1).toFixed(1) + '" y="' + Math.min(y, zero).toFixed(1) + '" width="' + barW.toFixed(1) +
        '" height="' + Math.abs(zero - y).toFixed(1) + '" fill="var(--go)"></rect>';
    }
    if (out != null && out !== 0) {
      var y2 = yAt(-Math.abs(out));
      svg += '<rect x="' + (x + 1).toFixed(1) + '" y="' + Math.min(y2, zero).toFixed(1) + '" width="' + barW.toFixed(1) +
        '" height="' + Math.abs(y2 - zero).toFixed(1) + '" fill="var(--stop)"></rect>';
    }
    if (net != null) netPts.push(x.toFixed(1) + "," + yAt(net).toFixed(1));
    svg += '<text x="' + x.toFixed(1) + '" y="' + (height - 10) + '" text-anchor="middle" fill="var(--ink-soft)" font-size="11">' +
      bankEsc(col.label || "") + "</text>";
  });
  if (netPts.length > 1) {
    svg += '<polyline fill="none" stroke="var(--ink)" stroke-width="2" points="' + netPts.join(" ") + '"></polyline>';
  } else if (netPts.length === 1) {
    var xy = netPts[0].split(",");
    svg += '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="3" fill="var(--ink)"></circle>';
  }
  svg += "</svg>";
  return svg;
}

function recFlowLegend() {
  return '<ul class="bank-legend"><li><i style="background:var(--go)"></i>In</li><li><i style="background:var(--stop)"></i>Out</li><li><i style="background:var(--ink)"></i>Net</li></ul>';
}

function recTimelineSection(doc) {
  var chart = doc.charts && doc.charts.income_outflow_timeline;
  var head = recChartHead("Daily in and out", doc);
  if (chart && chart.available === false) {
    return '<section class="bank-bars" data-bank-rec-chart="income_outflow_timeline">' + head + recUnavailable("income_outflow_timeline") + "</section>";
  }
  var points = chart && Array.isArray(chart.points) ? chart.points : [];
  if (!points.length) {
    return '<section class="bank-bars" data-bank-rec-chart="income_outflow_timeline">' + head + recNothing() + "</section>";
  }
  var cols = points.map(function (row) {
    var inn = bankNum(row && (row["in"] != null ? row["in"] : row.income));
    var out = bankNum(row && (row.out != null ? row.out : row.outflow));
    var net = bankNum(row && row.net);
    if (net == null && inn != null && out != null) net = inn - out;
    return { label: recMonthShort(row.date) + " " + String(row.date || "").slice(8, 10).replace(/^0/, ""), inn: inn, out: out, net: net };
  });
  var svg = recColumnSvg({ label: "Daily income and outflow", columns: cols });
  return '<section class="bank-bars" data-bank-rec-chart="income_outflow_timeline">' + head + (svg || recNothing()) + recFlowLegend() + "</section>";
}

function recLegend(items, colorOf) {
  return '<ul class="bank-legend">' + items.map(function (item, i) {
    var color = colorOf ? colorOf(item, i) : REC_COLORS[i % REC_COLORS.length];
    var amount = item.amount != null ? " " + bankMoney(item.amount) : "";
    return "<li><i style=\"background:" + color + '"></i>' + bankEsc(item.name || "") + bankEsc(amount) + "</li>";
  }).join("") + "</ul>";
}

function recDonutSection(doc) {
  var chart = doc.charts && doc.charts.category_donut;
  var head = recChartHead("Categories", doc);
  if (chart && chart.available === false) {
    return '<section class="bank-pie-block" data-bank-rec-chart="category_donut">' + head + recUnavailable("category_donut") + "</section>";
  }
  var slices = chart && Array.isArray(chart.slices) ? chart.slices.slice() : [];
  if (!slices.length) {
    (doc.categories || []).forEach(function (row) {
      if (row && row.name && bankNum(row.actual) != null) slices.push({ name: row.name, amount: row.actual });
    });
  }
  var total = 0;
  slices.forEach(function (row) { total += Math.max(0, bankNum(row.amount) || 0); });
  if (!(total > 0) || typeof bankDonutPath !== "function") {
    return '<section class="bank-pie-block" data-bank-rec-chart="category_donut">' + head + recNothing() + "</section>";
  }
  var cx = 80;
  var cy = 80;
  var angle = -Math.PI / 2;
  var paths = slices.map(function (row, i) {
    var amt = Math.max(0, bankNum(row.amount) || 0);
    var sweep = (amt / total) * Math.PI * 2;
    var d = bankDonutPath(cx, cy, 46, 70, angle, angle + Math.max(sweep, 0));
    angle += sweep;
    return '<path d="' + d + '" fill="' + REC_COLORS[i % REC_COLORS.length] + '"></path>';
  }).join("");
  var center = chart && chart.center;
  var midLabel = "Spent";
  var midValue = bankMoney(total);
  if (typeof center === "string" && center) midLabel = center;
  else if (center && typeof center === "object") {
    if (center.label) midLabel = String(center.label);
    if (center.amount != null) midValue = bankMoney(center.amount);
  }
  var pie = '<div class="bank-split"><div class="bank-pie" data-bank-pie="record"><svg viewBox="0 0 160 160" role="img" aria-label="' +
    bankEsc(midLabel + " " + midValue) + '">' + paths + '</svg><div class="bank-pie-mid"><b>' + bankEsc(midValue) +
    "</b><span>" + bankEsc(midLabel) + "</span></div></div>" + recLegend(slices) + "</div>";
  return '<section class="bank-pie-block" data-bank-rec-chart="category_donut">' + head + pie + "</section>";
}

function recTierSection(doc) {
  var chart = doc.charts && doc.charts.tier_stack;
  var head = recChartHead("Tiers", doc);
  if (chart && chart.available === false) {
    return '<section class="bank-bars" data-bank-rec-chart="tier_stack">' + head + recUnavailable("tier_stack") + "</section>";
  }
  var segments = chart && Array.isArray(chart.segments) ? chart.segments.slice() : [];
  if (!segments.length && doc.insights && Array.isArray(doc.insights.tiers)) segments = doc.insights.tiers.slice();
  var total = 0;
  segments.forEach(function (row) { total += Math.max(0, bankNum(row && row.amount) || 0); });
  if (!(total > 0)) {
    return '<section class="bank-bars" data-bank-rec-chart="tier_stack">' + head + recNothing() + "</section>";
  }
  var segs = segments.map(function (row) {
    var amt = Math.max(0, bankNum(row.amount) || 0);
    var pct = (amt / total) * 100;
    return '<i class="bank-mix-seg" style="width:' + pct.toFixed(1) + "%;background:" + recTierColor(row.name) + '"></i>';
  }).join("");
  var legend = recLegend(segments.map(function (row) {
    return { name: recTierLabel(row.name), amount: row.amount };
  }), function (item, i) { return recTierColor(segments[i] && segments[i].name); });
  var mix = '<div class="bank-income-mix" role="img" aria-label="Spending by tier"><div class="bank-mix-track">' + segs + "</div>" + legend + "</div>";
  return '<section class="bank-bars" data-bank-rec-chart="tier_stack">' + head + mix + "</section>";
}

function recCharts(doc) {
  return '<div class="bank-rec-charts" data-bank-rec-charts>' +
    recBarsSection("budget_vs_actual", "Budget vs actual", doc, doc.charts && doc.charts.budget_vs_actual) +
    recDailySection(doc) +
    recTimelineSection(doc) +
    recDonutSection(doc) +
    recTierSection(doc) +
    "</div>";
}

function recSep() {
  return typeof bankSep === "function" ? bankSep() : " \u00b7 ";
}

function recCycles(doc) {
  var list = Array.isArray(doc.cycles) ? doc.cycles : [];
  var body = !list.length ? '<p class="bank-empty">No pay cycles in this record.</p>' : '<div class="bank-rec-cycles">' + list.map(function (cycle, i) {
    var title = recDayLabel(cycle.start) || "Cycle";
    if (cycle.end) title += " \u2013 " + recDayLabel(cycle.end);
    var net = bankNum(cycle.net);
    return '<article class="bank-rec-cycle" data-bank-rec-cycle="' + (i + 1) + '"><h3>' + bankEsc(title) + "</h3><p>" +
      bankEsc("Start " + bankMoney(cycle.start_bal)) + recSep() + bankEsc("End " + bankMoney(cycle.end_bal)) + "</p><p>" +
      bankEsc("Deposits " + bankMoney(cycle.deposit)) + recSep() + bankEsc("Income " + bankMoney(cycle.income)) + recSep() +
      bankEsc("Out " + bankMoney(cycle.outflows)) + recSep() + '<b class="' + (recMoneyTone(net) === "stop" ? "tone-stop" : "tone-go") + '">' +
      bankEsc("Net " + bankMoney(net)) + "</b></p>" +
      (cycle.confidence ? '<p class="bank-rec-asof">Confidence ' + bankEsc(String(cycle.confidence)) + "</p>" : "") +
      "</article>";
  }).join("") + "</div>";
  return '<section class="bank-bars" data-bank-rec-cycles><h3>Pay cycles</h3>' + body + "</section>";
}

function recTimeList(rows, kind) {
  if (!rows.length) return "";
  return '<ol class="bank-rec-time">' + rows.map(function (row) {
    var flow = recFlow(bankNum(row.amount), kind);
    return "<li><span>" + bankEsc(recDayLabel(row.date) || "\u2014") + '</span><span class="bank-rec-desc">' +
      bankEsc(row.desc || row.name || "\u2014") + "</span><i>" + bankEsc(kind === "in" ? recKindLabel(row.kind) : recTierLabel(row.tier)) +
      "</i><i>" + bankEsc(recSuffix(row.account_suffix || "")) + '</i><b class="' + (flow.tone === "stop" ? "tone-stop" : "tone-go") + '">' +
      bankEsc(flow.text) + "</b></li>";
  }).join("") + "</ol>";
}

function recIncomeSection(doc) {
  var rows = (doc.income || []).slice().sort(function (a, b) { return String(a.date || "").localeCompare(String(b.date || "")); });
  var body = rows.length ? recTimeList(rows, "in") : '<p class="bank-empty">No income lines in this record.</p>';
  return '<section class="bank-bars" data-bank-rec-income><h3>Income</h3>' + body + "</section>";
}

function recOutSection(doc) {
  var rows = (doc.transactions || []).slice().sort(function (a, b) { return String(a.date || "").localeCompare(String(b.date || "")); });
  var body;
  if (!rows.length && doc.completeness === "aggregates_only") body = '<p class="bank-empty">Totals only. Outflow lines are not listed.</p>';
  else if (!rows.length) body = '<p class="bank-empty">No outflow lines in this record.</p>';
  else body = recTimeList(rows, "out");
  return '<section class="bank-bars" data-bank-rec-outflows><h3>Outflows</h3>' + body + "</section>";
}

function recBasis(doc) {
  var basis = doc && doc.budget_basis;
  var kind = basis && basis.kind;
  var labels = {
    edits_saved: "Budgets from saved edits",
    backfill: "Budgets from backfill",
    current_edits_fallback: "Budgets from current edits"
  };
  if (!kind || !labels[kind]) return "";
  var extra = "";
  if (basis.as_of && /^\d{4}-\d{2}-\d{2}/.test(String(basis.as_of))) extra = " as of " + recDayLabel(basis.as_of);
  return '<p class="bank-bar-note" data-bank-budget-basis="' + bankEsc(kind) + '">' + bankEsc(labels[kind] + extra) + "</p>";
}

function recCatTable(doc) {
  var rows = Array.isArray(doc.categories) ? doc.categories : [];
  if (!rows.length) return recBasis(doc) + '<p class="bank-empty">No category totals in this record.</p>';
  var body = rows.map(function (row) {
    var budget = bankNum(row.budget);
    var actual = bankNum(row.actual);
    var over = budget != null && actual != null && actual > budget + 0.004;
    function cell(value) { return "<td>" + bankEsc(bankMoney(value)) + "</td>"; }
    return '<tr' + (over ? ' data-over="1"' : "") + "><th scope=\"row\">" + bankEsc(row.name || "") + "</th>" +
      cell(row.budget) + cell(row.actual) + cell(row.actual_operating) +
      '<td class="' + (over ? "tone-stop" : "") + '">' + bankEsc(bankMoney(row.diff)) + "</td>" +
      cell(row.vs_prior_month) + cell(row.vs_3mo_avg) + "</tr>";
  }).join("");
  return recBasis(doc) + '<div class="bank-rec-table-wrap"><table class="bank-rec-table"><thead><tr>' +
    "<th>Category</th><th>Budget</th><th>Actual</th><th>Operating</th><th>Diff</th><th>Vs prior</th><th>Vs 3-mo</th>" +
    "</tr></thead><tbody>" + body + "</tbody></table></div>";
}

function bankRecordsFilterTx(list, filter) {
  filter = filter || {};
  var q = String(filter.q || "").trim().toLowerCase();
  return (list || []).filter(function (row) {
    if (!row) return false;
    var category = String(row.category_name || row.category || "");
    var tier = String(row.tier || "").toLowerCase();
    var suffix = String(row.account_suffix || "");
    if (filter.category && category !== filter.category) return false;
    if (filter.tier && tier !== String(filter.tier).toLowerCase()) return false;
    if (filter.account && suffix !== String(filter.account)) return false;
    var rhythm = row.one_off === true || row.one_off === "true" ? "one" : ((row.recurring === true || row.recurring === "true" || row.one_off === false) ? "recurring" : "");
    if (filter.rhythm && rhythm !== filter.rhythm) return false;
    if (!q) return true;
    var hay = (String(row.desc || "") + " " + category + " " + tier + " " + suffix).toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}

function bankRecordsPurchaseBody(doc, filter) {
  var all = Array.isArray(doc && doc.transactions) ? doc.transactions : [];
  if (!all.length) {
    var msg = doc && doc.completeness === "aggregates_only"
      ? "Totals only. Purchases are not listed for this month."
      : "No purchases in this record.";
    return { html: '<tr><td colspan="7">' + bankEsc(msg) + "</td></tr>", count: 0 };
  }
  var rows = bankRecordsFilterTx(all, filter).slice().sort(function (a, b) {
    var byDate = String(b.date || "").localeCompare(String(a.date || ""));
    return byDate || String(a.desc || "").localeCompare(String(b.desc || ""));
  });
  if (rows.length > 500) rows = rows.slice(0, 500);
  if (!rows.length) return { html: '<tr><td colspan="7">No purchases match.</td></tr>', count: 0 };
  var html = rows.map(function (row) {
    var rhythm = row.one_off === true || row.one_off === "true" ? "One-time" : ((row.recurring === true || row.recurring === "true" || row.one_off === false) ? "Recurring" : "\u2014");
    return "<tr><td>" + bankEsc(recDayLabel(row.date) || "\u2014") + "</td><td>" + bankEsc(row.desc || "\u2014") +
      "</td><td>" + bankEsc(row.category_name || row.category || "\u2014") + "</td><td>" + bankEsc(recTierLabel(row.tier) || "\u2014") +
      "</td><td>" + bankEsc(recSuffix(row.account_suffix || "")) + "</td><td>" + bankEsc(rhythm) +
      "</td><td>" + bankEsc(bankMoney(row.amount)) + "</td></tr>";
  }).join("");
  return { html: html, count: rows.length };
}

function recOptions(values, current, blank) {
  var html = '<option value="">' + bankEsc(blank) + "</option>";
  values.forEach(function (value) {
    html += '<option value="' + bankEsc(value) + '"' + (value === current ? " selected" : "") + ">" + bankEsc(value) + "</option>";
  });
  return html;
}

function recTierOptions(tiers, current) {
  var html = '<option value="">All tiers</option>';
  tiers.forEach(function (tier) {
    html += '<option value="' + bankEsc(tier) + '"' + (tier === current ? " selected" : "") + ">" + bankEsc(recTierLabel(tier)) + "</option>";
  });
  return html;
}

function recAccountOptions(accounts, current) {
  var html = '<option value="">All accounts</option>';
  accounts.forEach(function (account) {
    html += '<option value="' + bankEsc(account) + '"' + (account === current ? " selected" : "") + ">" + bankEsc(recSuffix(account) || account) + "</option>";
  });
  return html;
}

function recPurchases(doc, filter) {
  filter = filter || {};
  var all = Array.isArray(doc.transactions) ? doc.transactions : [];
  var built = bankRecordsPurchaseBody(doc, filter);
  if (!all.length) {
    return '<section class="bank-bars" data-bank-rec-purchases><h3>Purchases</h3><div class="bank-rec-table-wrap"><table class="bank-rec-table"><tbody data-bank-rec-rows>' +
      built.html + "</tbody></table></div></section>";
  }
  var categories = [];
  var tiers = [];
  var accounts = [];
  all.forEach(function (row) {
    var category = String(row.category_name || row.category || "");
    var tier = String(row.tier || "").toLowerCase();
    var account = String(row.account_suffix || "");
    if (category && categories.indexOf(category) < 0) categories.push(category);
    if (tier && tiers.indexOf(tier) < 0) tiers.push(tier);
    if (account && accounts.indexOf(account) < 0) accounts.push(account);
  });
  var count = built.count + (built.count === 1 ? " purchase" : " purchases");
  return '<section class="bank-bars" data-bank-rec-purchases><h3>Purchases</h3><div class="bank-rec-filters">' +
    '<input type="search" data-bank-rec-q aria-label="Search purchases" value="' + bankEsc(filter.q || "") + '" placeholder="Search purchases">' +
    '<select data-bank-rec-filter="category" aria-label="Category">' + recOptions(categories, filter.category || "", "All categories") + "</select>" +
    '<select data-bank-rec-filter="tier" aria-label="Tier">' + recTierOptions(tiers, filter.tier || "") + "</select>" +
    '<select data-bank-rec-filter="account" aria-label="Account">' + recAccountOptions(accounts, filter.account || "") + "</select>" +
    '<select data-bank-rec-filter="rhythm" aria-label="One-time or recurring">' +
    '<option value="">All purchases</option><option value="one"' + (filter.rhythm === "one" ? " selected" : "") + '>One-time</option><option value="recurring"' +
    (filter.rhythm === "recurring" ? " selected" : "") + ">Recurring</option></select></div>" +
    '<p class="bank-rec-asof" data-bank-rec-count>' + bankEsc(count) + '</p><div class="bank-rec-table-wrap"><table class="bank-rec-table"><thead><tr>' +
    "<th>Date</th><th>Description</th><th>Category</th><th>Tier</th><th>Account</th><th>Rhythm</th><th>Amount</th></tr></thead><tbody data-bank-rec-rows>" +
    built.html + "</tbody></table></div></section>";
}

function recMonthBody(doc, opts) {
  return recSummary(doc) + recCharts(doc) + recCycles(doc) + recIncomeSection(doc) + recOutSection(doc) +
    '<section class="bank-bars" data-bank-rec-categories><h3>Categories</h3>' + recCatTable(doc) + "</section>" +
    recPurchases(doc, opts && opts.recFilter);
}

function recShell(kind, extra, inner, doc) {
  var complete = doc && doc.completeness ? ' data-completeness="' + bankEsc(doc.completeness) + '"' : "";
  var key = extra ? ' data-record-key="' + bankEsc(extra) + '"' : "";
  return '<div class="bank-record" data-bank-record="' + bankEsc(kind) + '"' + key + complete + ">" + inner + "</div>";
}

function bankRecordsShownMonth(opts, index) {
  opts = opts || {};
  if (opts.histYear && /^\d{4}$/.test(String(opts.histYear))) return "";
  var picked = opts.histMonth && typeof bankMonthKey === "function" ? bankMonthKey(opts.histMonth) : String(opts.histMonth || "");
  if (/^\d{4}-\d{2}$/.test(picked)) return picked;
  return bankRecordsDefaultMonth(index);
}

function recIsMonth(doc, month) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return false;
  if (doc.schema === "banking-year-archive/v1") return false;
  if (doc.year && !doc.month) return false;
  if (month && doc.month && doc.month !== month) return false;
  return !!(doc.month || doc.schema === "banking-month-archive/v1" || doc.income || doc.transactions || doc.categories);
}

function recIsYear(doc, year) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return false;
  if (doc.schema === "banking-month-archive/v1" || doc.month) return false;
  if (year && doc.year != null && String(doc.year) !== String(year)) return false;
  return !!(doc.year || doc.schema === "banking-year-archive/v1");
}

function recMapRows(raw) {
  if (Array.isArray(raw)) {
    return raw.map(function (row, i) {
      if (row && typeof row === "object") return { key: String(row.month || row.date || i), value: bankNum(row.amount != null ? row.amount : row.value) };
      return { key: String(i), value: bankNum(row) };
    });
  }
  if (raw && typeof raw === "object") {
    return Object.keys(raw).filter(function (key) { return key !== "__proto__"; }).sort().map(function (key) {
      return { key: key, value: bankNum(raw[key]) };
    });
  }
  return [];
}

function recMonthColumns(doc) {
  var chart = doc.charts && doc.charts.monthly_in_out_net;
  if (chart && chart.available === false) return { off: true, columns: [] };
  if (chart && Array.isArray(chart.months)) {
    return {
      off: false,
      columns: chart.months.map(function (month, i) {
        var inn = chart.income ? bankNum(chart.income[i]) : null;
        var out = chart.outflow ? bankNum(chart.outflow[i]) : null;
        var net = chart.line ? bankNum(chart.line[i]) : null;
        if (net == null && inn != null && out != null) net = inn - out;
        return { label: recMonthShort(month), inn: inn, out: out, net: net };
      })
    };
  }
  var income = recMapRows(doc.income_by_month);
  var out = recMapRows(doc.outflows_by_month);
  var keys = [];
  income.concat(out).forEach(function (row) { if (keys.indexOf(row.key) < 0) keys.push(row.key); });
  keys.sort();
  if (!keys.length) return { off: false, columns: [] };
  return {
    off: false,
    columns: keys.map(function (key) {
      var inn = null;
      var spent = null;
      income.forEach(function (row) { if (row.key === key) inn = row.value; });
      out.forEach(function (row) { if (row.key === key) spent = row.value; });
      var net = inn != null && spent != null ? inn - spent : null;
      return { label: recMonthShort(key), inn: inn, out: spent, net: net };
    })
  };
}

function recTrendSeries(chart) {
  var series = chart && Array.isArray(chart.series) ? chart.series : [];
  var months = [];
  series.forEach(function (row) {
    (row.points || []).forEach(function (pt) {
      var month = pt && (pt.month || pt.date);
      if (month && months.indexOf(month) < 0) months.push(month);
    });
    if (Array.isArray(row.months)) row.months.forEach(function (month) { if (months.indexOf(month) < 0) months.push(month); });
  });
  months.sort();
  var drawn = series.map(function (row, i) {
    var values;
    if (Array.isArray(row.points)) values = recAlign(months, row.points, "value");
    else if (Array.isArray(row.values) && Array.isArray(row.months)) {
      values = months.map(function (month) {
        var at = row.months.indexOf(month);
        return at >= 0 ? bankNum(row.values[at]) : null;
      });
    } else values = months.map(function () { return null; });
    return { name: row.name || "Category", values: values, color: REC_COLORS[i % REC_COLORS.length] };
  });
  return { months: months, series: drawn };
}

function recHeatModel(chart) {
  var alt = chart && chart.alternate;
  if (alt && Array.isArray(alt.months) && Array.isArray(alt.rows) && alt.rows.length) {
    return { months: alt.months, rows: alt.rows };
  }
  var trend = recTrendSeries(chart);
  if (!trend.months.length) return null;
  return {
    months: trend.months,
    rows: trend.series.map(function (row) { return { name: row.name, values: row.values }; })
  };
}

function recHeatSvg(model) {
  var months = model.months || [];
  var rows = (model.rows || []).slice(0, 12);
  if (!months.length || !rows.length) return "";
  var left = 120;
  var top = 28;
  var cellW = Math.max(36, Math.min(120, (500) / months.length));
  var cellH = 28;
  var width = left + cellW * months.length + 16;
  var height = top + cellH * rows.length + 12;
  var max = 0;
  rows.forEach(function (row) {
    (row.values || []).forEach(function (value) {
      var n = Math.abs(bankNum(value) || 0);
      if (n > max) max = n;
    });
  });
  var svg = '<svg class="bank-rec-svg" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Category heatmap">';
  months.forEach(function (month, i) {
    svg += '<text x="' + (left + cellW * i + cellW / 2).toFixed(1) + '" y="16" text-anchor="middle" fill="var(--ink-soft)" font-size="11">' +
      bankEsc(recMonthShort(month)) + "</text>";
  });
  rows.forEach(function (row, r) {
    svg += '<text x="8" y="' + (top + cellH * r + 18) + '" fill="var(--ink)" font-size="11">' + bankEsc(row.name || "") + "</text>";
    months.forEach(function (_month, c) {
      var n = bankNum(row.values && row.values[c]);
      var mag = Math.abs(n || 0);
      var opacity = max > 0 ? (0.12 + (mag / max) * 0.78).toFixed(2) : "0.12";
      var fill = n != null && n < 0 ? "var(--stop)" : "var(--ink)";
      var x = left + cellW * c + 2;
      var y = top + cellH * r + 2;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + (cellW - 4) + '" height="' + (cellH - 4) + '" rx="4" fill="' + fill + '" fill-opacity="' + opacity + '"></rect>';
      if (n != null) {
        svg += '<text x="' + (x + (cellW - 4) / 2).toFixed(1) + '" y="' + (y + 16) + '" text-anchor="middle" fill="var(--ink)" font-size="11">' +
          bankEsc(bankMoney(n)) + "</text>";
      }
    });
  });
  svg += "</svg>";
  return svg;
}

function recSavingsSection(doc) {
  var chart = doc.charts && doc.charts.savings_rate;
  var head = "<h3>Savings rate</h3>";
  if (chart && chart.available === false) {
    return '<section class="bank-bars" data-bank-rec-chart="savings_rate">' + head + recUnavailable("savings_rate") + "</section>";
  }
  var points = chart && Array.isArray(chart.points) ? chart.points : [];
  if (!points.length) {
    return '<section class="bank-bars" data-bank-rec-chart="savings_rate">' + head + recNothing() + "</section>";
  }
  var months = points.map(function (row) { return row.month || ""; });
  var allIn = points.map(function (row) { return recPct(row.rate).n; });
  var operating = points.map(function (row) { return recPct(row.operating_rate).n; });
  var values = allIn.concat(operating).concat([0]);
  var svg = recLineSvg({
    label: "Savings rate",
    dates: months,
    labels: months.map(recMonthShort),
    values: values,
    series: [
      { name: "All-in", values: allIn, color: "var(--ink)", stopBelow: true },
      { name: "Operating", values: operating, color: "var(--ink-soft)", dash: "5 4", stopBelow: true }
    ]
  });
  var legend = '<ul class="bank-legend"><li><i style="background:var(--ink)"></i>All-in</li><li><i style="background:var(--ink-soft)"></i>Operating</li><li><i style="background:var(--stop)"></i>Below zero</li></ul>';
  return '<section class="bank-bars" data-bank-rec-chart="savings_rate">' + head + svg + legend + "</section>";
}

function recTrendSection(doc, opts) {
  var chart = doc.charts && doc.charts.category_trends;
  var heatOn = !!(opts && opts.recHeat);
  var head = "<h3>Category trends</h3>";
  if (chart && chart.available === false) {
    return '<section class="bank-bars" data-bank-rec-chart="category_trends">' + head + recUnavailable("category_trends") + "</section>";
  }
  var trend = recTrendSeries(chart || {});
  var heat = recHeatModel(chart || {});
  if ((!trend.months.length || !trend.series.length) && !heat) {
    return '<section class="bank-bars" data-bank-rec-chart="category_trends">' + head + recNothing() + "</section>";
  }
  var button = '<button type="button" class="bank-year-chip" data-bank-rec-heat aria-pressed="' + (heatOn ? "true" : "false") + '">' +
    (heatOn ? "Lines" : "Heatmap") + "</button>";
  var body;
  if (heatOn && heat) body = recHeatSvg(heat);
  else if (trend.months.length) {
    var values = [];
    trend.series.forEach(function (row) { row.values.forEach(function (n) { if (n != null) values.push(n); }); });
    body = recLineSvg({
      label: "Category trends",
      dates: trend.months,
      labels: trend.months.map(recMonthShort),
      values: values,
      series: trend.series
    }) + recLegend(trend.series.map(function (row) { return { name: row.name }; }));
  } else body = recHeatSvg(heat);
  return '<section class="bank-bars" data-bank-rec-chart="category_trends">' + head + button + (body || recNothing()) + "</section>";
}

function recSankeyModel(doc) {
  var chart = doc.charts && doc.charts.sankey;
  if (chart && chart.available === false) return { off: true };
  if (chart && Array.isArray(chart.nodes) && Array.isArray(chart.links) && chart.links.length) {
    return { off: false, nodes: chart.nodes, links: chart.links, confidence: chart.confidence || "" };
  }
  var sources = [];
  var bySource = doc.income_by_source;
  if (Array.isArray(bySource)) {
    bySource.forEach(function (row) {
      if (row && bankNum(row.amount) != null) sources.push({ name: row.name || row.kind || "Source", amount: Math.abs(bankNum(row.amount)) });
    });
  } else if (bySource && typeof bySource === "object") {
    Object.keys(bySource).forEach(function (key) {
      if (key === "__proto__") return;
      var n = bankNum(bySource[key]);
      if (n != null) sources.push({ name: recKindLabel(key), amount: Math.abs(n) });
    });
  }
  var income = bankNum(doc.income_total);
  if (!sources.length && income != null) sources.push({ name: "Income sources", amount: Math.abs(income) });
  var uses = [];
  (doc.categories || []).forEach(function (row) {
    var n = bankNum(row && row.actual);
    if (row && row.name && n != null) uses.push({ name: row.name, amount: Math.abs(n) });
  });
  var spent = uses.reduce(function (sum, row) { return sum + row.amount; }, 0);
  var outflow = bankNum(doc.outflow_total);
  if (!uses.length && outflow != null) {
    uses.push({ name: "Spending", amount: Math.abs(outflow) });
    spent = Math.abs(outflow);
  }
  if (!sources.length && !uses.length) return { off: false, nodes: [], links: [], confidence: "" };
  if (income == null) income = sources.reduce(function (sum, row) { return sum + row.amount; }, 0);
  var gap = income - spent;
  var nodes = [{ id: "in", label: "Income" }];
  var links = [];
  if (gap < -0.5) {
    nodes.unshift({ id: "draw", label: "Account drawdown" });
    links.push({ source: "draw", target: "in", value: Math.abs(gap) });
  }
  sources.forEach(function (row, i) {
    nodes.unshift({ id: "s" + i, label: row.name });
    links.push({ source: "s" + i, target: "in", value: row.amount });
  });
  uses.forEach(function (row, i) {
    nodes.push({ id: "u" + i, label: row.name });
    links.push({ source: "in", target: "u" + i, value: row.amount });
  });
  if (gap > 0.5) {
    nodes.push({ id: "left", label: "Left in accounts" });
    links.push({ source: "in", target: "left", value: gap });
  }
  return { off: false, nodes: nodes, links: links, confidence: chart && chart.confidence || "" };
}

function recSankeySvg(model) {
  var nodes = (model.nodes || []).slice();
  var links = (model.links || []).filter(function (link) { return link && bankNum(link.value) > 0 && link.source !== link.target; });
  if (!nodes.length || !links.length) return "";
  var byId = {};
  nodes.forEach(function (node) { if (node && node.id != null) byId[node.id] = node; });
  nodes.forEach(function (node) {
    if (node.col) return;
    var label = String(node.label || node.id || "");
    if (/^income$/i.test(label)) node.col = "mid";
    else if (/drawdown/i.test(label)) node.col = "source";
    else if (/left in accounts/i.test(label)) node.col = "use";
  });
  links.forEach(function (link) {
    var source = byId[link.source];
    var target = byId[link.target];
    if (source && !source.col && target && /^income$/i.test(String(target.label || ""))) source.col = "source";
    if (target && !target.col && source && /^income$/i.test(String(source.label || ""))) target.col = "use";
  });
  nodes.forEach(function (node) { if (!node.col) node.col = "use"; });
  function stack(col, x) {
    var list = nodes.filter(function (node) { return node.col === col; });
    return list.map(function (node, i) {
      return { id: node.id, label: node.label || node.id, x: x, y: 16 + i * 36, w: 14, h: 22 };
    });
  }
  var placed = stack("source", 150).concat(stack("mid", 310), stack("use", 470));
  var at = {};
  placed.forEach(function (node) { at[node.id] = node; });
  var height = 48;
  placed.forEach(function (node) { height = Math.max(height, node.y + node.h + 16); });
  var max = 0;
  links.forEach(function (link) { var n = bankNum(link.value) || 0; if (n > max) max = n; });
  var svg = '<svg class="bank-rec-svg" viewBox="0 0 640 ' + height + '" role="img" aria-label="Income flow">';
  links.forEach(function (link) {
    var a = at[link.source];
    var b = at[link.target];
    if (!a || !b) return;
    var value = bankNum(link.value) || 0;
    var width = max > 0 ? Math.max(2, (value / max) * 16) : 2;
    var label = String((b.label || "") + " " + (a.label || ""));
    var stroke = /left in accounts/i.test(label) ? "var(--go)" : (/drawdown/i.test(label) ? "var(--stop)" : "var(--ink-soft)");
    var x1 = a.x + a.w;
    var y1 = a.y + a.h / 2;
    var x2 = b.x;
    var y2 = b.y + b.h / 2;
    var c = (x2 - x1) / 2;
    svg += '<path d="M ' + x1 + " " + y1 + " C " + (x1 + c) + " " + y1 + ", " + (x2 - c) + " " + y2 + ", " + x2 + " " + y2 +
      '" fill="none" stroke="' + stroke + '" stroke-width="' + width.toFixed(1) + '" stroke-opacity="0.8"></path>';
  });
  placed.forEach(function (node) {
    var anchor = node.x < 200 ? "end" : (node.x > 400 ? "start" : "middle");
    var tx = node.x < 200 ? node.x - 8 : (node.x > 400 ? node.x + node.w + 8 : node.x + node.w / 2);
    svg += '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" rx="3" fill="var(--ink)"></rect>';
    svg += '<text x="' + tx + '" y="' + (node.y + 15) + '" text-anchor="' + anchor + '" fill="var(--ink)" font-size="12">' + bankEsc(node.label) + "</text>";
  });
  svg += "</svg>";
  return svg;
}

function recSankeySection(doc) {
  var model = recSankeyModel(doc);
  var note = '<p class="bank-bar-note">Money is fungible. This sketch follows labels, not specific dollars.' +
    (model.confidence ? " Confidence: " + bankEsc(String(model.confidence)) + "." : " Confidence was not set.") + "</p>";
  var body = model.off ? recUnavailable("sankey") : (recSankeySvg(model) || recNothing());
  return '<section class="bank-bars" data-bank-rec-chart="sankey"><h3>Where the money went</h3>' + note + body + "</section>";
}

function recYearSummary(doc) {
  var inn = recFlow(bankNum(doc.income_total), "in");
  var out = recFlow(bankNum(doc.outflow_total), "out");
  var net = bankNum(doc.net_cash_flow);
  var operating = bankNum(doc.net_operating);
  var save = recPct(doc.savings_rate);
  var saveOp = recPct(doc.savings_rate_operating);
  var flag = doc.status === "closed" ? "Final" : "Provisional";
  var code = doc.status === "closed" ? "closed" : "provisional_ytd";
  var through = recDayLabel(doc.through_date);
  var sentence = (doc.status === "closed" ? "Full year" : "Year to date") + (through ? " through " + through : "") + ".";
  var best = doc.best_month && (doc.best_month.month || doc.best_month);
  var worst = doc.worst_month && (doc.worst_month.month || doc.worst_month);
  var range = "";
  if (best || worst) {
    var bits = [];
    if (best) bits.push("Best month " + recMonthTitle(best) + (doc.best_month && doc.best_month.net != null ? ", net " + bankMoney(doc.best_month.net) : ""));
    if (worst) bits.push("Worst month " + recMonthTitle(worst) + (doc.worst_month && doc.worst_month.net != null ? ", net " + bankMoney(doc.worst_month.net) : ""));
    range = '<p class="bank-rec-asof">' + bankEsc(bits.join(". ")) + ".</p>";
  }
  var mix = doc.completeness_by_month;
  var mixLine = "";
  if (mix && typeof mix === "object") {
    var parts = Object.keys(mix).sort().map(function (month) {
      return recMonthShort(month) + " " + (recCompleteLabel(mix[month]) || String(mix[month] || ""));
    });
    if (parts.length) mixLine = '<p class="bank-rec-asof" data-bank-rec-mix>' + bankEsc(parts.join(" · ")) + ".</p>";
  }
  var cards = [
    recKpi("in", "In", inn.text, inn.tone),
    recKpi("out", "Out", out.text, out.tone),
    recKpi("net", "Net", bankMoney(net), recMoneyTone(net)),
    recKpi("net_operating", "Net, operating", bankMoney(operating), recMoneyTone(operating)),
    recKpi("savings", "Savings rate", save.text, save.tone),
    recKpi("savings_operating", "Savings, operating", saveOp.text, saveOp.tone),
    recKpi("late", "Late bills", doc.late_bills_count == null ? "\u2014" : String(doc.late_bills_count), Number(doc.late_bills_count) > 0 ? "stop" : ""),
    recKpi("nsf", "Returned", doc.nsf_or_returned_count == null ? "\u2014" : String(doc.nsf_or_returned_count), Number(doc.nsf_or_returned_count) > 0 ? "stop" : ""),
    recKpi("floor_days", "Days under floor", doc.below_floor_day_count == null ? "\u2014" : String(doc.below_floor_day_count), ""),
    recKpi("negative_days", "Negative days", doc.negative_day_count == null ? "\u2014" : String(doc.negative_day_count), Number(doc.negative_day_count) > 0 ? "stop" : "")
  ].join("");
  return '<div data-bank-rec-summary><p class="bank-rec-flag" data-bank-rec-status="' + bankEsc(code) + '">' + bankEsc(flag) +
    '</p><p class="bank-rec-summary">' + bankEsc(sentence) + "</p>" + range + mixLine +
    '<div class="bank-kpi bank-rec-kpis">' + cards + "</div></div>";
}

function recText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") return String(item.text || item.note || item.label || item.summary || "");
  return String(item);
}

function recBullets(items) {
  var list = (items || []).map(recText).filter(function (line) { return !!line; });
  if (!list.length) return '<p class="bank-empty">Nothing listed.</p>';
  return "<ul>" + list.map(function (line) { return "<li>" + bankEsc(line) + "</li>"; }).join("") + "</ul>";
}

function recAnalysis(doc) {
  var analysis = doc && doc.year_end_analysis || {};
  var provisional = doc.status === "provisional_ytd" || analysis.provisional === true;
  var through = recDayLabel(doc.through_date);
  var label = "";
  if (provisional) label = '<p class="bank-rec-flag">Provisional' + (through ? ", through " + bankEsc(through) : "") + ".</p>";
  return '<section class="bank-bars" data-bank-rec-analysis><h3>Year-end analysis</h3>' + label +
    "<h3>What went right</h3>" + recBullets(analysis.what_went_right) +
    "<h3>What went wrong</h3>" + recBullets(analysis.what_went_wrong) +
    "<h3>Habits for next year</h3>" + recBullets(analysis.habits_for_next_year) + "</section>";
}

function recYearBody(doc, opts) {
  var flow = recMonthColumns(doc);
  var flowBody = flow.off ? recUnavailable("monthly_in_out_net") : (recColumnSvg({ label: "Monthly in, out, and net", columns: flow.columns }) || recNothing());
  return recYearSummary(doc) + '<div class="bank-rec-charts" data-bank-rec-charts>' +
    '<section class="bank-bars" data-bank-rec-chart="monthly_in_out_net"><h3>Monthly in, out, and net</h3>' + flowBody + recFlowLegend() + "</section>" +
    recTrendSection(doc, opts) +
    recSavingsSection(doc) +
    recBarsSection("ytd_budget_vs_actual", "Year budget vs actual", doc, doc.charts && doc.charts.ytd_budget_vs_actual) +
    recSankeySection(doc) +
    "</div>" + recAnalysis(doc);
}

function bankRecordsHtml(snap, opts) {
  opts = opts || {};
  var index = opts.recordIndex;
  if (!index || typeof index !== "object" || Array.isArray(index)) return "";
  if (index.locked) {
    return recShell("locked", "", '<p class="bank-empty">Monthly records are locked. Sign in with the one-time passcode.</p>');
  }
  if (!Array.isArray(index.months) && !Array.isArray(index.years)) return "";
  if (opts.histYear && /^\d{4}$/.test(String(opts.histYear))) {
    var yearDoc = recIsYear(opts.record, opts.histYear) ? opts.record : null;
    if (!yearDoc) {
      return recShell("year", opts.histYear, '<p class="bank-empty" data-bank-rec-missing="year">No year record yet.</p>');
    }
    return recShell("year", String(opts.histYear), recYearBody(yearDoc, opts), yearDoc);
  }
  if (!(index.months && index.months.length) && !(index.years && index.years.length)) {
    return recShell("empty", "", '<p class="bank-empty">No monthly records yet.</p>');
  }
  var month = bankRecordsShownMonth(opts, index);
  var monthDoc = recIsMonth(opts.record, month) ? opts.record : null;
  if (!monthDoc) {
    return recShell("month", month, '<p class="bank-empty" data-bank-rec-missing="month">No record for this month.</p>');
  }
  return recShell("month", month, recMonthBody(monthDoc, opts), monthDoc);
}

function bankRecordsPickerHtml(snap, opts) {
  opts = opts || {};
  var index = opts.recordIndex;
  if (!index || index.locked || !Array.isArray(index.months)) return "";
  var yearMode = !!(opts.histYear && /^\d{4}$/.test(String(opts.histYear)));
  var shown = yearMode ? "" : bankRecordsShownMonth(opts, index);
  var months = index.months.slice().sort(function (a, b) {
    return String(b && b.month || "").localeCompare(String(a && a.month || ""));
  });
  var options = yearMode ? '<option value="" selected disabled>Year view</option>' : "";
  var badge = "";
  months.forEach(function (row) {
    var ym = typeof bankMonthKey === "function" ? bankMonthKey(row && row.month) : "";
    if (!ym) return;
    var label = recMonthTitle(ym) + " \u00b7 " + (recCompleteLabel(row.completeness) || "Month");
    options += '<option value="' + bankEsc(ym) + '"' + (ym === shown ? " selected" : "") + ">" + bankEsc(label) + "</option>";
    if (ym === shown) badge = recBadge(row.completeness);
  });
  if (!options) options = '<option value="">No months</option>';
  var chips = recYearList(index).map(function (year) {
    var on = String(opts.histYear || "") === year;
    return '<button type="button" class="bank-year-chip" data-bank-hist-year="' + bankEsc(year) + '" aria-pressed="' +
      (on ? "true" : "false") + '" aria-label="Year ' + bankEsc(year) + '">Year ' + bankEsc(year) + "</button>";
  }).join("");
  return '<div class="bank-hist-controls"><label class="bank-month-pick">Month <select class="bank-hist-select" data-bank-hist-month aria-label="Historical month">' +
    options + "</select></label>" + badge + chips + "</div>";
}

function bankRecordsPaintPurchases(root) {
  var st = root && root._bank;
  if (!st || !st.record || !root.querySelector) return;
  var rows = root.querySelector("[data-bank-rec-rows]");
  if (!rows) return;
  var built = bankRecordsPurchaseBody(st.record, st.recFilter || {});
  rows.innerHTML = built.html;
  var count = root.querySelector("[data-bank-rec-count]");
  if (count) count.textContent = built.count + (built.count === 1 ? " purchase" : " purchases");
}

function bankRecordRead(url) {
  if (!url || typeof fetch !== "function" || typeof bankFetchInit !== "function") {
    return Promise.resolve({ ok: false, status: 0, doc: null });
  }
  var pending;
  try { pending = fetch(url + "?v=" + Date.now(), bankFetchInit()); }
  catch (e) { return Promise.resolve({ ok: false, status: 0, doc: null }); }
  return Promise.resolve(pending).then(function (res) {
    if (!res || res.type === "opaqueredirect") return { ok: false, status: 401, locked: true, doc: null };
    var status = Number(res.status);
    if (status === 401 || status === 403) return { ok: false, status: status, locked: true, doc: null };
    if (res.ok !== true) return { ok: false, status: status, doc: null };
    var read = typeof bankReadJson === "function" ? bankReadJson(res) : Promise.resolve(null);
    return Promise.resolve(read).then(function (doc) {
      return { ok: !!(doc && typeof doc === "object" && !Array.isArray(doc)), status: status, doc: doc };
    });
  }, function () {
    return { ok: false, status: 0, doc: null };
  });
}

function bankRecordsTarget(st) {
  if (st.histYear && /^\d{4}$/.test(String(st.histYear))) return { kind: "year", year: String(st.histYear), key: "y:" + st.histYear };
  var month = st.histMonth && typeof bankMonthKey === "function" ? bankMonthKey(st.histMonth) : "";
  if (month) return { kind: "month", month: month, key: "m:" + month };
  return { kind: "auto", key: "auto" };
}

function bankRecordLoad(st, target) {
  var indexP = st.recordIndex && !st.recordIndex.locked
    ? Promise.resolve({ ok: true, doc: st.recordIndex })
    : bankRecordRead(BANK_RECORD_INDEX);
  return indexP.then(function (indexRes) {
    if (!indexRes || indexRes.locked) return { error: "locked" };
    if (!indexRes.ok || !indexRes.doc) return { error: "missing" };
    var index = indexRes.doc;
    var month = target.month || "";
    var year = target.year || "";
    if (!month && !year) month = bankRecordsDefaultMonth(index);
    if (year) {
      var yearPath = bankRecordYearPath(year);
      if (!yearPath) return { index: index, error: "missing", year: year };
      return bankRecordRead(yearPath).then(function (res) {
        return { index: index, doc: res && res.ok ? res.doc : null, error: res && res.ok ? "" : "missing", year: year };
      });
    }
    if (!month) return { index: index, error: "empty" };
    var monthPath = bankRecordMonthPath(month);
    if (!monthPath) return { index: index, error: "missing" };
    return bankRecordRead(monthPath).then(function (res) {
      return { index: index, doc: res && res.ok ? res.doc : null, error: res && res.ok ? "" : "missing", month: month };
    });
  });
}

function bankRecordsEnsure(root) {
  var st = root && root._bank;
  if (!st || st.tab !== "historical") return;
  if (st.recordIndex && st.recordIndex.locked) return;
  var target = bankRecordsTarget(st);
  if (st.recordIndex && st.recordKey === target.key && (st.record || st.recordError)) return;
  if (st.recordLoading === target.key) return;
  if (!st.recordIndex && st.recordTried === target.key) return;
  st.recordLoading = target.key;
  var seq = (st.recordSeq = (st.recordSeq || 0) + 1);
  st.recordPromise = bankRecordLoad(st, target).then(function (pack) {
    if (!root._bank || root._bank.recordSeq !== seq || root._bank.tab !== "historical") return;
    var cur = root._bank;
    cur.recordLoading = "";
    if (!pack || pack.error === "locked") {
      cur.recordIndex = { locked: true, months: [], years: [] };
      cur.record = null;
      cur.recordKey = target.key;
      cur.recordError = "locked";
      bankPaint(root);
      return;
    }
    if (!pack.index) {
      cur.recordTried = target.key;
      cur.recordError = pack.error || "missing";
      return;
    }
    cur.recordIndex = pack.index;
    if (pack.year) {
      cur.histYear = pack.year;
      cur.histMonth = "";
      cur.recordKey = "y:" + pack.year;
    } else if (pack.month) {
      if (target.kind === "auto" && typeof bankWriteRecordHash === "function") bankWriteRecordHash(pack.month, "", true);
      cur.histMonth = pack.month;
      cur.histYear = "";
      cur.recordKey = "m:" + pack.month;
    } else cur.recordKey = target.key;
    cur.record = pack.doc || null;
    cur.recordError = pack.error || "";
    bankPaint(root);
  }, function () {
    if (!root._bank || root._bank.recordSeq !== seq) return;
    root._bank.recordLoading = "";
    root._bank.recordTried = target.key;
    root._bank.recordError = "error";
  });
}
