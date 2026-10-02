TABS = [
  { id: "combined", label: "House" },
  { id: "robinhood", label: "Robinhood" },
  { id: "fidelity", label: "Fidelity" },
  { id: "voya", label: "Voya" }
];
RH_IDS = ["agentic", "individual", "auto_grok", "joint"];
LABEL.robinhood = "Robinhood";
LABEL.auto_grok = "Grok";
LABEL.joint = "Deep Seek";
LABEL.fidelity = "Fidelity";
LABEL.voya = "Voya";
LABEL.combined = "House";

function rhBookVisible(id) {
  /* Hide chip/dig-in when House print omits the book or equity is empty. */
  if (!snap || !snap.accounts || !Object.prototype.hasOwnProperty.call(snap.accounts, id)) return false;
  var b = snap.accounts[id] || {};
  if ((Number(b.equity) || 0) > 0.004) return true;
  return !!(b.names && b.names.length);
}
function visibleRhIds() {
  return (RH_IDS || []).filter(rhBookVisible);
}
function ensureVisibleRhTab() {
  if (typeof RH_IDS !== "undefined" && RH_IDS.indexOf(tab) >= 0 && !rhBookVisible(tab)) {
    tab = "robinhood";
    if (typeof setHash === "function") setHash();
  }
}


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

function bookNavHtml() {
  if (!snap) return "";
  if (tab === "robinhood" || (typeof RH_IDS !== "undefined" && RH_IDS.indexOf(tab) >= 0)) {
    var chips = '<button type="button" class="book-chip' + (tab === "robinhood" ? " on" : "") + '" data-tab="robinhood">All</button>';
    visibleRhIds().forEach(function (id) {
      var b = (snap.accounts && snap.accounts[id]) || {};
      var lab = (typeof bookDisplayLabel === "function") ? bookDisplayLabel(id, b) : ((LABEL && LABEL[id]) || id);
      chips += '<button type="button" class="book-chip' + (tab === id ? " on" : "") + '" data-tab="' + id + '">' + esc(lab) + "</button>";
    });
    return '<nav class="book-nav" aria-label="Robinhood books"><span class="book-nav-k">Robinhood books</span><div class="book-nav-chips">' + chips + "</div></nav>";
  }
  if (tab === "fidelity" || (typeof isFidSleeveTab === "function" && isFidSleeveTab(tab))) {
    var fid = (snap.accounts && snap.accounts.fidelity) || {};
    if (!fid.sleeves && typeof buildFidelitySleeves === "function") fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
    var sleeves = fid.sleeves || [];
    var chips2 = '<button type="button" class="book-chip' + (tab === "fidelity" ? " on" : "") + '" data-tab="fidelity">All</button>';
    sleeves.forEach(function (s) {
      if (!s || !s.id) return;
      if ((Number(s.equity) || 0) <= 0.004 && !(s.names || []).length) return;
      var id = fidTabId(s.id);
      registerFidSleeveLabel(s);
      chips2 += '<button type="button" class="book-chip' + (tab === id ? " on" : "") + '" data-tab="' + id + '">' + esc(s.label || s.id) + "</button>";
    });
    return '<nav class="book-nav" aria-label="Fidelity books"><span class="book-nav-k">Fidelity books</span><div class="book-nav-chips">' + chips2 + "</div></nav>";
  }
  return "";
}
function injectBookNav(desk) {
  if (!desk) return;
  var nav = bookNavHtml();
  if (!nav) return;
  var alertN = desk.querySelector(".next-alert");
  if (alertN) alertN.insertAdjacentHTML("afterend", nav);
  else desk.insertAdjacentHTML("afterbegin", nav);
}

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
/* Print tags: names[].sleeve is BNY / Roth / PER / Trad / RSU (any case).
   names[].accounts is the account last-4, the same string as accounts[].suffix.
   Account titles are longer ("INDIVIDUAL - BNY", "BNY RSU") and are not the tag. */
