TABS = [
  { id: "combined", label: "House" },
  { id: "robinhood", label: "Robinhood" },
  { id: "fidelity", label: "Fidelity" },
  { id: "voya", label: "Voya" }
];
RH_IDS = ["agentic", "individual", "auto_grok", "joint"];
LABEL.robinhood = "Robinhood";
LABEL.auto_grok = "Auto";
LABEL.fidelity = "Fidelity";
LABEL.voya = "Voya";
LABEL.combined = "House";
hashTab = function () {
  var h = (location.hash || "").replace(/^#/, "");
  if (h === "house") h = "combined";
  if (TABS.some(function (t) { return t.id === h; }) || RH_IDS.indexOf(h) >= 0 || /^fid-/.test(h)) tab = h;
};
setHash = function () {
  try { history.replaceState(null, "", "#" + (tab === "combined" ? "house" : tab)); } catch (e) {}
};
hashTab();
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
var FID_SLEEVE_LABELS = {
  BNY: "Brokerage", PER: "Personal", Roth: "Roth IRA", Trad: "Traditional IRA",
  ESPP: "ESPP", RSU: "RSU", HIGH: "HIGH", UNKNOWN: "Other"
};
var FID_SLEEVES = [
  { id: "bny", label: "Brokerage", key: "BNY", sleeveKey: "fidelity_bny" },
  { id: "per", label: "Personal", key: "PER", sleeveKey: "fidelity_per" },
  { id: "roth", label: "Roth IRA", key: "Roth", sleeveKey: "fidelity_roth" },
  { id: "trad", label: "Traditional IRA", key: "Trad", sleeveKey: "fidelity_trad" },
  { id: "espp", label: "ESPP", key: "ESPP", sleeveKey: "fidelity_espp" },
  { id: "rsu", label: "RSU", key: "RSU", sleeveKey: "fidelity_rsu" },
  { id: "high", label: "HIGH", key: "HIGH", sleeveKey: "fidelity_high" }
];
FID_SLEEVES.forEach(function (s) { LABEL["fid-" + s.id] = s.label; });
function fidTabId(sleeveId) { return "fid-" + String(sleeveId || ""); }
function isFidSleeveTab(t) { return /^fid-/.test(String(t || "")); }
function registerFidSleeveLabel(s) {
  if (!s || !s.id) return s;
  LABEL[fidTabId(s.id)] = s.label || s.id;
  return s;
}
function fidSleeveFromTab(t) {
  if (!snap || !isFidSleeveTab(t)) return null;
  var sid = String(t).slice(4);
  var sleeves = ((snap.accounts.fidelity || {}).sleeves) || [];
  for (var i = 0; i < sleeves.length; i++) if (sleeves[i].id === sid) return sleeves[i];
  return null;
}
function slugId(s) {
  return String(s || "acct").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "acct";
}
function fidelityAccountCard(a, i) {
  var names = a.names || [];
  var held = names.reduce(function (sum, n) { return sum + (Number(n.value) || 0); }, 0);
  var equity = a.equity != null ? Number(a.equity) : (held + (Number(a.cash) || 0));
  var cash = a.cash != null ? Number(a.cash) : Math.max(0, equity - held);
  var id = a.id || slugId((a.label || a.name || "acct") + "-" + (a.suffix || i));
  var label = a.label || a.name || ("Account " + (i + 1));
  if (a.suffix && String(label).indexOf(String(a.suffix)) < 0) label = label + " ···" + a.suffix;
  return registerFidSleeveLabel({
    id: id,
    label: label,
    key: a.sleeve || a.key || label,
    suffix: a.suffix || "",
    equity: rnd(equity),
    cash: rnd(cash),
    buying_power: rnd(a.buying_power != null ? a.buying_power : cash),
    pending_deposits: Number(a.pending_deposits) || 0,
    equity_value: rnd(a.equity_value != null ? a.equity_value : held),
    invested_pct: equity ? Math.min(100, (held / equity) * 100) : 0,
    open_orders: Number(a.open_orders) || 0,
    names: names,
    source: a.source || "SnapTrade"
  });
}
function buildFidelitySleeves(fid, outside) {
  var totals = (outside && outside.sleeves) || {};
  fid = fid || { names: [] };
  /* Prefer one card per real Fidelity account (SnapTrade / hybrid feed). */
  if (Array.isArray(fid.accounts) && fid.accounts.length) {
    return fid.accounts.map(function (a, i) { return fidelityAccountCard(a, i); });
  }
  var byKey = {};
  FID_SLEEVES.forEach(function (s) { byKey[s.key.toLowerCase()] = s; });
  (fid.names || []).forEach(function (n) {
    var k = String(n.sleeve || n.account_name || "UNKNOWN");
    var lk = k.toLowerCase();
    if (!byKey[lk]) {
      byKey[lk] = { id: slugId(k), label: FID_SLEEVE_LABELS[k] || k, key: k, sleeveKey: "fidelity_" + slugId(k).replace(/-/g, "_") };
    }
  });
  var ordered = FID_SLEEVES.slice();
  Object.keys(byKey).forEach(function (lk) {
    if (!FID_SLEEVES.some(function (s) { return s.key.toLowerCase() === lk; })) ordered.push(byKey[lk]);
  });
  return ordered.map(function (s) {
    var names = (fid.names || []).filter(function (n) {
      return String(n.sleeve || "").toLowerCase() === String(s.key).toLowerCase();
    });
    var held = names.reduce(function (sum, n) { return sum + (Number(n.value) || 0); }, 0);
    var equity = totals[s.sleeveKey] != null ? Number(totals[s.sleeveKey]) : held;
    var cash = Math.max(0, rnd(equity - held));
    return registerFidSleeveLabel({ id: s.id, label: s.label, key: s.key, equity: rnd(equity), cash: cash, buying_power: cash, pending_deposits: 0, equity_value: rnd(held), invested_pct: equity ? Math.min(100, (held / equity) * 100) : 0, open_orders: 0, names: names });
  }).filter(function (s) {
    /* Keep known empty sleeves for Truthifi fallback; drop empty UNKNOWN */
    if (String(s.key).toUpperCase() === "UNKNOWN" && !(s.names || []).length && !(s.equity > 0.004)) return false;
    return true;
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
  var rhEq = 0, rhCash = 0, rhBp = 0, rhPend = 0, rhEv = 0, rhCv = 0, rhOrders = 0, rhNames = [], rhBooks = [];
  RH_IDS.forEach(function (id) {
    var b = out.accounts[id] || { names: [] };
    rhEq += Number(b.equity) || 0;
    rhCash += Number(b.cash) || 0;
    rhBp += Number(b.buying_power) || 0;
    rhPend += Number(b.pending_deposits) || 0;
    rhEv += Number(b.equity_value) || 0;
    rhCv += Number(b.crypto_value) || 0;
    rhOrders += Number(b.open_orders) || 0;
    rhBooks.push({ id: id, label: LABEL[id], equity: Number(b.equity) || 0, cash: Number(b.cash) || 0, pending_deposits: Number(b.pending_deposits) || 0, invested_pct: Number(b.invested_pct) || 0, names: (b.names || []).length });
    (b.names || []).forEach(function (n) {
      var row = JSON.parse(JSON.stringify(n));
      row.account = row.account || id;
      row.accounts = row.accounts && row.accounts.length ? row.accounts : [id];
      rhNames.push(row);
    });
  });
  out.robinhood = {
    id: "robinhood", label: "Robinhood",
    equity: rnd(rhEq), cash: rnd(rhCash), buying_power: rnd(rhBp), pending_deposits: rnd(rhPend),
    equity_value: rnd(rhEv), crypto_value: rnd(rhCv), open_orders: rhOrders,
    invested_pct: rhEq ? Math.min(100, (rhEv / rhEq) * 100) : 0,
    names: rhNames, books: rhBooks
  };
  var fidB = out.accounts.fidelity || {};
  var voyaB = out.accounts.voya || {};
  out.combined.books = [
    { id: "robinhood", label: "Robinhood", equity: rnd(rhEq), cash: rnd(rhCash), pending_deposits: rnd(rhPend), invested_pct: out.robinhood.invested_pct, names: rhNames.length },
    { id: "fidelity", label: "Fidelity", equity: Number(fidB.equity) || 0, cash: Number(fidB.cash) || 0, pending_deposits: Number(fidB.pending_deposits) || 0, invested_pct: Number(fidB.invested_pct) || 0, names: (fidB.names || []).length },
    { id: "voya", label: "Voya", equity: Number(voyaB.equity) || 0, cash: Number(voyaB.cash) || 0, pending_deposits: Number(voyaB.pending_deposits) || 0, invested_pct: Number(voyaB.invested_pct) || 0, names: (voyaB.names || []).length }
  ];
  out.tape = out.tape || {};
  out.tape.live = (out.tape.combined || []).map(normPrint);
  out.tape.robinhood = (out.tape.combined || []).map(normPrint);
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
function bookCardHtml(id, label, equity, tag, tapeKey) {
  var d = vsLookback(dodTape(tapeKey || id), equity, 1);
  var day = !d
    ? '<div class="m"><span class="tone-flat">Day \u2014</span></div>'
    : '<div class="m"><span class="tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) + " \u00b7 " + pct(d.pct) + "</span></div>";
  return "<button type=\"button\" class=\"acct-mini\" data-tab=\"" + id + "\"><div class=\"k\">" + esc(label) + " \u00b7 " + tag + "</div><b>" + money(equity) + "</b>" + day + "</button>";
}
cardsHtml = function () {
  if (tab === "robinhood") {
    return "<h2>Books</h2><div class=\"acct-grid four\">" + RH_IDS.map(function (id) {
      var b = snap.accounts[id] || {};
      return bookCardHtml(id, LABEL[id] || id, b.equity, "live", id);
    }).join("") + "</div>";
  }
  var rh = snap.robinhood || {};
  var fid = snap.accounts.fidelity || {};
  var voya = snap.accounts.voya || {};
  return "<h2>Books</h2><div class=\"acct-grid\">" +
    bookCardHtml("robinhood", "Robinhood", rh.equity != null ? rh.equity : 0, "live", "robinhood") +
    bookCardHtml("fidelity", "Fidelity", fid.equity, fid.live ? "live" : "EOD", "fidelity") +
    bookCardHtml("voya", "Voya", voya.equity, "EOD", "voya") +
    "</div>";
};
book = function () {
  if (!snap) return { names: [], equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, invested_pct: 0, open_orders: 0 };
  if (tab === "combined") return snap.combined;
  if (tab === "robinhood") return snap.robinhood || { names: [], equity: 0, books: [] };
  if (isFidSleeveTab(tab)) return fidSleeveFromTab(tab) || { names: [], equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, invested_pct: 0, open_orders: 0 };
  return snap.accounts[tab] || { names: [] };
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
  var rollup = title === "Fidelity";
  var dod = rollup ? dodHtml(dodTape("fidelity"), b.equity) : "";
  return "<h2>Book state · " + esc(title) + "</h2><div class=\"card span\"><div class=\"kpi\">" +
    "<div><span>Equity</span><b>" + money(b.equity) + "</b>" + dod + "</div>" +
    "<div><span>Holdings</span><b>" + money(held) + "</b></div>" +
    "<div><span>Cash</span><b>" + money(b.cash) + "</b></div>" +
    "<div><span>P&L</span><b class=\"tone-" + tone(pnl) + "\">" + (pnl == null ? "—" : money(pnl) + " " + pct(pnlPct)) + "</b></div>" +
    "</div><p class=\"hint\">Invested " + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "—") +
    " · " + s.n + " names · " + (rollup ? "live like Robinhood · " : "") + esc(src) +
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
function fidelityBooksHtml(fid) {
  var sleeves = fid.sleeves || [];
  var tag = fid.live ? "live" : "EOD";
  return "<h2>Books</h2><div class=\"acct-grid\">" + sleeves.map(function (s) {
    registerFidSleeveLabel(s);
    return bookCardHtml(fidTabId(s.id), s.label, s.equity, tag, "fidelity");
  }).join("") + "</div>" +
    "<p class=\"hint\">Each Truthifi/SnapTrade Fidelity account is its own book. Click a sleeve for book state, mix, and holdings. No account numbers.</p>";
}
function fidelityDeskHtml() {
  var fid = snap.accounts.fidelity || { names: [], equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, open_orders: 0, invested_pct: 0 };
  if (!fid.sleeves) fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  var sleeves = fid.sleeves || [];
  var mixBook = { books: sleeves, names: fid.names || [], cash: fid.cash || 0 };
  var html = "";
  if (fid.live) {
    if (typeof tapeHtml === "function") html += tapeHtml("fidelity", "Fidelity", false);
    else html += fidelityTapeHtml();
    html += fidelityLiveStateHtml(fid, "Fidelity");
  } else {
    html += eodTapeHtml("fidelity", "Fidelity");
    html += custodialStateHtml(fid, "Fidelity");
  }
  html += fidelityBooksHtml(fid);
  html += "<h2>Where it sits</h2>" + mixHtml(mixBook, "combined");
  html += "<h2>Book</h2>" + custodialTableHtml(fid.names, fid.equity);
  return html;
}
function fidelitySleeveDeskHtml() {
  var fid = snap.accounts.fidelity || {};
  if (!fid.sleeves) fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  var s = fidSleeveFromTab(tab);
  if (!s) {
    return "<p class=\"hint\">Unknown Fidelity sleeve. <button type=\"button\" data-tab=\"fidelity\">Back to Fidelity</button></p>";
  }
  registerFidSleeveLabel(s);
  var title = "Fidelity \u00b7 " + s.label;
  var html = "";
  if (fid.live) html += fidelityLiveStateHtml(s, title);
  else html += custodialStateHtml(s, title);
  html += "<h2>Where it sits</h2>" + mixHtml(s, s.id);
  html += "<h2>Book</h2>" + custodialTableHtml(s.names, s.equity);
  html += "<p class=\"hint\"><button type=\"button\" class=\"acct-mini\" data-tab=\"fidelity\" style=\"display:inline-block;width:auto;padding:8px 12px\"><div class=\"k\">All Fidelity books</div></button></p>";
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
  if (foot) {
    var fid = (snap.accounts && snap.accounts.fidelity) || {};
    if (tab === "robinhood" || RH_IDS.indexOf(tab) >= 0) foot.textContent = "Murphy Pilot \u00b7 Robinhood live books only.";
    else if (tab === "fidelity" || isFidSleeveTab(tab)) {
      foot.textContent = fid.live
        ? "Murphy Pilot \u00b7 Fidelity live overlay on Truthifi books."
        : "Murphy Pilot \u00b7 Fidelity books from Truthifi EOD.";
    }
    else if (tab === "voya") foot.textContent = "Murphy Pilot \u00b7 Voya is Truthifi EOD.";
    else foot.textContent = "Murphy Pilot \u00b7 Live equity = Robinhood + Fidelity. Voya is Truthifi EOD.";
  }
  var desk = document.getElementById("desk");
  if (!desk) return;
  if (tab === "fidelity" || tab === "voya" || isFidSleeveTab(tab)) {
    var alertN = desk.querySelector(".next-alert");
    var footN = desk.querySelector(".desk-foot");
    var body = tab === "voya" ? voyaDeskHtml() : (isFidSleeveTab(tab) ? fidelitySleeveDeskHtml() : fidelityDeskHtml());
    desk.innerHTML = (alertN ? alertN.outerHTML : "") + body + (footN ? footN.outerHTML : "");
    return;
  }
  if (tab === "combined") {
    Array.from(desk.querySelectorAll("h2")).forEach(function (h) {
      var t = h.textContent || "";
      if (t.indexOf("Live equity") === 0) h.textContent = "Live equity \u00b7 Robinhood + Fidelity";
      if (t.indexOf("Book state") === 0) h.textContent = "Book state \u00b7 all books";
    });
  }
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
  var keyEl = e.target.closest("[data-mix-key]");
  if (!keyEl || !e.target.closest(".mix-card")) return;
  var key = keyEl.getAttribute("data-mix-key");
  if (!key) return;
  if (RH_IDS.indexOf(key) >= 0) {
    overlayOpen = false;
    tab = key;
    closeDeskMenu();
    setHash();
    paint();
    return;
  }
  var fid = snap && snap.accounts && snap.accounts.fidelity;
  var sleeves = (fid && fid.sleeves) || [];
  var hit = null;
  for (var i = 0; i < sleeves.length; i++) {
    var s = sleeves[i];
    if (s.id === key || fidTabId(s.id) === key || String(s.key).toLowerCase() === String(key).toLowerCase()) { hit = s; break; }
  }
  if (!hit) return;
  overlayOpen = false;
  tab = fidTabId(hit.id);
  closeDeskMenu();
  setHash();
  paint();
});
