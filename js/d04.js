    if (fat && !axis) extras+='<text x="'+(w-pR+4)+'" y="'+(y+3).toFixed(1)+'" font-size="10" fill="'+pal.mute+'">'+(opt.dashLabel||"cost")+'</text>';
    if (axis) extras+='<text x="'+(pL+8)+'" y="'+(y-6).toFixed(1)+'" font-size="10" fill="'+pal.mute+'">'+(opt.dashLabel==="high"?"high water":(opt.dashLabel||""))+'</text>';
  }
  let marks = "";
  if (axis){
    vals.forEach(function(v, i){
      const p = ptsArr[i];
      const dtg = (opt.dtg && opt.dtg[i]) ? String(opt.dtg[i]) : "";
      const lastP = i === vals.length - 1;
      marks += '<circle class="tape-hit" data-i="'+i+'" data-eq="'+Number(v).toFixed(2)+'" data-dtg="'+dtg.replace(/"/g,"")+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="14" fill="transparent"/>';
      marks += '<circle class="tape-pt'+(lastP?" on":"")+'" data-i="'+i+'" data-eq="'+Number(v).toFixed(2)+'" data-dtg="'+dtg.replace(/"/g,"")+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(lastP?"5":"3.4")+'" fill="'+(lastP?stroke:pal.axis)+'" fill-opacity="'+(lastP?"1":"0.55")+'" pointer-events="none"><title>$'+Number(v).toFixed(2)+(dtg?" · "+dtg:"")+'</title></circle>';
    });
    const hi = Math.max.apply(null, vals);
    const loVal = Math.min.apply(null, vals);
    if (hi !== last){
      const hiI = vals.indexOf(hi);
      const hiPt = ptsArr[hiI];
      marks += '<text class="tape-hl" x="'+hiPt[0].toFixed(1)+'" y="'+(hiPt[1]-10).toFixed(1)+'" text-anchor="middle" font-size="10" fill="'+pal.go+'">$'+Number(hi).toFixed(2)+'</text>';
    }
    if (loVal !== last && loVal !== hi){
      const loI = vals.indexOf(loVal);
      const loPt = ptsArr[loI];
      marks += '<text class="tape-hl" x="'+loPt[0].toFixed(1)+'" y="'+(loPt[1]+14).toFixed(1)+'" text-anchor="middle" font-size="10" fill="'+pal.stop+'">$'+Number(loVal).toFixed(2)+'</text>';
    }
    marks += tapeFlagMarkup(lastPt[0], lastPt[1], "$"+Number(last).toFixed(2), stroke, pal, w);
  } else if (fat){
    const hi = Math.max.apply(null, vals);
    const loVal = Math.min.apply(null, vals);
    const hiI = vals.indexOf(hi);
    const loI = vals.indexOf(loVal);
    const hiPt = xy(hi, hiI);
    const loPt = xy(loVal, loI);
    extras += '<circle cx="'+lastPt[0].toFixed(1)+'" cy="'+lastPt[1].toFixed(1)+'" r="3.2" fill="'+stroke+'"/>';
    extras += '<circle cx="'+hiPt[0].toFixed(1)+'" cy="'+hiPt[1].toFixed(1)+'" r="2.4" fill="'+pal.go+'"/>';
    extras += '<circle cx="'+loPt[0].toFixed(1)+'" cy="'+loPt[1].toFixed(1)+'" r="2.4" fill="'+pal.stop+'"/>';
    extras += '<text x="4" y="'+(pT+3)+'" font-size="10" fill="'+pal.mute+'">'+Number(mx).toFixed(2)+'</text>';
    extras += '<text x="4" y="'+(h-pB)+'" font-size="10" fill="'+pal.mute+'">'+Number(mn).toFixed(2)+'</text>';
    extras += '<text x="'+(lastPt[0]+6).toFixed(1)+'" y="'+(lastPt[1]+3).toFixed(1)+'" font-size="11" font-weight="700" fill="'+stroke+'">'+Number(last).toFixed(2)+'</text>';
  }
  const sw = fat ? 2 : 1.6;
  const par = axis ? "xMidYMid meet" : "none";
  const cls = axis ? ' class="axis-svg"' : "";
  return '<svg'+cls+' viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="'+par+'" aria-hidden="true">'+extras+'<polygon fill="'+fill+'" fill-opacity="0.14" points="'+area+'" pointer-events="none"/><polyline fill="none" stroke="'+stroke+'" stroke-width="'+sw+'" points="'+pts+'" pointer-events="none"/>'+marks+'</svg>';
}
function paintTicker(parsed, quotes){
  const el = document.getElementById("tickerTrack");
  if (!el) return;
  const qmap = {};
  (quotes||[]).forEach(q => { if (q && q.symbol) qmap[q.symbol] = q; });
  const names = (parsed && parsed.length) ? parsed : Object.keys(SEED_TICKER).map(s => ({symbol:s}));
  const items = names.filter(n => n.symbol && n.symbol !== "—").map(n => {
    const seed = SEED_TICKER[n.symbol] || {};
    const q = qmap[n.symbol] || {};
    const last = q.last != null ? q.last : (n.last != null ? n.last : seed.last);
    const prev = q.prev != null ? q.prev : (n.prev != null ? n.prev : (n.previous_close != null ? n.previous_close : seed.prev));
    const chg = (last != null && prev) ? last - prev : null;
    const pct = (chg != null && prev) ? (chg/prev)*100 : null;
    let cls = "flat";
    if (pct != null && pct > 0.005) cls = "up";
    else if (pct != null && pct < -0.005) cls = "down";
    const lastTxt = last != null ? Number(last).toFixed(2) : "—";
    const pctTxt = pct == null ? "" : ((pct>=0?"+":"")+Number(pct).toFixed(2)+"%");
    const qty = n.qty;
    const spent = (qty != null && n.cost != null) ? qty * n.cost : null;
    const value = (qty != null && last != null) ? qty * last : null;
    const qtyTxt = qty == null ? "" : (qty>=1?qty.toFixed(2):qty.toFixed(4))+" sh";
    const spentTxt = spent == null ? "" : "$"+spent.toFixed(2)+" in";
    const valTxt = value == null ? "" : "$"+value.toFixed(2)+" mkt";
    return '<span class="ticker-item '+cls+'">'+
      '<span class="sym">'+n.symbol+'</span>'+
      '<span class="px">'+lastTxt+'</span>'+
      (pctTxt ? '<span class="chg">'+pctTxt+'</span>' : '')+
      (spentTxt ? '<span class="meta">'+spentTxt+'</span>' : '')+
      (qtyTxt ? '<span class="meta">'+qtyTxt+'</span>' : '')+
      (valTxt ? '<span class="meta">'+valTxt+'</span>' : '')+
      '</span>';
  });
  if (!items.length) {
    el.innerHTML = '<span class="ticker-item flat">No names on the book</span>';
    return;
  }
  el.innerHTML = items.join("") + items.join("");
  el.style.animationDuration = Math.max(22, items.length * 10) + "s";
}
function paintCharts(parsed){
  const store = chartStore();
  const el = document.getElementById("charts");
  if (!el) return;
  const open = {};
  try { (JSON.parse(localStorage.getItem("murphyPilotSparkOpen")||"[]")||[]).forEach(function(s){ open[s]=true; }); } catch(e){}
  el.innerHTML = parsed.map(function(n){
    const vals = store[n.symbol] || SEED_CHARTS[n.symbol] || [];
    if (!vals.length) return '<details class="spark"><summary><b>'+n.symbol+'</b><span class="held">No prints yet</span></summary></details>';
    const last = vals[vals.length-1];
    const first = vals[0];
    const hi = Math.max.apply(null, vals);
    const lo = Math.min.apply(null, vals);
    const vsCostPct = n.cost ? ((last/n.cost-1)*100) : null;
    const vsCostDol = n.cost ? (last-n.cost) : null;
    const vsOpenPct = first ? ((last/first-1)*100) : null;
    const vsHiPct = hi ? ((last/hi-1)*100) : null;
    const rngPct = lo ? ((hi/lo-1)*100) : null;
    const rngDol = (hi!=null && lo!=null) ? (hi-lo) : null;
    const trail = hi * 0.85;
    const roomTrail = last - trail;
    const held = n.fill || "2026-08-27";
    const mkt = (n.qty!=null && last!=null) ? n.qty*last : null;
    const spent = (n.qty!=null && n.cost!=null) ? n.qty*n.cost : null;
    const fmt = function(x,d){ return x==null || !isFinite(x) ? "—" : Number(x).toFixed(d); };
    const mini = sparkSvg(vals, n.cost, {fat:false});
    const fat = sparkSvg(vals, n.cost, {fat:true});
    const nameCls = toneCls(vsCostPct);
    const qtyTxt = n.qty==null ? "" : (n.qty>=1?n.qty.toFixed(2):n.qty.toFixed(4))+" sh";
    const recent = vals.slice(-8).map(function(v,i,a){
      const mark = i===a.length-1 ? "<b>"+fmt(v,2)+"</b>" : fmt(v,2);
      return "<span>"+mark+"</span>";
    }).join("");
    const isOpen = !!open[n.symbol];
    return '<details class="spark" data-sym="'+n.symbol+'"'+(isOpen?" open":"")+'>'+
      '<summary>'+
      '<b class="spark-sym '+nameCls+'">'+n.symbol+'</b>'+
      '<span class="spark-mini">'+mini+'</span>'+
      '<span class="held">'+fmt(last,2)+' · vs cost '+ (vsCostPct==null?"—":((vsCostPct>=0?"+":"")+fmt(vsCostPct,2)+"%")) + (qtyTxt?" · "+qtyTxt:"")+' · since '+held+'</span>'+
      '</summary>'+
      '<div class="spark-open">'+fat+
      '<div class="stats">'+
      '<div><span>Last</span>'+fmt(last,2)+'</div>'+
      '<div><span>Cost</span>'+fmt(n.cost,2)+'</div>'+
      '<div><span>Vs cost</span>'+signedSpan(vsCostPct,2,"%")+'</div>'+
      '<div><span>$ vs cost</span>'+signedSpan(vsCostDol,2)+'</div>'+
      '<div><span>High</span>'+fmt(hi,2)+'</div>'+
      '<div><span>Low</span>'+fmt(lo,2)+'</div>'+
      '<div><span>Vs high</span>'+signedSpan(vsHiPct,2,"%")+'</div>'+
      '<div><span>Range</span>'+fmt(rngDol,2)+' / '+fmt(rngPct,2)+'%</div>'+
      '<div><span>First print</span>'+fmt(first,2)+'</div>'+
      '<div><span>Since first</span>'+signedSpan(vsOpenPct,2,"%")+'</div>'+
      '<div><span>Trail −15%</span>'+fmt(trail,2)+'</div>'+
      '<div><span>Room to trail</span>'+signedSpan(roomTrail,2)+'</div>'+
      '<div><span>Qty</span>'+(qtyTxt||"—")+'</div>'+
      '<div><span>Spent</span>'+(spent==null?"—":"$"+fmt(spent,2))+'</div>'+
      '<div><span>Mkt</span>'+(mkt==null?"—":"$"+fmt(mkt,2))+'</div>'+
      '<div><span>Prints</span>'+vals.length+'</div>'+
      '</div>'+
