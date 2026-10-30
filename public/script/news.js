/* News & events: expandable list of notices. */
document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("newsList");
  if (!list) return;
  const { escapeHtml, formatDate, isoDate } = window.OCDA;

  try {
    const items = await window.OCDA.api("/admin/notices");
    if (!Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<li class="empty">No notices or events have been posted yet. Check back soon.</li>';
      return;
    }

    list.innerHTML = items.map((n) => {
      const id = `notice-${escapeHtml(n.id)}`;
      return `
      <li class="notice" id="${id}">
        <button type="button" aria-expanded="false" aria-controls="${id}-body">
          <time datetime="${escapeHtml(isoDate(n.created_at))}">${escapeHtml(formatDate(n.created_at))}</time>
          <span class="notice-title">${escapeHtml(n.title)}</span>
          <span class="notice-kind" data-kind="${escapeHtml(n.type)}">${n.type === "event" ? "Event" : "Notice"}</span>
        </button>
        <div class="notice-body" id="${id}-body" hidden><div class="notice-body-inner">${escapeHtml(n.content || "No further details.")}</div></div>
      </li>`;
    }).join("");

    // One notice open at a time, animated, without the list jumping on phones
    const accordion = window.OCDA.noticeAccordion(list);

    // Open the notice linked from the home page, if any
    const target = location.hash && document.getElementById(location.hash.slice(1));
    const first = target ? target.querySelector("button") : list.querySelector("button");
    if (first) accordion.toggle(first, true, { animate: false });
    if (target) target.scrollIntoView({ block: "start" });
  } catch (err) {
    list.innerHTML = '<li class="empty">Notices couldn\'t be loaded. Refresh the page to try again.</li>';
  }
});
