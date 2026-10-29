/* Contact page: published contact details + EmailJS message form. */
(function () {
  const EMAILJS_PUBLIC_KEY = "PdTYJ7_aos2Uu7P7L";
  const EMAILJS_SERVICE = "service_9rpkjl6";
  const EMAILJS_TEMPLATE = "template_ub32eow";

  document.addEventListener("DOMContentLoaded", () => {
    const { escapeHtml } = window.OCDA;
    if (window.emailjs) window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    // Contact details managed from the admin console
    (async () => {
      const box = document.getElementById("contactInfo");
      try {
        const data = await window.OCDA.api("/admin/contactus");
        if (data && data.content) {
          if (data.title) document.getElementById("contactInfoTitle").textContent = data.title;
          box.innerHTML = escapeHtml(data.content);
        } else {
          box.innerHTML = '<p class="empty">Contact details will be published here soon.</p>';
        }
      } catch (err) {
        box.innerHTML = '<p class="empty">Contact details couldn\'t be loaded. Refresh the page to try again.</p>';
      }
    })();

    const form = document.getElementById("contactForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      window.OCDA.clearFieldErrors(form);
      window.OCDA.hideAlert("contactAlert");

      const fullname = form.fullname.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      let ok = true;
      if (!fullname) { window.OCDA.setFieldError("fullname", "Enter your name."); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { window.OCDA.setFieldError("email_id", "Enter an email address we can reply to."); ok = false; }
      if (!message) { window.OCDA.setFieldError("message", "Write your message."); ok = false; }
      if (!ok) return;

      const btn = document.getElementById("sendBtn");
      window.OCDA.setBusy(btn, true, "Sending…");
      try {
        if (!window.emailjs) throw new Error("emailjs unavailable");
        await window.emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, { from_name: fullname, from_email: email, message });
        form.reset();
        window.OCDA.showAlert("contactAlert", "Message sent. The secretariat will reply by email.", "success");
      } catch (err) {
        console.error("Contact form error:", err);
        window.OCDA.showAlert("contactAlert", "Your message wasn't sent. Check your connection and try again, or use the phone numbers listed.", "error");
      } finally {
        window.OCDA.setBusy(btn, false);
      }
    });
  });
})();
