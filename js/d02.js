      verdict = "Hold. Stall in "+leftBd+" bd — need $"+stall.toFixed(2)+".";
    }
    const lastBit = last ? "$"+last.toFixed(2)+" · "+signedSpan(vs,2,"%") : "";
    const stallWhen = leftBd!=null ? stallDate+" · "+leftBd+" bd" : (days!=null && days>=2 ? "due" : "period 1");
    card.innerHTML =
      "<div class='thr-head'><b>"+n.symbol+"</b><span>"+lastBit+(n.qty!=null?" · "+n.qty+" sh":"")+"</span></div>"+
      "<p class='thr-verdict "+statusCls+"'>"+verdict+"</p>"+
      "<table class='thr-table'><tbody>"+
      "<tr><td>Floor −5%</td><td>$"+stop5.toFixed(2)+"</td><td>"+vsLine(stop5)+"</td></tr>"+
      "<tr><td>Hard cap −6%</td><td>$"+hard6.toFixed(2)+"</td><td>"+vsLine(hard6)+"</td></tr>"+
      "<tr><td>Flatten −10%</td><td>$"+flat.toFixed(2)+"</td><td>"+vsLine(flat)+"</td></tr>"+
      "<tr><td>Stall +5%</td><td>$"+stall.toFixed(2)+"</td><td>"+vsLine(stall)+" · "+stallWhen+"</td></tr>"+
      "</tbody></table>";
    tb.appendChild(card);
  });
  const eq = parseFloat(String(s.equity||"").replace(/[^0-9.]/g,""));
  const bp = parseFloat(String(s.bp||"").replace(/[^0-9.]/g,""));
  const inv = parseFloat(String(s.inv||"").replace(/[^0-9.]/g,""));
  const slots = isFinite(eq) ? Math.floor(eq/75) : null;
  const used = parsed.filter(n=>n.symbol && n.symbol!=="—").length;
  const buy = [];
  if (!isFinite(eq)) buy.push("Need equity to score slots / 90-10.");
  else {
    buy.push("Slots "+used+" / "+slots+".");
    if (used > slots) buy.push("Over slots — no new name until equity clears another $75 or a name exits.");
    else if (used === slots) buy.push("No free slot. May add to an existing allowed name only.");
    else buy.push("Free slot: may research 1 new name.");
    if (isFinite(inv) && inv >= 80) buy.push("Invested "+inv+"% — Eyes stay quiet if no stop/stall is due.");
    if (isFinite(inv) && inv >= 90) buy.push("At or over 90% deploy. No new cash in unless a name is sold.");
    if (isFinite(bp) && bp < 40 && used===0) buy.push("Empty-book fault line is $40 BP. Current BP is below that.");
    if (used===0 && isFinite(bp) && bp>=5) buy.push("Empty book with spendable BP is a deploy.");
  }
  buy.push("HWM freeze is account-level only and does not sell a name by itself.");
  buy.push("Do not dump a fresh green winner. Same-symbol rebuy waits 24h.");
  const note = document.getElementById("thrNote");
  if (note) note.textContent = "Each name vs its own cost. Stall is this name only.";
  const shortBuy = [];
  if (isFinite(eq)) shortBuy.push("Slots in use: "+used+" of "+slots+".");
  if (isFinite(inv) && inv >= 80) shortBuy.push("Book is "+inv+"% invested, so Eyes stay quiet unless a stop or stall is due.");
  else if (used < slots) shortBuy.push("A free slot is open if cash shows up.");
  document.getElementById("buyNote").innerHTML = shortBuy.map(function(line){ return "<li>"+line+"</li>"; }).join("");
}

