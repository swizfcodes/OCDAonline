/* Member registration. */
document.addEventListener("DOMContentLoaded", () => {
  const O = window.OCDA;
  const form = document.getElementById("signupForm");

  const addOptions = (select, items) => {
    const frag = document.createDocumentFragment();
    items.forEach(([value, label]) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      frag.appendChild(o);
    });
    select.appendChild(frag);
  };

  const load = async (type) => {
    try {
      const data = await O.api(`/admin/static/${type}`);
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  };

  // Dropdowns
  load("titles").then((d) => addOptions(document.getElementById("title"), d.map((x) => [x.title, x.title])));
  load("hontitles").then((d) => addOptions(document.getElementById("honTitle"), d.map((x) => [x.Htitle, x.Htitle])));
  load("qualifications").then((d) => addOptions(document.getElementById("qualifications"), d.map((x) => [x.qualification, x.qualification])));
  load("states").then((d) => addOptions(document.getElementById("state"), d.map((x) => [x.statecode, x.statename])));
  load("wards").then((wards) => {
    const quarterSel = document.getElementById("quarters");
    const wardSel = document.getElementById("ward");
    const quarters = [...new Set(wards.map((w) => w.Quarter).filter(Boolean))].sort();
    addOptions(quarterSel, quarters.map((q) => [q, q]));
    quarterSel.addEventListener("change", () => {
      wardSel.innerHTML = '<option value="">Select ward</option>';
      addOptions(wardSel, wards.filter((w) => w.Quarter === quarterSel.value).map((w) => [w.ward, w.ward]));
    });
  });

  // Live checks
  document.getElementById("phoneNumber").addEventListener("blur", (e) => {
    const v = e.target.value.trim();
    if (v && !O.validPhone(v)) O.setFieldError("phoneNumber", "Enter a Nigerian mobile number, e.g. 08012345678.");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    O.clearFieldErrors(form);
    O.hideAlert("successMessage");

    const d = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]));
    let firstBad = null;
    const fail = (id, msg) => { O.setFieldError(id, msg); if (!firstBad) firstBad = id; };

    if (!d.surname) fail("surname", "Enter your surname.");
    if (!d.otherNames) fail("otherNames", "Enter your other names.");
    if (!d.sex) fail("sex", "Select your sex.");
    if (!d.dob) fail("dob", "Enter your date of birth.");
    else {
      const dob = new Date(d.dob), now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      if (age < 13) fail("dob", "Members must be at least 13 years old.");
    }
    if (!d.quarters) fail("quarters", "Select your quarter.");
    if (!d.ward) fail("ward", "Select your ward.");
    if (!d.state) fail("state", "Select your state of residence.");
    if (!d.town) fail("town", "Enter your town of residence.");
    if (!d.phoneNumber) fail("phoneNumber", "Enter your phone number.");
    else if (!O.validPhone(d.phoneNumber)) fail("phoneNumber", "Enter a Nigerian mobile number, e.g. 08012345678.");
    if (d.phoneNo2 && !O.validPhone(d.phoneNo2)) fail("phoneNo2", "Enter a Nigerian mobile number, or leave this blank.");
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fail("email", "Enter a valid email address, or leave this blank.");
    if ((d.password || "").length < 6) fail("password", "Use at least 6 characters.");
    if (d.password !== d.retypePassword) fail("retypePassword", "The passwords don't match.");
    if (!document.getElementById("acceptRules").checked) fail("acceptRules", "You need to accept the association's rules to register.");

    if (firstBad) {
      document.getElementById(firstBad).focus();
      return;
    }
    delete d.retypePassword;
    delete d.acceptRules;

    const btn = document.getElementById("submitBtn");
    O.setBusy(btn, true, "Creating your account…");
    try {
      const data = await O.api("/signup", { method: "POST", body: d });
      try { localStorage.setItem("loggedInPhone", data.phoneNumber); } catch (_) {}
      O.showAlert("successMessage", "Account created. Taking you to your dashboard…", "success");
      setTimeout(() => (location.href = "/dashboard"), 900);
    } catch (err) {
      O.setBusy(btn, false);
      if (err.field && document.getElementById(err.field)) {
        O.setFieldError(err.field, err.message);
        document.getElementById(err.field).focus();
      } else {
        O.showAlert("successMessage", err.message, "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  });
});
