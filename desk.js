(function(){
  var JOBS = [
    {t:"21:00", days:[0,1,2,3,4], name:"Policy Pack Evening", role:"No trading. White House, states, 21-day calendar."},
    {t:"06:30", days:[1,2,3,4,5], name:"Policy Pack AM Refresh", role:"No trading. Overnight delta only."},
    {t:"09:45", days:[1,2,3,4,5], name:"Autopilot AM", role:"Deploy + write book-state card."},
    {t:"10:15", days:[1,2,3,4,5], name:"Watch AM", role:"Health only."},
    {t:"11:45", days:[1,2,3,4,5], name:"Eyes", role:"Risk-first. Quiet if ≥80% invested."},
    {t:"13:45", days:[1,2,3,4,5], name:"Eyes", role:"Risk-first. Quiet if ≥80% invested."},
    {t:"15:05", days:[1,2,3,4,5], name:"Autopilot PM", role:"Last redeploy."},
    {t:"15:20", days:[1,2,3,4,5], name:"Watch PM", role:"Health only."}
  ];
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
    nextJob(n);
  }
  function nextJob(now){
    var day=now.getDay(), cur=now.getHours()*60+now.getMinutes();
    var pick=null, when=null;
    function consider(off){
      JOBS.forEach(function(j){
        var d=(day+off)%7;
        if(j.days.indexOf(d)<0) return;
        var p=j.t.split(":"), mins=+p[0]*60+(+p[1]);
        if(off===0 && mins<=cur) return;
        if(!pick){ pick=j; when=mins+(off*24*60)-cur; }
      });
    }
    consider(0); if(!pick) consider(1); if(!pick) consider(2);
    if(!pick) return;
    setText("nextName", pick.t+"  "+pick.name);
    setText("nextRole", pick.role);
    var h=Math.floor(when/60), m=when%60;
    var eta=document.getElementById("nextEta");
    if(eta){ eta.textContent = h+"h "+pad(m)+"m"; eta.className="eta "+(when<=15?"heat-hot":when<=60?"heat-soon":when<=180?"heat-hour":"heat-ok"); }
    var card=document.getElementById("nextCard");
    if(card) card.className="card span "+(when<=15?"heat-hot":when<=60?"heat-soon":when<=180?"heat-hour":"");
    var tb=document.getElementById("clockRows");
    if(tb && !tb.dataset.done){
      tb.dataset.done="1";
      JOBS.forEach(function(j){
        var tr=document.createElement("tr");
        tr.innerHTML="<td>"+j.t+"</td><td>"+j.name+"</td><td>"+j.role+"</td>";
        tb.appendChild(tr);
      });
    }
  }
  function paintCal(){
    var box=document.getElementById("calCard"); if(!box) return;
    box.innerHTML=CAL.map(function(r){ return "<div class='cal-row'><b>"+r[0]+"</b> · "+r[1]+"</div>"; }).join("");
  }
  function paintSnap(j){
    if(!j) return;
    setText("kEquity", money(j.equity));
    setText("kBp", money(j.buying_power));
    setText("kInv", j.invested_pct!=null ? Number(j.invested_pct).toFixed(1)+"%" : "—");
    setText("kSlots", j.slots!=null ? String(j.slots) : String(Math.floor((j.equity||0)/75)));
    setText("kCash", money(j.cash));
    setText("kPend", money(j.pending_deposits));
    setText("kOrd", j.open_orders!=null ? String(j.open_orders) : "0");
    setText("bookNote", "Snapshot "+(j.asof||"")+" · Agentic only · no account numbers");
    var names=j.names||[];
    var tb=document.getElementById("bookRows");
    if(tb){
      tb.innerHTML="";
      names.forEach(function(n){
        var avg=Number(n.avg||n.cost), last=Number(n.last||avg);
        var vs = (avg && last) ? ((last/avg-1)*100).toFixed(2)+"%" : "—";
        var tr=document.createElement("tr");
        tr.innerHTML="<td>"+(n.symbol||"")+(n.name?" · "+n.name:"")+"</td><td>"+(n.avg||"—")+"</td><td>"+(n.first_fill||"—")+"</td><td>"+(n.next_stall||"—")+"</td><td>"+vs+"</td>";
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
        return "<div class='co'><b>"+n.symbol+"</b> first fill "+(n.first_fill||"—")+" · next stall "+(n.next_stall||"—")+" · avg "+(n.avg||"—")+" · last "+(n.last||"—")+"</div>";
      }).join("") || "<p class='hint'>No names in the latest snapshot.</p>";
    }
    var cos=document.getElementById("coRows");
    if(cos){
      cos.innerHTML=names.map(function(n){
        return "<div class='co'><div class='co-head'><b>"+n.symbol+"</b> "+(n.name||"")+"</div><p class='co-meta'>qty "+(n.qty||"—")+" · avg "+(n.avg||"—")+" · last "+(n.last||"—")+"</p></div>";
      }).join("");
    }
    var thr=document.getElementById("thrRows");
    if(thr){
      thr.innerHTML=names.map(function(n){
        var c=Number(n.avg||n.cost)||0;
        function px(m){ return c ? money(c*m) : "—"; }
        return "<div class='thr'><div class='thr-head'><b>"+n.symbol+"</b></div>"+
          "<table class='thr-table'><tr><td>Floor −5%</td><td>"+px(0.95)+"</td></tr>"+
          "<tr><td>Hard cap −6%</td><td>"+px(0.94)+"</td></tr>"+
          "<tr><td>Flatten −10%</td><td>"+px(0.90)+"</td></tr>"+
          "<tr><td>Stall day 2 +5%</td><td>"+px(1.05)+"</td></tr></table></div>";
      }).join("");
    }
    var buy=document.getElementById("buyNote");
    if(buy) buy.innerHTML="<li>Slots = floor(equity / $75). 12h green lock. Same-symbol rebuy 24h. Stall 2bd +5% then +4%.</li>";
    var track=document.getElementById("tickerTrack");
    if(track){
      var bits=names.map(function(n){ return "<span class='ticker-item'><span class='sym'>"+n.symbol+"</span><span class='px'>"+(n.last||n.avg||"")+"</span></span>"; }).join("");
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
