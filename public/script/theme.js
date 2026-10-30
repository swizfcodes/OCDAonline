/* Light / dark theme for every OCDA page.
   - Default: follow the browser's own setting (prefers-color-scheme). Each browser reports its
     own choice, so Chrome set to dark opens dark while Edge set to light opens light.
   - A click on any [data-theme-toggle] button switches theme and remembers it on this browser.
     Picking the same theme as the browser forgets the choice, so the page follows the browser again.
   The tiny inline snippet in each page's <head> applies the theme before first paint;
   this file only handles switching. */
(function () {
  "use strict";

  const KEY = "ocda-theme";
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  const stored = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (_) {
      return null;
    }
  };
  const system = () => (media && media.matches ? "dark" : "light");
  const current = () => root.getAttribute("data-theme") || stored() || system();

  function syncControls() {
    const theme = current();
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-pressed", String(theme === "dark"));
      btn.setAttribute("aria-label", `Switch to ${next} mode`);
      btn.title = `Switch to ${next} mode`;
      btn.querySelectorAll("[data-theme-label]").forEach((l) => (l.textContent = next === "dark" ? "Dark mode" : "Light mode"));
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
      m.setAttribute("content", theme === "dark" ? "#081b29" : "#edf4f9"),
    );
  }

  function apply(theme, animate) {
    if (animate) {
      root.classList.add("theme-switching");
      setTimeout(() => root.classList.remove("theme-switching"), 350);
    }
    root.setAttribute("data-theme", theme);
    syncControls();
    document.dispatchEvent(new CustomEvent("ocda:theme", { detail: { theme } }));
  }

  apply(current(), false);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const next = current() === "dark" ? "light" : "dark";
    try {
      if (next === system()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch (_) {}
    apply(next, true);
  });

  // Follow the browser's setting while the visitor hasn't picked a theme
  if (media) {
    const onChange = () => { if (!stored()) apply(system(), true); };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncControls);
  else syncControls();

  window.OCDATheme = { current, set: (t) => apply(t === "dark" ? "dark" : "light", true) };
})();
