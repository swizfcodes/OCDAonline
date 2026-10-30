/* Shared behaviour for public pages, sign-in pages and the member portal. */
(function () {
  "use strict";

  const OCDA = (window.OCDA = window.OCDA || {});

  OCDA.escapeHtml = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  OCDA.formatDate = function (value, opts) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleDateString("en-GB", opts || { day: "numeric", month: "short", year: "numeric" });
  };

  OCDA.isoDate = function (value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    const d = new Date(value);
    if (isNaN(d)) return "";
    // Use local calendar date (database DATE values arrive as UTC timestamps)
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  OCDA.naira = function (value) {
    const n = Number(value || 0);
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /** fetch JSON with consistent error handling. Throws { status, message, field }. */
  OCDA.api = async function (url, { method = "GET", body, headers } = {}) {
    const opts = { method, credentials: "same-origin", headers: Object.assign({}, headers) };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      throw { status: 0, message: "Can't reach the server. Check your connection and try again." };
    }
    let data = null;
    const type = res.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      try { data = await res.json(); } catch (_) { data = null; }
    }
    if (!res.ok) {
      throw {
        status: res.status,
        field: data && data.field,
        message: (data && (data.message || data.error)) || `Request failed (${res.status}).`,
      };
    }
    return data;
  };

  /* Field error helpers. Expects .field wrappers with an .error element inside. */
  OCDA.setFieldError = function (inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const field = input.closest(".field");
    const slot = document.getElementById(inputId + "Error") || (field && field.querySelector(".error"));
    if (field) field.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    if (slot) { slot.textContent = message; slot.classList.add("is-visible"); }
  };
  OCDA.clearFieldErrors = function (root) {
    (root || document).querySelectorAll(".field.has-error").forEach((f) => f.classList.remove("has-error"));
    (root || document).querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
    (root || document).querySelectorAll(".error.is-visible").forEach((e) => { e.classList.remove("is-visible"); e.textContent = ""; });
  };

  OCDA.showAlert = function (el, message, kind) {
    if (typeof el === "string") el = document.getElementById(el);
    if (!el) return;
    el.className = "alert is-visible alert-" + (kind || "info");
    el.textContent = message;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
  };
  OCDA.hideAlert = function (el) {
    if (typeof el === "string") el = document.getElementById(el);
    if (el) el.className = "alert";
  };

  OCDA.setBusy = function (button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label || "Please wait…";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  };

  /** Animate elements with .reveal as they scroll into view. Safe to call for content added later. */
  let revealObserver = null;
  OCDA.observeReveal = function (els) {
    const list = els instanceof Element ? [els] : Array.from(els || []);
    if (!list.length) return;
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      list.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    revealObserver = revealObserver || new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
      { threshold: 0.12 },
    );
    list.forEach((el) => revealObserver.observe(el));
  };

  /* ---------- Smooth accordions ----------
     Height is animated with the Web Animations API, and when an open item ABOVE the one being opened
     closes, it closes instantly and the page is scrolled by the same amount, so the tapped row stays
     exactly where the finger is (this is what made the list jump on phones). */
  const reducedMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  OCDA.slide = function (panel, open, done) {
    // If it is mid-animation, carry on from its current height rather than snapping
    const mid = panel._anim ? panel.getBoundingClientRect().height : null;
    if (panel._anim) panel._anim.cancel();
    if (reducedMotion() || !panel.animate) { if (done) done(); return; }
    const from = mid !== null ? mid : open ? 0 : panel.offsetHeight;
    const to = open ? panel.scrollHeight : 0;
    panel.style.overflow = "hidden";
    const anim = panel.animate(
      [{ height: from + "px", opacity: open ? 0.2 : 1 }, { height: to + "px", opacity: open ? 1 : 0 }],
      { duration: open ? 320 : 260, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
    panel._anim = anim;
    anim.onfinish = () => { panel._anim = null; panel.style.overflow = ""; if (done) done(); };
    anim.oncancel = () => { panel._anim = null; panel.style.overflow = ""; };
  };

  const isBefore = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  /** Run `change` and then scroll so `anchor` stays at the same place on screen. */
  function keepInPlace(anchor, change) {
    const before = anchor.getBoundingClientRect().top;
    change();
    const shift = anchor.getBoundingClientRect().top - before;
    if (Math.abs(shift) > 1) window.scrollBy(0, shift);
  }

  /** Lists of <button aria-controls> + panel (news page, portal notices). One open at a time. */
  OCDA.noticeAccordion = function (list) {
    if (!list) return null;
    const panelOf = (btn) => document.getElementById(btn.getAttribute("aria-controls"));

    function set(btn, open, animate) {
      const panel = panelOf(btn);
      btn.setAttribute("aria-expanded", String(open));
      if (!panel) return;
      if (!animate) {
        if (panel._anim) panel._anim.cancel();
        panel.hidden = !open;
        return;
      }
      if (open) {
        panel.hidden = false;
        OCDA.slide(panel, true);
      } else {
        OCDA.slide(panel, false, () => { if (btn.getAttribute("aria-expanded") !== "true") panel.hidden = true; });
      }
    }

    function toggle(btn, forceOpen, opts) {
      const open = forceOpen === true || btn.getAttribute("aria-expanded") !== "true";
      const animate = !(opts && opts.animate === false);
      if (!open) { set(btn, false, animate); return; }
      const others = [...list.querySelectorAll('button[aria-expanded="true"]')].filter((b) => b !== btn);
      // Only snap the items above shut if the page can scroll up by their height; otherwise animate them
      const aboveHeight = others.filter((b) => isBefore(b, btn)).reduce((t, b) => t + ((panelOf(b) || {}).offsetHeight || 0), 0);
      const canAnchor = window.scrollY >= aboveHeight - 1;
      keepInPlace(btn, () => {
        others.forEach((b) => set(b, false, animate && !(canAnchor && isBefore(b, btn))));
        set(btn, true, animate);
      });
    }

    list.addEventListener("click", (e) => {
      const btn = e.target.closest("button[aria-controls]");
      if (btn && list.contains(btn)) toggle(btn);
    });
    return { toggle };
  };

  /** <details> lists (FAQ). One open at a time, animated open and close. */
  OCDA.detailsAccordion = function (container) {
    if (!container) return;
    const panelOf = (d) => d.querySelector(":scope > :not(summary)");

    function close(d, animate) {
      const panel = panelOf(d);
      if (!animate || !panel) { if (panel && panel._anim) panel._anim.cancel(); d.classList.remove("is-closing"); d.open = false; return; }
      d.classList.add("is-closing");
      OCDA.slide(panel, false, () => { d.classList.remove("is-closing"); d.open = false; });
    }

    container.addEventListener("click", (e) => {
      const summary = e.target.closest("summary");
      if (!summary || !container.contains(summary)) return;
      const d = summary.parentElement;
      e.preventDefault();
      if (d.open && !d.classList.contains("is-closing")) { close(d, true); return; }
      const others = [...container.querySelectorAll("details[open]")].filter((o) => o !== d);
      const aboveHeight = others.filter((o) => isBefore(o, d)).reduce((t, o) => t + ((panelOf(o) || {}).offsetHeight || 0), 0);
      const canAnchor = window.scrollY >= aboveHeight - 1;
      keepInPlace(summary, () => {
        others.forEach((o) => close(o, !(canAnchor && isBefore(o, d))));
        d.classList.remove("is-closing");
        d.open = true;
        const panel = panelOf(d);
        if (panel) OCDA.slide(panel, true);
      });
    });
  };

  /** Only one <details> open at a time inside `container`. */
  OCDA.singleOpen = function (container) {
    if (!container) return;
    container.addEventListener("toggle", (e) => {
      const opened = e.target;
      if (opened.tagName !== "DETAILS" || !opened.open) return;
      container.querySelectorAll("details[open]").forEach((d) => { if (d !== opened) d.open = false; });
    }, true);
  };

  OCDA.validPhone = function (phone) {
    return /^(\+234|234|0)[789][01]\d{8}$/.test(String(phone || "").replace(/\s/g, ""));
  };

  document.addEventListener("DOMContentLoaded", function () {
    // Mobile navigation
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("site-nav");
    if (toggle && nav) {
      const setOpen = (open) => {
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      };
      toggle.addEventListener("click", function () {
        setOpen(!nav.classList.contains("is-open"));
      });
      // Close when tapping outside the menu or pressing Escape
      document.addEventListener("click", (e) => {
        if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
      });
    }

    // Show / hide password buttons
    document.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
      const input = document.getElementById(btn.getAttribute("data-password-toggle"));
      if (!input) return;
      btn.addEventListener("click", function () {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", String(show));
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.querySelector(".eye-open").style.display = show ? "none" : "";
        btn.querySelector(".eye-closed").style.display = show ? "" : "none";
      });
    });

    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

    // Scroll reveal for .reveal elements (re-triggers when they come back into view)
    OCDA.observeReveal(document.querySelectorAll(".reveal"));
  });
})();
