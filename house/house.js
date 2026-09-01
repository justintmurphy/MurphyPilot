(function(){
  var KEY="murphyHouseTheme";
  var book="combined";
  var snap=null;
  function pad(n){ return String(n).padStart(2,"0"); }
  function money(n){ n=Number(n); return isFinite(n) ? "$"+n.toFixed(2) : "—"; }
  function pct(n){ n=Number(n); return isFinite(n) ? (n>=0?"+":"")+n.toFixed(2)+"%" : "—"; }
  function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  function nyNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"})); }
  function tick(){
    var n=nyNow();
    setText("etClock", pad(n.getHours())+":"+pad(n.getMinutes())+":"+pad(n.getSeconds())+" ET");
    setText("etDate", n.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric",year:"numeric"}));
  }
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme",t);
    try{ localStorage.setItem(KEY,t); }catch(e){}
    document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
      var on=btn.getAttribute("data-theme-choice")===t;
      btn.classList.toggle("on",on);
    });
  }
  function namesFor(j){
    if(book==="combined") return (j.combined && j.combined.names) || [];
    var a=j.accounts && j.accounts[book];
    return (a && a.names) || [];
  }
  function paint(j){
    if(!j) return;
    snap=j;
    var acc=j.accounts||{};
    var c=j.combined||{};
    setText("kHouse", money(c.equity));
    setText("kInd", money(acc.individual && acc.individual.equity));
    setText("kAg", money(acc.auto_grok && acc.auto_grok.equity));
    setText("kJt", money(acc.joint && acc.joint.equity));
    setText("kCash", money(c.cash));
    setText("kPend", money(c.pending_deposits));
    setText("kOrd", c.open_orders!=null ? String(c.open_orders) : "0");
    setText("bookNote", (j.brand||"Murphy House")+" · "+(j.asof||"")+" · "+(j.note||"DATA ONLY"));
    var tb=document.getElementById("nameRows");
    if(tb){
      tb.innerHTML="";
      namesFor(j).forEach(function(n){
        var books=(n.accounts||[]).join(", ") || n.account || book;
        var tr=document.createElement("tr");
        tr.innerHTML="<td>"+(n.symbol||"")+(n.name?" · "+n.name:"")+"</td><td>"+books+"</td><td>"+(n.qty!=null?n.qty:"—")+"</td><td>"+(n.avg!=null?n.avg:"—")+"</td><td>"+(n.last!=null?n.last:"—")+"</td><td>"+money(n.value)+"</td><td>"+money(n.pnl)+" "+pct(n.pnl_pct)+"</td>";
        tb.appendChild(tr);
      });
    }
    var tape=document.getElementById("tapeCard");
    if(tape){
      var key=book==="combined"?"combined":book;
      var rows=((j.tape&&j.tape[key])||[]).slice().reverse();
      tape.innerHTML = rows.length ? rows.map(function(p){
        return "<div>"+(p.dtg||p.t||"")+" · "+money(p.equity)+(p.max!=null?" · max "+money(p.max):"")+"</div>";
      }).join("") : "<p class='hint'>No tape in this snapshot.</p>";
    }
    try{ localStorage.setItem("murphyHouseDesk", JSON.stringify(j)); }catch(e){}
  }
  function load(){
    fetch("house-snapshot.json",{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error("no file"); return r.json(); })
      .then(function(j){ setText("kSnap","local file"); paint(j); })
      .catch(function(){
        try{
          var s=JSON.parse(localStorage.getItem("murphyHouseDesk")||"null");
          if(s){ setText("kSnap","browser"); paint(s); }
        }catch(e){}
      });
  }
  var saved=null; try{ saved=localStorage.getItem(KEY); }catch(e){}
  applyTheme(saved==="dark"||saved==="light"?saved:"light");
  document.querySelectorAll("[data-theme-choice]").forEach(function(btn){
    btn.addEventListener("click", function(){ applyTheme(btn.getAttribute("data-theme-choice")); });
  });
  document.getElementById("bookTabs").addEventListener("click", function(e){
    var b=e.target.getAttribute && e.target.getAttribute("data-book");
    if(!b) return;
    book=b;
    document.querySelectorAll("#bookTabs [data-book]").forEach(function(x){ x.classList.toggle("on", x.getAttribute("data-book")===book); });
    if(snap) paint(snap);
  });
  var jsonBtn=document.getElementById("jsonBtn");
  if(jsonBtn) jsonBtn.onclick=function(){
    var raw=(document.getElementById("fJson")||{}).value||"";
    raw=raw.replace(/```json|```/g,"").trim();
    if(!raw) return;
    try{ var j=JSON.parse(raw); setText("kSnap","paste"); paint(j); }catch(err){ alert("JSON did not parse"); }
  };
  tick();
  setInterval(tick,1000);
  load();
})();
