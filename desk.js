(function(){
  var CAL = [
    ["2026-09-01","JOLTS; beef TRQ first tranche"],
    ["2026-09-03","UAS import duties start"],
    ["2026-09-04","NFP 08:30 ET"],
    ["2026-09-07","Labor Day — NYSE closed"],
    ["2026-09-10","PPI; EIA weekly delayed"],
    ["2026-09-11","CPI 08:30 ET"],
    ["2026-09-15","FOMC + SEP"],
    ["2026-09-16","FOMC decision ~14:00 ET"],
    ["2026-09-30","PCE + GDP third estimate"]
  ];
  function nyNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"})); }
  function pad(n){ return String(n).padStart(2,"0"); }
  function money(n){ n=Number(n); if(!isFinite(n)) return "—"; return (n<0?"-$":"$")+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function setText(id, v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  function tick(){
    var n=nyNow();
    setText("etClock", pad(n.getHours())+":"+pad(n.getMinutes())+":"+pad(n.getSeconds())+" ET");
    setText("etDate", n.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric",year:"numeric"}));
  }
  function paintCal(){
    var box=document.getElementById("calCard"); if(!box) return;
    box.innerHTML=CAL.map(function(r){ return "<div class='cal-row'><b>"+r[0]+"</b> · "+r[1]+"</div>"; }).join("");
  }
  function paintSnap(j){
    if(!j) return;
    setText("kEquity", money(j.equity));
    setText("kInv", j.invested_pct!=null ? Number(j.invested_pct).toFixed(1)+"%" : "—");
    setText("kCash", money(j.cash));
    setText("kPend", money(j.pending_deposits));
    setText("bookNote", "Snapshot "+(j.asof||"")+" · AI WWIII (Agentic book) · no account numbers");
    var names=j.names||[];
    var tb=document.getElementById("bookRows");
    if(tb){
      tb.innerHTML="";
      names.forEach(function(n){
        var avg=Number(n.avg||n.cost), last=Number(n.last||avg);
        var vs = (avg && last) ? ((last/avg-1)*100).toFixed(2)+"%" : "—";
        var tr=document.createElement("tr");
        var nm=(n.symbol||"")+(n.name?" · "+n.name:"");
        var url="https://duckduckgo.com/?q="+encodeURIComponent("!ducky "+((n.name&&n.symbol&&String(n.name).toUpperCase()!==String(n.symbol).toUpperCase())?(n.name+" "+n.symbol):(n.name||n.symbol||""))+" official website");
        tr.innerHTML="<td><a class='name-link' href='"+url+"' target='_blank' rel='noopener noreferrer'>"+nm+"</a></td><td>"+(n.avg||"—")+"</td><td>"+(n.first_fill||"—")+"</td><td>"+vs+"</td>";
        tb.appendChild(tr);
      });
    }
    var mix=document.getElementById("mixCard");
    if(mix){
      var eq=Number(j.equity)||0, cash=Number(j.cash)||0;
      var rows=names.map(function(n){
        var dollars=(Number(n.qty)||0)*(Number(n.last||n.avg)||0);
        return "<div class='co'><b>"+n.symbol+"</b> "+money(dollars)+" · qty "+(n.qty||"—")+"</div>";
      }).join("");
      mix.innerHTML=rows+"<div class='co'><b>Cash</b> "+money(cash)+"</div><p class='hint'>Equity "+money(eq)+"</p>";
    }
    var charts=document.getElementById("charts");
    if(charts){
      charts.innerHTML=names.map(function(n){
        return "<div class='co'><b>"+n.symbol+"</b> qty "+(n.qty!=null?n.qty:"—")+" · avg "+(n.avg||"—")+" · last "+(n.last||"—")+"</div>";
      }).join("") || "<p class='hint'>No names in the latest snapshot.</p>";
    }
    var cos=document.getElementById("coRows");
    if(cos){
      cos.innerHTML=names.map(function(n){
        return "<div class='co'><div class='co-head'><b>"+n.symbol+"</b> "+(n.name||"")+"</div><p class='co-meta'>qty "+(n.qty||"—")+" · avg "+(n.avg||"—")+" · last "+(n.last||"—")+"</p></div>";
      }).join("");
    }
    var track=document.getElementById("tickerTrack");
    if(track){
      var bits=names.map(function(n){
        var url="https://duckduckgo.com/?q="+encodeURIComponent("!ducky "+((n.name&&n.symbol&&String(n.name).toUpperCase()!==String(n.symbol).toUpperCase())?(n.name+" "+n.symbol):(n.name||n.symbol||""))+" official website");
        var body="<span class='sym'>"+n.symbol+"</span><span class='px'>"+(n.last||n.avg||"")+"</span>";
        return "<a class='ticker-item' href='"+url+"' target='_blank' rel='noopener noreferrer' title='Company website'>"+body+"</a>";
      }).join("");
      track.innerHTML=bits+bits;
    }
    try{ localStorage.setItem("murphyPilotDesk", JSON.stringify(j)); }catch(e){}
  }
  function loadLocal(){
    fetch("pilot-snapshot.json",{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error("no snapshot"); return r.json(); })
      .then(function(j){ setText("kSnap","local file"); paintSnap(j); })
      .catch(function(){
        try{
          var s=JSON.parse(localStorage.getItem("murphyPilotDesk")||"null");
          if(s){ setText("kSnap","browser"); paintSnap(s); }
        }catch(e){}
      });
  }
  function applyPasted(){
    var raw=(document.getElementById("fJson")||{}).value||"";
    raw=raw.replace(/```json|```/g,"").trim();
    if(!raw) return;
    try{ var j=JSON.parse(raw); paintSnap(j); setText("kSnap","paste"); }catch(e){ alert("JSON did not parse"); }
  }
  var KEY="murphyPilotTheme";
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme",t);
    try{ localStorage.setItem(KEY,t); }catch(e){}
    document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
      var on=btn.getAttribute("data-theme-choice")===t;
      btn.classList.toggle("on",on);
      btn.setAttribute("aria-pressed",on?"true":"false");
    });
  }
  var saved=null; try{ saved=localStorage.getItem(KEY); }catch(e){}
  applyTheme(saved==="dark"||saved==="light"?saved:"light");
  document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
    btn.addEventListener("click", function(){ applyTheme(btn.getAttribute("data-theme-choice")); });
  });
  var jsonBtn=document.getElementById("jsonBtn"); if(jsonBtn) jsonBtn.onclick=applyPasted;
  var urlBtn=document.getElementById("urlBtn");
  if(urlBtn) urlBtn.onclick=function(){
    var u=(document.getElementById("fUrl")||{}).value||"";
    u=u.trim();
    if(!u) return;
    try{ localStorage.setItem("murphyPilotDeskUrl", u); }catch(e){}
    fetch(u,{cache:"no-store"}).then(function(r){ return r.json(); }).then(function(j){ setText("kSnap","url"); paintSnap(j); }).catch(function(err){ setText("kSnap","fetch fail"); setText("bookNote","URL fetch failed: "+err); });
  };
  var pack=document.getElementById("packCard");
  if(pack) pack.innerHTML="<p class='hint'>Latest pack is the Gmail subject Agentic policy pack. This local board does not log into Gmail.</p>";
  paintCal();
  loadLocal();
  tick();
  setInterval(tick,1000);
  setInterval(loadLocal, 5*60*1000);
})();