function chartStore(){
  try { return JSON.parse(localStorage.getItem("murphyPilotCharts")||"{}"); }
  catch { return {}; }
}
function rememberPoints(parsed){
  const store = chartStore();
  parsed.forEach(n => {
    if (!n.symbol || n.last == null) return;
    if (!store[n.symbol] || store[n.symbol].length < 3) store[n.symbol] = (SEED_CHARTS[n.symbol]||[]).slice();
    const arr = store[n.symbol];
    if (!arr.length || Math.abs(arr[arr.length-1] - n.last) > 0.0001) arr.push(n.last);
    if (arr.length > 400) store[n.symbol] = arr.slice(-400);
  });
  localStorage.setItem("murphyPilotCharts", JSON.stringify(store));
}
function moneyStore(){
  try { return JSON.parse(localStorage.getItem("murphyPilotMoneyV2")||"[]"); }
  catch(e){ return []; }
}
function roundMoney(n){ return Math.round(Number(n) * 100) / 100; }
function backfillMoney(s, parsed){
  const charts = chartStore();
  const names = (parsed||[]).filter(function(n){ return n.symbol && n.symbol !== "—" && n.qty != null && isFinite(n.qty); });
  const series = names.map(function(n){
    const vals = (charts[n.symbol] && charts[n.symbol].length ? charts[n.symbol] : null) || SEED_CHARTS[n.symbol] || [];
    return { qty: n.qty, vals: vals };
  }).filter(function(x){ return x.vals.length >= 2; });
  const built = [];
  if (series.length){
    const n = Math.min.apply(null, series.map(function(x){ return x.vals.length; }));
    const cashNow = parseFloat(String(s && s.cash).replace(/[^0-9.]/g,"")) || 0;
    let t0 = Date.parse("2026-08-27T09:45:00-04:00");
    (parsed||[]).forEach(function(nm){
      if (nm.fill && /^\d{4}-\d{2}-\d{2}/.test(nm.fill)) {
        const ms = Date.parse(nm.fill.slice(0,10) + "T09:45:00-04:00");
        if (isFinite(ms) && ms < t0) t0 = ms;
      }
    });
    const t1 = Date.now();
    let mx = 0;
    for (let i = 0; i < n; i++){
      let eq = cashNow;
      for (let j = 0; j < series.length; j++) eq += series[j].qty * series[j].vals[i];
      eq = roundMoney(eq);
      mx = i === 0 ? eq : Math.max(mx, eq);
      const t = t0 + (t1 - t0) * i / Math.max(n - 1, 1);
      built.push({ t: t, dtg: fmtDtg(t), equity: eq, max: roundMoney(mx), key: "backfill-" + i });
    }
  }
  const live = moneyStore().filter(function(r){
    const k = String(r && r.key || "");
    return k.indexOf("backfill-") !== 0 && (k.indexOf("Snapshot") === 0 || k.indexOf("Updated") === 0);
  });
  const lastB = built.length ? built[built.length-1] : null;
  live.forEach(function(r){
    if (!r || r.equity == null || !isFinite(r.equity)) return;
    if (lastB && Math.abs(r.equity - lastB.equity) < 0.03) return;
    const mx = built.length ? Math.max(built[built.length-1].max, r.equity) : r.equity;
    built.push({ t: r.t || Date.now(), dtg: r.dtg || fmtDtg(r.t), equity: roundMoney(r.equity), max: roundMoney(mx), key: r.key });
  });
  localStorage.setItem("murphyPilotMoneyV2", JSON.stringify(built.slice(-400)));
}
function rememberMoney(s){
  const eq = parseFloat(String(s && s.equity).replace(/[^0-9.]/g,""));
  if (!isFinite(eq) || eq <= 0) return;
  const key = String((s && (s.note || s.asof)) || "").replace(/\s+/g," ").slice(0,120);
  const store = moneyStore();
  const last = store.length ? store[store.length-1] : null;
  if (last && key && last.key === key) return;
  if (last && Math.abs(last.equity - eq) < 0.03) return;
  if (!key && last && (Date.now() - last.t) < 15000) return;
  const mx = last ? Math.max(last.max, eq) : eq;
  store.push({ t: Date.now(), dtg: fmtDtg(Date.now()), equity: roundMoney(eq), max: roundMoney(mx), key: key || ("snap-"+Date.now()) });
  if (store.length > 400) store.splice(0, store.length - 400);
  localStorage.setItem("murphyPilotMoneyV2", JSON.stringify(store));
}
function paintMoney(){
  const el = document.getElementById("finCard");
  if (!el) return;
  const store = moneyStore();
  if (!store.length) {
    el.innerHTML = "<p class='hint'>No value ticks yet. The next snapshot JSON adds the first print.</p>";
    return;
  }
  const eqVals = store.map(function(r){ return r.equity; });
  const maxVals = store.map(function(r){ return r.max; });
  const lastEq = eqVals[eqVals.length-1];
  const first = eqVals[0];
  const hwm = maxVals[maxVals.length-1];
  const lo = Math.min.apply(null, eqVals);
  const vsFirst = first ? ((hwm/first)-1)*100 : null;
  const vsHwm = hwm ? ((lastEq/hwm)-1)*100 : null;
  const grown = hwm - first;
  const fmt = function(x,d){ return x==null || !isFinite(x) ? "—" : Number(x).toFixed(d); };
  const plotEq = eqVals.length === 1 ? [eqVals[0], eqVals[0]] : eqVals;
  const plotMax = maxVals.length === 1 ? [maxVals[0], maxVals[0]] : maxVals;
  const dtgs = store.map(function(r){ return r.dtg || fmtDtg(r.t); });
  const plotDtg = dtgs.length === 1 ? [dtgs[0], dtgs[0]] : dtgs;
  const mini = sparkSvg(plotMax, first, {w:640, h:92});
  const fat = sparkSvg(plotEq, hwm, {fat:true, axis:true, dashLabel:"high", dtg: plotDtg});
  const vsTxt = vsFirst==null ? "—" : ((vsFirst>=0?"+":"")+fmt(vsFirst,2)+"%");
  const growTxt = grown==null || !isFinite(grown) ? "—" : ((grown>=0?"+$":"−$")+Math.abs(grown).toFixed(2));
  const nowCls = lastEq + 0.004 < hwm ? "tone-stop" : "tone-go";
  const growCls = toneCls(vsFirst);
  const isOpen = el.querySelector("details.fin-more") ? el.querySelector("details.fin-more").open : false;
  const shown = store.slice(Math.max(0, store.length - 40));
  const startI = store.length - shown.length;
  const lastShown = shown.length - 1;
  const ledger = shown.slice().reverse().map(function(r, revI){
    const i = startI + (lastShown - revI);
    const dtg = r.dtg || fmtDtg(r.t);
    const on = i === store.length - 1 ? " on" : "";
    return '<button type="button" class="tape-row'+on+'" data-i="'+i+'" data-eq="'+fmt(r.equity,2)+'" data-dtg="'+String(dtg).replace(/"/g,"")+'"><span>'+dtg+'</span><b>$'+fmt(r.equity,2)+'</b></button>';
  }).join("");
  el.innerHTML =
    '<div class="fin-hero">'+
