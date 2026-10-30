/* Member portal. All data is scoped to the signed-in member by the server session. */
(function () {
  "use strict";
  const O = window.OCDA;
  const $ = (id) => document.getElementById(id);
  const esc = O.escapeHtml;

  const state = {
    me: null,
    receipts: [],
    filtered: [],
    wards: [],
    lookups: { titles: [], hontitles: [], qualifications: [], states: [] },
    amountsHidden: (() => { try { return localStorage.getItem("ocdaHideAmounts") === "1"; } catch (_) { return false; } })(),
    notices: [],
  };

  // ------------------------------------------------------------------ shell
  const views = ["overview", "profile", "receipts", "community", "notices"];

  function show(view) {
    if (!views.includes(view)) view = "overview";
    views.forEach((v) => ($(`view-${v}`).hidden = v !== view));
    document.querySelectorAll(".portal-nav [data-view]").forEach((b) => {
      if (b.dataset.view === view) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
    closeMenu();
    window.scrollTo(0, 0);
  }

  function openMenu() {
    $("sidebar").classList.add("is-open");
    $("scrim").hidden = false;
    $("menuToggle").setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    $("sidebar").classList.remove("is-open");
    $("scrim").hidden = true;
    $("menuToggle").setAttribute("aria-expanded", "false");
  }

  async function signOut() {
    try { await O.api("/logout", { method: "POST" }); } catch (_) { /* ignore */ }
    try { ["loggedInPhone", "loggedInUserId", "phoneno"].forEach((k) => localStorage.removeItem(k)); } catch (_) {}
    location.href = "/member.html";
  }

  function handleAuthError(err) {
    if (err && err.status === 401) {
      location.href = "/member.html?expired=1";
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ helpers
  const money = (n) => (state.amountsHidden ? "₦ •••••" : O.naira(n));
  // Large figure: smaller currency sign and decimals so the number reads first
  function moneyHtml(n) {
    if (state.amountsHidden) {
      return '<span class="cur">₦</span><span class="masked" aria-label="Amount hidden">•••••</span>';
    }
    const [whole, dec] = Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(".");
    return `<span class="cur">₦</span>${esc(whole)}<span class="dec">.${esc(dec)}</span>`;
  }
  const count = (n) => (n ? `${n} payment${n === 1 ? "" : "s"}` : "No payments yet");
  const sum = (rows) => rows.reduce((t, r) => t + Number(r.amount || 0), 0);
  const fullName = (me) => [me.title, me.othernames, me.surname].filter(Boolean).join(" ");

  function lookupLabel(list, key, labelKey, value) {
    const hit = list.find((x) => String(x[key]) === String(value));
    return hit ? hit[labelKey] : value;
  }

  function fillSelect(select, items, placeholder) {
    const current = select.value;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>` +
      items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
    if (current) select.value = current;
  }

  // ------------------------------------------------------------------ profile
  async function loadProfile() {
    const me = await O.api("/api/me");
    state.me = me;
    const first = (me.othernames || "").split(/\s+/)[0];
    $("username").textContent = first ? `, ${first}` : "";
    $("sideName").textContent = fullName(me) || "Member";
    $("sidePhone").textContent = `Member ID ${me.id} · ${me.phoneNumber}`;
    renderProfile();
  }

  function renderProfile() {
    const me = state.me;
    const sexLabel = { M: "Male", F: "Female" }[me.sex] || me.sex;
    const rows = [
      ["Full name", [me.othernames, me.surname].filter(Boolean).join(" ")],
      ["Member ID", me.id],
      ["Phone number", me.phoneNumber],
      ["Second phone", me.phoneNo2],
      ["Email", me.email],
      ["Sex", sexLabel],
      ["Age", me.age != null ? `${me.age}` : ""],
      ["Title", me.title],
      ["Honorary title", me.honTitle],
      ["Quarter", me.quarters],
      ["Ward", me.ward],
      ["Town", me.town],
      ["State", me.stateName],
      ["Qualification", me.qualifications],
      ["Profession", me.profession],
      ["Member since", O.formatDate(me.memberSince)],
      ["Exit date", O.formatDate(me.exitDate)],
    ];
    $("profileList").innerHTML = rows
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v ? esc(v) : '<span class="muted">Not provided</span>'}</dd></div>`)
      .join("");
  }

  async function loadLookups() {
    const get = (t) => O.api(`/admin/static/${t}`).catch(() => []);
    const [titles, hontitles, qualifications, states, wards] = await Promise.all([
      get("titles"), get("hontitles"), get("qualifications"), get("states"), get("wards"),
    ]);
    Object.assign(state.lookups, { titles, hontitles, qualifications, states });
    state.wards = Array.isArray(wards) ? wards : [];

    fillSelect($("pf-title"), titles.map((x) => [x.title, x.title]), "None");
    fillSelect($("pf-honTitle"), hontitles.map((x) => [x.Htitle, x.Htitle]), "None");
    fillSelect($("pf-qualifications"), qualifications.map((x) => [x.qualification, x.qualification]), "None");
    fillSelect($("pf-state"), states.map((x) => [x.statecode, x.statename]), "Select state");

    const quarters = [...new Set(state.wards.map((w) => w.Quarter).filter(Boolean))].sort();
    const wardsAll = [...new Set(state.wards.map((w) => w.ward).filter(Boolean))].sort();
    fillSelect($("pf-quarters"), quarters.map((q) => [q, q]), "Select quarter");
    fillSelect($("quartersSelect"), quarters.map((q) => [q, q]), "Select quarter");
    fillSelect($("wardSelect"), wardsAll.map((w) => [w, w]), "Select ward");
  }

  function wardsForQuarter(quarter, keep) {
    const list = state.wards.filter((w) => w.Quarter === quarter).map((w) => [w.ward, w.ward]);
    // Keep the member's existing ward visible even if the lookup table has changed
    if (keep && !list.some(([w]) => w === keep)) list.unshift([keep, keep]);
    fillSelect($("pf-ward"), list, "Select ward");
  }

  function openEdit() {
    const me = state.me;
    const set = (id, v) => { const el = $(id); if (el) el.value = v ?? ""; };
    const ensureOption = (id, v) => {
      const sel = $(id);
      if (v && ![...sel.options].some((o) => o.value === String(v))) {
        sel.insertAdjacentHTML("beforeend", `<option value="${esc(v)}">${esc(v)}</option>`);
      }
      sel.value = v ?? "";
    };
    set("pf-surname", me.surname);
    set("pf-othernames", me.othernames);
    set("pf-phone", me.phoneNumber);
    set("pf-phoneNo2", me.phoneNo2);
    set("pf-email", me.email);
    set("pf-sex", me.sex);
    ensureOption("pf-title", me.title);
    ensureOption("pf-honTitle", me.honTitle);
    ensureOption("pf-qualifications", me.qualifications);
    ensureOption("pf-state", me.state);
    ensureOption("pf-quarters", me.quarters);
    wardsForQuarter(me.quarters, me.ward);
    $("pf-ward").value = me.ward ?? "";
    set("pf-town", me.town);
    set("pf-profession", me.profession);
    set("pf-exitDate", O.isoDate(me.exitDate));

    O.clearFieldErrors($("profileEditForm"));
    O.hideAlert("profileAlert");
    $("profileDisplay").hidden = true;
    $("profileEditForm").hidden = false;
    $("editProfileBtn").hidden = true;
    $("pf-surname").focus();
  }

  function closeEdit() {
    $("profileEditForm").hidden = true;
    $("profileDisplay").hidden = false;
    $("editProfileBtn").hidden = false;
  }

  async function saveProfile(e) {
    e.preventDefault();
    const form = $("profileEditForm");
    O.clearFieldErrors(form);
    O.hideAlert("profileAlert");

    const data = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]));
    const required = { surname: "Enter your surname.", othernames: "Enter your other names.", sex: "Select your sex.", quarters: "Select your quarter.", ward: "Select your ward.", state: "Select your state.", town: "Enter your town." };
    let bad = null;
    for (const [k, msg] of Object.entries(required)) {
      if (!data[k]) { O.setFieldError(`pf-${k}`, msg); bad = bad || `pf-${k}`; }
    }
    if (data.phoneNo2 && !O.validPhone(data.phoneNo2)) { O.setFieldError("pf-phoneNo2", "Enter a Nigerian mobile number, or leave this blank."); bad = bad || "pf-phoneNo2"; }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { O.setFieldError("pf-email", "Enter a valid email address, or leave this blank."); bad = bad || "pf-email"; }
    if (bad) { $(bad).focus(); return; }

    // Only send what changed
    const me = state.me;
    const current = {
      surname: me.surname, othernames: me.othernames, phoneNo2: me.phoneNo2, email: me.email, sex: me.sex,
      title: me.title, honTitle: me.honTitle, quarters: me.quarters, ward: me.ward, state: me.state, town: me.town,
      qualifications: me.qualifications, profession: me.profession, exitDate: O.isoDate(me.exitDate),
    };
    const changes = {};
    Object.keys(current).forEach((k) => {
      if ((data[k] ?? "") !== String(current[k] ?? "")) changes[k] = data[k] ?? "";
    });
    if (Object.keys(changes).length === 0) {
      O.showAlert("profileAlert", "Nothing has changed yet.", "info");
      return;
    }

    const btn = $("saveProfileBtn");
    O.setBusy(btn, true, "Saving…");
    try {
      await O.api("/api/me", { method: "PUT", body: changes });
      await loadProfile();
      closeEdit();
      O.showAlert("pageAlert", "Profile saved.", "success");
      setTimeout(() => O.hideAlert("pageAlert"), 4000);
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err.field && $(`pf-${err.field}`)) O.setFieldError(`pf-${err.field}`, err.message);
      else O.showAlert("profileAlert", err.message, "error");
    } finally {
      O.setBusy(btn, false);
    }
  }

  // ------------------------------------------------------------------ receipts
  async function loadReceipts() {
    const rows = await O.api("/api/me/receipts");
    state.receipts = Array.isArray(rows) ? rows : [];
    state.filtered = state.receipts.slice();
    renderTotals();
    renderRecent();
    renderReceipts();
  }

  function renderTotals() {
    const now = new Date();
    const y = String(now.getFullYear());
    const ym = `${y}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const all = state.receipts;
    const inYear = all.filter((r) => (r.transdate || "").startsWith(y));
    const inMonth = all.filter((r) => (r.transdate || "").startsWith(ym));
    $("totalAll").innerHTML = moneyHtml(sum(all));
    $("totalYear").innerHTML = moneyHtml(sum(inYear));
    $("totalMonth").innerHTML = moneyHtml(sum(inMonth));
    $("yearMeta").textContent = count(inYear.length);
    $("monthMeta").textContent = count(inMonth.length);
    $("yearLabel").textContent = `In ${y}`;
    $("monthLabel").textContent = `In ${now.toLocaleDateString("en-GB", { month: "long" })}`;
    $("totalMeta").textContent = all.length
      ? `${all.length} payment${all.length === 1 ? "" : "s"} recorded. Last on ${O.formatDate(all[0].transdate)}.`
      : "No payments recorded yet.";
  }

  const titleCase = (t) => String(t || "").toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const PAY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function renderRecent() {
    const rows = state.receipts.slice(0, 5);
    $("recentBody").innerHTML = rows.length
      ? rows.map((r) => `<li class="pay-row">
          <span class="pay-icon">${PAY_ICON}</span>
          <span class="pay-main"><strong>${esc(titleCase(r.remark))}</strong><time datetime="${esc(r.transdate)}">${esc(O.formatDate(r.transdate))}</time></span>
          <span class="pay-amount">${esc(money(r.amount))}</span>
        </li>`).join("")
      : '<li class="pay-empty">No payments recorded yet. Payments appear here once the treasurer records them.</li>';
  }

  function renderReceipts() {
    const rows = state.filtered;
    $("receiptBody").innerHTML = rows.length
      ? rows.map((r) => `<tr>
          <td>${esc(O.formatDate(r.transdate))}</td>
          <td class="wrap">${esc(titleCase(r.remark))}</td>
          <td class="num">${esc(money(r.amount))}</td>
          <td class="muted">${esc(O.formatDate(r.paydate))}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">${state.receipts.length ? "No payments in this date range." : "No payments recorded yet."}</td></tr>`;
    $("receiptFoot").innerHTML = rows.length
      ? `<tr><td colspan="2">${rows.length} payment${rows.length === 1 ? "" : "s"}</td><td class="num">${esc(money(sum(rows)))}</td><td></td></tr>`
      : "";
  }

  function applyFilter(e) {
    if (e) e.preventDefault();
    const from = $("fromDate").value;
    const to = $("toDate").value;
    state.filtered = state.receipts.filter((r) => {
      const d = (r.transdate || "").slice(0, 10);
      return (!from || d >= from) && (!to || d <= to);
    });
    renderReceipts();
  }

  function printStatement() {
    if (!window.OCDAReports) {
      O.showAlert("pageAlert", "The PDF tools didn't load. Refresh the page and try again.", "error");
      return;
    }
    O.hideAlert("pageAlert");
    window.OCDAPDF.run(
      $("printReceipts"),
      () => window.OCDAReports.memberStatement({ me: state.me, rows: state.filtered, from: $("fromDate").value, to: $("toDate").value }),
      (msg) => O.showAlert("pageAlert", msg, "error"),
    );
  }

  function downloadCsv() {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Date", "Description", "Amount", "Recorded"].map(q).join(",")]
      .concat(state.filtered.map((r) => [r.transdate, r.remark, r.amount, r.paydate].map(q).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ocda-receipts-${state.me ? state.me.phoneNumber : "member"}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ------------------------------------------------------------------ notices
  async function loadNotices() {
    const mini = $("newsList");
    const full = $("noticeFullList");
    try {
      const items = await O.api("/admin/notices");
      state.notices = Array.isArray(items) ? items : [];
    } catch (_) {
      mini.innerHTML = '<li class="muted">Notices couldn\'t be loaded.</li>';
      full.innerHTML = '<li class="empty">Notices couldn\'t be loaded. Refresh the page to try again.</li>';
      return;
    }
    const items = state.notices;
    mini.innerHTML = items.length
      ? items.slice(0, 4).map((n) => {
          const d = new Date(n.created_at);
          const day = isNaN(d) ? "" : d.getDate();
          const mon = isNaN(d) ? "" : d.toLocaleDateString("en-GB", { month: "short" });
          return `<li><button type="button" class="mini-notice" data-notice="${esc(n.id)}">
            <time class="date-chip" datetime="${esc(O.isoDate(n.created_at))}"><b>${esc(day)}</b><span>${esc(mon)}</span></time>
            <span class="mini-notice-text"><strong>${esc(n.title)}</strong><small>${n.type === "event" ? "Event" : "Notice"} · ${esc(O.formatDate(n.created_at, { year: "numeric", month: "long" }))}</small></span>
          </button></li>`;
        }).join("")
      : '<li class="muted">No notices yet.</li>';
    full.innerHTML = items.length
      ? items.map((n) => {
          const id = `pn-${esc(n.id)}`;
          return `<li class="notice" id="${id}">
            <button type="button" aria-expanded="false" aria-controls="${id}-body">
              <time datetime="${esc(O.isoDate(n.created_at))}">${esc(O.formatDate(n.created_at))}</time>
              <span class="notice-title">${esc(n.title)}</span>
              <span class="notice-kind" data-kind="${esc(n.type)}">${n.type === "event" ? "Event" : "Notice"}</span>
            </button>
            <div class="notice-body" id="${id}-body" hidden><div class="notice-body-inner">${esc(n.content || "No further details.")}</div></div>
          </li>`;
        }).join("")
      : '<li class="empty">No notices or events have been posted yet.</li>';
  }

  // One notice open at a time, animated (see OCDA.noticeAccordion)
  let noticeAccordion = null;
  function toggleNotice(btn, forceOpen, opts) {
    noticeAccordion = noticeAccordion || O.noticeAccordion($("noticeFullList"));
    noticeAccordion.toggle(btn, forceOpen, opts);
  }

  function openNotice(id) {
    show("notices");
    const item = $(`pn-${id}`);
    if (!item) return;
    toggleNotice(item.querySelector("button"), true, { animate: false });
    item.scrollIntoView({ block: "start" });
  }

  // ------------------------------------------------------------------ community totals
  function syncEnquiryType() {
    const type = document.querySelector('input[name="filterType"]:checked').value;
    $("wardField").hidden = type !== "ward";
    $("quarterField").hidden = type !== "quarters";
    // Belt and braces: never show both pickers, even if a stylesheet overrides [hidden]
    $("wardField").style.display = type === "ward" ? "" : "none";
    $("quarterField").style.display = type === "quarters" ? "" : "none";
  }

  async function runEnquiry(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="filterType"]:checked').value;
    const value = type === "ward" ? $("wardSelect").value : $("quartersSelect").value;
    const out = $("enquiryResults");
    if (!value) {
      out.innerHTML = `<p class="alert alert-info is-visible">Select a ${type === "ward" ? "ward" : "quarter"} first.</p>`;
      return;
    }
    const params = new URLSearchParams();
    if ($("enquiryFrom").value) params.set("from", $("enquiryFrom").value);
    if ($("enquiryTo").value) params.set("to", $("enquiryTo").value);

    out.innerHTML = '<div class="skeleton-line" style="width:50%"></div>';
    try {
      const rows = await O.api(`/api/enquiry/${type}/${encodeURIComponent(value)}?${params}`);
      if (!rows.length) {
        out.innerHTML = `<p class="empty">No contributions recorded for ${esc(value)} in this period.</p>`;
        return;
      }
      const total = rows.reduce((t, r) => t + Number(r.amount || 0), 0);
      const label = type === "ward" ? "Ward" : `Wards in ${esc(value)}`;
      out.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>${label}</th><th class="num">Contributing members</th><th class="num">Total</th></tr></thead>
            <tbody>${rows.map((r) => `<tr><td>${esc(r.ward || "Unassigned")}</td><td class="num">${esc(r.members)}</td><td class="num">${esc(O.naira(r.amount))}</td></tr>`).join("")}</tbody>
            ${rows.length > 1 ? `<tfoot><tr><td colspan="2">Total for ${esc(value)}</td><td class="num">${esc(O.naira(total))}</td></tr></tfoot>` : ""}
          </table>
        </div>`;
    } catch (err) {
      if (handleAuthError(err)) return;
      out.innerHTML = `<p class="alert alert-error is-visible">${esc(err.message)}</p>`;
    }
  }

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll(".portal-nav [data-view]").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
    document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => show(b.dataset.goto)));
    $("menuToggle").addEventListener("click", openMenu);
    $("scrim").addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    $("logoutBtn").addEventListener("click", signOut);

    $("editProfileBtn").addEventListener("click", openEdit);
    $("cancelEditBtn").addEventListener("click", closeEdit);
    $("profileEditForm").addEventListener("submit", saveProfile);
    $("pf-quarters").addEventListener("change", (e) => wardsForQuarter(e.target.value));

    $("receiptFilter").addEventListener("submit", applyFilter);
    $("clearFilter").addEventListener("click", () => { $("fromDate").value = ""; $("toDate").value = ""; applyFilter(); });
    $("printReceipts").addEventListener("click", printStatement);
    $("csvReceipts").addEventListener("click", downloadCsv);

    const syncAmountToggle = () => {
      const btn = $("toggleAmounts");
      btn.setAttribute("aria-pressed", String(state.amountsHidden));
      btn.classList.toggle("is-hidden", state.amountsHidden);
      $("toggleAmountsLabel").textContent = state.amountsHidden ? "Show" : "Hide";
    };
    syncAmountToggle();
    $("toggleAmounts").addEventListener("click", () => {
      state.amountsHidden = !state.amountsHidden;
      try { localStorage.setItem("ocdaHideAmounts", state.amountsHidden ? "1" : "0"); } catch (_) {}
      syncAmountToggle();
      renderTotals(); renderRecent(); renderReceipts();
    });

    $("newsList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-notice]");
      if (b) openNotice(b.dataset.notice);
    });
    noticeAccordion = O.noticeAccordion($("noticeFullList"));

    document.querySelectorAll('input[name="filterType"]').forEach((r) => r.addEventListener("change", syncEnquiryType));
    syncEnquiryType();
    $("enquiryForm").addEventListener("submit", runEnquiry);

    show((location.hash || "#overview").slice(1));

    try {
      await loadProfile();
    } catch (err) {
      if (!handleAuthError(err)) O.showAlert("pageAlert", err.message, "error");
      return;
    }
    loadNotices();
    loadLookups();
    loadReceipts().catch((err) => {
      if (handleAuthError(err)) return;
      $("recentBody").innerHTML = `<li class="pay-empty">${esc(err.message)}</li>`;
      $("receiptBody").innerHTML = `<tr><td colspan="4" class="muted">${esc(err.message)}</td></tr>`;
    });
  });
})();
