/* Admin console UI helpers: modals, sticky static-table columns, Reports caret.
   Loaded after admin-dashboard.js; it only wires up markup, all data logic stays in admin-dashboard.js. */
(function () {
  "use strict";

  let lastTrigger = null;

  function openModal(modal, trigger) {
    if (!modal) return;
    lastTrigger = trigger || document.activeElement;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    const first = modal.querySelector(
      ".ocda-modal-body input:not([type=hidden]):not([disabled]):not([readonly]), .ocda-modal-body select, .ocda-modal-body textarea",
    );
    setTimeout(() => (first || modal.querySelector(".ocda-modal-x"))?.focus(), 30);
  }

  function closeModal(modal) {
    if (!modal || modal.classList.contains("hidden")) return;
    const hook = modal.dataset.onClose;
    if (hook && typeof window[hook] === "function") {
      window[hook](); // e.g. closeMemberDetails() also resets and hides the panel
    }
    modal.classList.add("hidden");
    if (!document.querySelector(".ocda-modal:not(.hidden)")) document.body.classList.remove("modal-open");
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  window.ocdaOpenModal = (id) => openModal(document.getElementById(id));
  window.ocdaCloseModal = (id) => closeModal(document.getElementById(id));

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-modal-open]");
    if (opener) {
      openModal(document.getElementById(opener.dataset.modalOpen), opener);
      return;
    }
    if (e.target.closest("[data-modal-close]")) {
      closeModal(e.target.closest(".ocda-modal"));
      return;
    }
    // Clicking the dimmed backdrop closes the modal
    if (e.target.classList && e.target.classList.contains("ocda-modal")) {
      closeModal(e.target);
      return;
    }
    // Buttons that run a report: close once their own handler has run
    const runner = e.target.closest("[data-close-on-click]");
    if (runner) setTimeout(() => closeModal(runner.closest(".ocda-modal")), 0);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // Leave the alert/confirm dialog to its own handler
    if (!document.getElementById("appModal")?.classList.contains("hidden")) return;
    const open = [...document.querySelectorAll(".ocda-modal:not(.hidden)")].pop();
    if (open) closeModal(open);
  });

  // Report forms close as soon as they are submitted (results render on the page)
  document.addEventListener("submit", (e) => {
    const modal = e.target.closest(".ocda-modal[data-close-on-submit]");
    if (modal) setTimeout(() => closeModal(modal), 0);
  });

  // Entry forms are reset by admin-dashboard.js only after a successful save: close then
  document.addEventListener(
    "reset",
    (e) => {
      const modal = e.target.closest(".ocda-modal[data-close-on-reset]");
      if (modal) setTimeout(() => closeModal(modal), 0);
    },
    true,
  );

  // Report cards: after "Clear", re-sync anything that depends on the radio choice
  // (e.g. the Enquiry form shows the member, ward or quarter dropdown).
  document.addEventListener("reset", (e) => {
    if (!e.target.closest(".report-card")) return;
    setTimeout(() => {
      e.target.querySelectorAll("input[type=radio]:checked").forEach((r) => r.dispatchEvent(new Event("change", { bubbles: true })));
    }, 0);
  });

  // FAQ: close after a successful add (the inputs are cleared on success)
  if (typeof window.addFaqEntry === "function") {
    const original = window.addFaqEntry;
    window.addFaqEntry = async function () {
      await original.apply(this, arguments);
      const q = document.getElementById("newFaqQuestion");
      const a = document.getElementById("newFaqAnswer");
      if (q && a && !q.value && !a.value) closeModal(document.getElementById("faqModal"));
    };
  }

  // Some modals (member details) are opened/closed by admin-dashboard.js directly:
  // keep the page scroll lock in step with whatever is visible.
  function syncScrollLock() {
    document.body.classList.toggle("modal-open", !!document.querySelector(".ocda-modal:not(.hidden)"));
  }
  document.addEventListener("DOMContentLoaded", () => {
    const mo = new MutationObserver(syncScrollLock);
    document.querySelectorAll(".ocda-modal").forEach((m) => mo.observe(m, { attributes: true, attributeFilter: ["class"] }));
  });

  // ------------------------------------------------------------------ Reports caret
  // Closed: rotated -180°. Open: rotates +180° back to its natural position.
  function syncCaret() {
    const dd = document.getElementById("receiptDropdown");
    const btn = document.getElementById("receiptTabBtn");
    if (!dd || !btn) return;
    const open = !dd.classList.contains("hidden");
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  }
  document.addEventListener("DOMContentLoaded", () => {
    const dd = document.getElementById("receiptDropdown");
    if (dd) new MutationObserver(syncCaret).observe(dd, { attributes: true, attributeFilter: ["class", "style"] });
    syncCaret();
  });

  // ------------------------------------------------------------------ sticky static-table columns
  // Each column sticks. A column shorter than the panel waits at the top; a taller one
  // scrolls until its bottom is in view and then waits there, so both finish together.
  function setupStickyColumns() {
    const grid = document.getElementById("staticTablesGrid");
    const scroller = document.querySelector(".admin-main");
    if (!grid || !scroller) return;
    const cols = [...grid.querySelectorAll(".st-col")];
    const gap = 16;

    const update = () => {
      const view = scroller.clientHeight;
      const wide = window.matchMedia("(min-width: 768px)").matches;
      cols.forEach((col) => {
        if (!wide) { col.style.top = ""; return; }
        const h = col.offsetHeight;
        col.style.top = (h + gap * 2 > view ? view - h - gap : gap) + "px";
      });
    };

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(update);
      cols.forEach((c) => ro.observe(c));
      ro.observe(scroller);
    }
    window.addEventListener("resize", update);
    document.querySelectorAll('[data-tab="static-tables"]').forEach((b) =>
      b.addEventListener("click", () => setTimeout(update, 50)),
    );
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupStickyColumns);
  else setupStickyColumns();
})();
