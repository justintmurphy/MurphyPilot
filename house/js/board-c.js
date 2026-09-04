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
  ESPP: "ESPP", RSU: "RSU", HIGH: "HIGH", UNKNOWN: "Other", "401k": "401(k)", "401(k)": "401(k)"
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
function tidyFidAccountLabel(name) {
  var n = String(name || "");
  if (/ESPP/i.test(n)) return "ESPP";
  if (/\bRSU\b/i.test(n)) return "RSU";
  if (/Roth/i.test(n)) return "Roth IRA";
  if (/Trad/i.test(n)) return "Traditional IRA";
  if (/HIGH/i.test(n)) return "HIGH";
  if (/\bPER\b|Personal/i.test(n)) return "Personal";
  if (/BNY/i.test(n) || /Brokerage/i.test(n)) return "Brokerage";
  return n || "Fidelity";
}
function fidelityAccountCard(a, i) {
  var names = a.names || [];
  var held = names.reduce(function (sum, n) { return sum + (Number(n.value) || 0); }, 0);
  var equity = a.equity != null ? Number(a.equity) : (held + (Number(a.cash) || 0));
  var cash = a.cash != null ? Number(a.cash) : Math.max(0, equity - held);
  var rawName = a.label || a.name || ("Account " + (i + 1));
  var id = a.id || slugId(rawName + "-" + (a.suffix || i));
  var label = tidyFidAccountLabel(rawName);
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
  if (out.accounts) {
    (typeof RH_IDS !== "undefined" ? RH_IDS : ["agentic", "individual", "auto_grok", "joint"]).forEach(function (id) {
      if (out.accounts[id]) bookDisplayLabel(id, out.accounts[id]);
    });
    if (out.accounts.voya) bookDisplayLabel("voya", out.accounts.voya);
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
  if (typeof collapseHouseNames === "function") {
    out.combined.names = collapseHouseNames(out.combined.names || []);
    if (out.robinhood) out.robinhood.names = collapseHouseNames(out.robinhood.names || []);
    if (out.accounts && out.accounts.fidelity) out.accounts.fidelity.names = collapseHouseNames(out.accounts.fidelity.names || []);
    if (out.accounts && out.accounts.voya) out.accounts.voya.names = collapseHouseNames(out.accounts.voya.names || []);
  }

  return out;
};
function bookCardHtml(id, label, equity, tag, tapeKey) {
  var day = '<div class="m"><span class="tone-flat">Day —</span></div>';
  var sleeveCard = (typeof isFidSleeveTab === "function" && isFidSleeveTab(id));
  var key = sleeveCard ? null : (tapeKey || id);
  if (key) {
    var prints = dodTape(key);
    var tapeLast = null;
    (prints || []).forEach(function (raw) {
      var eq = Number(raw && raw.equity);
      if (!isFinite(eq)) return;
      var tt = raw && (raw.t || "");
      if (!tapeLast || String(tt) >= String(tapeLast.t || "")) tapeLast = { t: tt, equity: eq };
    });
    var eqN = Number(equity) || 0;
    var scaleOk = !tapeLast || tapeLast.equity < 0.01 || eqN < 0.01
      || (eqN / tapeLast.equity >= 0.7 && eqN / tapeLast.equity <= 1.35);
    if (scaleOk) {
      var d = vsLookback(prints, eqN, 1);
      if (d) day = '<div class="m"><span class="tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) + " · " + pct(d.pct) + "</span></div>";
    }
  }
  return '<button type="button" class="acct-mini" data-tab="' + id + '"><div class="k">' + esc(label) + " · " + tag + "</div><b>" + money(equity) + "</b>" + day + "</button>";
}  if (!tapeLast || String(t) >= String(tapeLast.t || "")) tapeLast = { t: t, equity: eq };
    });
    var eqN = Number(equity) || 0;
    var scaleOk = !tapeLast || tapeLast.equity < 0.01 || eqN < 0.01
      || (eqN / tapeLast.equity >= 0.7 && eqN / tapeLast.equity <= 1.35);
    if (scaleOk) {
      var d = vsLookback(prints, eqN, 1);
      if (d) day = '<div class="m"><span class="tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) + " · " + pct(d.pct) + "</span></div>";
    }
  }
  return "<button type="button" class="acct-mini" data-tab="" + id + ""><div class="k">" + esc(label) + " · " + tag + "</div><b>" + money(equity) + "</b>" + day + "</button>";
}