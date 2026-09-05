      '<div class="prints">Recent '+recent+'</div>'+
      '<div class="trail">Dashed line is average cost. Green/red dots are high, low, and last. Trail −15% from high arms after 24h if this name is still green. First fill '+held+'.</div>'+
      '</div></details>';
  }).join("") || "<p class='hint'>No names to chart.</p>";
  el.querySelectorAll("details.spark").forEach(function(d){
    d.addEventListener("toggle", function(){
      const on = [];
      el.querySelectorAll("details.spark[open]").forEach(function(x){ on.push(x.getAttribute("data-sym")); });
      try { localStorage.setItem("murphyPilotSparkOpen", JSON.stringify(on)); } catch(e){}
    });
  });
}

function hostedPack(){
  if (typeof google === "undefined" || !google.script || !google.script.run) return false;
  google.script.run
    .withSuccessHandler(function(pack){
      if (pack && !pack.error) paintPack(pack);
    })
    .withFailureHandler(function(){})
    .getPack();
  return true;
}
function hostedIssuers(){
  if (typeof google === "undefined" || !google.script || !google.script.run) return false;
  google.script.run
    .withSuccessHandler(function(rows){
      const map = {};
      (rows||[]).forEach(function(r){ if (r && r.symbol) map[r.symbol] = r; });
      paintIssuers(parseNames(loadState()), map);
    })
    .withFailureHandler(function(){})
    .getIssuers();
  return true;
}
function hostedTicker(){
  if (typeof google === "undefined" || !google.script || !google.script.run) return false;
  google.script.run
    .withSuccessHandler(function(quotes){
      const s = loadState();
      paintTicker(parseNames(s), quotes);
    })
    .withFailureHandler(function(){})
    .getTicker();
  return true;
}
function hostedPull(){
  if (typeof google === "undefined" || !google.script || !google.script.run) return false;
  document.getElementById("kSnap").textContent = "hosted…";
  hostedTicker();
  hostedPack();
  hostedIssuers();
  google.script.run
    .withSuccessHandler(function(obj){
      document.getElementById("fJson").value = JSON.stringify(obj);
      applyJson();
      document.getElementById("kSnap").textContent = "hosted";
    })
    .withFailureHandler(function(err){
      document.getElementById("kSnap").textContent = "hosted fail";
      document.getElementById("bookNote").textContent = "Hosted snapshot failed: " + err;
    })
    .getSnapshot();
  return true;
}
function saveUrlAndFetch(){
  const u = document.getElementById("fUrl").value.trim();
  if (!u){ localStorage.removeItem("murphyPilotDeskUrl"); return; }
  localStorage.setItem("murphyPilotDeskUrl", u);
  fetchSnapshot(u);
}
function fetchSnapshot(u){
  document.getElementById("kSnap").textContent = "fetch…";
  fetch(u, { cache: "no-store" }).then(r => {
    if (!r.ok) throw new Error("HTTP "+r.status);
    return r.text();
  }).then(txt => {
    document.getElementById("fJson").value = txt;
    applyJson();
    document.getElementById("kSnap").textContent = "url";
  }).catch(err => {
    document.getElementById("kSnap").textContent = "fetch fail";
    document.getElementById("bookNote").textContent = "URL fetch failed: "+err+". Drive preview links usually block the browser. Use the Apps Script /exec link.";
  });
}
function localFilePull(){
  if (typeof google !== "undefined" && google.script && google.script.run) return false;
  fetch("pilot-snapshot.json", { cache: "no-store" }).then(function(r){
    if (!r.ok) throw new Error("no local snapshot");
    return r.text();
  }).then(function(txt){
    var box = document.getElementById("fJson");
    if (box) box.value = txt;
    applyJson();
    var k = document.getElementById("kSnap");
    if (k) k.textContent = "local file";
  }).catch(function(){ /* file:// or missing json — keep last localStorage book */ });
  return true;
}
function applyJson(){
  const raw = document.getElementById("fJson").value.trim();
  if (!raw) return;
  let j;
  try { j = JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch(e){ alert("JSON did not parse"); return; }
  const names = (j.names||[]).map(n => {
    if (typeof n === "string") return n;
    const bits = [n.symbol, n.avg ?? n.cost ?? "—", n.qty ?? "—", n.last ?? "—"];
    if (n.qty != null) bits.push("qty "+n.qty);
    if (n.last != null) bits.push("last "+n.last);
    if (n.previous_close != null) bits.push("prev "+n.previous_close);
    if (n.prev != null) bits.push("prev "+n.prev);
    if (n.pct) bits.push(n.pct);
    return bits.join(" | ");
  }).join("\n");
  const s = {
    equity: j.equity != null ? String(j.equity) : "",
    bp: j.buying_power != null ? String(j.buying_power) : "",
    inv: j.invested_pct != null ? String(j.invested_pct) : "",
    hwm: j.hwm != null ? String(j.hwm) : "",
    cash: j.cash != null ? String(j.cash) : "",
    pending: j.pending_deposits != null ? String(j.pending_deposits) : "",
    orders: j.open_orders != null ? String(j.open_orders) : "",
    names: names,
    note: "Snapshot " + (j.asof || new Date().toISOString()) + " · Agentic only · no account numbers"
  };
  localStorage.setItem("murphyPilotDesk", JSON.stringify(s));
  paintBook(s);
}
function mixColor(i, kind, pal){
  if (kind === "cash") return pal.mixCash;
  const cols = [pal.mixA, pal.mixB, pal.mixC];
  return cols[i % cols.length];
}
function mixSlices(s, parsed){
  const eq = parseFloat(String(s && s.equity).replace(/[^0-9.]/g,"")) || 0;
  const cashRaw = parseFloat(String(s && s.cash).replace(/[^0-9.]/g,"")) || 0;
  const names = (parsed || []).filter(function(n){ return n.symbol && n.symbol !== "—"; });
  const held = names.map(function(n){
    const last = n.last;
    const qty = n.qty;
    let mkt = 0;
    if (qty != null && last != null && isFinite(qty) && isFinite(last)) mkt = qty * last;
    else if (qty != null && n.cost != null && isFinite(qty) && isFinite(n.cost)) mkt = qty * n.cost;
    return { symbol: n.symbol, dollars: mkt, qty: qty, last: last, cost: n.cost, kind: "name" };
  });
  const invested = held.reduce(function(a, b){ return a + b.dollars; }, 0);
  let rest = cashRaw;
  if ((!isFinite(rest) || rest <= 0) && eq > invested + 0.02) rest = eq - invested;
  if (rest < 0) rest = 0;
  const denom = invested + rest;
  const base = denom > 0.001 ? denom : (eq > 0 ? eq : 1);
  const out = held.map(function(h){
    return Object.assign({}, h, { pct: (h.dollars / base) * 100 });
  });
  out.push({ symbol: "Cash", dollars: rest, kind: "cash", pct: (rest / base) * 100, qty: null, last: null, cost: null });
  const sumPct = out.reduce(function(a, b){ return a + b.pct; }, 0);
  if (sumPct > 0 && Math.abs(sumPct - 100) > 0.005) out[out.length - 1].pct += (100 - sumPct);
  return { eq: eq, total: base, invested: invested, cash: rest, slices: out };
}
function polar(cx, cy, r, a){
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function slicePath(cx, cy, r, r0, a0, a1){
  const da = a1 - a0;
  if (da < 1e-6) return "";
  if (da >= Math.PI * 2 - 1e-4) {
    return "M "+(cx+r)+","+cy+" A "+r+","+r+" 0 1 1 "+(cx-r)+","+cy+" A "+r+","+r+" 0 1 1 "+(cx+r)+","+cy+
      " M "+(cx+r0)+","+cy+" A "+r0+","+r0+" 0 1 0 "+(cx-r0)+","+cy+" A "+r0+","+r0+" 0 1 0 "+(cx+r0)+","+cy;
  }
  const large = da > Math.PI ? 1 : 0;
  const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  const q1 = polar(cx, cy, r0, a1), q0 = polar(cx, cy, r0, a0);
  return "M "+p0[0].toFixed(2)+","+p0[1].toFixed(2)+
    " A "+r+","+r+" 0 "+large+" 1 "+p1[0].toFixed(2)+","+p1[1].toFixed(2)+
    " L "+q1[0].toFixed(2)+","+q1[1].toFixed(2)+
    " A "+r0+","+r0+" 0 "+large+" 0 "+q0[0].toFixed(2)+","+q0[1].toFixed(2)+" Z";
}
function pieSvg(slices, opt){
  opt = opt || {};
  const fat = !!opt.fat;
  const size = opt.size || (fat ? 220 : 112);
  const pal = themeColors();
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - (fat ? 6 : 3);
  const r0 = r * (fat ? 0.56 : 0.58);
  let a = -Math.PI / 2;
  let paths = "";
  let nameI = 0;
  slices.forEach(function(s, i){
    const da = Math.max(0, (s.pct / 100) * Math.PI * 2);
    const a1 = a + da;
    const col = mixColor(s.kind === "cash" ? 0 : nameI, s.kind, pal);
    if (s.kind === "name") nameI += 1;
    const d = slicePath(cx, cy, r, r0, a, a1);
    if (d) {
      const even = da >= Math.PI * 2 - 1e-4 ? ' fill-rule="evenodd"' : "";
      const on = i === (opt.sel == null ? slices.length - 1 : opt.sel) && fat ? " on" : "";
      paths += '<path class="mix-slice'+on+'"'+even+' data-i="'+i+'" data-sym="'+escHtml(s.symbol)+'" data-pct="'+s.pct.toFixed(2)+'" data-usd="'+s.dollars.toFixed(2)+'" fill="'+col+'" d="'+d+'"><title>'+escHtml(s.symbol)+" "+s.pct.toFixed(1)+"% · $"+s.dollars.toFixed(2)+"</title></path>";
    }
    a = a1;
  });
  const pick = slices[opt.sel != null ? opt.sel : 0] || slices[0];
