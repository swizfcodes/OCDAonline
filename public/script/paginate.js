/* System-wide table pagination: every data table inside <main> shows 10 rows per page.
   Works with tables that other scripts fill in later (watches for new rows).
   Rows are hidden with a class only, so prints and exports that copy the table HTML
   still get every row. Add data-no-paginate to a <table> to opt out. */
(function () {
  "use strict";

  const PAGE_SIZE = 10;
  const SKIP_TBODY_IDS = new Set(["membersTable"]); // already paginated by admin-dashboard.js
  const state = new WeakMap(); // table -> { page, count }

  const style = document.createElement("style");
  style.textContent = `
    tr.pg-hidden { display: none !important; }
    .pg-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 2px 2px; font-size: 0.86rem; color: var(--muted, #5a6b79); }
    .pg-pages { display: flex; flex-wrap: wrap; gap: 4px; }
    .pg-btn { min-width: 34px; height: 34px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-strong, #c3cfd9);
      background: var(--surface, #fff); color: var(--ink, #0f1f2b); font: 600 0.84rem var(--font-body, system-ui); cursor: pointer; }
    .pg-btn:hover:not([disabled]) { border-color: var(--harvest, #00bcd4); background: var(--harvest-tint, #e0f7fa); }
    .pg-btn[aria-current="page"] { background: var(--canopy, #112e42); border-color: var(--canopy, #112e42); color: var(--on-canopy, #fff); }
    .pg-btn[disabled] { opacity: .45; cursor: default; }
    .pg-gap { padding: 0 4px; align-self: center; }
    @media print { tr.pg-hidden { display: table-row !important; } .pg-bar { display: none !important; } }
  `;
  document.head.appendChild(style);

  const isTotalRow = (tr) => /^\s*(grand\s+)?total\b/i.test(tr.textContent || "");

  function rowsOf(table) {
    const body = table.tBodies[0];
    if (!body) return [];
    const rows = [...body.rows];
    // Keep a closing "Total" row visible on every page
    const last = rows[rows.length - 1];
    const pinned = last && rows.length > 1 && isTotalRow(last) ? last : null;
    if (pinned) pinned.classList.remove("pg-hidden");
    // Rows another script filtered out (e.g. a search box) don't count
    return rows.filter((r) => r !== pinned && r.style.display !== "none");
  }

  function pageList(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    const from = Math.max(2, current - 1);
    const to = Math.min(total - 1, current + 1);
    if (from > 2) out.push("…");
    for (let p = from; p <= to; p++) out.push(p);
    if (to < total - 1) out.push("…");
    out.push(total);
    return out;
  }

  function anchorFor(table) {
    // Put the pager under the table's scroll box when it has one
    const box = table.closest(".overflow-auto, .overflow-x-auto, .table-wrap");
    return box && box.querySelectorAll("table").length === 1 ? box : table;
  }

  function pagerFor(table) {
    const anchor = anchorFor(table);
    // Reuse the bar already sitting under this spot (tables are often rebuilt with innerHTML)
    let bar = anchor.nextElementSibling;
    if (!(bar && bar.classList.contains("pg-bar"))) {
      bar = document.createElement("div");
      bar.className = "pg-bar";
      bar.setAttribute("role", "navigation");
      bar.setAttribute("aria-label", "Table pages");
      bar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-page]");
        const t = bar.__table;
        if (!btn || btn.disabled || !t) return;
        state.get(t).page = Number(btn.dataset.page);
        apply(t);
      });
      anchor.insertAdjacentElement("afterend", bar);
    }
    if (table.__pgBar && table.__pgBar !== bar) table.__pgBar.remove();
    bar.__table = table;
    table.__pgBar = bar;
    return bar;
  }

  function removePager(table) {
    const anchor = anchorFor(table);
    const next = anchor.nextElementSibling;
    if (next && next.classList.contains("pg-bar")) next.remove();
    if (table.__pgBar) table.__pgBar.remove();
    table.__pgBar = null;
  }

  // Bars whose table was replaced or removed
  function sweepOrphans(root) {
    root.querySelectorAll(".pg-bar").forEach((bar) => {
      const t = bar.__table;
      if (!t || !t.isConnected || t.__pgBar !== bar) bar.remove();
    });
  }

  function apply(table) {
    const rows = rowsOf(table);
    const st = state.get(table) || { page: 1, count: -1 };
    if (st.count !== rows.length) {
      st.page = 1; // new data: back to the first page
      st.count = rows.length;
    }
    state.set(table, st);

    if (rows.length <= PAGE_SIZE) {
      rows.forEach((r) => r.classList.remove("pg-hidden"));
      removePager(table);
      return;
    }

    const pages = Math.ceil(rows.length / PAGE_SIZE);
    st.page = Math.min(Math.max(1, st.page), pages);
    const start = (st.page - 1) * PAGE_SIZE;
    rows.forEach((r, i) => r.classList.toggle("pg-hidden", i < start || i >= start + PAGE_SIZE));

    const end = Math.min(start + PAGE_SIZE, rows.length);
    const html =
      `<span>Showing ${start + 1}–${end} of ${rows.length}</span><div class="pg-pages">` +
      `<button type="button" class="pg-btn" data-page="${st.page - 1}" ${st.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>` +
      pageList(st.page, pages)
        .map((p) =>
          p === "…"
            ? '<span class="pg-gap">…</span>'
            : `<button type="button" class="pg-btn" data-page="${p}"${p === st.page ? ' aria-current="page"' : ""}>${p}</button>`,
        )
        .join("") +
      `<button type="button" class="pg-btn" data-page="${st.page + 1}" ${st.page === pages ? "disabled" : ""} aria-label="Next page">›</button></div>`;

    const bar = pagerFor(table);
    if (bar.__html !== html) {
      bar.innerHTML = html;
      bar.__html = html;
    }
  }

  function eligible(table) {
    if (table.hasAttribute("data-no-paginate")) return false;
    const body = table.tBodies[0];
    if (!body || SKIP_TBODY_IDS.has(body.id)) return false;
    if (table.closest(".pg-bar")) return false;
    return true;
  }

  let scheduled = false;
  function scan(root) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      root.querySelectorAll("table").forEach((t) => {
        if (eligible(t)) apply(t);
      });
      sweepOrphans(root);
    });
  }

  function start() {
    const root = document.querySelector("main") || document.body;
    scan(root);
    new MutationObserver((muts) => {
      // Ignore our own pager updates
      if (muts.every((m) => m.target.closest && m.target.closest(".pg-bar"))) return;
      scan(root);
    }).observe(root, { childList: true, subtree: true });
    // Search boxes that hide rows with style.display
    root.addEventListener("input", () => setTimeout(() => scan(root), 0));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
