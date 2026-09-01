  SOXX: [524.68, 520.44, 518.82, 520.34, 523.24, 524.49, 521.6, 522.8, 521.43, 523.79, 522.72, 521.85, 521.63, 520.23, 522.55, 522.57, 521.69, 522.35, 523.37, 523.75, 523.43, 523.6, 523.57, 522.6, 522.36, 521.74]
};
function nyNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}
function pad(n){ return String(n).padStart(2,"0"); }
function fmtDtg(ms){
  const t = Number(ms);
  if (!isFinite(t) || t < 1e11) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short"
  }).formatToParts(new Date(t));
  function grab(type){
    const p = parts.find(function(x){ return x.type === type; });
    return p ? p.value : "";
  }
  const zone = grab("timeZoneName") === "EST" ? "Q" : "R";
  const mon = grab("month").slice(0,3).toUpperCase();
  return pad(grab("day")) + pad(grab("hour")) + pad(grab("minute")) + zone + " " + mon + " " + String(grab("year")).slice(2);
}
function themeColors(){
  const st = getComputedStyle(document.documentElement);
  function v(name, fallback){
    const x = st.getPropertyValue(name).trim();
    return x || fallback;
  }
  return {
    go: v("--go", "#1F6B45"),
    stop: v("--stop", "#9B2C2C"),
    axis: v("--chart-axis", "#1B3A2F"),
    mute: v("--chart-mute", "#2F5346"),
    grid: v("--chart-grid", "#EFE8DC"),
    dash: v("--chart-dash", "#C9C0B0"),
    paper: v("--paper", "#fff"),
    ink: v("--ink", "#1B3A2F"),
    mixA: v("--mix-a", "#1B3A2F"),
    mixB: v("--mix-b", "#1F6B45"),
    mixC: v("--mix-c", "#9A6700"),
    mixCash: v("--mix-cash", "#C9C0B0")
  };
}
function toneCls(n){
  if (n==null || !isFinite(n)) return "tone-flat";
  if (n > 0.0005) return "tone-go";
  if (n < -0.0005) return "tone-stop";
  return "tone-flat";
}
function heatFromSec(s){
  if (s <= 5*60) return "heat-hot";
  if (s <= 15*60) return "heat-soon";
  if (s <= 60*60) return "heat-hour";
  return "heat-ok";
}
function signedSpan(n, d, extra){
  if (n==null || !isFinite(n)) return "<span class='tone-flat'>—</span>";
  const t = ((n>=0)?"+":"") + Number(n).toFixed(d);
  return "<span class='"+toneCls(n)+"'>"+t+(extra||"")+"</span>";
}
function fmtClock(d){
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + " ET";
}
function parseHM(hm){
  const [h,m] = hm.split(":").map(Number);
  return h*60+m;
}
function nextJob(now){
  const candidates = [];
  for (let add = 0; add < 8; add++){
    const d = new Date(now.getTime() + add*86400000);
    d.setHours(0,0,0,0);
    const dow = d.getDay();
    const minsNow = add === 0 ? now.getHours()*60 + now.getMinutes() : -1;
    JOBS.forEach(j => {
      if (!j.days.includes(dow)) return;
      const jm = parseHM(j.t);
      if (add === 0 && jm <= minsNow) return;
      const when = new Date(d.getTime());
      const hh = Math.floor(jm/60), mm = jm%60;
      when.setHours(hh, mm, 0, 0);
      candidates.push({ ...j, when, add });
    });
  }
  candidates.sort((a,b)=>a.when-b.when);
  return candidates[0];
}
function eta(now, when){
  let s = Math.max(0, Math.floor((when - now)/1000));
  const h = Math.floor(s/3600); s%=3600;
  const m = Math.floor(s/60); s%=60;
  if (h>0) return h + "h " + pad(m) + "m";
  return m + "m " + pad(s) + "s";
}
function renderClockTable(now){
  const dow = now.getDay();
  const mins = now.getHours()*60 + now.getMinutes();
  const body = document.getElementById("clockRows");
  body.innerHTML = "";
  JOBS.filter(j => j.days.includes(dow) || (dow===0 && j.t==="21:00")).forEach(j => {
    const tr = document.createElement("tr");
    const jm = parseHM(j.t);
    const today = j.days.includes(dow);
    if (today && jm <= mins) tr.className = "done";
    if (today && jm > mins) {
      const nxt = nextJob(now);
      if (nxt && nxt.t === j.t && nxt.name === j.name) {
        const s = Math.max(0, Math.floor((nxt.when - now)/1000));
        tr.className = "now " + heatFromSec(s);
      }
    }
    tr.innerHTML = "<td>"+j.t+"</td><td>"+j.name+"</td><td>"+j.role+"</td>";
    body.appendChild(tr);
  });
}
function loadState(){
  try { return JSON.parse(localStorage.getItem("murphyPilotDesk")||"null") || SEED; }
  catch { return SEED; }
}
function saveState(){
  const s = {
    equity: document.getElementById("fEquity").value,
    bp: document.getElementById("fBp").value,
    inv: document.getElementById("fInv").value,
    hwm: document.getElementById("fHwm").value,
    cash: document.getElementById("fCash").value,
    pending: document.getElementById("fPend").value,
    orders: document.getElementById("kOrd").textContent === "—" ? "" : document.getElementById("kOrd").textContent,
    names: document.getElementById("fNames").value,
    note: "Updated on this computer " + new Date().toISOString()
  };
  localStorage.setItem("murphyPilotDesk", JSON.stringify(s));
  paintBook(s);
}
function parseNames(s){
  return String(s.names||"").split("\n").filter(Boolean).map(line => {
    const p = line.split("|").map(x=>x.trim());
    const n = { symbol: p[0]||"—", cost: null, fill: p[2]||"", stall: p[3]||"", extra: p[4]||"", last: null, qty: null };
    const c = parseFloat(String(p[1]||"").replace(/[^0-9.]/g,""));
    if (isFinite(c)) n.cost = c;
    const blob = p.slice(4).join(" ");
    const lastM = blob.match(/last\s+([0-9.]+)/i);
    const qtyM = blob.match(/qty\s+([0-9.]+)/i);
    const prevM = blob.match(/prev(?:ious_close)?\s+([0-9.]+)/i);
    if (lastM) n.last = parseFloat(lastM[1]);
    if (qtyM) n.qty = parseFloat(qtyM[1]);
    if (prevM) n.prev = parseFloat(prevM[1]);
    if (!n.last && p[5]) {
      const l = parseFloat(String(p[5]).replace(/[^0-9.]/g,""));
      if (isFinite(l)) n.last = l;
    }
    return n;
  });
}
function busDaysFrom(fillISO, now){
  if (!fillISO || !/^\d{4}-\d{2}-\d{2}/.test(fillISO)) return null;
  const f = new Date(fillISO.slice(0,10)+"T00:00:00");
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = 0;
  const cur = new Date(f);
  cur.setDate(cur.getDate()+1);
  while (cur <= n){
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) d++;
    cur.setDate(cur.getDate()+1);
  }
  return d;
}
function paintThresholds(s, parsed){
  const now = nyNow();
  const tb = document.getElementById("thrRows");
  tb.innerHTML = "";
  parsed.forEach(n => {
    const card = document.createElement("div");
    card.className = "thr";
    if (!n.cost){
      card.innerHTML = "<div class='thr-head'><b>"+n.symbol+"</b></div><p class='hint'>Need average cost to score thresholds.</p>";
      tb.appendChild(card);
      return;
    }
    const last = n.last;
    const vs = last ? ((last/n.cost - 1)*100) : null;
    const stop5 = n.cost * 0.95; const hard6 = n.cost * 0.94;
    const flat = n.cost * 0.90;
    const stall = n.cost * 1.05;
    const days = busDaysFrom(n.fill, now);
    const hours = n.fill ? (now - new Date(n.fill+"T09:45:00"))/36e5 : null;
    const lockOn = hours != null && hours < 12 && vs != null && vs >= 0;
    const trailOn = hours != null && hours >= 12 && vs != null && vs >= 0;
    const trailLine = last ? last * 0.85 : null;
    const stallDate = n.stall || "period 1";
    const leftBd = days!=null && days<2 ? (2-days) : null;
    function vsLine(price){
      if (last==null || price==null) return "—";
      const d = last - price;
      if (Math.abs(d) < 0.01) return "on the line";
      if (d > 0) return "$"+d.toFixed(2)+" above";
      return "$"+(-d).toFixed(2)+" through";
    }
    let verdict = "Hold. No sell line is due.";
    let statusCls = "tone-flat";
    if (last && last <= flat) {
      verdict = "Sell now. Through the −10% flatten.";
      statusCls = "tone-stop"; card.classList.add("attn");
    } else if (last && last <= hard6) {
      verdict = "Sell now. Through the −6% hard cap.";
      statusCls = "tone-stop"; card.classList.add("attn");
    } else if (last && last <= stop5) {
      verdict = "Sell now. Through the −5% floor.";
      statusCls = "tone-stop"; card.classList.add("attn");
    } else if (days != null && days >= 2 && last && last < stall && vs >= 0) {
      verdict = "Sell now. Missed the +5% stall test.";
      statusCls = "tone-stop"; card.classList.add("attn");
    } else if (lockOn) {
      verdict = "Hold. First 12h and green — will not sell (unless −6%).";
      statusCls = "tone-go";
    } else if (trailOn) {
      verdict = "Hold. Trail on — sell if −15% from high (~$"+(trailLine?trailLine.toFixed(2):"—")+").";
      statusCls = "tone-go";
    } else if (vs != null && vs < 0) {
      verdict = "Hold unless −5% floor. Last is below cost.";
      statusCls = "tone-stop";
    } else if (leftBd != null) {
