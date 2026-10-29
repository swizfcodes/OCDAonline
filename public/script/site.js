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
      toggle.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
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
