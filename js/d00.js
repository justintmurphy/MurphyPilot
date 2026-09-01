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
    var desk = isGas() ? "?" : "index.html";
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

function bootDesk() {
const JOBS = [
  { t: "21:00", days: [0,1,2,3,4], name: "Policy Pack Evening", role: "No trading. White House, states, 21-day calendar." },
  { t: "06:30", days: [1,2,3,4,5], name: "Policy Pack AM Refresh", role: "No trading. Overnight delta only." },
  { t: "09:45", days: [1,2,3,4,5], name: "Autopilot AM", role: "Deploy + write book-state card." },
  { t: "10:15", days: [1,2,3,4,5], name: "Watch AM", role: "Health only." },
  { t: "11:45", days: [1,2,3,4,5], name: "Eyes", role: "Risk-first. Quiet if ≥80% invested." },
  { t: "13:45", days: [1,2,3,4,5], name: "Eyes", role: "Risk-first. Quiet if ≥80% invested." },
  { t: "15:05", days: [1,2,3,4,5], name: "Autopilot PM", role: "Last redeploy." },
  { t: "15:20", days: [1,2,3,4,5], name: "Watch PM", role: "Health only." }
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
  equity: "197.20",
  bp: "19.74",
  inv: "90.0",
  hwm: "",
  cash: "19.74",
  pending: "0",
  orders: "0",
  names: "XLE | 64.2367 | 2026-09-01 | 2026-09-03 | qty 1.381764 | last 64.2367\nRTX | 208.6699 | 2026-09-01 | 2026-09-03 | qty 0.425360 | last 208.6699",
  note: "Live Agentic 1 Sep 2026. XLE + RTX. Slots 2 of 2. Stall day 2 is Thu 3 Sep +5%."
};
const SEED_PACK = {
  subject: "Agentic policy pack",
  asof: "2026-09-01",
  items: [
    { tag: "Fed", title: "FOMC meeting calendar (SEP 15-16 Sep)", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", text: "Decision expected ~14:00 ET 16 Sep." },
    { tag: "Data", title: "BLS Employment Situation (NFP 4 Sep)", url: "https://www.bls.gov/schedule/news_release/empsit.htm", text: "CPI 11 Sep. Labor Day 7 Sep NYSE closed." }
  ]
};
const SEED_CO = {
  XLE: { name: "Energy Select Sector SPDR", type: "ETF", issuer: "SSGA", location: "USA", exchange: "NYSEARCA", url: "https://www.ssga.com/", note: "Energy sector ETF." },
  RTX: { name: "RTX Corporation", type: "Stock", issuer: "RTX", location: "Arlington, VA", exchange: "NYSE", url: "https://www.rtx.com/", note: "Aerospace and defense." }
};
const SEED_TICKER = {
  XLE: { last: 64.24, prev: 64.24 },
  RTX: { last: 208.67, prev: 208.67 }
};
const SEED_CHARTS = {
  XLE: [64.24],
  RTX: [208.67]
};
