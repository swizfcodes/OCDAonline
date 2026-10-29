/* FAQ page. */
document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("faqList");
  if (!list) return;
  const { escapeHtml } = window.OCDA;
  try {
    const items = await window.OCDA.api("/admin/faq");
    if (!Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<p class="empty">No questions have been published yet.</p>';
      return;
    }
    list.innerHTML = items.map((q, i) => `
      <details class="faq-item"${i === 0 ? " open" : ""}>
        <summary>${escapeHtml(q.question)}</summary>
        <div class="faq-answer">${escapeHtml(q.answer)}</div>
      </details>`).join("");
    window.OCDA.singleOpen(list);
  } catch (err) {
    list.innerHTML = '<p class="empty">Questions couldn\'t be loaded. Refresh the page to try again.</p>';
  }
});
