/* Home page: latest notices as cards. */
document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("homeNotices");
  if (!box) return;
  const { escapeHtml: esc, isoDate } = window.OCDA;
  try {
    const items = await window.OCDA.api("/admin/notices");
    if (!Array.isArray(items) || items.length === 0) {
      box.innerHTML = '<p class="empty">No notices have been posted yet.</p>';
      return;
    }
    box.innerHTML = items.slice(0, 3).map((n, i) => {
      const d = new Date(n.created_at);
      const day = isNaN(d) ? "" : d.getDate();
      const my = isNaN(d) ? "" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      return `
      <a class="notice-card reveal" style="--rd: ${i * 120 + 60}ms" href="/news.html#notice-${encodeURIComponent(n.id)}">
        <div class="notice-card-top">
          <time class="date-block" datetime="${esc(isoDate(n.created_at))}"><b>${esc(day)}</b><span>${esc(my)}</span></time>
          <span class="notice-kind" data-kind="${esc(n.type)}">${n.type === "event" ? "Event" : "Notice"}</span>
        </div>
        <h3>${esc(n.title)}</h3>
        ${n.content ? `<p>${esc(n.content)}</p>` : ""}
        <span class="more">Read ${n.type === "event" ? "event" : "notice"}</span>
      </a>`;
    }).join("");
    window.OCDA.observeReveal(box.querySelectorAll(".reveal"));
  } catch (err) {
    box.innerHTML = '<p class="empty">Notices couldn\'t be loaded right now. <a href="/news.html">Open the notices page</a>.</p>';
  }
});
