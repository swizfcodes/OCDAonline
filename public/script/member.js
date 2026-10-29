/* Member sign in. */
document.addEventListener("DOMContentLoaded", () => {
  const O = window.OCDA;
  const form = document.getElementById("loginForm");
  const params = new URLSearchParams(location.search);
  if (params.get("expired")) O.showAlert("successMessage", "Your session ended. Sign in again to continue.", "info");
  if (params.get("reset")) O.showAlert("successMessage", "Password updated. Sign in with your new password.", "success");

  // Carry the phone number over to the reset page
  document.getElementById("forgotLink").addEventListener("click", () => {
    const v = document.getElementById("loginPhone").value.trim();
    if (v) sessionStorage.setItem("prefillPhoneNumber", v);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    O.clearFieldErrors(form);
    O.hideAlert("successMessage");

    const identifier = form.identifier.value.trim();
    const password = form.password.value;
    let ok = true;
    if (!identifier) { O.setFieldError("loginPhone", "Enter your phone number or member ID."); ok = false; }
    if (!password) { O.setFieldError("loginPassword", "Enter your password."); ok = false; }
    if (!ok) return;

    const btn = form.querySelector("button[type=submit]");
    O.setBusy(btn, true, "Signing in…");
    try {
      const data = await O.api("/login", { method: "POST", body: { identifier, password } });
      try { localStorage.setItem("loggedInPhone", data.phoneNumber); } catch (_) {}
      location.href = "/dashboard";
    } catch (err) {
      O.setBusy(btn, false);
      if (err.field === "identifier") O.setFieldError("loginPhone", err.message);
      else if (err.field === "password") O.setFieldError("loginPassword", err.message);
      else O.showAlert("successMessage", err.message, "error");
    }
  });
});
