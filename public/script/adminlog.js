/* Administrator sign in. */
document.addEventListener("DOMContentLoaded", () => {
  const O = window.OCDA;
  const form = document.getElementById("adminLoginForm");
  const params = new URLSearchParams(location.search);
  if (params.get("expired")) O.showAlert("adminAlert", "Your session ended. Sign in again to continue.", "info");
  if (params.get("reset")) O.showAlert("adminAlert", "Password updated. Sign in with your new password.", "success");

  // Carry the email over to the reset page
  document.getElementById("adminForgotLink")?.addEventListener("click", () => {
    const v = document.getElementById("loginEmail").value.trim();
    if (v) sessionStorage.setItem("prefillEmail", v);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    O.clearFieldErrors(form);
    O.hideAlert("adminAlert");

    const email = form.email.value.trim();
    const password = form.password.value;
    let ok = true;
    if (!email) { O.setFieldError("loginEmail", "Enter your email address."); ok = false; }
    if (!password) { O.setFieldError("loginPassword", "Enter your password."); ok = false; }
    if (!ok) return;

    const btn = form.querySelector("button[type=submit]");
    O.setBusy(btn, true, "Signing in…");
    try {
      const result = await O.api("/admin/login", { method: "POST", body: { email, password } });
      localStorage.setItem("adminToken", result.token);
      if (result.admin) {
        localStorage.setItem("adminId", result.admin.id ?? result.admin.Id ?? "");
        localStorage.setItem("adminRole", result.admin.role || "");
        localStorage.setItem("adminName", result.admin.fullname || "");
      }
      location.href = result.admin && result.admin.role === "VIEWADMIN" ? "/viewadmin-dashboard.html" : "/admin-dashboard.html";
    } catch (err) {
      O.setBusy(btn, false);
      O.showAlert("adminAlert", err.message || "Sign in failed.", "error");
    }
  });
});
