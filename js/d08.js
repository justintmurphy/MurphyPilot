      if (pctEl && isFinite(pct)) pctEl.textContent = pct.toFixed(0) + "%";
      if (symEl) symEl.textContent = slice.getAttribute("data-sym") || "";
    }
    card.querySelectorAll("button.mix-row.on").forEach(function(r){ r.classList.remove("on"); });
    const match = card.querySelector('button.mix-row[data-i="'+i+'"]');
    if (match) match.classList.add("on");
  }
  function onMixPoint(e){
    const card = document.getElementById("mixCard");
    if (!card) return;
    const row = e.target.closest && e.target.closest("button.mix-row");
    const slice = e.target.closest && e.target.closest("path.mix-slice");
    if (!row && !slice) return;
    if (slice && !slice.closest("svg.mix-svg.fat")) return;
    selectMixSlice(card, (row || slice).getAttribute("data-i"));
  }
  const mixCard = document.getElementById("mixCard");
  if (mixCard) {
    mixCard.addEventListener("click", onMixPoint);
    mixCard.addEventListener("pointerover", function onMixHover(e){
      if (!(e.target.closest && e.target.closest("svg.mix-svg.fat"))) return;
      onMixPoint(e);
    });
  }
  function onTheme(){
    const tapeOpen = document.querySelector("details.fin-more");
    const wasOpen = !!(tapeOpen && tapeOpen.open);
    const mixOpen = document.querySelector("details.mix-more");
    const mixWas = !!(mixOpen && mixOpen.open);
    paintBook(loadState());
    if (wasOpen) {
      const again = document.querySelector("details.fin-more");
      if (again) again.open = true;
    }
    if (mixWas) {
      const againMix = document.querySelector("details.mix-more");
      if (againMix) againMix.open = true;
    }
  }
  window.addEventListener("murphy-theme", onTheme);
  return function cleanup(){
    timers.forEach(clearInterval);
    window.removeEventListener("murphy-theme", onTheme);
    if (finCard) {
      finCard.removeEventListener("click", onTapePoint);
      finCard.removeEventListener("pointerover", onTapeHover);
    }
    if (mixCard) mixCard.removeEventListener("click", onMixPoint);
  };
}
bootDesk();

