/* Slim next-in / next-out strip under the Banking nav. */
(function (root) {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function money(n) {
    if (typeof root.bankMoney === "function") return root.bankMoney(n);
    if (n == null || n === "" || !isFinite(Number(n))) return "\u2014";
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function mask(last4) {
    if (typeof root.bankAccountMask === "function") return root.bankAccountMask(last4);
    var digits = String(last4 || "").replace(/\D/g, "");
    if (digits.length > 4) digits = digits.slice(-4);
    return digits ? "\u00b7\u00b7" + digits : "";
  }

  function face(account) {
    if (typeof root.bankAccountFace === "function") return root.bankAccountFace(account);
    if (!account) return "";
    if (typeof account === "string") return account;
    var nick = account.nickname || account.name || "";
    var last = mask(account.last4 || account.last_4);
    return nick && last ? nick + " " + last : (nick || last);
  }

  function shortDate(iso) {
    if (typeof root.bankShortDate === "function") return root.bankShortDate(iso) || iso;
    return iso || "";
  }

  /* Section, not seat. Investments never reads the Banking print. */
  function pageSection() {
    var nav = null;
    try { nav = document.getElementById("mpNav"); } catch (e) {}
    if (nav && nav.getAttribute) {
      var attr = nav.getAttribute("data-section");
      if (attr) return String(attr);
    }
    if (root.MPNav && root.MPNav.section) return String(root.MPNav.section);
    var path = "";
    try { path = (root.location && root.location.pathname) || ""; } catch (e2) {}
    if (/^\/investments(\/|$)/.test(path)) return "investments";
    return "banking";
  }

  function deskNow() {
    if (typeof root.FAKE_NOW !== "undefined" && root.FAKE_NOW != null && root.FAKE_NOW !== "") return root.FAKE_NOW;
    return null;
  }

  function deskAbs(n) {
    return Math.abs(Number(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function deskMoney(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    return (v < 0 ? "\u2212$" : "$") + deskAbs(v);
  }

  function deskSigned(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    if (v < 0) return "\u2212$" + deskAbs(v);
    if (v > 0) return "+$" + deskAbs(v);
    return "$" + deskAbs(v);
  }

  function deskPct(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    var body = Math.abs(v).toFixed(2) + "%";
    if (v < 0) return "\u2212" + body;
    if (v > 0) return "+" + body;
    return body;
  }

  function deskTone(n) {
    if (typeof root.tone === "function") {
      var t = root.tone(n);
      if (t === "go" || t === "stop" || t === "flat") return "tone-" + t;
    }
    var v = Number(n);
    if (!isFinite(v) || Math.abs(v) < 0.0005) return "tone-flat";
    return v > 0 ? "tone-go" : "tone-stop";
  }

  function tickButton(kind, title, aria, inner) {
    return '<button type="button" data-mp-tick="' + kind + '" title="' + esc(title) + '" aria-label="' + esc(aria) + '">' + inner + "</button>";
  }

  function portfolioItem(snap) {
    var c = (snap && snap.combined) || snap || {};
    var eq = Number(c.equity);
    if (!isFinite(eq) && snap && isFinite(Number(snap.equity))) eq = Number(snap.equity);
    if (!isFinite(eq)) return null;
    var bits = ["<span>Portfolio</span> <b>" + deskMoney(eq) + "</b>"];
    var aria = "Portfolio " + deskMoney(eq);
    var tape = (snap && snap.tape) || {};
    var prints = (tape.overall && tape.overall.length >= 2) ? tape.overall : (tape.combined || tape.overall || []);
    var day = (typeof root.vsLookback === "function") ? root.vsLookback(prints, eq, 1, deskNow()) : null;
    if (day && isFinite(Number(day.delta))) {
      var signed = deskSigned(day.delta);
      bits.push('<b class="' + deskTone(day.delta) + '">' + signed + "</b>");
      aria += " " + signed;
    }
    return tickButton("value", "Portfolio", aria, bits.join(" "));
  }

  function indexItem(key, label) {
    var book = root.INDEXES && root.INDEXES[key];
    if (!book || book.last == null || !isFinite(Number(book.last))) return null;
    var last = Number(book.last);
    var pct = book.pct != null && isFinite(Number(book.pct)) ? Number(book.pct) : null;
    if (pct == null && book.prev != null && isFinite(Number(book.prev)) && Number(book.prev)) {
      pct = ((last - Number(book.prev)) / Number(book.prev)) * 100;
    }
    var level = last.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var inner = "<span>" + esc(label) + "</span> <b>" + level + "</b>";
    var aria = label + " " + level;
    if (pct != null) {
      var chg = deskPct(pct);
      inner += ' <b class="' + deskTone(pct) + '">' + chg + "</b>";
      aria += " " + chg;
    }
    return tickButton(key, label, aria, inner);
  }

  function latestFill(snap) {
    var best = null;
    function take(list) {
      (list || []).forEach(function (f) {
        if (!f || !f.symbol || !f.side || !f.ts) return;
        if (!best || String(f.ts) > String(best.ts)) best = f;
      });
    }
    if (!snap) return null;
    take(snap.fills);
    if (snap.combined) take(snap.combined.fills);
    if (snap.robinhood) take(snap.robinhood.fills);
    var accounts = snap.accounts || {};
    Object.keys(accounts).forEach(function (id) {
      var book = accounts[id];
      if (!book) return;
      take(book.fills);
      (book.sleeves || []).forEach(function (s) { if (s) take(s.fills); });
    });
    return best;
  }

  function fillItem(snap) {
    var f = latestFill(snap);
    if (!f) return null;
    var clock = (/T(\d{2}:\d{2})/.exec(String(f.ts)) || [])[1] || "";
    if (!clock) return null;
    var side = String(f.side || "").toLowerCase();
    var sideLabel = side === "buy" ? "Buy" : (side === "sell" ? "Sell" : "");
    if (!sideLabel) return null;
    var sym = String(f.symbol).trim();
    if (!sym) return null;
    var aria = "Fill " + sym + " " + sideLabel + " " + clock;
    var inner = "<span>Fill</span> <b>" + esc(sym) + "</b> <b>" + sideLabel + "</b> <b>" + clock + "</b>";
    return tickButton("fill", sym, aria, inner);
  }

  function renderDesk(mountEl, snap) {
    if (!mountEl) return;
    mountEl._mpTickerPainted = true;
    var parts = [];
    var portfolio = portfolioItem(snap);
    if (portfolio) parts.push(portfolio);
    var spx = indexItem("spx", "S&P 500");
    var ndx = indexItem("ndx", "Nasdaq");
    if (spx) parts.push(spx);
    if (ndx) parts.push(ndx);
    var fill = fillItem(snap);
    if (fill) parts.push(fill);
    if (!parts.length) {
      mountEl.hidden = true;
      mountEl.innerHTML = "";
      return;
    }
    mountEl.hidden = false;
    var aria = parts.map(function (html) {
      var m = /aria-label="([^"]*)"/.exec(html);
      return m ? m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : "";
    }).filter(Boolean).join(". ");
    mountEl.innerHTML = '<div class="mp-ticker mp-ticker-desk" role="region" aria-label="' + esc(aria) + '">' + parts.join(" ") + "</div>";
  }

  function render(mountEl, print, tiersDoc, today) {
    if (!mountEl) return;
    mountEl._mpTickerPainted = true;
    if (!print || typeof root.bankNextDeposit !== "function" || typeof root.bankNextBillOut !== "function") {
      mountEl.hidden = true;
      mountEl.innerHTML = "";
      return;
    }
    var snap = print;
    if (tiersDoc && typeof tiersDoc === "object") {
      snap = {};
      Object.keys(print).forEach(function (k) { snap[k] = print[k]; });
      if (!snap.tier_doc) snap.tier_doc = tiersDoc;
    }
    var opts = {};
    if (today && today.year) opts.now = today.year + "-" + String(today.month).padStart(2, "0") + "-" + String(today.day).padStart(2, "0") + "T12:00:00";
    var deposit = root.bankNextDeposit(snap, opts);
    var bill = root.bankNextBillOut(snap, opts);
    if (!deposit && !bill) {
      mountEl.hidden = true;
      mountEl.innerHTML = "";
      return;
    }
    mountEl.hidden = false;
    var depWhen = deposit ? shortDate(deposit.date) : "";
    var billWhen = bill ? shortDate(bill.due) : "";
    var depName = deposit ? (deposit.kind || deposit.name || "Deposit") : "";
    var depAria = deposit ? ("Next deposit " + depName + (depWhen ? " " + depWhen : "") + " " + money(deposit.amount)) : "";
    var billAria = bill ? ("Next bill " + (bill.name || "") + (billWhen ? " " + billWhen : "") + " " + money(bill.amount)) : "";
    var acct = deposit ? face(deposit.account) : "";
    var acctBit = acct && !/\bTBD\b/.test(acct) ? " <i>" + esc(acct) + "</i>" : "";
    var left = deposit
      ? '<button type="button" data-mp-tick="in" title="' + esc(deposit.name || "Deposit") + '" aria-label="' + esc(depAria) + '">' +
        "<span>Next in</span> <b>" + esc(depName) + "</b> <b>" +
        esc(depWhen) + "</b> <b>" + money(deposit.amount) + "</b>" + acctBit + "</button>"
      : '<span class="mp-tick-empty">Next in \u2014</span>';
    var more = bill && bill.more > 0 ? " +" + bill.more + " more" : "";
    var right = bill
      ? '<button type="button" data-mp-tick="out" title="' + esc(bill.name) + '" aria-label="' + esc(billAria) + '">' +
        "<span>Next out</span> <b>" + esc(bill.name) + more + "</b> <b>" + esc(billWhen) + "</b> <b>" +
        money(bill.amount) + "</b></button>"
      : '<span class="mp-tick-empty">Next out \u2014</span>';
    var label = "Next deposit " + (deposit ? (depName + (depWhen ? " " + depWhen : "") + " " + money(deposit.amount)) : "none") +
      ". Next bill " + (bill ? ((bill.name || "") + (billWhen ? " " + billWhen : "") + " " + money(bill.amount)) : "none");
    mountEl.innerHTML = '<div class="mp-ticker" role="region" aria-label="' + esc(label) + '">' + left + " " + right + "</div>";
    if (!mountEl._mpTickBound) {
      mountEl._mpTickBound = true;
      mountEl.addEventListener("click", function (e) {
        var t = e.target && e.target.closest ? e.target.closest("[data-mp-tick]") : null;
        if (!t) return;
        var which = t.getAttribute("data-mp-tick");
        if (which === "in") {
          var next = document.getElementById("bank-next-title");
          if (next && next.focus) next.focus();
          if (next && next.scrollIntoView) next.scrollIntoView({ block: "nearest" });
          return;
        }
        if (which === "out") {
          if (typeof root.bankActivate === "function" && root.bankNavRoot && root.bankNavRoot._bank) {
            root.bankActivate(root.bankNavRoot, "budget");
          }
          var due = document.querySelector(".bank-due-month");
          if (due && due.focus) due.setAttribute("tabindex", "-1");
          if (due && due.focus) due.focus();
          if (due && due.scrollIntoView) due.scrollIntoView({ block: "nearest" });
        }
      });
    }
  }

  function load(mountEl) {
    if (!mountEl || mountEl._mpTickerPainted) return;
    if (pageSection() !== "banking") return;
    var creds = { credentials: "same-origin" };
    fetch("/data/banking.json", creds).then(function (res) {
      return res && res.ok ? res.json() : null;
    }).then(function (print) {
      if (mountEl._mpTickerPainted) return null;
      if (!print) {
        mountEl.hidden = true;
        mountEl.innerHTML = "";
        return null;
      }
      return fetch("/data/banking/tiers.json", creds).then(function (res) {
        return res && res.ok ? res.json() : null;
      }).catch(function () { return null; }).then(function (tiers) {
        if (mountEl._mpTickerPainted) return;
        render(mountEl, print, tiers, null);
      });
    }).catch(function () {
      if (mountEl._mpTickerPainted) return;
      mountEl.hidden = true;
      mountEl.innerHTML = "";
    });
  }

  root.MPTicker = { render: render, renderDesk: renderDesk, load: load };

  function boot() {
    var el = document.getElementById("mp-ticker");
    if (!el || el._mpTickerPainted) return;
    load(el);
  }
  if (typeof document !== "undefined" && document.getElementById) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})(typeof window !== "undefined" ? window : this);
