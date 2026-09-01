      verdict = "Hold. Stall in "+leftBd+" bd — need $"+stall.toFixed(2)+".";
    }
    card.innerHTML = "<div class='thr-head'><b>"+n.symbol+"</b></div><p class='thr-verdict "+statusCls+"'>"+verdict+"</p>"+
      "<table class='thr-table'><tr><td>Floor −5%</td><td>$"+stop5.toFixed(2)+"</td></tr>"+
      "<tr><td>Hard cap −6%</td><td>$"+hard6.toFixed(2)+"</td></tr>"+
      "<tr><td>Flatten −10%</td><td>$"+flat.toFixed(2)+"</td></tr>"+
      "<tr><td>Stall +5%</td><td>$"+stall.toFixed(2)+"</td></tr></table>";
    tb.appendChild(card);
  });
  var eq = parseFloat(String(s.equity||s.combined&&s.combined.equity||"").replace(/[^0-9.]/g,""));
  if (!isFinite(eq) && s.equity!=null) eq = Number(s.equity);
  var slots = isFinite(eq) ? Math.floor(eq/75) : null;
  var used = parsed.filter(function(n){ return n.symbol && n.symbol!=="—"; }).length;
  var buyEl = document.getElementById("buyNote");
  if (buyEl) buyEl.innerHTML = "<li>Slots "+used+" / "+(slots!=null?slots:"—")+". 12h lock. Stall 2bd +5% then +4%.</li>";
}
function paintBook(s){
  if (!s) return;
  var parsed = parseNames(s);
  function set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  var eq = s.equity!=null ? Number(s.equity) : parseFloat(String(s.equity||"").replace(/[^0-9.]/g,""));
  set("kEquity", isFinite(eq)?"$"+eq.toFixed(2):"—");
  set("kBp", s.buying_power!=null?"$"+Number(s.buying_power).toFixed(2):(s.bp?"$"+s.bp:"—"));
  set("kInv", s.invested_pct!=null?Number(s.invested_pct).toFixed(1)+"%":(s.inv?s.inv+"%":"—"));
  set("kSlots", s.slots!=null?String(s.slots):(isFinite(eq)?String(Math.floor(eq/75)):"—"));
  set("kCash", s.cash!=null?"$"+Number(s.cash).toFixed(2):(s.cash||"—"));
  set("kPend", s.pending_deposits!=null?"$"+Number(s.pending_deposits).toFixed(2):(s.pending||"—"));
  set("kOrd", s.open_orders!=null?String(s.open_orders):(s.orders||"0"));
  set("bookNote", s.note||s.asof||"");
  var tb=document.getElementById("bookRows");
  if (tb){
    tb.innerHTML="";
    parsed.forEach(function(n){
      var vs = (n.cost && n.last) ? (((n.last/n.cost)-1)*100).toFixed(2)+"%" : "—";
      var tr=document.createElement("tr");
      tr.innerHTML="<td>"+n.symbol+(n.name?" · "+n.name:"")+"</td><td>"+(n.cost!=null?n.cost:"—")+"</td><td>"+(n.fill||"—")+"</td><td>"+(n.stall||"—")+"</td><td>"+vs+"</td>";
      tb.appendChild(tr);
    });
  }
  var mix=document.getElementById("mixCard");
  if (mix){
    mix.innerHTML = parsed.map(function(n){
      var dollars = (n.qty||0)*(n.last||n.cost||0);
      return "<div class='co'><b>"+n.symbol+"</b> $"+dollars.toFixed(2)+(n.qty!=null?" · qty "+n.qty:"")+"</div>";
    }).join("") || "<p class='hint'>No names.</p>";
  }
  var charts=document.getElementById("charts");
  if (charts){
    charts.innerHTML = parsed.map(function(n){
      return "<div class='co'><b>"+n.symbol+"</b> fill "+(n.fill||"—")+" · stall "+(n.stall||"—")+" · last "+(n.last||"—")+"</div>";
    }).join("");
  }
  var cos=document.getElementById("coRows");
  if (cos){
    cos.innerHTML = parsed.map(function(n){
      return "<div class='co'><div class='co-head'><b>"+n.symbol+"</b> "+(n.name||"")+"</div><p class='co-meta'>qty "+(n.qty||"—")+" · avg "+(n.cost||"—")+" · last "+(n.last||"—")+"</p></div>";
    }).join("");
  }
  var track=document.getElementById("tickerTrack");
  if (track){
    var bits=parsed.map(function(n){ return "<span class='ticker-item'><span class='sym'>"+n.symbol+"</span> "+(n.last||n.cost||"")+"</span>"; }).join(" ");
    track.innerHTML=bits+" "+bits;
  }
  paintThresholds(s, parsed);
  var cal=document.getElementById("calCard");
  if (cal && !cal.dataset.done){
    cal.dataset.done="1";
    cal.innerHTML = CAL.map(function(r){ return "<div><b>"+r[0]+"</b> · "+r[1]+"</div>"; }).join("");
  }
  var pack=document.getElementById("packCard");
  if (pack && SEED_PACK){
    pack.innerHTML = "<p class='hint'>"+(SEED_PACK.subject||"Pack")+" · "+(SEED_PACK.asof||"")+"</p>"+
      (SEED_PACK.items||[]).map(function(it){ return "<div class='co'><b>"+it.tag+"</b> <a href='"+(it.url||"#")+"'>"+it.title+"</a><div class='hint'>"+(it.text||"")+"</div></div>"; }).join("");
  }
  try { localStorage.setItem("murphyPilotDesk", JSON.stringify(s)); } catch (e) {}
}
function loadSnapFile(){
  fetch("pilot-snapshot.json",{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error("no file"); return r.json(); })
    .then(function(j){
      var el=document.getElementById("kSnap"); if(el) el.textContent="local file";
      if (j.names && Array.isArray(j.names)) paintBook(j);
      else paintBook(Object.assign({}, SEED, j));
    }).catch(function(){ paintBook(loadState()); });
}
var jsonBtn=document.getElementById("jsonBtn");
if (jsonBtn) jsonBtn.onclick=function(){
  var raw=(document.getElementById("fJson")||{}).value||"";
  raw=raw.replace(/```json|```/g,"").trim();
  if(!raw) return;
  try { paintBook(JSON.parse(raw)); } catch (e) { alert("JSON did not parse"); }
};
function tickJob(){
  var now=nyNow();
  var nxt=nextJob(now);
  if (nxt){
    var nEl=document.getElementById("nextName"); if(nEl) nEl.textContent=nxt.t+"  "+nxt.name;
    var rEl=document.getElementById("nextRole"); if(rEl) rEl.textContent=nxt.role||"";
    var eEl=document.getElementById("nextEta"); if(eEl) eEl.textContent=eta(now, nxt.when);
  }
  renderClockTable(now);
}
tickJob();
setInterval(tickJob, 1000);
loadSnapFile();
setInterval(loadSnapFile, 5*60*1000);
