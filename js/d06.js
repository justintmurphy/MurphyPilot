  const holeSym = fat && pick ? pick.symbol : "Deployed";
  const holePct = fat && pick ? pick.pct : slices.filter(function(x){ return x.kind === "name"; }).reduce(function(a, b){ return a + b.pct; }, 0);
  const fs = fat ? 18 : 13;
  const fs2 = fat ? 11 : 9;
  const hole =
    '<text class="mix-hole-pct" x="'+cx+'" y="'+(cy-1)+'" text-anchor="middle" font-size="'+fs+'" font-weight="700" font-variant="tabular-nums" fill="'+pal.ink+'">'+holePct.toFixed(0)+'%</text>'+
    '<text class="mix-hole-sym" x="'+cx+'" y="'+(cy+fs2+6)+'" text-anchor="middle" font-size="'+fs2+'" fill="'+pal.mute+'">'+escHtml(holeSym)+'</text>';
  return '<svg class="mix-svg'+(fat?" fat":"")+'" viewBox="0 0 '+size+' '+size+'" aria-hidden="true">'+paths+hole+'</svg>';
}
function paintMix(s, parsed){
  const el = document.getElementById("mixCard");
  if (!el) return;
  const mix = mixSlices(s, parsed);
  const slices = mix.slices;
  const isOpen = el.querySelector("details.mix-more") ? el.querySelector("details.mix-more").open : false;
  const pal = themeColors();
  const legend = slices.map(function(sl, i){
    const col = mixColor(sl.kind === "cash" ? 0 : slices.slice(0, i).filter(function(x){ return x.kind === "name"; }).length, sl.kind, pal);
    return '<div class="mix-leg"><i style="background:'+col+'"></i><span>'+escHtml(sl.symbol)+'</span><b>'+sl.pct.toFixed(1)+'%</b></div>';
  }).join("");
  const rows = slices.map(function(sl, i){
    const col = mixColor(sl.kind === "cash" ? 0 : slices.slice(0, i).filter(function(x){ return x.kind === "name"; }).length, sl.kind, pal);
    const sh = sl.kind === "cash" ? "remaining" : (sl.qty == null ? "—" : (sl.qty >= 1 ? sl.qty.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : sl.qty.toLocaleString("en-US",{maximumFractionDigits:4})) + " sh");
    const on = i === 0 ? " on" : "";
    return '<button type="button" class="mix-row'+on+'" data-i="'+i+'"><i style="background:'+col+'"></i><span class="mix-sym">'+escHtml(sl.symbol)+'</span><b>'+usd(sl.dollars)+'</b><span class="mix-pct">'+sl.pct.toFixed(1)+'%</span><span class="mix-sh">'+sh+'</span></button>';
  }).join("");
  const firstName = slices.find(function(x){ return x.kind === "name"; }) || slices[0];
  const sel = firstName ? slices.indexOf(firstName) : 0;
  el.innerHTML =
    '<details class="mix-more"'+(isOpen?" open":"")+'>'+
      '<summary><div class="mix-compact">'+pieSvg(slices, { size: 112, sel: sel })+'<div class="mix-legend">'+legend+'<div class="mix-hint">Click to enlarge</div></div></div></summary>'+
      '<div class="mix-open">'+
        pieSvg(slices, { fat: true, size: 220, sel: sel })+
        '<div class="mix-rows">'+rows+'</div>'+
        '<p class="trail">Each name is market value now. Cash is remaining funds. Slices sum to 100% of '+usd(mix.total)+'. Pending deposits are already inside equity — not an extra slice.</p>'+
      '</div>'+
    '</details>';
}
function paintBook(s){
  document.getElementById("kEquity").textContent = s.equity ? usd(s.equity) : "—";
  document.getElementById("kBp").textContent = s.bp ? usd(s.bp) : "—";
  document.getElementById("kInv").textContent = s.inv ? s.inv + (String(s.inv).includes("%")?"":"%") : "—";
  document.getElementById("kCash").textContent = s.cash ? usd(s.cash) : "—";
  document.getElementById("kPend").textContent = s.pending ? usd(s.pending) : "—";
  document.getElementById("kOrd").textContent = s.orders != null && s.orders !== "" ? s.orders : "—";
  document.getElementById("kSnap").textContent = (s.note && s.note.indexOf("Snapshot")===0) ? "email" : "local";
  const parsed = parseNames(s);
  const tb = document.getElementById("bookRows");
  tb.innerHTML = "";
  parsed.forEach(n => {
    const tr = document.createElement("tr");
    const vsN = (n.last && n.cost) ? ((n.last/n.cost)-1)*100 : null;
    const vs = vsN!=null ? signedSpan(vsN,2,"%") : (n.extra||"—");
    tr.innerHTML = "<td>"+n.symbol+"</td><td>"+(n.cost||"—")+"</td><td>"+(n.fill||"—")+"</td><td>"+(n.stall||"—")+"</td><td>"+vs+"</td>";
    tb.appendChild(tr);
  });
  const eq = parseFloat(String(s.equity).replace(/[^0-9.]/g,""));
  const inv = parseFloat(String(s.inv).replace(/[^0-9.]/g,""));
  const bp = parseFloat(String(s.bp).replace(/[^0-9.]/g,""));
  const ord = parseFloat(String(s.orders).replace(/[^0-9.]/g,""));
  const slots = isFinite(eq) ? Math.floor(eq/75) : null;
  const used = parsed.filter(n=>n.symbol && n.symbol!=="—").length;
  document.getElementById("kSlots").textContent = slots!=null ? String(slots) : "—";
  document.getElementById("kSlots").className = (slots!=null && used>slots) ? "tone-stop" : (slots!=null && used<slots && isFinite(bp) && bp>=5 ? "tone-warn" : "");
  document.getElementById("kInv").className = (isFinite(inv) && inv>=90) ? "tone-go" : (isFinite(inv) && inv<80 ? "tone-warn" : "");
  document.getElementById("kOrd").className = (isFinite(ord) && ord>0) ? "tone-warn" : "";
  document.getElementById("kPend").className = "";
  document.getElementById("kBp").className = (used===0 && isFinite(bp) && bp>=40) ? "tone-warn" : "";
  paintThresholds(s, parsed);
  rememberPoints(parsed);
  backfillMoney(s, parsed);
  rememberMoney(s);
  paintMoney();
  paintCharts(parsed);
  paintTicker(parsed);
  paintIssuers(parsed);
  paintMix(s, parsed);
  document.getElementById("bookNote").textContent = s.note || "";
  document.getElementById("fEquity").value = s.equity||"";
  document.getElementById("fBp").value = s.bp||"";
  document.getElementById("fInv").value = s.inv||"";
  document.getElementById("fHwm").value = s.hwm||"";
  document.getElementById("fCash").value = s.cash||"";
  document.getElementById("fPend").value = s.pending||"";
  document.getElementById("fNames").value = s.names||"";
}
function escHtml(s){
  return String(s||"").replace(/[&<>"]/g, function(c){
    if (c === "&") return "&" + "amp;";
    if (c === "<") return "&" + "lt;";
    if (c === ">") return "&" + "gt;";
    return "&" + "quot;";
  });
}
function safeHttp(u){
  if (!u) return "";
  try {
    const x = new URL(String(u).trim());
    if (x.protocol !== "http:" && x.protocol !== "https:") return "";
    return x.href;
  } catch (e) { return ""; }
}
function paintIssuers(parsed, extra){
  const el = document.getElementById("coRows");
  if (!el) return;
  const map = extra || {};
  const names = (parsed && parsed.length) ? parsed : Object.keys(SEED_CO).map(function(s){ return { symbol: s }; });
  const html = names.filter(function(n){ return n.symbol && n.symbol !== "—"; }).map(function(n){
    const seed = SEED_CO[n.symbol] || {};
    const live = map[n.symbol] || {};
    const name = live.name || seed.name || n.symbol;
    const type = live.type || seed.type || "";
    const issuer = live.issuer || seed.issuer || "";
    const loc = live.location || seed.location || "";
    const exch = live.exchange || seed.exchange || "";
    const url = safeHttp(live.url || seed.url || "");
    const note = live.note || seed.note || "";
    const bits = [type, exch, loc, issuer].filter(Boolean);
    const title = url
      ? "<a href='"+escHtml(url)+"' target='_blank' rel='noopener noreferrer'>"+escHtml(name)+"</a>"
      : "<b>"+escHtml(name)+"</b>";
    return "<div class='co'><div class='co-head'><b>"+escHtml(n.symbol)+"</b>"+title+"</div>"+
      (bits.length ? "<div class='co-meta'>"+escHtml(bits.join(" · "))+(note?" · "+escHtml(note):"")+"</div>" : (note?"<div class='co-meta'>"+escHtml(note)+"</div>":""))+
      "</div>";
  }).join("");
  el.innerHTML = html || "<p class='hint'>No names on the book.</p>";
}
function fallbackPackUrl(s){
  const t = String(s||"").toLowerCase();
  const rows = [
    [/bulk-power|eo 14420/, "https://www.whitehouse.gov/presidential-actions/2026/08/declaring-a-national-emergency-to-secure-the-united-states-bulk-power-system/"],
    [/canadian discrimination|alcoholic beverages/, "https://www.whitehouse.gov/presidential-actions/2026/08/temporary-suspension-of-additional-duties-to-offset-canadian-discrimination-against-the-commerce-of-the-united-states-with-respect-to-alcoholic-beverages-dairy-and-motor-vehicles/"],
    [/unmanned aircraft|uas component/, "https://www.whitehouse.gov/presidential-actions/2026/08/adjusting-imports-of-unmanned-aircraft-systems-and-unmanned-aircraft-systems-components-into-the-united-states/"],
    [/affordable beef/, "https://www.whitehouse.gov/presidential-actions/2026/08/further-ensuring-affordable-beef-for-the-american-consumer/"],
    [/presidential actions/, "https://www.whitehouse.gov/presidential-actions/"],
    [/fomc|federalreserve|sep 15/, "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"],
    [/employment situation|nfp|empsit/, "https://www.bls.gov/schedule/news_release/empsit.htm"],
    [/\bcpi\b/, "https://www.bls.gov/schedule/news_release/cpi.htm"],
    [/\bpce\b|bea.gov/, "https://www.bea.gov/news/schedule"],