function fidSleeveToken(raw) {
  var s = String(raw || "").trim();
  if (!s) return "";
  if (/\bESPP\b/i.test(s)) return "espp";
  if (/\bRSU\b/i.test(s)) return "rsu";
  if (/roth/i.test(s)) return "roth";
  if (/trad/i.test(s)) return "trad";
  if (/\bHIGH\b/i.test(s)) return "high";
  if (/\bPER\b/i.test(s) || /personal/i.test(s)) return "per";
  if (/\bBNY\b/i.test(s) || /brokerage/i.test(s)) return "bny";
  return s.toLowerCase();
}
function fidAccountToken(a) {
  if (!a) return "";
  return fidSleeveToken(a.sleeve || a.key || a.name || a.label || "");
}
function fidNameToken(n) {
  if (!n) return "";
  return fidSleeveToken(n.sleeve || n.account_name || "");
}
function fidNameSuffixes(n) {
  var out = [];
  function add(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase();
    if (!s || /^(fidelity|voya|unknown)$/.test(s)) return;
    if (out.indexOf(s) < 0) out.push(s);
  }
  if (!n) return out;
  if (Array.isArray(n.accounts)) n.accounts.forEach(add);
  else if (n.accounts != null && n.accounts !== "") add(n.accounts);
  if (n.suffix != null && n.suffix !== "") add(n.suffix);
  return out;
}
/* Each name lands on one account: last-4 first, then a unique sleeve token. */
function partitionFidNames(accounts, names) {
  var buckets = (accounts || []).map(function () { return []; });
  (names || []).forEach(function (n) {
    var hit = -1;
    var suffixes = fidNameSuffixes(n);
    var i;
    if (suffixes.length) {
      for (i = 0; i < accounts.length; i++) {
        var suf = String((accounts[i] && accounts[i].suffix) || "").trim().toLowerCase();
        if (suf && suffixes.indexOf(suf) >= 0) { hit = i; break; }
      }
    }
    if (hit < 0) {
      var token = fidNameToken(n);
      if (token) {
        var matches = [];
        for (i = 0; i < accounts.length; i++) {
          if (fidAccountToken(accounts[i]) === token) matches.push(i);
        }
        if (matches.length === 1) hit = matches[0];
      }
    }
    if (hit >= 0) buckets[hit].push(n);
  });
  return buckets;
}
function fidKindIsCash(n) {
  return String((n && n.kind) || "").trim().toLowerCase() === "cash";
}
function fidPositionSum(names) {
  var sum = 0;
  (names || []).forEach(function (n) {
    if (fidKindIsCash(n)) return;
    var v = Number(n && n.value);
    if (isFinite(v)) sum += v;
  });
  return sum;
}
function fidCashFromNames(names) {
  var sum = 0, any = false;
  (names || []).forEach(function (n) {
    if (!fidKindIsCash(n)) return;
    var v = Number(n && n.value);
    if (!isFinite(v)) return;
    any = true;
    sum += v;
  });
  return any ? sum : null;
}
function fidRowByToken(totals, token) {
  if (!totals || !token) return null;
  var map = {
    bny: "fidelity_bny", roth: "fidelity_roth", per: "fidelity_per",
    trad: "fidelity_trad", rsu: "fidelity_rsu", espp: "fidelity_espp", high: "fidelity_high"
  };
  if (map[token] && totals[map[token]] && typeof totals[map[token]] === "object") return totals[map[token]];
  var keys = Object.keys(totals);
  var i;
  for (i = 0; i < keys.length; i++) {
    var row = totals[keys[i]];
    if (!row || typeof row !== "object") continue;
    var lab = fidSleeveToken(row.label || "");
    var idTok = fidSleeveToken(String(row.id || keys[i]).replace(/^fidelity_/, "").replace(/^voya_/, ""));
    if (lab === token || idTok === token) return row;
  }
  return null;
}
/* Sleeve cash: the print's sleeves map, else the sum of kind:cash names. Never invent 0. */
function fidSleeveRow(totals, account, names) {
  var row = fidRowByToken(totals, fidAccountToken(account));
  if (row) return row;
  var tokens = [];
  (names || []).forEach(function (n) {
    var t = fidNameToken(n);
    if (t && tokens.indexOf(t) < 0) tokens.push(t);
  });
  if (tokens.length === 1) return fidRowByToken(totals, tokens[0]);
  return null;
}
function fidResolvedCash(totals, account, names) {
  var row = fidSleeveRow(totals, account, names);
  if (row && row.cash != null && row.cash !== "" && isFinite(Number(row.cash))) return Number(row.cash);
  return fidCashFromNames(names);
}
function fidelityAccountCard(a, i, sleeveTotals) {
  var names = a.names || [];
  var held = fidPositionSum(names);
  var equity = null;
  if (a.equity != null && a.equity !== "") equity = Number(a.equity);
  else if (a.endingBalance != null && a.endingBalance !== "") equity = Number(a.endingBalance);
  else if (names.length) equity = held + (Number(fidResolvedCash(sleeveTotals, a, names)) || 0);
  if (equity != null && !isFinite(equity)) equity = null;
  var cash = fidResolvedCash(sleeveTotals, a, names);
  if (cash != null && !isFinite(cash)) cash = null;
  var equityValue = null;
  if (names.length) equityValue = held;
  var rawName = a.label || a.name || ("Account " + (i + 1));
  var id = a.id || slugId(rawName + "-" + (a.suffix || i));
  var label = tidyFidAccountLabel(rawName);
  if (a.suffix && String(label).indexOf(String(a.suffix)) < 0) label = label + " ···" + a.suffix;
  var token = fidAccountToken(a);
  var tokenKey = { espp: "ESPP", rsu: "RSU", roth: "Roth", trad: "Trad", high: "HIGH", per: "PER", bny: "BNY" }[token] || "";
  return registerFidSleeveLabel({
    id: id,
    label: label,
    key: a.sleeve || a.key || tokenKey || label,
    suffix: a.suffix || "",
    equity: equity == null ? null : rnd(equity),
    equityExact: equity,
    cash: cash == null ? null : rnd(cash),
    cashExact: cash,
    buying_power: a.buying_power != null && a.buying_power !== "" ? rnd(a.buying_power) : (cash == null ? null : rnd(cash)),
    pending_deposits: Number(a.pending_deposits) || 0,
    equity_value: equityValue == null ? null : rnd(equityValue),
    heldExact: equityValue,
    invested_pct: equity && names.length ? Math.min(100, (held / equity) * 100) : (names.length ? 0 : null),
    open_orders: Number(a.open_orders) || 0,
    names: names,
    namesUnavailable: names.length === 0,
    source: a.source || "SnapTrade"
  });
}
function buildFidelitySleeves(fid, outside) {
  var totals = (outside && outside.sleeves) || {};
  fid = fid || { names: [] };
  /* Prefer one card per real Fidelity account (SnapTrade / hybrid feed). */
  if (Array.isArray(fid.accounts) && fid.accounts.length) {
    var parentNames = fid.names || [];
    var buckets = partitionFidNames(fid.accounts, parentNames);
    return fid.accounts.map(function (a, i) {
      var own = (Array.isArray(a.names) && a.names.length) ? a.names : (buckets[i] || []);
      var src = {};
      Object.keys(a).forEach(function (k) { src[k] = a[k]; });
      src.names = own;
      return fidelityAccountCard(src, i, totals);
    });
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
    var held = fidPositionSum(names);
    var tot = totals[s.sleeveKey];
    var fromTot = tot == null ? NaN : Number(typeof tot === "object" ? tot.equity : tot);
    var equity = isFinite(fromTot) ? fromTot : (names.length ? held + (Number(fidResolvedCash(totals, s, names)) || 0) : null);
    var cash = fidResolvedCash(totals, s, names);
    if (cash != null && !isFinite(cash)) cash = null;
    return registerFidSleeveLabel({ id: s.id, label: s.label, key: s.key, equity: equity == null ? null : rnd(equity), equityExact: equity, cash: cash == null ? null : rnd(cash), cashExact: cash, buying_power: cash == null ? null : rnd(cash), pending_deposits: 0, equity_value: names.length ? rnd(held) : null, heldExact: names.length ? held : null, invested_pct: equity && names.length ? Math.min(100, (held / equity) * 100) : (names.length ? 0 : null), open_orders: 0, names: names, namesUnavailable: !names.length });
  }).filter(function (s) {
    /* Keep known empty sleeves for Truthifi fallback; drop empty UNKNOWN */
    if (String(s.key).toUpperCase() === "UNKNOWN" && !(s.names || []).length && !(s.equity > 0.004)) return false;
    return true;
  });
}
var _mergeCore = merge;
merge = function (house, pilot, outside) {
  /* tip bm: null Truthifi stays null. load() passes last-good explicitly. */
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
  out.combined.invested_pct = eq ? Math.min(100, ((ev + cv) / eq) * 100) : 0; /* tip bb: +crypto */
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
    invested_pct: rhEq ? Math.min(100, ((rhEv + rhCv) / rhEq) * 100) : 0, /* tip bb: +crypto */
    names: rhNames, books: rhBooks
  };
  /* tip ba: roll optional Forge fields when any RH book prints them — never invent */
  /* tip bf paint: company_url http(s) else Yahoo /quote/{SYMBOL}/ ; account id→AI WWIII/Grok/Deep Seek/Individual; sell finite $ else —; buys omit P&L slot */
  (function tipBaRollups() {
    var mix = { equity: 0, crypto: 0, options: 0, cash: 0 }, hasMix = false;
    var rp = { day: 0, week: 0, month: 0 }, hasRp = { day: false, week: false, month: false };
    var fills = [], hasFills = false, uSum = 0, hasU = false;
    RH_IDS.forEach(function (id) {
      var bk = out.accounts[id] || {};
      if (bk.asset_mix && typeof bk.asset_mix === "object") {
        hasMix = true;
        ["equity", "crypto", "options", "cash"].forEach(function (k) {
          if (bk.asset_mix[k] != null && isFinite(Number(bk.asset_mix[k]))) mix[k] += Number(bk.asset_mix[k]);
        });
      } else {
        if (bk.equity_value != null && isFinite(Number(bk.equity_value))) { hasMix = true; mix.equity += Number(bk.equity_value); }
        if (bk.crypto_value != null && isFinite(Number(bk.crypto_value))) { hasMix = true; mix.crypto += Number(bk.crypto_value); }
        if (bk.cash != null && isFinite(Number(bk.cash))) { hasMix = true; mix.cash += Number(bk.cash); }
      }
      if (bk.realized_pnl && typeof bk.realized_pnl === "object") {
        ["day", "week", "month"].forEach(function (k) {
          if (bk.realized_pnl[k] != null && isFinite(Number(bk.realized_pnl[k]))) {
            hasRp[k] = true; rp[k] += Number(bk.realized_pnl[k]);
          }
        });
      }
      if (Object.prototype.hasOwnProperty.call(bk, "fills")) {
        hasFills = true;
        (bk.fills || []).forEach(function (f) { if (f) fills.push(f); });
      }
      if (bk.unrealized_pnl != null && isFinite(Number(bk.unrealized_pnl))) { hasU = true; uSum += Number(bk.unrealized_pnl); }
    });
    if (hasMix) {
      out.robinhood.asset_mix = { equity: rnd(mix.equity), crypto: rnd(mix.crypto), options: rnd(mix.options), cash: rnd(mix.cash) };
      if (!out.combined.asset_mix) out.combined.asset_mix = out.robinhood.asset_mix;
    }
    var rpOut = {};
    ["day", "week", "month"].forEach(function (k) { if (hasRp[k]) rpOut[k] = rnd(rp[k]); });
    if (Object.keys(rpOut).length) {
      out.robinhood.realized_pnl = rpOut;
      if (!out.combined.realized_pnl) out.combined.realized_pnl = rpOut;
    }
    if (hasFills) {
      fills.sort(function (a, b) { return String(b.ts || "").localeCompare(String(a.ts || "")); });
      out.robinhood.fills = fills.slice(0, 40);
      if (!Object.prototype.hasOwnProperty.call(out.combined, "fills")) out.combined.fills = out.robinhood.fills;
    }
    if (hasU) {
      out.robinhood.unrealized_pnl = rnd(uSum);
      if (out.combined.unrealized_pnl == null) out.combined.unrealized_pnl = rnd(uSum);
    }
  })();
  /* tip bh+bi+bj: KEEP printed combined.cashflow_30d overall + by_source + dividends/reinvested — never invent. UTMA + Smart Income stay off public totals. */
  (function tipBhCashflowKeep() {
    function skipOffPublic(id, bk) {
      var s = String(id || "") + " " + String((bk && (bk.label || bk.name || bk.sleeve || bk.account_name)) || "");
      return /utma|smart\s*income/i.test(s);
    }
    var printedCf = house && house.combined && house.combined.cashflow_30d;
    if (printedCf && typeof printedCf === "object") out.combined.cashflow_30d = printedCf;
    if (out.accounts && house && house.accounts) {
      Object.keys(house.accounts).forEach(function (id) {
        var src = house.accounts[id];
        if (!src || !src.cashflow_30d || typeof src.cashflow_30d !== "object") return;
        if (skipOffPublic(id, src)) return;
        if (!out.accounts[id]) return;
        if (skipOffPublic(id, out.accounts[id])) return;
        if (!out.accounts[id].cashflow_30d) out.accounts[id].cashflow_30d = src.cashflow_30d;
      });
    }
  })();

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
  if (outside) {
    if (houseFidTape.length) {
      out.tape.fidelity = houseFidTape.map(normPrint);
    } else {
      out.tape.fidelity = mergeEodTape("fidelity", outside, fidEq, closeT);
    }
    out.tape.voya = mergeEodTape("voya", outside, Number((out.accounts.voya || {}).equity) || 0, closeT);
    var ovTape = (outside && outside.tape && outside.tape.overall) || [];
    out.tape.overall = ovTape.map(normPrint);
  } else {
    /* tip bm: do not stamp $0 or a -100% day onto Fid/Voya when the print is missing */
    out.tape.fidelity = houseFidTape.length ? houseFidTape.map(normPrint) : [];
    out.tape.voya = [];
    out.tape.overall = [];
  }
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
    var eqN = Number(equity);
    /* tip bm: missing equity is not $0 and must not print -100% against an old tape */
    if (isFinite(eqN)) {
      var scaleOk = !tapeLast || tapeLast.equity < 0.01 || eqN < 0.01
        || (eqN / tapeLast.equity >= 0.7 && eqN / tapeLast.equity <= 1.35);
      if (scaleOk) {
        var d = vsLookback(prints, eqN, 1);
        if (d) day = '<div class="m"><span class="tone-' + tone(d.delta) + '">' + (d.delta > 0 ? "+" : "") + money(d.delta) + " · " + pct(d.pct) + "</span></div>";
      }
    }
  }
  return '<button type="button" class="acct-mini' + (tab === id ? ' on' : '') + '" data-tab="' + id + '"><div class="k">' + esc(label) + " · " + tag + "</div><b>" + money(equity) + "</b>" + day + "</button>";
}

