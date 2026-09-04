TABS = [
  { id: "combined", label: "House" },
  { id: "agentic", label: "Marlowe" },
  { id: "individual", label: "Individual" },
  { id: "auto_grok", label: "Auto" },
  { id: "joint", label: "Joint" },
  { id: "fidelity", label: "Fidelity" },
  { id: "voya", label: "Voya" }
];
LABEL.auto_grok = "Auto";
LABEL.fidelity = "Fidelity";
LABEL.voya = "Voya";
if (typeof hashTab === "function") hashTab();
IDS = ["agentic", "individual", "auto_grok", "joint", "fidelity", "voya"];
var LIVE_IDS = ["agentic", "individual", "auto_grok", "joint", "fidelity"];
var OUTSIDE_IDS = ["voya"];
var EOD_IDS = ["voya"];
var EOD_TAPE_SEED = {
  fidelity: [
    { t: "2026-09-01T16:00:00-04:00", dtg: "011600R SEP 26", equity: 2755.07 },
    { t: "2026-09-02T16:00:00-04:00", dtg: "021600R SEP 26", equity: 2735.53 },
    { t: "2026-09-03T16:00:00-04:00", dtg: "031600R SEP 26", equity: 2749.62 }
  ],
  voya: [
    { t: "2026-09-01T16:00:00-04:00", dtg: "011600R SEP 26", equity: 62174.33 },
    { t: "2026-09-02T16:00:00-04:00", dtg: "021600R SEP 26", equity: 61806.32 },
    { t: "2026-09-03T16:00:00-04:00", dtg: "031600R SEP 26", equity: 61966.26 }
  ]
};
function mergeEodTape(key, outside, currentEq, closeT) {
  var seed = (EOD_TAPE_SEED && EOD_TAPE_SEED[key]) || [];
  var fromJson = (outside && outside.tape && outside.tape[key]) || [];
  var extra = [];
  if (currentEq != null && isFinite(Number(currentEq)) && closeT) extra.push({ t: closeT, equity: Number(currentEq) });
  var arr = [].concat(seed, fromJson, extra);
  try {
    var raw = localStorage.getItem("murphyTape." + key);
    var stored = raw ? JSON.parse(raw) : [];
    if (Array.isArray(stored)) arr = arr.concat(stored);
  } catch (e) {}
  var byDay = {};
  arr.forEach(function (rawP) {
    var p = typeof normPrint === "function" ? normPrint(rawP) : rawP;
    if (!p || !p.t) return;
    var eq = Number(p.equity);
    if (!isFinite(eq)) return;
    var day = String(p.t).slice(0, 10);
    if (!day || day === "Invalid") return;
    var prev = byDay[day];
    if (!prev || String(p.t) >= String(prev.t)) byDay[day] = { t: p.t, dtg: p.dtg || "", equity: eq };
  });
  var days = Object.keys(byDay).sort();
  var out = days.map(function (d) { return byDay[d]; });
  try { localStorage.setItem("murphyTape." + key, JSON.stringify(out)); } catch (e2) {}
  return out;
}
var FID_SLEEVES = [
  { id: "bny", label: "Brokerage", key: "BNY", sleeveKey: "fidelity_bny" },
  { id: "per", label: "Personal", key: "PER", sleeveKey: "fidelity_per" },
  { id: "roth", label: "Roth IRA", key: "Roth", sleeveKey: "fidelity_roth" },
  { id: "trad", label: "Traditional IRA", key: "Trad", sleeveKey: "fidelity_trad" },
  { id: "espp", label: "ESPP", key: "ESPP", sleeveKey: "fidelity_espp" },
  { id: "rsu", label: "RSU", key: "RSU", sleeveKey: "fidelity_rsu" }
];
function buildFidelitySleeves(fid, outside) {
  var totals = (outside && outside.sleeves) || {};
  fid = fid || { names: [] };
  return FID_SLEEVES.map(function (s) {
    var names = (fid.names || []).filter(function (n) {
      return String(n.sleeve || "").toLowerCase() === s.key.toLowerCase();
    });
    var held = names.reduce(function (sum, n) { return sum + (Number(n.value) || 0); }, 0);
    var equity = totals[s.sleeveKey] != null ? Number(totals[s.sleeveKey]) : held;
    var cash = Math.max(0, rnd(equity - held));
    return { id: s.id, label: s.label, key: s.key, equity: rnd(equity), cash: cash, buying_power: cash, pending_deposits: 0, equity_value: rnd(held), invested_pct: equity ? Math.min(100, (held / equity) * 100) : 0, open_orders: 0, names: names };
  });
}
var _mergeCore = merge;
merge = function (house, pilot, outside) {
  outside = outside || (typeof snap !== "undefined" && snap && snap.truthifi) || null;
  var out = _mergeCore(house, pilot, outside);
  if (outside && outside.accounts) {
    if (outside.accounts.voya) out.accounts.voya = outside.accounts.voya;
    if (outside.accounts.fidelity) {
      var houseFid = house && house.accounts && house.accounts.fidelity;
      var liveFid = houseFid && ((houseFid.names || []).length || houseFid.source === "snaptrade" || houseFid.live);
      if (!liveFid) out.accounts.fidelity = outside.accounts.fidelity;
    }
    out.truthifi = outside;
  }
  if (out.accounts && out.accounts.fidelity) {
    out.accounts.fidelity.sleeves = buildFidelitySleeves(out.accounts.fidelity, outside || out.truthifi);
  }
  var eq = 0, cash = 0, bp = 0, pend = 0, ev = 0, cv = 0, orders = 0, names = [];
  IDS.forEach(function (id) {
    var b = out.accounts[id] || { names: [] };
    if (!b.id) b.id = id;
    if (!b.label) b.label = LABEL[id];
    eq += Number(b.equity) || 0;
    cash += Number(b.cash) || 0;
    bp += Number(b.buying_power) || 0;
    pend += Number(b.pending_deposits) || 0;
    ev += Number(b.equity_value) || 0;
    cv += Number(b.crypto_value) || 0;
    orders += Number(b.open_orders) || 0;
    (b.names || []).forEach(function (n) {
      var row = JSON.parse(JSON.stringify(n));
      row.account = row.account || id;
      row.accounts = row.accounts && row.accounts.length ? row.accounts : [id];
      names.push(row);
    });
  });
  var liveEq = 0, liveCash = 0, liveBp = 0;
  LIVE_IDS.forEach(function (id) {
    var b = out.accounts[id] || {};
    liveEq += Number(b.equity) || 0;
    liveCash += Number(b.cash) || 0;
    liveBp += Number(b.buying_power) || 0;
  });
  var custEq = 0;
  OUTSIDE_IDS.forEach(function (id) { custEq += Number((out.accounts[id] || {}).equity) || 0; });
  out.combined.equity = rnd(eq);
  out.combined.cash = rnd(cash);
  out.combined.buying_power = rnd(bp);
  out.combined.pending_deposits = rnd(pend);
  out.combined.equity_value = rnd(ev);
  out.combined.crypto_value = rnd(cv);
  out.combined.open_orders = orders;
  out.combined.invested_pct = eq ? Math.min(100, (ev / eq) * 100) : 0;
  out.combined.names = names;
  out.combined.books = IDS.map(function (id) {
    var b = out.accounts[id] || {};
    return { id: id, label: LABEL[id], equity: Number(b.equity) || 0, cash: Number(b.cash) || 0, pending_deposits: Number(b.pending_deposits) || 0, invested_pct: Number(b.invested_pct) || 0, names: (b.names || []).length };
  });
  out.tape = out.tape || {};
  out.tape.live = (out.tape.combined || []).map(normPrint);
  var outsideAsOf = (outside && (outside.holdings_asof || outside.asof)) || "";
  var closeT = (outside && outside.overall && outside.overall.asof) || (outside && outside.scanned_at) || outsideAsOf;
  var fidEq = Number((out.accounts.fidelity || {}).equity) || 0;
  var houseFidTape = (out.tape && out.tape.fidelity) || [];
  if (houseFidTape.length) {
    out.tape.fidelity = houseFidTape.map(normPrint);
  } else {
    out.tape.fidelity = mergeEodTape("fidelity", outside, fidEq, closeT);
  }
  out.tape.voya = mergeEodTape("voya", outside, Number((out.accounts.voya || {}).equity) || 0, closeT);
  var ovTape = (outside && outside.tape && outside.tape.overall) || [];
  out.tape.overall = ovTape.map(normPrint);
  if (!out.tape.overall.length) out.tape.overall = [{ t: closeT || "", equity: rnd(eq) }];
  out.combined.live_equity = rnd(liveEq);
  out.combined.live_cash = rnd(liveCash);
  out.combined.live_buying_power = rnd(liveBp);
  out.combined.custodial_equity = rnd(custEq);
  out.combined.outside_asof = outsideAsOf;
  out.combined.overall_asof = (outside && outside.overall && outside.overall.asof) || (outside && outside.scanned_at) || "";
  return out;
};
cardsHtml = function () {
  return "<h2>Books</h2><div class=\"acct-grid\">" + IDS.map(function (id) {
    var b = snap.accounts[id] || {};
    var tag = OUTSIDE_IDS.indexOf(id) >= 0 ? "EOD" : "live";
    var d = vsLookback(dodTape(id), b.equity, 1);
    var day = !d
      ? '<div class="m"><span class="tone-flat">Day \u2014</span></div>'
      : '<div class="m"><span class="tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) + " \u00b7 " + pct(d.pct) + "</span></div>";
    return "<button type=\"button\" class=\"acct-mini\" data-tab=\"" + id + "\"><div class=\"k\">" + esc(LABEL[id]) + " \u00b7 " + tag + "</div><b>" + money(b.equity) + "</b>" + day + "</button>";
  }).join("") + "</div>";
};
function eodNote(book, title) {
  var t = snap.truthifi || {};
  var asof = (book && book.asof) || t.holdings_asof || t.asof || "";
  var scanned = t.scanned_at || "";
  return "<p class=\"hint\">" + esc(title) + " is Truthifi EOD " + esc(asof) +
    (scanned ? " · scanned " + esc(scanned.replace("T", " ").slice(0, 19)) : "") +
    ". Once a day. No account numbers.</p>";
}
function nameStats(names) {
  var value = 0, cost = 0, pnl = 0, hasCost = false, n = names || [];
  n.forEach(function (row) {
    value += Number(row.value) || 0;
    if (row.cost != null && isFinite(Number(row.cost))) { cost += Number(row.cost); hasCost = true; }
    if (row.pnl != null && isFinite(Number(row.pnl))) pnl += Number(row.pnl);
  });
  if (!hasCost) pnl = null;
  else if (!n.some(function (row) { return row.pnl != null; })) pnl = value - cost;
  return { value: rnd(value), cost: rnd(cost), pnl: pnl == null ? null : rnd(pnl), n: n.length, hasCost: hasCost };
}
function custodialStateHtml(b, title) {
  var s = nameStats(b.names);
  var held = b.equity_value != null ? Number(b.equity_value) : s.value;
  var pnl = s.pnl;
  var pnlPct = s.hasCost && s.cost ? (pnl / s.cost) * 100 : null;
  var t = snap.truthifi || {};
  return "<h2>Book state · " + esc(title) + "</h2><div class=\"card span\"><div class=\"kpi\">" +
    "<div><span>Equity</span><b>" + money(b.equity) + "</b>" + (title === "Fidelity" || String(title).indexOf("Voya") === 0 ? dodHtml(dodTape(title === "Fidelity" ? "fidelity" : "voya"), b.equity) : "") + "</div>" +
    "<div><span>Holdings</span><b>" + money(held) + "</b></div>" +
    "<div><span>Cash</span><b>" + money(b.cash) + "</b></div>" +
    "<div><span>P&L</span><b class=\"tone-" + tone(pnl) + "\">" + (pnl == null ? "—" : money(pnl) + " " + pct(pnlPct)) + "</b></div>" +
    "</div><p class=\"hint\">Invested " + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "—") +
    " · " + s.n + " names · Truthifi holdings " + esc(t.holdings_asof || b.asof || "—") +
    " · scanned " + esc((t.scanned_at || "").replace("T", " ").slice(0, 16) || "—") +
    ". Once a day. Sleeves by name only.</p></div>";
}
function custodialTableHtml(names, totalEq) {
  names = (names || []).slice().sort(function (a, b) { return (Number(b.value) || 0) - (Number(a.value) || 0); });
  var total = totalEq || names.reduce(function (s, n) { return s + (Number(n.value) || 0); }, 0) || 1;
  if (!names.length) return "<div class=\"card\"><p class=\"hint\" style=\"margin:0\">No names on this sleeve. Cash-only or empty.</p></div>";
  var head = "<tr><th>Name</th><th>Sleeve</th><th>Kind</th><th class=\"num\">Qty</th><th class=\"num\">Avg</th><th class=\"num\">Last</th><th class=\"num\">Value</th><th class=\"num\">Wt</th><th class=\"num\">Cost</th><th class=\"num\">P&L</th></tr>";
  var rows = names.map(function (n) {
    var wt = (Number(n.value) || 0) / total * 100;
    return "<tr><td class=\"name-cell tone-" + tone(n.pnl_pct) + "\"><span class=\"sym\">" + esc(n.symbol) + "</span><span class=\"sub\">" + esc(n.name || "") + "</span></td>" +
      "<td>" + esc(n.sleeve || "—") + "</td><td>" + esc(n.kind || "equity") + "</td>" +
      "<td class=\"num\">" + qty(n.qty) + "</td>" +
      "<td class=\"num\">" + (n.avg == null ? "—" : money(n.avg)) + "</td>" +
      "<td class=\"num\">" + (n.last == null ? "—" : money(n.last)) + "</td>" +
      "<td class=\"num\">" + money(n.value) + "</td>" +
      "<td class=\"num\">" + wt.toFixed(1) + "%</td>" +
      "<td class=\"num\">" + (n.cost == null ? "—" : money(n.cost)) + "</td>" +
      "<td class=\"num tone-" + tone(n.pnl) + "\">" + (n.pnl == null ? "—" : money(n.pnl) + " " + pct(n.pnl_pct)) + "</td></tr>";
  }).join("");
  return "<div class=\"card book-scroll\"><table class=\"book custodial\"><thead>" + head + "</thead><tbody>" + rows + "</tbody></table></div>";
}
function eodTapeHtml(key, title) {
  var prints = ((snap.tape && snap.tape[key]) || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); });
  var vals = prints.map(function (p) { return p.equity; });
  var last = vals.length ? vals[vals.length - 1] : 0;
  if (!vals.length) vals = [last, last];
  return "<h2>EOD equity \u00b7 " + esc(title) + "</h2><div class=\"card tape-card\">" +
    "<div class=\"tape-kpis\"><div><span>Last EOD</span><b>" + money(last) + "</b></div>" +
    improveKpis(prints, last) + "</div>" +
    "<div class=\"tape-plot ov-plot\">" + overlayAxisChart(prints) + "</div>" +
    "<p class=\"hint\">Truthifi weekday close. Day / week / month vs the prior close.</p></div>";
}
function truthifiMetaHtml() {
  var t = snap.truthifi || {};
  return "<h2>Truthifi feed</h2><div class=\"card span\"><div class=\"kpi\">" +
    "<div><span>Holdings date</span><b>" + esc(t.holdings_asof || t.asof || "—") + "</b></div>" +
    "<div><span>Scanned</span><b>" + esc((t.scanned_at || "").replace("T", " ").slice(0, 16) || "—") + "</b></div>" +
    "<div><span>Source</span><b>" + esc(t.source || "Truthifi") + "</b></div>" +
    "<div><span>Day</span><b>" + (function () { var d = vsLookback((t.tape && t.tape.overall) || [], (snap.combined || {}).equity, 1); return d ? ((d.delta > 0 ? "+" : "") + money(d.delta)) : "\u2014"; })() + "</b></div></div>" +
    "<p class=\"hint\">" + esc(t.note || "Custodial EOD. Sleeves labeled as Truthifi names. No account numbers.") + "</p></div>";
}
function fidelityLiveStateHtml(b, title) {
  var s = nameStats(b.names);
  var held = b.equity_value != null ? Number(b.equity_value) : s.value;
  var pnl = s.pnl;
  var pnlPct = s.hasCost && s.cost ? (pnl / s.cost) * 100 : null;
  var src = b.source || (snap.truthifi && !(b.live || b.source === "snaptrade") ? "Truthifi" : "SnapTrade");
  return "<h2>Book state · " + esc(title) + "</h2><div class=\"card span\"><div class=\"kpi\">" +
    "<div><span>Equity</span><b>" + money(b.equity) + "</b>" + dodHtml(dodTape("fidelity"), b.equity) + "</div>" +
    "<div><span>Holdings</span><b>" + money(held) + "</b></div>" +
    "<div><span>Cash</span><b>" + money(b.cash) + "</b></div>" +
    "<div><span>P&L</span><b class=\"tone-" + tone(pnl) + "\">" + (pnl == null ? "—" : money(pnl) + " " + pct(pnlPct)) + "</b></div>" +
    "</div><p class=\"hint\">Invested " + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "—") +
    " · " + s.n + " names · live like Robinhood · " + esc(src) +
    " · asof " + esc(b.asof || (snap.asof || "—")) +
    ". No account numbers.</p></div>";
}
function fidelityTapeHtml() {
  var prints = ((snap.tape && snap.tape.fidelity) || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); });
  var vals = prints.map(function (p) { return p.equity; });
  var last = vals.length ? vals[vals.length - 1] : Number((snap.accounts.fidelity || {}).equity) || 0;
  if (!vals.length) vals = [last, last];
  return "<h2>Live equity · Fidelity</h2><div class=\"card tape-card\">" +
    "<div class=\"tape-kpis\"><div><span>Now</span><b>" + money(last) + "</b></div>" +
    improveKpis(prints, last) + "</div>" +
    "<div class=\"tape-plot ov-plot\">" + overlayAxisChart(prints) + "</div>" +
    "<p class=\"hint\">Session prints when SnapTrade/House updates. Day / week / month vs prior close.</p></div>";
}
function fidelityDeskHtml() {
  var fid = snap.accounts.fidelity || { names: [], equity: 0 };
  if (!fid.sleeves) fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  var sleeves = fid.sleeves || [];
  var mixBook = { books: sleeves, names: fid.names || [], cash: fid.cash || 0 };
  var html = fidelityLiveStateHtml(fid, "Fidelity");
  html += fidelityTapeHtml();
  html += "<h2>Fidelity accounts · live sleeves</h2><div class=\"acct-grid\">" + sleeves.map(function (s) {
    var st = nameStats(s.names);
    var extra = s.names.length ? (s.names.length + " names") : (s.cash > 0.004 ? "cash sweep" : "empty");
    return "<button type=\"button\" class=\"acct-mini\" data-scroll=\"sleeve-" + esc(s.id) + "\"><div class=\"k\">" + esc(s.label) + " · live</div><b>" + money(s.equity) + "</b><div class=\"m\">" + extra +
      (st.pnl != null ? " · P&L " + money(st.pnl) : "") + "</div></button>";
  }).join("") + "</div>";
  html += "<p class=\"hint\">Fidelity is live (SnapTrade), same cadence goal as Robinhood House. Voya stays Truthifi EOD. No account numbers.</p>";
  html += "<h2>Where it sits · Fidelity</h2>" + mixHtml(mixBook, "combined");
  html += "<h2>All Fidelity names</h2>" + custodialTableHtml(fid.names, fid.equity);
  sleeves.forEach(function (s) {
    html += "<h2 id=\"sleeve-" + esc(s.id) + "\">Account · " + esc(s.label) + "</h2>";
    html += fidelityLiveStateHtml(s, "Fidelity · " + s.label);
    if ((s.names || []).length) {
      html += "<h2>Where it sits · " + esc(s.label) + "</h2>" + mixHtml(s, s.id);
      html += "<h2>Holdings · " + esc(s.label) + "</h2>" + custodialTableHtml(s.names, s.equity);
    }
  });
  return html;
}
function voyaDeskHtml() {
  var voya = snap.accounts.voya || { names: [], equity: 0 };
  return truthifiMetaHtml() + custodialStateHtml(voya, "Voya 401(k)") + eodNote(voya, "Voya") +
    eodTapeHtml("voya", "Voya") +
    "<h2>Where it sits · Voya</h2>" + mixHtml(voya, "voya") +
    "<h2>Holdings · Voya</h2>" + custodialTableHtml(voya.names, voya.equity);
}
function overallCardHtml() {
  var c = snap.combined || {};
  var prints = ((snap.tape && snap.tape.overall) || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); });
  var vals = prints.map(function (p) { return p.equity; });
  var last = vals.length ? vals[vals.length - 1] : (c.equity || 0);
  if (!vals.length) vals = [last, last];
  var asof = c.outside_asof || (prints.length ? prints[prints.length - 1].t.slice(0, 10) : "");
  return "<h2 class=\"overall-eq\">Overall \u00b7 last close</h2><div class=\"card tape-card tape-open\" data-open-all-books=\"1\">" +
    "<div class=\"tape-kpis\">" +
    "<div><span>Last close</span><b>" + money(c.equity) + "</b></div>" +
    improveKpis(prints, c.equity) + "</div>" +
    "<div class=\"tape-plot ov-plot\">" + overlayAxisChart(prints) + "</div>" +
    "<p class=\"hint\">Click for every book. Live Robinhood + Fidelity " + money(c.live_equity) + " \u00b7 Voya EOD " + money(c.custodial_equity) + "." +
    (asof ? " Holdings date " + esc(asof) + "." : "") + "</p></div>";
}
var _paint = paint;
paint = function () {
  if (!snap) return;
  _paint();
  var foot = document.querySelector(".desk-foot");
  if (foot) foot.textContent = "Murphy Pilot \u00b7 Live is Robinhood + Fidelity (SnapTrade). Voya is Truthifi EOD.";
  var desk = document.getElementById("desk");
  if (!desk) return;
  if (tab === "fidelity" || tab === "voya") {
    var alertN = desk.querySelector(".next-alert");
    var footN = desk.querySelector(".desk-foot");
    desk.innerHTML = (alertN ? alertN.outerHTML : "") + (tab === "fidelity" ? fidelityDeskHtml() : voyaDeskHtml()) + (footN ? footN.outerHTML : "");
    return;
  }
  if (tab !== "combined") return;
  Array.from(desk.querySelectorAll("h2")).forEach(function (h) {
    var t = h.textContent || "";
    if (t.indexOf("Live equity") === 0) h.textContent = "Live equity \u00b7 Robinhood session";
    if (t.indexOf("Book state") === 0) h.textContent = "Book state \u00b7 all books";
  });
};
load = function () {
  var housePath = /\/house(\/|$)/.test(location.pathname);
  var bust = "?t=" + Date.now();
  Promise.all([
    fetch((housePath ? "house-snapshot.json" : "house/house-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch((housePath ? "../pilot-snapshot.json" : "pilot-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch((housePath ? "truthifi-snapshot.json" : "house/truthifi-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (pair) {
    snap = merge(pair[0], pair[1], pair[2]);
    paint();
  }).catch(function (e) {
    document.getElementById("desk").innerHTML = "<p class=\"hint\">Could not load snapshots. " + esc(e) + "</p>";
  });
};
load();

document.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-scroll]");
  if (!btn) return;
  var id = btn.getAttribute("data-scroll");
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
});
