/* Expense / income dropdowns on the analysis reports (admin and view-only consoles).
   Fills every <select data-code-list="expense|income"> from Standard Expenses and
   Income Classifications, keeping "All" as the first option. Re-loads whenever a
   Reports tab is opened, so newly added codes show up without a page refresh. */
(function () {
  "use strict";

  const SOURCES = {
    expense: { url: "/admin/stdxpenses", value: (r) => r.expscode, label: (r) => `${r.expsdesc} (${r.expscode})` },
    income: { url: "/admin/incomeclass", value: (r) => r.incomedesc, label: (r) => r.incomedesc },
  };

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  async function fill(kind) {
    const selects = document.querySelectorAll(`select[data-code-list="${kind}"]`);
    if (!selects.length) return;
    const src = SOURCES[kind];
    try {
      const res = await fetch(src.url, { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}` } });
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows)) return;
      const seen = new Set();
      const options = rows
        .filter((r) => src.value(r) && !seen.has(src.value(r)) && seen.add(src.value(r)))
        .sort((a, b) => String(src.label(a)).localeCompare(String(src.label(b))))
        .map((r) => `<option value="${esc(src.value(r))}">${esc(src.label(r))}</option>`)
        .join("");
      selects.forEach((sel) => {
        const keep = sel.value;
        const first = sel.options[0] ? sel.options[0].outerHTML : '<option value="ALL">All</option>';
        sel.innerHTML = first + options;
        if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
      });
    } catch (_) {
      /* leave "All" in place if the list can't be loaded */
    }
  }

  const loadAll = () => { fill("expense"); fill("income"); };

  document.addEventListener("DOMContentLoaded", () => {
    loadAll();
    document.addEventListener("click", (e) => {
      const t = e.target.closest('[data-tab="ocda-expenses-analysis"], [data-tab="ocda-income-analysis"], [data-tab="expenses-tab"], [data-tab="income-tab"]');
      if (t) loadAll();
    });
  });
})();
