(function(){
  var KEY = "murphyPilotTheme";
  var EVENT = "murphy-theme";
  function readTheme(){
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    try {
      var t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) {}
    try {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  }
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0A100E" : "#1B3A2F");
    document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
      var on = btn.getAttribute("data-theme-choice") === t;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    try { window.dispatchEvent(new Event(EVENT)); } catch (e) {}
  }
  function pad(n){ return String(n).padStart(2, "0"); }
  function tick(){
    var n = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    var c = document.getElementById("etClock");
    var d = document.getElementById("etDate");
    if (c) c.textContent = pad(n.getHours()) + ":" + pad(n.getMinutes()) + ":" + pad(n.getSeconds()) + " ET";
    if (d) d.textContent = n.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }
  function isGas(){ return typeof google !== "undefined" && google.script; }
  function bindDocs(){
    var desk = isGas() ? "?" : "Murphy_Pilot_Desk.html";
    var man = isGas() ? "?doc=manual" : "Murphy_Pilot_Manual.html";
    var setu = isGas() ? "?doc=setup" : "Murphy_Pilot_Setup.html";
    function setHref(id, href){
      var el = document.getElementById(id);
      if (el) el.setAttribute("href", href);
    }
    setHref("navDesk", desk);
    setHref("navBrand", desk);
    setHref("linkManual", man);
    setHref("linkSetup", setu);
    setHref("linkManualTop", man);
    setHref("linkSetupTop", setu);
    if (isGas()) return;
    function overlay(view, file, e){
      var ov = document.getElementById("docOverlay");
      var frame = document.getElementById("docFrame");
      if (!ov || !frame) return;
      if (e) e.preventDefault();
      var title = view === "manual" ? "Operating Manual v7.0" : "Setup Guide v5.0";
      var t = document.getElementById("docTitle");
      if (t) t.textContent = title;
      ov.hidden = false;
      fetch(file).then(function(r){
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      }).then(function(html){
        frame.removeAttribute("src");
        frame.srcdoc = html;
      }).catch(function(){
        frame.removeAttribute("srcdoc");
        frame.src = file;
      });
    }
    function bind(id, view, file){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", function(e){ overlay(view, file, e); });
    }
    bind("linkManual", "manual", "Murphy_Pilot_Manual.html");
    bind("linkSetup", "setup", "Murphy_Pilot_Setup.html");
    bind("linkManualTop", "manual", "Murphy_Pilot_Manual.html");
    bind("linkSetupTop", "setup", "Murphy_Pilot_Setup.html");
    var close = document.getElementById("docClose");
    if (close) close.addEventListener("click", function(){
      var ov = document.getElementById("docOverlay");
      if (ov) ov.hidden = true;
    });
  }
  applyTheme(readTheme());
  document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
    btn.addEventListener("click", function(){
      applyTheme(btn.getAttribute("data-theme-choice"));
    });
  });
  tick();
  setInterval(tick, 1000);
  bindDocs();
})();