function liveFidSleeveIds() {
  var sleeves = ((snap && snap.accounts && snap.accounts.fidelity) || {}).sleeves || [];
  var ids = [];
  sleeves.forEach(function (s) {
    if (!s || !s.id) return;
    if ((Number(s.equity) || 0) > 0.004 || (s.names || []).length) ids.push(fidTabId(s.id));
  });
  return ids;
}
overlayIds = function (mode) {
  if (typeof RH_IDS !== "undefined" && tab === "robinhood") return visibleRhIds();
  var fidIds = liveFidSleeveIds();
  if (mode === "live") return ["combined"].concat(RH_IDS.slice()).concat(fidIds);
  return ["combined"].concat(RH_IDS.slice()).concat(fidIds).concat(["voya"]);
};
var _overlayPrints = typeof overlayPrints === "function" ? overlayPrints : null;
overlayPrints = function (id, mode) {
  if (isFidSleeveTab(id)) {
    var tape = (snap && snap.tape) || {};
    if (tape[id] && tape[id].length) return tape[id];
    var s = fidSleeveFromTab(id);
    var eq = s ? (Number(s.equity) || 0) : 0;
    var t = (snap && snap.combined && (snap.combined.outside_asof || snap.combined.overall_asof)) || (snap && snap.asof) || "";
    if (t && String(t).length === 10) t = t + "T16:00:00-04:00";
    return [{ t: t, equity: eq }];
  }
  if (_overlayPrints) return _overlayPrints(id, mode);
  var tape0 = (snap && snap.tape) || {};
  if (mode === "all" && id === "combined") return tape0.overall || tape0.combined || [];
  if (id === "robinhood") return tape0.robinhood || tape0.combined || [];
  if (id === "fidelity" || id === "voya") return tape0[id] || [];
  var src = tape0[id] || [];
  if (id === "combined" && tape0.live && tape0.live.length) src = src.concat(tape0.live);
  return src;
};
var _overlayChartCard = typeof overlayChartCard === "function" ? overlayChartCard : null;
overlayChartCard = function (id, mode) {
  var custodialId = id === "fidelity" || id === "voya" || (typeof isFidSleeveTab === "function" && isFidSleeveTab(id));
  if (custodialId && typeof truthifiSoftEmpty === "function" && truthifiSoftEmpty()) {
    var gapLab = id === "voya" ? "Voya" : (id === "fidelity" ? "Fidelity" : (LABEL[id] || id));
    var gapPhrase = truthifiFailPhrase(snap.truthifiFail);
    return '<button type="button" class="ov-book ov-chart" data-tab="' + id + '"><div class="k">' + esc(gapLab) +
      '</div><b>\u2014</b><div class="m"><span class="fresh-chip fresh-flag">' + esc(gapPhrase) + "</span></div></button>";
  }
  var raw = overlayPrints(id, mode);
  var prints = (typeof mergePrints === "function" ? mergePrints(raw) : (raw || []).map(normPrint).filter(function (p) { return p && isFinite(p.equity); }));
  var vals = prints.map(function (p) { return p.equity; }).filter(function (v) { return isFinite(v); });
  var book = null;
  if (id === "combined") book = snap.combined;
  else if (id === "robinhood") book = snap.robinhood;
  else if (isFidSleeveTab(id)) book = fidSleeveFromTab(id);
  else book = (snap.accounts && snap.accounts[id]) || {};
  var last = vals.length ? vals[vals.length - 1] : Number((book || {}).equity) || 0;
  if (!prints.length) prints = [{ t: "", equity: last }];
  var eod = (id === "voya" || (mode === "all" && id === "combined"));
  var label;
  if (mode === "all" && id === "combined") label = "Overall";
  else if (typeof bookDisplayLabel === "function" && id && id !== "combined" && id !== "robinhood") label = bookDisplayLabel(id, book || {});
  else label = (LABEL[id] || (book && book.label) || id);
  return '<button type="button" class="ov-book ov-chart" data-tab="' + id + '">' +
    '<div class="k">' + esc(label) + " \u00b7 " + (eod ? "EOD" : "live") + "</div><b>" + money(last) + "</b>" +
    '<div class="tape-plot ov-plot">' + overlayAxisChart(prints) + "</div></button>";
};
overlayHtml = function () {
  if (!snap) return "";
  if (tab === "robinhood") {
    return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood", "Session prints for AI WWIII, Individual, Grok, and Deep Seek.");
  }
  return overlaySheet("booksOverlay", "live", "Live equity \u00b7 Robinhood + Fidelity books", "Robinhood books plus each Fidelity sleeve. Voya is EOD-only.") +
    overlaySheet("booksOverlayAll", "all", "Overall \u00b7 all books", "Net worth plus every Robinhood and Fidelity book. Only Voya is EOD.");
};


