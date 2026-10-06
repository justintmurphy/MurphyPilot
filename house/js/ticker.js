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
    var left = deposit
      ? '<button type="button" data-mp-tick="in" title="' + esc(deposit.name || "Deposit") + '">' +
        "<span>Next in</span> <b>" + esc(deposit.kind || deposit.name || "Deposit") + "</b> <b>" +
        esc(shortDate(deposit.date)) + "</b> <b>" + money(deposit.amount) + "</b> <i>" + esc(face(deposit.account)) + "</i></button>"
      : '<span class="mp-tick-empty">Next in \u2014</span>';
    var more = bill && bill.more > 0 ? " +" + bill.more + " more" : "";
    var right = bill
      ? '<button type="button" data-mp-tick="out" title="' + esc(bill.name) + '">' +
        "<span>Next out</span> <b>" + esc(bill.name) + more + "</b> <b>" + esc(shortDate(bill.due)) + "</b> <b>" +
        money(bill.amount) + "</b></button>"
      : '<span class="mp-tick-empty">Next out \u2014</span>';
    var label = "Next deposit " + (deposit ? (deposit.kind || deposit.name || "") + " " + money(deposit.amount) : "none") +
      ". Next bill " + (bill ? bill.name + " " + money(bill.amount) : "none");
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
          var tab = document.querySelector('[data-bank-tab="budget"]');
          if (tab && tab.click) tab.click();
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
    var creds = { credentials: "same-origin" };
    Promise.all([
      fetch("/data/banking.json", creds).then(function (res) { return res && res.ok ? res.json() : null; }),
      fetch("/data/banking/tiers.json", creds).then(function (res) { return res && res.ok ? res.json() : null; })
    ]).then(function (pair) {
      if (mountEl._mpTickerPainted) return;
      if (!pair[0]) {
        mountEl.hidden = true;
        mountEl.innerHTML = "";
        return;
      }
      mountEl._mpTickerPainted = true;
      render(mountEl, pair[0], pair[1], null);
    }).catch(function () {
      if (mountEl._mpTickerPainted) return;
      mountEl.hidden = true;
      mountEl.innerHTML = "";
    });
  }

  root.MPTicker = { render: render, load: load };

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
