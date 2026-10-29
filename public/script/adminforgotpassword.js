/* Administrator password reset: email + new password. */
document.addEventListener("DOMContentLoaded", () => {
  const O = window.OCDA;
  const form = document.getElementById("adminForgotPasswordForm");

  const prefill = sessionStorage.getItem("prefillEmail");
  if (prefill) {
    document.getElementById("email").value = prefill;
    sessionStorage.removeItem("prefillEmail");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    O.clearFieldErrors(form);
    O.hideAlert("resetAlert");

    const email = form.email.value.trim();
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { O.setFieldError("email", "Enter the email address on your account."); ok = false; }
    if (newPassword.length < 8) { O.setFieldError("newPassword", "Use at least 8 characters."); ok = false; }
    if (newPassword !== confirmPassword) { O.setFieldError("confirmPassword", "The passwords don't match."); ok = false; }
    if (!ok) return;

    const btn = form.querySelector("button[type=submit]");
    O.setBusy(btn, true, "Updating…");
    try {
      await O.api("/admin/reset-adminpassword", { method: "POST", body: { email, newPassword } });
      location.href = "/adminlog.html?reset=1";
    } catch (err) {
      O.setBusy(btn, false);
      O.showAlert("resetAlert", err.message, "error");
    }
  });
});