cardsHtml = function () {
  if (tab === "robinhood") {
    var rhIds = visibleRhIds();
    var grid = rhIds.length === 4 ? "acct-grid four" : "acct-grid";
    return "<h2>Books</h2><div class=\"" + grid + "\">" + rhIds.map(function (id) {
      var b = snap.accounts[id] || {};
      return bookCardHtml(id, bookDisplayLabel(id, b), b.equity, "live", id);
    }).join("") + "</div>";
  }
  var rh = snap.robinhood || {};
  var fid = snap.accounts.fidelity || {};
  var voya = snap.accounts.voya || {};
  function houseSourceCard(id, html) {
    var line = (typeof sourceAsofMicroHtml === "function") ? sourceAsofMicroHtml(id) : "";
    if (!line) return html;
    return html.replace(/<\/button>$/, line + "</button>");
  }
  return "<h2>Books</h2><div class=\"acct-grid\">" +
    houseSourceCard("robinhood", bookCardHtml("robinhood", "Robinhood", rh.equity != null ? rh.equity : 0, "live", "robinhood")) +
    houseSourceCard("fidelity", custodialBookCard("fidelity", "Fidelity", fid, fid.live ? "live" : "EOD", "fidelity")) +
    houseSourceCard("voya", custodialBookCard("voya", "Voya", voya, "EOD", "voya")) +
    "</div>";
};
function custodialBookCard(id, label, book, tag, tapeKey) {
  var has = book && ((book.names || []).length || (isFinite(Number(book.equity)) && Number(book.equity) > 0.004));
  if (typeof truthifiSoftEmpty === "function" && truthifiSoftEmpty() && !has) {
    var phrase = truthifiFailPhrase(snap.truthifiFail);
    return '<button type="button" class="acct-mini' + (tab === id ? " on" : "") + '" data-tab="' + id + '"><div class="k">' +
      esc(label) + " · " + esc(tag) + '</div><b>\u2014</b><div class="m"><span class="fresh-chip fresh-flag">' +
      esc(phrase) + "</span></div></button>";
  }
  return bookCardHtml(id, label, book && book.equity, tag, tapeKey);
}
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
    ". Once a day. No account numbers." + truthifiHeldNote() + "</p>";
}
function nameStats(names) {
  var value = 0, cost = 0, pnl = 0, saw = false, excluded = [], n = names || [];
  n.forEach(function (row) {
    value += Number(row.value) || 0;
    var lot = (typeof lotPnl === "function") ? lotPnl(row) : null;
    var c = lot ? lot.cost : (typeof knownRowCost === "function" ? knownRowCost(row) : null);
    if (c == null) { excluded.push(row); return; }
    saw = true;
    cost += c;
    var rowPnl = (lot && lot.pnl != null) ? lot.pnl : ((Number(row.value) || 0) - c);
    pnl += rowPnl;
  });
  /* No costed row: dash. Some costed rows: P&L covers only those, and names the rest. */
  return {
    value: rnd(value),
    cost: saw ? rnd(cost) : null,
    pnl: saw ? rnd(pnl) : null,
    n: n.length,
    hasCost: saw,
    partial: saw && excluded.length > 0,
    excl: saw ? (typeof exclNote === "function" ? exclNote(excluded) : "") : ""
  };
}
function pnlKpiText(stats) {
  if (!stats || stats.pnl == null || !isFinite(Number(stats.pnl))) return "\u2014";
  var pctHtml = (stats.cost != null && isFinite(Number(stats.cost)) && Number(stats.cost) !== 0)
    ? pct((Number(stats.pnl) / Number(stats.cost)) * 100)
    : "\u2014";
  return money(stats.pnl) + " " + pctHtml + (stats.excl ? " " + stats.excl : "");
}
function basisMoney(v) {
  if (v == null || v === "" || !isFinite(Number(v))) return "\u2014";
  return money(v);
}
function pnlPctHtml(pctN) {
  if (pctN == null || pctN === "" || !isFinite(Number(pctN))) return "\u2014";
  return pct(pctN);
}
function rowPnlHtml(n) {
  var lot = (typeof lotPnl === "function") ? lotPnl(n) : null;
  if (!lot || lot.pnl == null || !isFinite(Number(lot.pnl))) return "\u2014";
  return money(lot.pnl) + " " + pnlPctHtml(lot.pct);
}
function custodialFigures(b) {
  var held = null;
  if (b && b.equity_value != null && b.equity_value !== "" && isFinite(Number(b.equity_value))) held = Number(b.equity_value);
  else if (b && (b.names || []).length) held = fidPositionSum(b.names);
  var cash = null;
  if (b && b.cash != null && b.cash !== "" && isFinite(Number(b.cash))) cash = Number(b.cash);
  else if (b) cash = fidCashFromNames(b.names);
  return { held: held, cash: cash };
}
function custodialStateHtml(b, title) {
  var s = nameStats(b.names);
  var figs = custodialFigures(b);
  var held = figs.held;
  var pnl = s.pnl;
  var t = snap.truthifi || {};
  var printRaw = (b && (b.asof || b.holdings_asof)) || t.holdings_asof || t.asof || "";
  var waiting = typeof closePrintStale === "function" && closePrintStale(printRaw);
  var closeLab = waiting && typeof closePrintLabelHtml === "function" ? closePrintLabelHtml(true) : "";
  var showHeld = (b.names || []).length > 0 && held != null && isFinite(Number(held));
  return "<h2>Book state · " + esc(title) + "</h2>" +
    (typeof sourceFreshnessChipsHtml === "function" ? sourceFreshnessChipsHtml() : "") +
    "<div class=\"card span" + (waiting ? " awaiting-close" : "") + "\"><div class=\"kpi\">" +
    "<div><span>Equity</span><b>" + (typeof moneyOrDash === "function" ? moneyOrDash(b.equity) : money(b.equity)) + "</b>" + (title === "Fidelity" || String(title).indexOf("Voya") === 0 ? dodHtml(dodTape(title === "Fidelity" ? "fidelity" : "voya"), b.equity) : "") + "</div>" +
    (showHeld ? "<div><span>Holdings</span><b>" + money(held) + "</b></div>" : "") +
    "<div><span>Cash</span><b>" + (typeof moneyOrDash === "function" ? moneyOrDash(figs.cash) : money(figs.cash)) + "</b></div>" +
    "<div><span>P&L</span><b class=\"tone-" + tone(pnl) + "\">" + pnlKpiText(s) + "</b></div>" +
    "</div><p class=\"hint\">Invested " + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "—") +
    " · " + s.n + " names · Truthifi holdings " + esc(t.holdings_asof || b.asof || "—") +
    " · scanned " + esc((t.scanned_at || "").replace("T", " ").slice(0, 16) || "—") +
    ". Once a day." + closeLab + " Sleeves by name only." + truthifiHeldNote() + "</p></div>";
}
function custodialTableHtml(names, totalEq, opts) {
  if (typeof collapseHouseNames === "function") names = collapseHouseNames(names || []);
  names = (names || []).slice().sort(function (a, b) { return (Number(b.value) || 0) - (Number(a.value) || 0); });
  var total = totalEq || names.reduce(function (s, n) { return s + (Number(n.value) || 0); }, 0) || 1;
  if (!names.length) {
    var unavailable = opts && opts.namesUnavailable;
    var emptyNote = unavailable ? "names not available" : "No names on this sleeve. Cash-only or empty.";
    return "<div class=\"card\"><p class=\"hint\" style=\"margin:0\">" + emptyNote + "</p></div>";
  }
  var head = "<tr><th>Name</th><th>Sleeve</th><th>Kind</th><th class=\"num\">Qty</th><th class=\"num\">Avg</th><th class=\"num\">Last</th><th class=\"num\">Value</th><th class=\"num\">Wt</th><th class=\"num\">Cost</th><th class=\"num\">P&L</th></tr>";
  var rows = names.map(function (n) {
    var wt = (Number(n.value) || 0) / total * 100;
    var inner = "<span class=\"sym\">" + esc(n.symbol) + "</span><span class=\"sub\">" + esc(n.name || "") + "</span>";
    return "<tr><td class=\"name-cell tone-" + tone(n.pnl_pct) + "\">" + nameSiteLink(n, inner) + "</td>" +
      "<td>" + esc((typeof sleeveBitsLabel === "function" ? sleeveBitsLabel(n.sleeve || n.account_name || "") : tidySleeveLabel(n.sleeve || n.account_name || "")) || "—") + "</td><td>" + esc(n.kind || "equity") + "</td>" +
      "<td class=\"num\">" + qty(n.qty) + "</td>" +
      "<td class=\"num\">" + basisMoney(n.avg) + "</td>" +
      "<td class=\"num\">" + (n.last == null || !isFinite(Number(n.last)) ? "—" : money(n.last)) + "</td>" +
      "<td class=\"num\">" + money(n.value) + "</td>" +
      "<td class=\"num\">" + wt.toFixed(1) + "%</td>" +
      "<td class=\"num\">" + basisMoney(n.cost) + "</td>" +
      "<td class=\"num tone-" + tone(n.pnl) + "\">" + rowPnlHtml(n) + "</td></tr>";
  }).join("");
  var table = "<div class=\"card book-scroll\"><table class=\"book custodial\"><thead>" + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  return (typeof bookPhoneDisclosure === "function") ? bookPhoneDisclosure(table, names, 8) : table;
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
  var t = snap && snap.truthifi;
  if (!t || typeof t !== "object") return "";
  var printRaw = t.holdings_asof || t.asof || "";
  if (!printRaw && !t.scanned_at) return "";
  var waiting = printRaw && typeof closePrintStale === "function" && closePrintStale(printRaw);
  var closeLab = waiting && typeof closePrintLabelHtml === "function" ? closePrintLabelHtml(true) : "";
  return "<h2>Truthifi feed</h2>" +
    "<div class=\"card span" + (waiting ? " awaiting-close" : "") + "\"><div class=\"kpi\">" +
    "<div><span>Holdings date</span><b>" + esc(t.holdings_asof || t.asof || "—") + "</b></div>" +
    "<div><span>Scanned</span><b>" + esc((t.scanned_at || "").replace("T", " ").slice(0, 16) || "—") + "</b></div>" +
    "<div><span>Source</span><b>" + esc(t.source || "Truthifi") + "</b></div>" +
    "<div><span>Day</span><b>" + (function () { var d = vsLookback((t.tape && t.tape.overall) || [], (snap.combined || {}).equity, 1); return d ? ((d.delta > 0 ? "+" : "") + money(d.delta)) : "\u2014"; })() + "</b></div></div>" +
    "<p class=\"hint\">" + esc(t.note || "Custodial EOD. Sleeves labeled as Truthifi names. No account numbers.") + closeLab + truthifiHeldNote() + "</p></div>";
}
function fidelityLiveStateHtml(b, title) {
  var s = nameStats(b.names);
  var figs = custodialFigures(b);
  var held = figs.held;
  var pnl = s.pnl;
  var src = b.source || (snap.truthifi && !(b.live || b.source === "snaptrade") ? "Truthifi" : "SnapTrade");
  var rollup = title === "Fidelity";
  var dod = rollup ? dodHtml(dodTape("fidelity"), b.equity) : "";
  var showHeld = (b.names || []).length > 0 && held != null && isFinite(Number(held));
  return "<h2>Book state · " + esc(title) + "</h2>" +
    (typeof sourceFreshnessChipsHtml === "function" ? sourceFreshnessChipsHtml() : "") +
    "<div class=\"card span\"><div class=\"kpi\">" +
    "<div><span>Equity</span><b>" + (typeof moneyOrDash === "function" ? moneyOrDash(b.equity) : money(b.equity)) + "</b>" + dod + "</div>" +
    (showHeld ? "<div><span>Holdings</span><b>" + money(held) + "</b></div>" : "") +
    "<div><span>Cash</span><b>" + (typeof moneyOrDash === "function" ? moneyOrDash(figs.cash) : money(figs.cash)) + "</b></div>" +
    "<div><span>P&L</span><b class=\"tone-" + tone(pnl) + "\">" + pnlKpiText(s) + "</b></div>" +
    "</div><p class=\"hint\">Invested " + (isFinite(b.invested_pct) ? Math.min(b.invested_pct, 100).toFixed(1) + "%" : "—") +
    " · " + s.n + " names · " + (rollup ? "live like Robinhood · " : "") + esc(src) +
    " · asof " + esc(b.asof || (snap.asof || "—")) +
    ". No account numbers." + truthifiHeldNote() + "</p></div>";
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
  var sleeves = (fid.sleeves || []).filter(function (s) {
    if (!s || !s.id) return false;
    return (Number(s.equity) || 0) > 0.004 || (s.names || []).length > 0;
  });
  var tag = fid.live ? "live" : "EOD";
  return "<h2>Books</h2><div class=\"acct-grid\">" + sleeves.map(function (s) {
    registerFidSleeveLabel(s);
    return bookCardHtml(fidTabId(s.id), s.label, s.equity, tag, null);
  }).join("") + "</div>" +
    "<p class=\"hint\">Each Truthifi/SnapTrade Fidelity account is its own book. Click a sleeve for book state, mix, and holdings. No account numbers.</p>";
}
function fidelityDeskHtml() {
  if (truthifiSoftEmpty()) return (bookNavHtml() || "") + truthifiFailDeskHtml("Fidelity");
  var nav = bookNavHtml();
  var fid = snap.accounts.fidelity || { names: [], equity: 0, cash: 0, buying_power: 0, pending_deposits: 0, open_orders: 0, invested_pct: 0 };
  if (!fid.sleeves) fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  var sleeves = fid.sleeves || [];
  var mixBook = { books: sleeves, names: fid.names || [], cash: fid.cash || 0, equity: fid.equity };
  /* Match Robinhood page order: Books → Book state → Tape → Where it sits → Book */
  var html = nav || "";
  html += fidelityBooksHtml(fid);
  if (fid.live) {
    html += fidelityLiveStateHtml(fid, "Fidelity");
    if (typeof tapeHtml === "function") html += tapeHtml("fidelity", "Fidelity", false);
    else html += fidelityTapeHtml();
  } else {
    html += custodialStateHtml(fid, "Fidelity");
    html += eodTapeHtml("fidelity", "Fidelity");
  }
  html += "<h2>Where it sits</h2>" + mixHtml(mixBook, "fidelity");
  html += "<h2>Book</h2>" + custodialTableHtml(fid.names, fid.equity);
  html += truthifiMetaHtml();
  return html;
}
function fidelitySleeveDeskHtml() {
  if (truthifiSoftEmpty()) return (bookNavHtml() || "") + truthifiFailDeskHtml("Fidelity");
  var fid = snap.accounts.fidelity || {};
  if (!fid.sleeves) fid.sleeves = buildFidelitySleeves(fid, snap.truthifi);
  var s = fidSleeveFromTab(tab);
  if (!s) {
    return "<p class=\"hint\">Unknown Fidelity sleeve. <button type=\"button\" data-tab=\"fidelity\">Back to Fidelity</button></p>";
  }
  registerFidSleeveLabel(s);
  var title = "Fidelity \u00b7 " + s.label;
  var html = bookNavHtml();
  if (fid.live) html += fidelityLiveStateHtml(s, title);
  else html += custodialStateHtml(s, title);
  html += "<h2>Where it sits</h2>" + mixHtml(s, s.id);
  html += "<h2>Book</h2>" + custodialTableHtml(s.names, s.equity, { namesUnavailable: !!s.namesUnavailable });
  return html;
}
function voyaDeskHtml() {
  if (truthifiSoftEmpty()) return truthifiFailDeskHtml("Voya");
  var voya = snap.accounts.voya || { names: [], equity: 0 };
  /* Match Robinhood page order: Books → Book state → Tape → Where it sits → Book */
  var html = "";
  var voyaLabel = bookDisplayLabel("voya", voya);
  html += "<h2>Books</h2><div class=\"acct-grid\">" +
    bookCardHtml("voya", voyaLabel, voya.equity, "EOD", "voya") +
    "</div>" +
    "<p class=\"hint\">Voya is a single Truthifi EOD book. Labels match Fidelity style (tidy name + ···last-4 when the feed has it).</p>";
  html += custodialStateHtml(voya, "Voya · " + voyaLabel);
  html += eodTapeHtml("voya", "Voya");
  html += "<h2>Where it sits</h2>" + mixHtml(voya, "voya");
  html += "<h2>Book</h2>" + custodialTableHtml(voya.names, voya.equity);
  html += truthifiMetaHtml();
  return html;
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
    "<p class=\"hint\">Click for every book. Live RH + Fidelity sleeves " + money(c.live_equity) + " \u00b7 Voya EOD " + (truthifiSoftEmpty() ? "\u2014" : money(c.custodial_equity)) + "." +
    (asof ? " Holdings date " + esc(asof) + "." : "") + "</p></div>";
}
var _paint = paint;
paint = function () {
  if (!snap) return;
  ensureVisibleRhTab();
  _paint();
  var foot = document.querySelector(".desk-foot");
  if (foot) {
    var fid = (snap.accounts && snap.accounts.fidelity) || {};
    if (tab === "agentic") foot.textContent = "Murphy Pilot \u00b7 Agentic / AI WWIII only \u00b7 equity, cash/BP, holdings, realized, fills, asof.";
    else if (tab === "robinhood" || RH_IDS.indexOf(tab) >= 0) foot.textContent = "Murphy Pilot \u00b7 Robinhood live books only.";
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
  if (tab === "robinhood" || RH_IDS.indexOf(tab) >= 0) {
    injectBookNav(desk);
  }
  if (tab === "combined") {
    Array.from(desk.querySelectorAll("h2")).forEach(function (h) {
      var t = h.textContent || "";
      if (t.indexOf("Live equity") === 0) h.textContent = "Live equity \u00b7 Robinhood + Fidelity";
      if (t.indexOf("Book state") === 0) h.textContent = "Book state \u00b7 all books";
    });
  }
};
/* tip bm — Truthifi text→parse. Corrupt JSON keeps last-good or a FLAG, never a silent empty Fid/Voya. */
var truthifiLastGood = null;
var TRUTHIFI_LAST_KEY = "murphyTruthifiLastGood";
function truthifiFailPhrase(kind) {
  return kind === "unavailable" ? "Truthifi unavailable" : "Truthifi print broken";
}
function truthifiFailShort(kind) {
  return kind === "unavailable" ? "unavailable" : "print broken";
}
function truthifiSnapshotOk(data) {
  return !!(data && typeof data === "object" && !Array.isArray(data) && data.accounts && typeof data.accounts === "object");
}
function truthifiSoftEmpty() {
  return !!(snap && snap.truthifiFail && !snap.truthifiHeld);
}
function truthifiHeldNote() {
  return (snap && snap.truthifiHeld) ? " Showing last good Truthifi print." : "";
}
function truthifiFailDeskHtml(title) {
  var phrase = truthifiFailPhrase(snap && snap.truthifiFail);
  var chips = (typeof sourceFreshnessChipsHtml === "function") ? sourceFreshnessChipsHtml() : "";
  return "<h2>Book state · " + esc(title) + "</h2>" + chips +
    '<div class="card span"><p class="hint" style="margin:0">' + esc(phrase) +
    ". Equity, holdings, and day change stay hidden until a good Truthifi print lands.</p></div>";
}
function rememberTruthifi(data) {
  if (!truthifiSnapshotOk(data)) return;
  var copy = null;
  try { copy = JSON.parse(JSON.stringify(data)); } catch (e) { return; }
  if (!truthifiSnapshotOk(copy)) return;
  truthifiLastGood = copy;
  try { sessionStorage.setItem(TRUTHIFI_LAST_KEY, JSON.stringify(copy)); } catch (e2) {}
}
function takeTruthifiLastGood() {
  var src = truthifiLastGood;
  if (!truthifiSnapshotOk(src)) {
    src = null;
    try {
      var raw = sessionStorage.getItem(TRUTHIFI_LAST_KEY);
      if (raw) src = JSON.parse(raw);
    } catch (e) { src = null; }
    if (truthifiSnapshotOk(src)) truthifiLastGood = src;
    else src = null;
  }
  if (!truthifiSnapshotOk(src) && typeof snap !== "undefined" && snap && truthifiSnapshotOk(snap.truthifi)) {
    src = snap.truthifi;
  }
  if (!truthifiSnapshotOk(src)) return null;
  try { return JSON.parse(JSON.stringify(src)); } catch (e3) { return src; }
}
function fetchTruthifi(url) {
  return fetch(url, { cache: "no-store" }).then(function (r) {
    if (!r || !r.ok) {
      var httpErr = new Error(r ? String(r.status) : "fetch");
      httpErr.truthifiFail = "unavailable";
      throw httpErr;
    }
    return r.text();
  }).then(function (text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      var err = new Error("parse");
      err.truthifiFail = "broken";
      throw err;
    }
    if (!truthifiSnapshotOk(data)) {
      var shapeErr = new Error("shape");
      shapeErr.truthifiFail = "broken";
      throw shapeErr;
    }
    return { ok: true, data: data, fail: "" };
  }).catch(function (e) {
    return { ok: false, data: null, fail: (e && e.truthifiFail) || "unavailable" };
  });
}
load = function () {
  if (typeof pulseKpisForFetch === "function") pulseKpisForFetch(true);
  var housePath = /\/house(\/|$)/.test(location.pathname);
  var bust = "?t=" + Date.now();
  Promise.all([
    fetch((housePath ? "house-snapshot.json" : "house/house-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch((housePath ? "../pilot-snapshot.json" : "pilot-snapshot.json") + bust, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetchTruthifi((housePath ? "truthifi-snapshot.json" : "house/truthifi-snapshot.json") + bust)
  ]).then(function (pair) {
    if (typeof pulseKpisForFetch === "function") pulseKpisForFetch(false);
    var tf = pair[2] || { ok: false, fail: "unavailable", data: null };
    var outside = null;
    var fail = "";
    var held = false;
    if (tf.ok && truthifiSnapshotOk(tf.data)) {
      outside = tf.data;
    } else {
      fail = tf.fail === "broken" ? "broken" : "unavailable";
      outside = takeTruthifiLastGood();
      held = !!outside;
    }
    snap = merge(pair[0], pair[1], outside);
    if (snap) {
      snap.truthifiFail = fail;
      snap.truthifiHeld = held;
    }
    paint();
    if (!fail && truthifiSnapshotOk(tf.data)) rememberTruthifi(tf.data);
  }).catch(function (e) {
    if (typeof pulseKpisForFetch === "function") pulseKpisForFetch(false);
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
