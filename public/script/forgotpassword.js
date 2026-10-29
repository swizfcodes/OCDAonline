/* Member password reset: phone number + new password. */
document.addEventListener("DOMContentLoaded", () => {
  const O = window.OCDA;
  const form = document.getElementById("forgotPasswordForm");

  const prefill = sessionStorage.getItem("prefillPhoneNumber");
  if (prefill) {
    document.getElementById("phoneNumber").value = prefill;
    sessionStorage.removeItem("prefillPhoneNumber");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    O.clearFieldErrors(form);
    O.hideAlert("resetAlert");

    const phoneNumber = form.phoneNumber.value.trim();
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    let ok = true;
    if (!phoneNumber) { O.setFieldError("phoneNumber", "Enter your phone number."); ok = false; }
    else if (phoneNumber.replace(/\D/g, "").length < 10) { O.setFieldError("phoneNumber", "Enter a valid phone number."); ok = false; }
    if (newPassword.length < 6) { O.setFieldError("newPassword", "Use at least 6 characters."); ok = false; }
    if (newPassword !== confirmPassword) { O.setFieldError("confirmPassword", "The passwords don't match."); ok = false; }
    if (!ok) return;

    const btn = form.querySelector("button[type=submit]");
    O.setBusy(btn, true, "Updating…");
    try {
      await O.api("/api/reset-password", { method: "POST", body: { phoneNumber, newPassword } });
      location.href = "/member.html?reset=1";
    } catch (err) {
      O.setBusy(btn, false);
      O.showAlert("resetAlert", err.message, "error");
    }
  });
});