function fmt(x,d){
  if (x==null || !isFinite(Number(x))) return "—";
  d = d == null ? 2 : d;
  return Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function usd(n){
  n = Number(n);
  if (!isFinite(n)) return "—";
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function num2(n){
  n = Number(n);
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function bootDesk() {
const JOBS = [
  { t: "21:00", days: [0,1,2,3,4], name: "Policy Pack Evening", role: "No trading. World events + WH." },
  { t: "06:30", days: [1,2,3,4,5], name: "Policy Pack AM Refresh", role: "No trading. Overnight delta only." },
  { t: "09:50", days: [1,2,3,4,5], name: "Autopilot research", role: "Name pick. Grok exec." },
  { t: "10:00", days: [1,2,3,4,5], name: "Snapshot", role: "Stops only." },
  { t: "11:50", days: [1,2,3,4,5], name: "Eyes", role: "Risk-first pick." },
  { t: "13:50", days: [1,2,3,4,5], name: "Eyes", role: "Risk-first pick." },
  { t: "14:50", days: [1,2,3,4,5], name: "Autopilot PM", role: "Last redeploy pick." },
  { t: "15:00", days: [1,2,3,4,5], name: "Snapshot", role: "Stops only." },
  { t: "16:00", days: [1,2,3,4,5], name: "Truthifi", role: "Close scan." }
];
const CAL = [
  ["2026-09-01", "JOLTS; beef TRQ first tranche"],
  ["2026-09-03", "UAS import duties start"],
  ["2026-09-04", "NFP 08:30 ET"],
  ["2026-09-07", "Labor Day — NYSE closed"],
  ["2026-09-10", "PPI; EIA weekly delayed ~12:00 ET"],
  ["2026-09-11", "CPI 08:30 ET"],
  ["2026-09-15", "FOMC + SEP"],
  ["2026-09-16", "FOMC decision ~14:00 ET"],
  ["2026-09-30", "PCE + GDP third estimate"]
];
const SEED = {
  equity: "100.27",
  bp: "10.00",
  inv: "90.0",
  hwm: "",
  cash: "10.00",
  pending: "100.00",
  orders: "0",
  names: "QQQ | 717.15 | 2026-08-27 | 2026-09-08 | qty 0.062748 | last 720.06\nSOXX | 521.50 | 2026-08-27 | 2026-09-08 | qty 0.086290 | last 522.87",
  note: "Live Agentic + quotes 27 Aug 2026 13:33 ET. Equity $100.27, cash $10, BP $10. Pending $100 is already in that equity/BP — not extra arriving. Both names still inside the 24h green lock. Stall test is 8 Sep 2026 (7 business days; Labor Day does not count)."
};

const SEED_PACK = {
  subject: "Agentic policy pack: 2026-08-28",
  asof: "2026-08-27 13:16 ET",
  items: [
    { tag: "White House", title: "Declaring a National Emergency to Secure the United States Bulk-Power System (EO 14420)", url: "https://www.whitehouse.gov/presidential-actions/2026/08/declaring-a-national-emergency-to-secure-the-united-states-bulk-power-system/", text: "Foreign bulk-power gear from covered entities restricted; DOE rules in 120 days." },
    { tag: "Trade", title: "Temporary Suspension of Additional Duties … Canada (alcohol, dairy, autos)", url: "https://www.whitehouse.gov/presidential-actions/2026/08/temporary-suspension-of-additional-duties-to-offset-canadian-discrimination-against-the-commerce-of-the-united-states-with-respect-to-alcoholic-beverages-dairy-and-motor-vehicles/", text: "50% Section 338 duties on covered Canadian goods operative since 22 Aug." },
    { tag: "Defense", title: "Adjusting Imports of Unmanned Aircraft Systems and UAS Components", url: "https://www.whitehouse.gov/presidential-actions/2026/08/adjusting-imports-of-unmanned-aircraft-systems-and-unmanned-aircraft-systems-components-into-the-united-states/", text: "Most UAS import adjustments effective 3 Sep." },
    { tag: "Ag", title: "Further Ensuring Affordable Beef for the American Consumer", url: "https://www.whitehouse.gov/presidential-actions/2026/08/further-ensuring-affordable-beef-for-the-american-consumer/", text: "Lean-beef TRQ extra 300k mt; first tranche 1–30 Sep." },
    { tag: "Fed", title: "FOMC meeting calendar (SEP 15–16 Sep)", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", text: "Decision expected ~14:00 ET 16 Sep." },
    { tag: "Data", title: "BLS Employment Situation schedule (NFP 4 Sep)", url: "https://www.bls.gov/schedule/news_release/empsit.htm", text: "CPI 11 Sep · Labor Day 7 Sep NYSE closed." },
    { tag: "Book", title: "White House presidential actions", url: "https://www.whitehouse.gov/presidential-actions/", text: "No official 1–3 week veto on QQQ/SOXX in this pack." }
  ]
};
const SEED_CO = {
  QQQ: {
    name: "Invesco QQQ Trust",
    type: "ETF",
    issuer: "Invesco Ltd.",
    location: "Atlanta, GA",
    exchange: "NASDAQ",
    url: "https://www.invesco.com/qqq-etf/en/home.html",
    note: "Tracks a modified-cap index of 100 NASDAQ-listed names."
  },
  SOXX: {
    name: "iShares Semiconductor ETF",
    type: "ETF",
    issuer: "BlackRock / iShares",
    location: "San Francisco, CA",
    exchange: "NASDAQ",
    url: "https://www.ishares.com/us/products/239705/ishares-phlx-semiconductor-etf",
    note: "Tracks 30 US-listed semiconductor companies."
  }
};
const SEED_TICKER = {
  QQQ: { last: 718.59, prev: 711.37 },
  SOXX: { last: 520.98, prev: 515.40 }
};
const SEED_CHARTS = {
  QQQ: [716.04, 715.76, 715.93, 717.06, 718.25, 718.94, 717.43, 718.63, 718.8, 719.32, 719.33, 718.22, 717.74, 716.95, 718.72, 718.62, 718.53, 718.85, 719.72, 719.89, 720.03, 720.39, 720.34, 719.77, 719.57, 719.2],
