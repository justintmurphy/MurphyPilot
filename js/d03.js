      '<div><span>High water</span><b class="tone-go">$'+fmt(hwm,2)+'</b><span class="sub">Running max of Agentic value</span></div>'+
      '<div><span>Now</span><b class="'+nowCls+'">$'+fmt(lastEq,2)+'</b><span class="sub">'+signedSpan(vsHwm,2,"%")+' vs high water</span></div>'+
      '<div><span>Grown</span><b class="'+growCls+'">'+growTxt+'</b><span class="sub">'+vsTxt+' since first print</span></div>'+
      '<div><span>Prints</span><b>'+store.length+'</b><span class="sub">From first fill, then each snapshot</span></div>'+
    '</div>'+
    '<div class="fin-chart">'+mini+'<div class="fin-cap">High-water tape from first fill. Dashed is the first print. Solid only steps up.</div></div>'+
    '<details class="spark fin-more"'+(isOpen?" open":"")+'>'+
      '<summary><span class="tape-sum">Live equity tape</span><span class="held">$'+fmt(lastEq,2)+' now · expand to read $ on the chart</span></summary>'+
      '<div class="spark-open">'+
      '<div class="tape-plot">'+fat+'<div class="tape-flag-html" id="tapeFlagHtml">$'+fmt(lastEq,2)+'</div></div>'+
      '<div class="tape-readout" id="tapeReadout"><b>$'+fmt(lastEq,2)+'</b><span> · '+(plotDtg[plotDtg.length-1]||"")+' · last print</span></div>'+
      '<div class="stats">'+
      '<div><span>Now</span>$'+fmt(lastEq,2)+'</div>'+
      '<div><span>High water</span>$'+fmt(hwm,2)+'</div>'+
      '<div><span>First</span>$'+fmt(first,2)+'</div>'+
      '<div><span>Low tick</span>$'+fmt(lo,2)+'</div>'+
      '<div><span>Vs first</span>'+signedSpan(vsFirst,2,"%")+'</div>'+
      '<div><span>Vs high water</span>'+signedSpan(vsHwm,2,"%")+'</div>'+
      '<div><span>Dollars grown</span>'+signedSpan(grown,2)+'</div>'+
      '<div><span>Prints</span>'+store.length+'</div>'+
      '</div>'+
      '<div class="tape-ledger-cap">Every print on the tape · tap a row or a point</div>'+
      '<div class="tape-ledger" id="tapeLedger">'+ledger+'</div>'+
      '<div class="trail">Live tape is Agentic equity from first fill. Left scale is dollars. Bottom is DTG (ET). Dashed line is the high water. The plate on the chart is the selected print. Pending deposits are already in these numbers — not extra cash arriving.</div>'+
      '</div></details>';
  function pinFlag(){
    const svg = el.querySelector("svg.axis-svg");
    const pt = el.querySelector("circle.tape-pt.on");
    const flag = document.getElementById("tapeFlagHtml");
    if (svg && pt && flag) placeHtmlFlag(svg, pt, flag.textContent);
  }
  const tape = el.querySelector("details.fin-more");
  if (tape) {
    tape.addEventListener("toggle", function(){
      if (tape.open) requestAnimationFrame(pinFlag);
    });
  }
  if (isOpen) requestAnimationFrame(pinFlag);
}
function tapeFlagGeom(cx, cy, label, w){
  const tw = Math.max(64, 12 + String(label).length * 8.6);
  const th = 24;
  let fx = cx - tw / 2;
  let fy = cy - th - 14;
  if (fy < 4) fy = cy + 16;
  if (fx < 72) fx = 72;
  if (fx + tw > w - 8) fx = w - 8 - tw;
  return { fx: fx, fy: fy, tw: tw, th: th, mx: fx + tw / 2, my: fy + th - 7 };
}
function tapeFlagMarkup(cx, cy, label, stroke, pal, w){
  const g = tapeFlagGeom(cx, cy, label, w);
  return '<g class="tape-flag">'+
    '<rect class="tape-flag-bg" x="'+g.fx.toFixed(1)+'" y="'+g.fy.toFixed(1)+'" width="'+g.tw.toFixed(1)+'" height="'+g.th+'" rx="3" fill="'+pal.paper+'" stroke="'+stroke+'" stroke-width="1.6"/>'+
    '<text class="tape-callout" x="'+g.mx.toFixed(1)+'" y="'+g.my.toFixed(1)+'" text-anchor="middle" font-size="13" font-weight="700" fill="'+stroke+'">'+label+'</text>'+
    '</g>';
}
function placeHtmlFlag(svg, pt, label){
  const wrap = svg && svg.closest && svg.closest(".tape-plot");
  const flag = document.getElementById("tapeFlagHtml");
  if (!wrap || !flag || !pt) return;
  flag.textContent = label;
  const wrapR = wrap.getBoundingClientRect();
  const dot = pt.getBoundingClientRect();
  let x = dot.left + dot.width / 2 - wrapR.left;
  let y = dot.top + dot.height / 2 - wrapR.top;
  const pad = 8;
  flag.classList.remove("below");
  flag.style.left = x + "px";
  flag.style.top = y + "px";
  const fr = flag.getBoundingClientRect();
  if (fr.top < wrapR.top + 2) flag.classList.add("below");
  if (fr.left < wrapR.left + pad) {
    flag.style.left = (x + (wrapR.left + pad - fr.left)) + "px";
  } else if (fr.right > wrapR.right - pad) {
    flag.style.left = (x - (fr.right - (wrapR.right - pad))) + "px";
  }
}
function sparkSvg(vals, cost, opt){
  if (!vals || vals.length < 2) return "<span class='tone-flat'>Need two prints</span>";
  opt = opt || {};
  const fat = !!opt.fat;
  const axis = !!opt.axis;
  const narrow = axis && typeof window !== "undefined" && window.innerWidth < 720;
  const w = opt.w || (axis ? 760 : fat ? 640 : 132);
  const h = opt.h || (axis ? (narrow ? 360 : 320) : fat ? 168 : 40);
  const pL = axis ? (narrow ? 88 : 72) : fat ? 44 : 3;
  const pR = axis ? 18 : fat ? 52 : 3;
  const pT = axis ? 36 : fat ? 12 : 3;
  const pB = axis ? (narrow ? 52 : 58) : fat ? 14 : 3;
  let mn=Math.min.apply(null, vals.concat(cost||vals[0]));
  let mx=Math.max.apply(null, vals.concat(cost||vals[0]));
  let yTicks = null;
  if (axis){
    const padY = Math.max((mx-mn)*0.16, 0.08);
    let lo = mn - padY, hi = mx + padY;
    const rng = hi - lo;
    let step = 0.25;
    if (rng <= 0.4) step = 0.10;
    if (rng > 2) step = 0.50;
    if (rng > 5) step = 1;
    if (rng > 20) step = 5;
    if (rng > 50) step = 10;
    lo = Math.floor(lo/step)*step;
    hi = Math.ceil(hi/step)*step;
    yTicks = [];
    for (let v = lo; v <= hi + step/2; v = Math.round((v+step)*100)/100) yTicks.push(Math.round(v*100)/100);
    while (yTicks.length > (narrow ? 5 : 7)) {
      step = step * 2;
      yTicks = [];
      lo = Math.floor((mn - padY)/step)*step;
      hi = Math.ceil((mx + padY)/step)*step;
      for (let v = lo; v <= hi + step/2; v = Math.round((v+step)*100)/100) yTicks.push(Math.round(v*100)/100);
    }
    mn = yTicks[0]; mx = yTicks[yTicks.length-1];
  }
  const span=mx-mn || 1;
  function xy(v,i){
    const x=pL+i*(w-pL-pR)/Math.max(vals.length-1,1);
    const y=pT+(h-pT-pB)*(1-((v-mn)/span));
    return [x,y];
  }
  const ptsArr = vals.map(xy);
  const pts=ptsArr.map(function(p){ return p[0].toFixed(1)+","+p[1].toFixed(1); }).join(" ");
  const pal = themeColors();
  const last = vals[vals.length-1];
  const up = last >= (cost||vals[0]);
  const stroke = up ? pal.go : pal.stop;
  const fill = stroke;
  const lastPt = ptsArr[ptsArr.length-1];
  const firstPt = ptsArr[0];
  const area = pts+" "+lastPt[0].toFixed(1)+","+(h-pB)+" "+firstPt[0].toFixed(1)+","+(h-pB);
  let extras="";
  if (axis && yTicks){
    extras += '<line x1="'+pL+'" x2="'+pL+'" y1="'+pT+'" y2="'+(h-pB)+'" stroke="'+pal.axis+'" stroke-width="1.4"/>';
    extras += '<line x1="'+pL+'" x2="'+(w-pR)+'" y1="'+(h-pB)+'" y2="'+(h-pB)+'" stroke="'+pal.axis+'" stroke-width="1.4"/>';
    yTicks.forEach(function(v){
      const y=pT+(h-pT-pB)*(1-((v-mn)/span));
      extras += '<line x1="'+pL+'" x2="'+(w-pR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+pal.grid+'"/>';
      extras += '<text x="'+(pL-8)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="'+(narrow?"16":"11")+'" font-variant="tabular-nums" fill="'+pal.axis+'">$'+v.toFixed(2)+'</text>';
    });
    extras += '<text transform="rotate(-90 '+(16)+' '+(pT+(h-pT-pB)/2).toFixed(1)+')" x="16" y="'+(pT+(h-pT-pB)/2).toFixed(1)+'" text-anchor="middle" font-size="'+(narrow?"13":"10")+'" letter-spacing="1.2" fill="'+pal.mute+'">EQUITY $</text>';
    const dtg = opt.dtg || [];
    const lastI = vals.length - 1;
    const picks = lastI < 3 || narrow ? [0, lastI] : [0, Math.round(lastI/2), lastI];
    const seen = {};
    picks.forEach(function(i){
      if (i<0 || i>lastI || seen[i]) return;
      seen[i] = true;
      const x = pL+i*(w-pL-pR)/Math.max(lastI,1);
      const label = dtg[i] || "";
      if (!label) return;
      extras += '<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(h-pB)+'" y2="'+(h-pB+6)+'" stroke="'+pal.axis+'"/>';
      const anchor = i===0 ? "start" : i===lastI ? "end" : "middle";
      extras += '<text x="'+x.toFixed(1)+'" y="'+(h-22)+'" text-anchor="'+anchor+'" font-size="'+(narrow?"14":"10")+'" font-variant="tabular-nums" fill="'+pal.axis+'">'+label+'</text>';
    });
    extras += '<text x="'+(pL+(w-pL-pR)/2).toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle" font-size="'+(narrow?"12":"10")+'" letter-spacing="1.4" fill="'+pal.mute+'">DTG (ET)</text>';
  }
  if (cost){
    const y=pT+(h-pT-pB)*(1-((cost-mn)/span));
    extras+='<line x1="'+pL+'" x2="'+(w-pR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+pal.dash+'" stroke-dasharray="3 3"/>';
