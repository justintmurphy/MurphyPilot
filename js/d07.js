    [/eia|petroleum/, "https://www.eia.gov/petroleum/supply/weekly/"],
    [/nyse|labor day/, "https://www.nyse.com/markets/hours-calendars"],
    [/opec/, "https://www.opec.org/opec_web/en/press_room/28.htm"]
  ];
  for (let i=0;i<rows.length;i++){ if (rows[i][0].test(t)) return rows[i][1]; }
  const seed = (SEED_PACK.items||[]).find(function(it){
    const a = (it.title||"").toLowerCase();
    return a && t.indexOf(a.slice(0,24).toLowerCase()) >= 0;
  });
  return seed ? seed.url : "";
}
function resolvePackHref(it){
  let href = safeHttp(it && it.url);
  if (href) return href;
  const blob = ((it && it.title)||"")+" "+((it && it.text)||"");
  const md = blob.match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
  if (md) return safeHttp(md[2]);
  const trail = blob.match(/https?:\/\/[^\s)]+/);
  if (trail) return safeHttp(trail[0]);
  return safeHttp(fallbackPackUrl(blob));
}
function paintPack(pack){
  const el = document.getElementById("packCard");
  if (!el) return;
  const p = pack || SEED_PACK;
  const items = p.items || [];
  const subj = (p.subject||"").replace(/^Agentic policy pack:\s*/i, "Pack ");
  const head = "<p class='pack-head'>"+escHtml(subj)+(p.asof?" · "+escHtml(p.asof):"")+"</p>";
  if (!items.length) {
    el.innerHTML = head + "<p class='hint'>No overnight pack loaded.</p>";
    return;
  }
  const html = items.map(function(it){
    const href = resolvePackHref(it);
    const title = it.title || href || "Item";
    const label = href
      ? "<a class='pack-link' href='"+escHtml(href)+"' target='_blank' rel='noopener noreferrer'>"+escHtml(title)+"</a>"
      : "<b>"+escHtml(title)+"</b>";
    const note = it.text ? "<div class='note'>"+escHtml(it.text)+"</div>" : "";
    return "<div class='pack-row'><div class='pack-kicker'>"+escHtml(it.tag||"Pack")+"</div><div>"+label+note+"</div></div>";
  }).join("");
  el.innerHTML = head + html;
}
function paintCal(){
  const now = nyNow();
  const el = document.getElementById("calCard");
  el.innerHTML = CAL.map(([d,t])=>{
    const gone = d < now.toISOString().slice(0,10);
    const today = d === now.toISOString().slice(0,10);
    const soon = !gone && (new Date(d) - new Date(now.toISOString().slice(0,10))) / 86400000 <= 3;
    const cls = gone ? "tone-flat" : today ? "tone-soon" : soon ? "tone-warn" : "";
    return "<div class='cal-row "+cls+"'><b>"+d+"</b> · "+t+(today?" · today":"")+"</div>";
  }).join("");
}
function tick(){
  const now = nyNow();
  const clock = document.getElementById("etClock");
  const dateEl = document.getElementById("etDate");
  if (clock) clock.textContent = fmtClock(now);
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric", year:"numeric" });
  const n = nextJob(now);
  const card = document.getElementById("nextCard");
  const etaEl = document.getElementById("nextEta");
  if (n && card && etaEl){
    const secs = Math.max(0, Math.floor((n.when - now)/1000));
    const heat = heatFromSec(secs);
    const nameEl = document.getElementById("nextName");
    const roleEl = document.getElementById("nextRole");
    if (nameEl) nameEl.textContent = n.t + "  " + n.name;
    if (roleEl) roleEl.textContent = n.role + (n.add ? " · " + n.add + "d" : " · today");
    etaEl.textContent = eta(now, n.when);
    etaEl.className = "eta " + heat;
    card.className = "card span " + heat;
  }
  renderClockTable(now);
}
const timers = [];
  const saveBtn = document.getElementById("saveBtn");
  const jsonBtn = document.getElementById("jsonBtn");
  const urlBtn = document.getElementById("urlBtn");
  const resetBtn = document.getElementById("resetBtn");
  const fUrl = document.getElementById("fUrl");
  if (saveBtn) saveBtn.onclick = saveState;
  if (jsonBtn) jsonBtn.onclick = applyJson;
  if (urlBtn) urlBtn.onclick = saveUrlAndFetch;
  if (resetBtn) resetBtn.onclick = function(){
    localStorage.removeItem("murphyPilotDesk");
    paintBook(SEED);
  };
  const savedUrl = localStorage.getItem("murphyPilotDeskUrl") || "";
  if (fUrl) fUrl.value = savedUrl;
  if (!hostedPull() && savedUrl) fetchSnapshot(savedUrl);
  else if (!hostedPull()) localFilePull();
  function maybeFetch(){
    const box = document.getElementById("autoBox");
    if (box && !box.checked) return;
    if (hostedPull()) return;
    const u = localStorage.getItem("murphyPilotDeskUrl");
    if (u) { fetchSnapshot(u); return; }
    localFilePull();
  }
  paintBook(loadState());
  paintCal();
  paintPack(SEED_PACK);
  tick();
  timers.push(setInterval(tick, 1000));
  timers.push(setInterval(maybeFetch, 5 * 60 * 1000));
  timers.push(setInterval(function(){ hostedTicker(); }, 60 * 1000));
  function onTapePoint(e){
    const card = document.getElementById("finCard");
    if (!card) return;
    const row = e.target.closest && e.target.closest("button.tape-row");
    const svg = card.querySelector("svg.axis-svg");
    if (!svg) return;
    const pts = Array.prototype.slice.call(svg.querySelectorAll("circle.tape-pt"));
    if (!pts.length) return;
    let pt = null;
    if (row) {
      const want = row.getAttribute("data-i");
      pt = pts.filter(function(c){ return c.getAttribute("data-i") === want; }).pop() || pts[pts.length-1];
    } else {
      const inPlot = e.target.closest && e.target.closest("svg.axis-svg, .tape-plot");
      if (!inPlot) return;
      const hit = e.target.closest && e.target.closest("circle.tape-hit");
      if (hit) {
        const want = hit.getAttribute("data-i");
        pt = pts.filter(function(c){ return c.getAttribute("data-i") === want; }).pop();
      }
      if (!pt) {
        const rect = svg.getBoundingClientRect();
        const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { width: 760 };
        const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * vb.width;
        let bestD = Infinity;
        pts.forEach(function(c){
          const d = Math.abs(Number(c.getAttribute("cx")) - x);
          if (d < bestD) { bestD = d; pt = c; }
        });
      }
    }
    if (!pt) return;
    selectTapePrint(card, svg, pt);
  }
  function selectTapePrint(card, svg, pt){
    card.querySelectorAll("circle.tape-pt.on").forEach(function(c){
      c.classList.remove("on");
      c.setAttribute("r", "3.4");
      c.setAttribute("fill-opacity", "0.55");
    });
    pt.classList.add("on");
    pt.setAttribute("r", "5");
    pt.setAttribute("fill-opacity", "1");
    const eq = pt.getAttribute("data-eq");
    const dtg = pt.getAttribute("data-dtg") || "";
    const i = pt.getAttribute("data-i");
    const label = "$"+eq;
    const box = document.getElementById("tapeReadout");
    if (box) box.innerHTML = "<b>$"+eq+"</b><span> · "+dtg+" · print on the tape</span>";
    card.querySelectorAll("button.tape-row.on").forEach(function(r){ r.classList.remove("on"); });
    const match = card.querySelector('button.tape-row[data-i="'+i+'"]');
    if (match) {
      match.classList.add("on");
      match.scrollIntoView({ block: "nearest" });
    }
    const flag = svg.querySelector("g.tape-flag");
    if (flag) {
      const bg = flag.querySelector("rect");
      const call = flag.querySelector("text.tape-callout");
      const x = Number(pt.getAttribute("cx"));
      const y = Number(pt.getAttribute("cy"));
      const w = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.width : 760;
      const g = tapeFlagGeom(x, y, label, w);
      if (bg) {
        bg.setAttribute("x", g.fx.toFixed(1));
        bg.setAttribute("y", g.fy.toFixed(1));
        bg.setAttribute("width", g.tw.toFixed(1));
      }
      if (call) {
        call.textContent = label;
        call.setAttribute("x", g.mx.toFixed(1));
        call.setAttribute("y", g.my.toFixed(1));
      }
    }
    placeHtmlFlag(svg, pt, label);
  }
  const finCard = document.getElementById("finCard");
  function onTapeHover(e){
    if (!(e.target.closest && e.target.closest("svg.axis-svg"))) return;
    onTapePoint(e);
  }
  if (finCard) {
    finCard.addEventListener("click", onTapePoint);
    finCard.addEventListener("pointerover", onTapeHover);
  }
  function selectMixSlice(card, i){
    if (!card || i == null) return;
    const fat = card.querySelector("svg.mix-svg.fat");
    const slice = (fat && fat.querySelector('path.mix-slice[data-i="'+i+'"]')) || card.querySelector('path.mix-slice[data-i="'+i+'"]');
    if (!slice) return;
    if (fat) {
      fat.querySelectorAll("path.mix-slice.on").forEach(function(p){ p.classList.remove("on"); });
      const fs = fat.querySelector('path.mix-slice[data-i="'+i+'"]');
      if (fs) fs.classList.add("on");
      const pctEl = fat.querySelector(".mix-hole-pct");
      const symEl = fat.querySelector(".mix-hole-sym");
      const pct = Number(slice.getAttribute("data-pct"));
