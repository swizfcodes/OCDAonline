const isLocal = window.location.hostname === "localhost";
const BASE_URL = isLocal ? "http://localhost:5500" : "https://oyinakokocda.org";

// ===== REUSABLE MODAL (replaces all alert/confirm) =====
let _modalResolve = null;

function showModal(
  message,
  { title = "Notice", type = "info", confirm = false } = {},
) {
  return new Promise((resolve) => {
    _modalResolve = resolve;
    const modal = document.getElementById("appModal");
    const header = document.getElementById("appModalHeader");
    const titleEl = document.getElementById("appModalTitle");
    const msgEl = document.getElementById("appModalMessage");
    const okBtn = document.getElementById("appModalConfirm");
    const cancelBtn = document.getElementById("appModalCancel");

    titleEl.textContent = title;
    msgEl.textContent = message;

    // Colour header by type
    const colours = {
      info: "bg-blue-600",
      success: "bg-green-600",
      error: "bg-red-600",
      warning: "bg-yellow-500",
    };
    header.className = `px-5 py-3 flex items-center justify-between text-white ${colours[type] || colours.info}`;

    okBtn.className = `px-4 py-2 rounded text-sm text-white ${colours[type] || colours.info}`;
    okBtn.textContent = confirm ? "Confirm" : "OK";

    if (confirm) {
      cancelBtn.classList.remove("hidden");
      cancelBtn.onclick = () => {
        closeModal(false);
      };
      okBtn.onclick = () => {
        closeModal(true);
      };
    } else {
      cancelBtn.classList.add("hidden");
      okBtn.onclick = () => {
        closeModal(true);
      };
    }

    modal.classList.remove("hidden");
  });
}

function closeModal(result = true) {
  document.getElementById("appModal").classList.add("hidden");
  if (_modalResolve) {
    _modalResolve(result);
    _modalResolve = null;
  }
}

// Convenience wrappers
const showAlert = (msg, type = "info", title) =>
  showModal(msg, {
    title:
      title ||
      (type === "error"
        ? "Error"
        : type === "success"
          ? "Success"
          : type === "warning"
            ? "Warning"
            : "Notice"),
    type,
  });
const showConfirm = (msg, title = "Confirm Action") =>
  showModal(msg, { title, type: "warning", confirm: true });

document.addEventListener("DOMContentLoaded", function () {
  const role = localStorage.getItem("adminRole");
  // Hide the admin tab for normal admins
  if (role !== "superadmin") {
    const adminTab = document.getElementById("adminTabBtn");
    if (adminTab) adminTab.style.display = "none";
  }
});

const token = `Bearer ${localStorage.getItem("adminToken")}`;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("memberEditForm");
  if (!form) return;

  const titleSelect = form.querySelector("#Title");
  const honTitleSelect = form.querySelector("#HonTitle");
  const qualificationSelect = form.querySelector("#Qualifications");

  const loadDropdown = async (endpoint, selectElement, valueKey) => {
    try {
      const res = await fetch(`/admin/static/${endpoint}`);
      const data = await res.json();

      if (!Array.isArray(data))
        throw new Error(`Invalid data: ${JSON.stringify(data)}`);

      data.forEach((item) => {
        const val = item[valueKey];
        const option = document.createElement("option");
        option.value = val;
        option.textContent = val;
        selectElement.appendChild(option);
      });
    } catch (err) {
      console.error(`Error loading ${endpoint}:`, err);
    }
  };

  // Load dropdowns
  loadDropdown("titles", titleSelect, "title");
  loadDropdown("hontitles", honTitleSelect, "Htitle");
  loadDropdown("qualifications", qualificationSelect, "qualification");
});

document.addEventListener("DOMContentLoaded", () => {
  const stateSelect = document.getElementById("State");

  fetch("/admin/static/states")
    .then((res) => res.json())
    .then((states) => {
      if (!Array.isArray(states)) throw new Error("Invalid states response");

      states.forEach((state) => {
        const option = document.createElement("option");
        option.value = state.statecode;
        option.textContent = state.statename;
        stateSelect.appendChild(option);
      });
    })
    .catch((err) => {
      console.error("Error loading states:", err);
    });
});

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("memberEditForm");
  if (!form) return;

  const quarterDropdown = document.getElementById("Quarters");
  const wardDropdown = document.getElementById("Ward");

  let wardData = [];

  try {
    const res = await fetch("/admin/static/wards");
    wardData = await res.json();

    // Populate quarter dropdown (unique quarters only)
    const uniqueQuarters = [...new Set(wardData.map((item) => item.Quarter))];

    uniqueQuarters.forEach((quarter) => {
      const option = document.createElement("option");
      option.value = quarter;
      option.textContent = quarter;
      quarterDropdown.appendChild(option);
    });

    // Filter and populate wards when a quarter is selected
    quarterDropdown.addEventListener("change", () => {
      const selectedQuarter = quarterDropdown.value;

      // Clear existing ward options except default
      wardDropdown.innerHTML = '<option value="">Select Ward</option>';

      const filteredWards = wardData.filter(
        (item) => item.Quarter === selectedQuarter,
      );
      filteredWards.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.ward;
        option.textContent = item.ward;
        wardDropdown.appendChild(option);
      });
    });
  } catch (err) {
    console.error("Failed to fetch wards:", err);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const receiptBtn = document.getElementById("receiptTabBtn");
  const dropdown = document.getElementById("receiptDropdown");

  // Toggle dropdown on click
  receiptBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent window click from closing it instantly
    dropdown.classList.toggle("hidden");
  });

  // Handle subtab click
  document.querySelectorAll(".tab-sub-button").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");

      // Show only the selected subtab's content
      document
        .querySelectorAll(".tab-content")
        .forEach((tab) => tab.classList.add("hidden"));
      const section = document.getElementById(tabId);
      if (section) section.classList.remove("hidden");

      // Highlight active subtab
      document
        .querySelectorAll(".tab-sub-button")
        .forEach((btn) => btn.classList.remove("bg-gray-200"));
      button.classList.add("bg-gray-200");

      // Close dropdown
      dropdown.classList.add("hidden");
    });
  });

  // Close dropdown if clicked outside
  window.addEventListener("click", (e) => {
    if (!document.getElementById("receiptTabWrapper").contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // Render Lucide icons
  lucide.createIcons();
});

window.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const receiptTabBtn = document.getElementById("receiptTabBtn");
  const receiptDropdown = document.getElementById("receiptDropdown");
  const tabButtons = document.querySelectorAll(".tab-button, .tab-sub-button");

  let activeTab = null;

  const isSubtab = (tab) =>
    [
      "enquiry",
      "memberledger",
      "ocda-expenses-analysis",
      "ocda-income-analysis",
      "summary",
      "final-account",
      "payment-schedule",
    ].includes(tab);

  // Toggle sidebar
  if (menuToggle && sidebar && overlay) {
    menuToggle.addEventListener("click", () => {
      const isClosed = sidebar.classList.contains("-translate-x-full");

      if (isClosed) {
        // OPEN
        sidebar.classList.remove("hidden");
        setTimeout(() => {
          sidebar.classList.remove("-translate-x-full");
        }, 10); // allow render

        overlay.classList.remove("hidden");
      } else {
        // CLOSE
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");

        // wait for animation before hiding completely
        setTimeout(() => {
          sidebar.classList.add("hidden");
        }, 300); // match your CSS transition duration
      }
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");

      setTimeout(() => {
        sidebar.classList.add("hidden");
      }, 300);
    });
  }

  // Track tab clicks
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      activeTab = tab;

      // Hide dropdown if normal tab is clicked
      if (receiptDropdown && !isSubtab(tab)) {
        receiptDropdown.classList.add("hidden");
      }

      // Close sidebar on mobile
      if (window.innerWidth < 1024 && sidebar && overlay) {
        sidebar.classList.add("-translate-x-full", "hidden");
        overlay.classList.add("hidden");

        // Also hide dropdown on mobile when any tab (including subtabs) is clicked
        if (receiptDropdown) {
          receiptDropdown.classList.add("hidden");
        }
      }
    });
  });

  // Manual dropdown toggle for receipt tab
  if (receiptTabBtn && receiptDropdown) {
    // Force initialize dropdown as hidden using inline style
    receiptDropdown.style.display = "none";
    console.log("Dropdown initialized as hidden");

    receiptTabBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Receipt tab clicked");

      const isHidden = receiptDropdown.style.display === "none";
      console.log("Is dropdown hidden?", isHidden);

      if (isHidden) {
        receiptDropdown.style.display = "block";
        console.log("Dropdown shown");
      } else {
        receiptDropdown.style.display = "none";
        console.log("Dropdown hidden");
      }
    });
  }

  // Close dropdown only when menuwrapper is clicked
  const menuWrapper = document.querySelector(
    ".menu-wrapper, #menuWrapper, [data-menu-wrapper]",
  ); // Try multiple selectors
  if (menuWrapper && receiptDropdown) {
    menuWrapper.addEventListener("click", (e) => {
      // Only hide if the click is directly on the menu wrapper, not on its children
      if (e.target === menuWrapper) {
        receiptDropdown.classList.add("hidden");
      }
    });
  }
});

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    // For example with JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

let allMembers = [];
let currentPage = 1;
const rowsPerPage = 10;

async function loadAdmins() {
  const token = localStorage.getItem("adminToken");
  if (!token)
    return (document.getElementById("adminTable").innerText =
      "Unauthorized – No token found.");

  try {
    const res = await fetch(`${BASE_URL}/admin/list`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    const admins = await res.json();
    if (!res.ok || !Array.isArray(admins)) {
      return (document.getElementById("adminTable").innerText =
        "Failed to load admins.");
    }

    if (admins.length === 0) {
      return (document.getElementById("adminTable").innerText =
        "No admins found.");
    }

    const table = `
      <div class="overflow-x-hidden max-w-full">
        <table class="w-full text-left border border-collapse table-auto">
          <thead>
            <tr class="bg-gray-200 text-xs sm:text-sm">
              <th class="p-2 border">#</th>
              <th class="p-2 border">Full Name</th>
              <th class="p-2 border">Email</th>
              <th class="p-2 border">Role</th>
              <th class="p-2 border">Status</th>
              <th class="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${admins
              .map(
                (admin, index) => `
              <tr class="text-xs sm:text-sm">
                <td class="p-2 border">${index + 1}</td>
                <td class="p-2 border break-words">${admin.fullname}</td>
                <td class="p-2 border email-wrap">${admin.email}</td>
                <td class="p-2 border">${admin.role}</td>
                <td class="p-2 border">${admin.active == 1 || admin.active === "1" ? "Active" : "Inactive"}</td>
                <td class="p-2 border">
                  <!-- Desktop Buttons -->
                  <div class="hidden md:flex gap-1 flex-wrap">
                    <button onclick="toggleAdminStatus('${admin.Id}', ${admin.active})"
                      class="px-2 py-1 rounded ${admin.active ? "bg-yellow-500" : "bg-green-500"} text-white text-xs">
                      ${admin.active ? "Deactivate" : "Activate"}
                    </button>
                    <button class="px-2 py-1 bg-blue-600 text-white rounded text-xs edit-admin-btn"
                      data-id="${admin.Id}"
                      data-fullname="${admin.fullname}"
                      data-email="${admin.email}"
                      data-role="${admin.role}">
                      Edit
                    </button>
                    <button onclick="deleteAdmin('${admin.Id}')" class="px-2 py-1 bg-red-600 text-white rounded text-xs">
                      Delete
                    </button>
                  </div>

                  <!-- Mobile Menu -->
                  <div class="relative inline-block md:hidden">
                    <button onclick="toggleMenu(this)" class="p-2 rounded-full hover:bg-gray-100 focus:outline-none">
                      <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 114.001-.001A2 2 0 016 10zm4 0a2 2 0 114.001-.001A2 2 0 0110 10zm4 0a2 2 0 114.001-.001A2 2 0 0114 10z" />
                      </svg>
                    </button>
                    <div class="hidden absolute right-0 z-10 mt-2 w-36 bg-white border rounded-lg shadow-md">
                      <button onclick="toggleAdminStatus('${admin.Id}', ${admin.active})"
                        class="w-full text-left px-4 py-2 text-sm ${admin.active ? "bg-yellow-500" : "bg-green-500"} hover:bg-gray-100">
                        ${admin.active ? "Deactivate" : "Activate"}
                      </button>
                      <button class="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-gray-100 edit-admin-btn"
                        data-id="${admin.Id}"
                        data-fullname="${admin.fullname}"
                        data-email="${admin.email}"
                        data-role="${admin.role}">
                        Edit
                      </button>
                      <button onclick="deleteAdmin('${admin.Id}')" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100">
                        Delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById("adminTable").innerHTML = table;
  } catch (err) {
    console.error("Admin Load Error:", err);
    document.getElementById("adminTable").innerText = "Error loading admins.";
  }
}

function toggleMenu(btn) {
  const menu = btn.nextElementSibling;
  // Close all other menus
  document.querySelectorAll(".relative .absolute").forEach((m) => {
    if (m !== menu) m.classList.add("hidden");
  });
  // Toggle this one
  menu.classList.toggle("hidden");
}

// Optional: Close dropdown when clicking outside
document.addEventListener("click", function (e) {
  if (!e.target.closest(".relative")) {
    document
      .querySelectorAll(".relative .absolute")
      .forEach((m) => m.classList.add("hidden"));
  }
});

// Open Edit Modal and fill form
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("edit-admin-btn")) {
    const btn = e.target;
    document.getElementById("editAdminId").value = btn.getAttribute("data-id");
    document.getElementById("editAdminFullname").value =
      btn.getAttribute("data-fullname");
    document.getElementById("editAdminEmail").value =
      btn.getAttribute("data-email");
    document.getElementById("editAdminRole").value =
      btn.getAttribute("data-role");
    document.getElementById("editAdminModal").classList.remove("hidden");
  }
});

// Handle Edit Admin form submission
document
  .getElementById("editAdminForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type=submit]");
    const token = `Bearer ${localStorage.getItem("adminToken")}`;
    const id = document.getElementById("editAdminId").value;
    const fullname = document.getElementById("editAdminFullname").value;
    const email = document.getElementById("editAdminEmail").value;
    const role = document.getElementById("editAdminRole").value;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
    }

    try {
      const res = await fetch(`${BASE_URL}/admin/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ fullname, email, role }),
      });
      const result = await res.json();
      showAlert(
        res.ok
          ? "Admin updated successfully!"
          : result.message || "Update failed",
      );
      if (res.ok) {
        document.getElementById("editAdminModal").classList.add("hidden");
        loadAdmins();
      }
    } catch (err) {
      showAlert("Server error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save";
      }
    }
  });

// Toggle admin status (activate/deactivate)
async function toggleAdminStatus(adminId, isActive) {
  const token = `Bearer ${localStorage.getItem("adminToken")}`;
  const action = isActive ? "deactivate" : "activate";
  if (!(await showConfirm(`Are you sure you want to ${action} this admin?`)))
    return;
  try {
    const res = await fetch(`${BASE_URL}/admin/${action}/${adminId}`, {
      method: "PATCH",
      headers: { Authorization: token },
    });
    const result = await res.json();
    showAlert(
      res.ok
        ? `Admin ${action}d successfully!`
        : result.message || "Action failed",
    );
    if (res.ok) loadAdmins();
  } catch (err) {
    showAlert("Server error");
  }
}

// Delete admin
async function deleteAdmin(adminId) {
  const token = `Bearer ${localStorage.getItem("adminToken")}`;
  if (!(await showConfirm("Are you sure you want to delete this admin?")))
    return;
  try {
    const res = await fetch(`${BASE_URL}/admin/delete/${adminId}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });
    const result = await res.json();
    showAlert(
      res.ok
        ? "Admin deleted successfully!"
        : result.message || "Delete failed",
    );
    if (res.ok) loadAdmins();
  } catch (err) {
    showAlert("Server error");
  }
}

// 2. Define setupAdminTab globally
function setupAdminTab() {
  // Attach submit handler only once
  if (!setupAdminTab.initialized) {
    document
      .getElementById("createAdminForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector("button[type=submit]");
        const data = {
          fullname: form.fullname.value,
          email: form.email.value,
          password: form.password.value,
          role: form.role.value,
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Creating...";
        }

        try {
          const res = await fetch(`${BASE_URL}/admin/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.getItem("adminToken") || "",
            },
            body: JSON.stringify(data),
          });
          const result = await res.json();
          showAlert(
            res.ok
              ? "Admin created!"
              : result.message || "Error creating admin",
          );
          if (res.ok) form.reset();
          loadAdmins(); // Refresh list after creation
        } catch (err) {
          console.error("Create Admin Error:", err);
          showAlert("Server error");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Admin";
          }
        }
      });
    setupAdminTab.initialized = true;
  }
  loadAdmins(); // Always refresh admin list when tab is shown
}

// Call setupAdminTab() when the "Administrators" tab is shown
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (btn.dataset.tab === "create-member") {
      setupAdminTab();
    }
  });
});

// Format amount with ₦ and commas
const formatAmount = (amount) =>
  `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// Format date to DD/MM/YYYY
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

// Tab navigation
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("active-tab"));
    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.add("hidden"));

    this.classList.add("active-tab");
    const tabId = this.getAttribute("data-tab");
    const tabSection = document.getElementById(tabId);
    if (tabSection) tabSection.classList.remove("hidden");

    // Only call setupAdminTab when admin tab is clicked
    if (tabId === "create-admin") setupAdminTab();
    if (tabId === "member-list") loadMembers();
    if (tabId === "ledger-entry") loadMemberLedger();
    if (tabId === "memberledger") loadAllMemberLedger();
    // ...other tab-specific loaders
  });
});

// Fetch Data Sections
function fetchTable(endpoint, targetId, renderFn) {
  fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    },
  })
    .then(async (res) => {
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error(`Invalid JSON from ${endpoint}`);
      }

      if (!res.ok) {
        throw new Error(data.message || `Request failed: ${res.status}`);
      }

      if (!Array.isArray(data)) {
        console.error(`Expected array but got:`, data);
        return;
      }

      const tableBody = document.getElementById(targetId);
      if (!tableBody) {
        console.error(`Target element #${targetId} not found.`);
        return;
      }

      tableBody.innerHTML = data.map(renderFn).join("");
    })
    .catch((err) => {
      console.error(`Error loading ${endpoint}:`, err.message || err);
      const tableBody = document.getElementById(targetId);
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-red-500">${err.message}</td></tr>`;
      }
    });
}

// Fetch and render Monthly Summary
fetchTable(
  "/admin/monthlysummary",
  "summaryData",
  (row) => `
    <tr class="border-t">
      <td class="p-2">${row.period}</td>
      <td class="p-2">${formatAmount(row.openbalance)}</td>
      <td class="p-2">${formatAmount(row.Debitbalance)}</td>
      <td class="p-2">${formatAmount(row.Creditbalance)}</td>
      <td class="p-2">${formatAmount(row.Netbalance)}</td>
    </tr>
  `,
);

function loadMonthlySummary() {
  fetchTable(
    "/admin/monthlysummary",
    "summaryData",
    (row) => `
    <tr class="border-t">
      <td class="p-2">${row.period}</td>
      <td class="p-2">${formatAmount(row.openbalance)}</td>
      <td class="p-2">${formatAmount(row.Debitbalance)}</td>
      <td class="p-2">${formatAmount(row.Creditbalance)}</td>
      <td class="p-2">${formatAmount(row.Netbalance)}</td>
    </tr>
  `,
  );
}

// Fetch and render OCDA Expenses
fetchTable(
  "/admin/ocdaexpenses",
  "expensesData",
  (row) => `
  <tr class="border-t">
    <td class="p-2">${formatDate(row.docdate)}</td>
    <td class="p-2">${row.project}</td>
    <td class="p-2">${row.remarks}</td>
    <td class="p-2">${formatAmount(row.amount)}</td>
  </tr>
`,
);

// Fetch and render Standard Expenses
fetchTable(
  "/admin/stdxpenses",
  "stdData",
  (row) => `
    <tr class="border-t">
      <td data-field="expscode" contenteditable="false" class="p-2">${row.expscode}</td>
      <td data-field="expsdesc" contenteditable="false" class="p-2">${row.expsdesc}</td>
      <td class="p-2">
        <button class="px-2 py-1 bg-yellow-500 text-white rounded text-xs" onclick="editStdExpense('${row.expscode}', this)">Edit</button>
        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" onclick="deleteStdExpense('${row.expscode}')">Delete</button>
      </td>
    </tr>
  `,
);

document
  .getElementById("addStdExpenseForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const code = document.getElementById("newExpscode").value.trim();
    const desc = document.getElementById("newExpsdesc").value.trim();
    if (!code || !desc) return showAlert("Enter both code and description");
    try {
      const res = await fetch("/admin/stdxpenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expscode: code, expsdesc: desc }),
      });
      if (res.ok) {
        document.getElementById("newExpscode").value = "";
        document.getElementById("newExpsdesc").value = "";
        fetchTable("/admin/stdxpenses", "stdData", stdExpenseRowRender);
      } else {
        const result = await res.json();
        showAlert(result.error || "Insert failed");
      }
    } catch (err) {
      console.error("Failed to add std expense:", err);
    }
  });

function editStdExpense(code, btn) {
  const row = btn.closest("tr");
  const fields = row.querySelectorAll("[data-field]");
  const editing = btn.textContent === "Save";
  if (editing) {
    // Save
    const body = {};
    fields.forEach((f) => (body[f.dataset.field] = f.textContent.trim()));
    fetch(`/admin/stdxpenses?expscode=${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => {
      if (!res.ok) return showAlert("Update failed");
      showAlert("Saved successfully!");
      btn.textContent = "Edit";
      fields.forEach((f) => f.setAttribute("contenteditable", "false"));
      fetchTable("/admin/stdxpenses", "stdData", stdExpenseRowRender);
    });
  } else {
    // Enable editing
    fields.forEach((f) => f.setAttribute("contenteditable", "true"));
    btn.textContent = "Save";
    showAlert("Editing is enabled. You can now modify the fields.");
  }
}

async function deleteStdExpense(code) {
  if (!(await showConfirm("Delete this expense?"))) return;
  fetch(`/admin/stdxpenses?expscode=${encodeURIComponent(code)}`, {
    method: "DELETE",
  }).then((res) => {
    if (!res.ok) return showAlert("Delete failed");
    showAlert("Deleted successfully!");
    fetchTable("/admin/stdxpenses", "stdData", stdExpenseRowRender);
  });
}

// Helper for rendering rows (so you can reuse in fetchTable)
function stdExpenseRowRender(row) {
  return `
    <tr class="border-t">
      <td data-field="expscode" contenteditable="false" class="p-2">${row.expscode}</td>
      <td data-field="expsdesc" contenteditable="false" class="p-2">${row.expsdesc}</td>
      <td class="p-2">
        <button class="px-2 py-1 bg-yellow-500 text-white rounded text-xs" onclick="editStdExpense('${row.expscode}', this)">Edit</button>
        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" onclick="deleteStdExpense('${row.expscode}')">Delete</button>
      </td>
    </tr>
  `;
}

// Fetch and render Income Classifications
fetchTable("/admin/incomeclass", "incomeData", incomeClassRowRender);

// Handle form submission
document
  .getElementById("addIncomeClassForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const code = document.getElementById("newIncomecode").value.trim();
    const desc = document.getElementById("newIncomedesc").value.trim();
    if (!code || !desc) return showAlert("Enter both code and description");

    try {
      const res = await fetch("/admin/incomeclass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ incomecode: code, incomedesc: desc }),
      });
      if (res.ok) {
        document.getElementById("newIncomecode").value = "";
        document.getElementById("newIncomedesc").value = "";
        fetchTable("/admin/incomeclass", "incomeData", incomeClassRowRender);
      } else {
        const result = await res.json();
        showAlert(result.error || "Insert failed");
      }
    } catch (err) {
      console.error("Failed to add income classification:", err);
    }
  });

function editIncomeClass(code, btn) {
  const row = btn.closest("tr");
  const fields = row.querySelectorAll("[data-field]");
  const editing = btn.textContent === "Save";

  if (editing) {
    const body = {};
    fields.forEach((f) => (body[f.dataset.field] = f.textContent.trim()));

    // Only send incomedesc in body for update, as incomecode is used as query param
    fetch(`/admin/incomeclass?incomecode=${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incomedesc: body.incomedesc }),
    }).then((res) => {
      if (!res.ok) return showAlert("Update failed");
      showAlert("Saved successfully!");
      btn.textContent = "Edit";
      fields.forEach((f) => f.setAttribute("contenteditable", "false"));
      fetchTable("/admin/incomeclass", "incomeData", incomeClassRowRender);
    });
  } else {
    fields.forEach((f) => f.setAttribute("contenteditable", "true"));
    btn.textContent = "Save";
    showAlert("Editing is enabled. You can now modify the fields.");
  }
}

async function deleteIncomeClass(code) {
  if (!(await showConfirm("Delete this income class?"))) return;
  fetch(`/admin/incomeclass?incomecode=${encodeURIComponent(code)}`, {
    method: "DELETE",
  }).then((res) => {
    if (!res.ok) return showAlert("Delete failed");
    showAlert("Deleted successfully!");
    fetchTable("/admin/incomeclass", "incomeData", incomeClassRowRender);
  });
}

// Table row renderer
function incomeClassRowRender(row) {
  return `
    <tr class="border-t">
      <td data-field="incomecode" contenteditable="false" class="p-2">${row.incomecode}</td>
      <td data-field="incomedesc" contenteditable="false" class="p-2">${row.incomedesc}</td>
      <td class="p-2">
        <button class="px-2 py-1 bg-yellow-500 text-white rounded text-xs" onclick="editIncomeClass('${row.incomecode}', this)">Edit</button>
        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" onclick="deleteIncomeClass('${row.incomecode}')">Delete</button>
      </td>
    </tr>
  `;
}

// Logout
function adminLogout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/adminlog.html";
}

// Init
window.addEventListener("DOMContentLoaded", loadAdmins);

// Create New Member (Screen G)
document
  .getElementById("createMemberForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector("button[type=submit]");

    // Get raw values
    const password = form.Password.value;
    const retypePassword = form.retypePassword.value;

    // Password validation first
    if (!retypePassword) {
      showError("retypePassword", "Please retype your password");
      return;
    }
    if (password !== retypePassword) {
      showError("retypePassword", "Passwords do not match");
      return;
    }

    const data = {
      PhoneNumber: form.PhoneNumber.value,
      phoneno2: form.phoneno2.value,
      Surname: form.Surname.value,
      othernames: form.othernames.value,
      Title: form.Title.value,
      HonTitle: form.HonTitle.value,
      Sex: form.Sex.value,
      Quarters: form.Quarters.value,
      Ward: form.Ward.value,
      State: form.State.value,
      Town: form.Town.value,
      DOB: form.DOB.value,
      Qualifications: form.Qualifications.value,
      Profession: form.Profession.value,
      exitdate: form.exitdate.value,
      Password: password,
      email: form.email.value,
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating...";
    }

    try {
      const res = await fetch("/admin/createmember", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      showAlert(
        res.ok
          ? "Member created successfully!"
          : result.message || "Error creating member.",
      );

      if (res.ok) {
        form.reset();
        loadMembers();
        setTimeout(() => {
          document
            .querySelectorAll(".tab-content")
            .forEach((sec) => sec.classList.add("hidden"));
          document.getElementById("member-list")?.classList.remove("hidden");
        }, 1500);
      }
    } catch (err) {
      console.error("Create Member Error:", err);
      showAlert("Server error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Member";
      }
    }
  });

function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + "Error");
  const inputElement = document.getElementById(fieldId);

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    inputElement.style.borderColor = "#e74c3c";
  }
}

function clearError(fieldId) {
  const errorElement = document.getElementById(fieldId + "Error");
  const inputElement = document.getElementById(fieldId);

  if (errorElement) {
    errorElement.style.display = "none";
    inputElement.style.borderColor = "#e1e5e9";
  }
}

document
  .getElementById("retypePassword")
  .addEventListener("input", function () {
    const password = document.getElementById("password").value;
    const retypePassword = this.value;

    if (retypePassword && password !== retypePassword) {
      showError("retypePassword", "Passwords do not match");
    } else if (retypePassword) {
      clearError("retypePassword");
    }
  });

//show the member list
/*let allMembers = [];
let currentPage = 1;
const rowsPerPage = 10;*/

function displayMembers(data) {
  const table = document.getElementById("membersTable");
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = data.slice(start, end);

  table.innerHTML = paginated
    .map(
      (m) => `
    <tr class="border-t">
      <td class="p-3">${m.PhoneNumber}</td>
      <td class="p-3">${m.Title || ""} ${m.Surname}</td>
      <td class="p-3">${m.othernames}</td>
      <td class="p-3">${m.Title}</td>
      <td class="p-3">${m.Sex}</td>
      <td class="p-3">${m.Quarters}</td>
      <td class="p-3">${m.Ward}</td>
      <td class="p-3 flex flex-col gap-2">
        <button onclick="viewMember('${m.PhoneNumber}')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs">View</button>
        <button onclick="editMember('${m.PhoneNumber}')" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Edit</button>
        <button onclick="deleteMember('${m.PhoneNumber}')" class="bg-red-600 text-white px-2 py-1 rounded text-xs">Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");
  renderPagination(data.length);
}

function renderPagination(total) {
  const pages = Math.ceil(total / rowsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let i = 1; i <= pages; i++) {
    pagination.innerHTML += `
      <button class="px-3 py-1 border rounded ${i === currentPage ? "bg-blue-500 text-white" : ""}"
      onclick="goToPage(${i})">${i}</button>`;
  }
}

function goToPage(page) {
  currentPage = page;
  const filtered = filterMembers(document.getElementById("memberSearch").value);
  displayMembers(filtered);
}

function filterMembers(query) {
  return allMembers.filter((m) => {
    const q = query.toLowerCase();
    return Object.values(m).some((val) =>
      String(val).toLowerCase().includes(q),
    );
  });
}

document.getElementById("memberSearch").addEventListener("input", (e) => {
  currentPage = 1;
  displayMembers(filterMembers(e.target.value));
});

async function loadMembers() {
  try {
    const token = `Bearer ${localStorage.getItem("adminToken")}`;
    const res = await fetch("/admin/members", {
      headers: { Authorization: token },
    });

    allMembers = await res.json();
    displayMembers(allMembers);

    // Populate hidden export table
    const exportTableBody = document.getElementById("membersTableExport");
    if (exportTableBody) {
      exportTableBody.innerHTML = allMembers
        .map(
          (member) => `
        <tr>
          <td>${member.PhoneNumber || ""}</td>
          <td>${member.Surname || ""}</td>
          <td>${member.othernames || ""}</td>
          <td>${member.Sex || ""}</td>
          <td>${member.DOB ? new Date(member.DOB).toLocaleDateString() : ""}</td>
          <td>${member.Quarters || ""}</td>
          <td>${member.Ward || ""}</td>
          <td>${member.Town || ""}</td>
          <td>${member.State || ""}</td>
        </tr>
      `,
        )
        .join("");
    }
  } catch (err) {
    console.error("Member Load Error:", err);
    document.getElementById("membersTable").innerHTML =
      `<tr><td colspan="9">Failed to load members</td></tr>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  //loadEnquiryDropdowns?.();
  loadMembers(); // 👈 ensure this is called
});

// Fetch and render Members Summary Table (Quarters x Wards)
async function loadMembersSummaryTable(targetBoxId = "summaryTableBox") {
  const token = localStorage.getItem("adminToken");
  const box = document.getElementById(targetBoxId);
  if (!token || !box) return;
  box.innerHTML = '<div class="text-gray-500">Loading summary...</div>';

  try {
    const res = await fetch(`${BASE_URL}/admin/members-summary`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch summary");
    const { wards, quarters, data, wardTotals, quarterTotals, grandTotal } =
      await res.json();

    if (!wards?.length || !quarters?.length) {
      box.innerHTML = '<div class="text-gray-500">No data found.</div>';
      return;
    }

    // Create a mapping of quarters to their specific wards
    const groupedByQuarter = {};
    const members = Object.keys(data);
    members.forEach((ward) => {
      quarters.forEach((quarter) => {
        if ((data[ward]?.[quarter] ?? 0) > 0) {
          if (!groupedByQuarter[quarter]) groupedByQuarter[quarter] = [];
          groupedByQuarter[quarter].push(ward);
        }
      });
    });

    let html =
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">';

    // Render all ward cards individually
    wards.forEach((ward) => {
      if (wardTotals?.[ward] !== undefined) {
        html += `
          <div class="bg-white border border-blue-300 shadow-lg rounded-lg p-5 transform transition duration-500 hover:scale-105 hover:shadow-2xl">
            <div class="flex items-center space-x-4">
              <div class="bg-blue-100 text-blue-700 rounded-full p-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2h5" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-blue-900">${ward}</h3>
                <p class="text-sm text-blue-600"> <span class="font-bold">${wardTotals[ward]}</span></p>
              </div>
            </div>
          </div>`;
      }
    });
    html += "</div>";

    // Render each quarter card with its wards
    /*html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">';
    Object.entries(groupedByQuarter).forEach(([quarter, wardList]) => {
      html += `
        <div class="bg-white border-l-4 border-blue-500 shadow-md rounded-lg p-4 transition-transform duration-500 hover:scale-105">
          <h3 class="text-xl font-bold text-blue-800 mb-3">${quarter}</h3>
          <div class="space-y-2">`;
      wardList.forEach(ward => {
        html += `
            <div class="flex justify-between text-sm text-gray-700 border-b pb-1">
              <span class="font-medium">${ward}</span>
              <span class="font-semibold text-green-700">${data?.[ward]?.[quarter] ?? 0}</span>
            </div>`;
      });
      html += `
            <div class="flex justify-between font-bold border-t pt-2 mt-3 text-blue-900">
              <span>Quarter Total</span>
              <span>${quarterTotals?.[quarter] ?? 0}</span>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';*/

    html += `<div class="mt-10 text-right font-extrabold text-3xl text-gray-700 animate-pulse">Grand Total: ${grandTotal ?? 0}</div>`;
    box.innerHTML = html;
  } catch (err) {
    box.innerHTML = `<div class="text-red-500">Error loading summary table</div>`;
    console.error("Members Summary Table Error:", err);
  }
}

// Ensure summary table loads on login and on refresh
window.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("membersSummaryTableBox")) {
    loadMembersSummaryTable("membersSummaryTableBox");
  } else if (document.getElementById("summaryTableBox")) {
    loadMembersSummaryTable("summaryTableBox");
  }
});

// Export to Excel or PDF
// function exportMembers(type) {
//   const table = document.getElementById("memberTableExport");

//   if (type === "excel") {
//     const wb = XLSX.utils.table_to_book(table, { sheet: "Members" });
//     XLSX.writeFile(wb, "members.xlsx");
//   } else if (type === "pdf") {
//     const doc = new jspdf.jsPDF("landscape", "pt", "a4");
//     doc.autoTable({
//       html: "#memberTableExport",
//       styles: {
//         font: "helvetica",
//         fontSize: 10,
//         cellPadding: 5,
//         halign: "center",
//         valign: "middle",
//         lineColor: [220, 220, 220],
//         lineWidth: 0.2,
//       },
//       headStyles: {
//         fillColor: [240, 240, 240],
//         textColor: 33,
//         fontStyle: "bold",
//       },
//       alternateRowStyles: { fillColor: [248, 248, 248] },
//       margin: { top: 40 },
//       didDrawPage: function (data) {
//         doc.setFontSize(14);
//         doc.text("OCDA Member List", data.settings.margin.left, 30);
//       },
//     });
//     doc.save("members.pdf");
//   } else if (type === "print") {
//     const printContent = table.outerHTML;
//     const win = window.open("", "", "width=1000,height=800");
//     win.document.write(`
//       <html>
//         <head>
//           <title>Print Members</title>
//           <style>
//             body { font-family: Arial, sans-serif; padding: 20px; }
//             table { border-collapse: collapse; width: 100%; }
//             th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
//             th { background-color: #f2f2f2; font-weight: bold; }
//             tr:nth-child(even) { background-color: #f9f9f9; }
//           </style>
//         </head>
//         <body>
//           <h2>OCDA Member List</h2>
//           ${printContent}
//         </body>
//       </html>
//     `);
//     win.document.close();
//     win.focus();
//     win.print();
//   }
// }

// Show and populate member detail section
async function viewMember(phone) {
  originalPhone = phone;

  try {
    const res = await fetch(`/admin/member/${phone}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch member");

    const member = await res.json();

    // Hide the edit form and show the view-only div
    document.getElementById("memberEditForm").style.display = "none";
    const viewDiv = document.getElementById("memberViewOnly");
    viewDiv.classList.remove("hidden");

    // Fill all view fields
    document.getElementById("viewPhone").innerText = member.PhoneNumber || "";
    document.getElementById("viewPhone2").innerText = member.phoneno2 || "";
    document.getElementById("viewSurname").innerText = member.Surname || "";
    document.getElementById("viewOthernames").innerText =
      member.othernames || "";
    document.getElementById("viewTitle").innerText = member.Title || "";
    document.getElementById("viewHonTitle").innerText = member.HonTitle || "";
    document.getElementById("viewSex").innerText = member.Sex || "";
    document.getElementById("viewQuarters").innerText = member.Quarters || "";
    document.getElementById("viewWard").innerText = member.Ward || "";
    document.getElementById("viewState").innerText = member.State || "";
    document.getElementById("viewTown").innerText = member.Town || "";
    document.getElementById("viewDOB").innerText = member.DOB
      ? member.DOB.split("T")[0]
      : "";
    document.getElementById("viewExit").innerText = member.exitdate
      ? member.exitdate.split("T")[0]
      : "";
    document.getElementById("viewQualifications").innerText =
      member.Qualifications || "";
    document.getElementById("viewProfession").innerText =
      member.Profession || "";
    document.getElementById("viewEmail").innerText = member.email || "";

    // Hide save button while viewing
    document.getElementById("updateMemberBtn")?.classList.add("hidden");
    document.getElementById("memberDetails")?.classList.remove("hidden");

    window.scrollTo({
      top: document.getElementById("memberDetails").offsetTop,
      behavior: "smooth",
    });
  } catch (err) {
    console.error("View member error:", err);
    showAlert("Could not load member details.");
  }
}

let originalMemberData = {}; // global to hold the original data

async function editMember(phone) {
  originalPhone = phone;

  try {
    const res = await fetch(`/admin/member/${phone}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch member");

    const member = await res.json();
    originalMemberData = { ...member }; // Save original data for comparison
    const form = document.getElementById("memberEditForm");

    // Hide the view-only div and show the edit form
    document.getElementById("memberViewOnly").classList.add("hidden");
    form.style.display = "";

    // Fill form and enable inputs for editing
    for (const key in member) {
      if (form.elements[key]) {
        if (key === "DOB" || key === "exitdate") {
          // Format date for input type="date"
          form.elements[key].value = member[key]
            ? member[key].split("T")[0]
            : "";
        } else {
          form.elements[key].value = member[key] ?? "";
        }
        form.elements[key].disabled = false;
      }
    }

    // Show the update button when editing
    document.getElementById("updateMemberBtn")?.classList.remove("hidden");
    document.getElementById("memberDetails")?.classList.remove("hidden");

    window.scrollTo({
      top: document.getElementById("memberDetails").offsetTop,
      behavior: "smooth",
    });
  } catch (err) {
    console.error("Edit member error:", err);
    showAlert("Could not load member for editing.");
  }
}

function closeMemberDetails() {
  const form = document.getElementById("memberEditForm");
  form.reset();
  [...form.elements].forEach((el) => (el.disabled = false));
  document.getElementById("memberDetails").classList.add("hidden");
  document.getElementById("updateMemberBtn")?.classList.add("hidden");
}

// Save changes
async function saveMemberChanges() {
  const form = document.getElementById("memberEditForm");
  const formData = Object.fromEntries(new FormData(form));
  const newPhone = formData.PhoneNumber.trim();

  // Only include changed fields
  const changedData = {};
  for (const key in formData) {
    if (formData[key] !== String(originalMemberData[key] ?? "")) {
      changedData[key] = formData[key];
    }
  }

  // If nothing changed, do nothing
  if (Object.keys(changedData).length === 0) {
    showAlert("No changes detected.");
    return;
  }

  // 🔒 Confirm if main phone number was changed
  if (changedData.PhoneNumber && changedData.PhoneNumber !== originalPhone) {
    const confirmChange = await showConfirm(
      `You changed the primary phone number from ${originalPhone} to ${changedData.PhoneNumber}. This may affect member identity.\n\nDo you want to proceed?`,
    );
    if (!confirmChange) return;
  }

  // 🔎 Check if new phone number already exists
  if (changedData.PhoneNumber && changedData.PhoneNumber !== originalPhone) {
    try {
      const checkRes = await fetch(`/admin/member/${changedData.PhoneNumber}`, {
        headers: { Authorization: localStorage.getItem("adminToken") },
      });
      if (checkRes.ok) {
        showAlert(
          `A member already exists with phone number: ${changedData.PhoneNumber}`,
        );
        return;
      }
    } catch (err) {
      // Not found is OK
    }
  }

  // 🔄 Proceed with update
  try {
    const res = await fetch(`/admin/member/${originalPhone}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(changedData),
    });

    const result = await res.json();
    showAlert(
      res.ok
        ? "Member updated successfully!"
        : result.message || "Update failed",
    );
    if (res.ok) {
      loadMembers();
      closeMemberDetails();
    }
  } catch (err) {
    console.error("Save error:", err);
    showAlert("Error saving changes");
  }
}

//change phone number
async function savePhoneNumber(e) {
  e.preventDefault();

  const form = document.getElementById("phoneNumberEditForm");
  const formData = Object.fromEntries(new FormData(form));
  const oldPhone = formData.oldphoneno.trim();
  const newPhone = formData.PhoneNumber.trim();

  if (!oldPhone || !newPhone) {
    return showAlert("Both phone numbers are required.");
  }

  if (oldPhone === newPhone) {
    return showAlert("New phone number must be different.");
  }

  const token = `Bearer ${localStorage.getItem("adminToken")}`;

  // Check if old phone exists
  const oldExists = await fetch(`/admin/member/${oldPhone}`, {
    headers: { Authorization: token },
  });

  if (!oldExists.ok) {
    return showAlert(`Old phone number not found.`);
  }

  // Check if new phone already exists
  const newExists = await fetch(`/admin/member/${newPhone}`, {
    headers: { Authorization: token },
  });

  if (newExists.ok) {
    return showAlert(`New phone number already exists.`);
  }

  // Proceed to update both tables
  try {
    const res = await fetch(`/admin/change-phone`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ oldPhone, newPhone }),
    });

    const result = await res.json();
    showAlert(
      result.message || (res.ok ? "Phone number updated." : "Update failed"),
    );

    if (res.ok) {
      form.reset();
      loadMembers?.(); // optional if function is defined
    }
  } catch (err) {
    console.error("Error:", err);
    showAlert("Server error");
  }
}

//merge phonenumber
async function mergePhoneNumber(e) {
  e.preventDefault();

  const form = document.getElementById("phoneNumberMergingForm");
  const firstPhone = document.getElementById("firstphoneno").value.trim();
  const secondPhone = document.getElementById("secondPhoneNumber").value.trim();

  if (!firstPhone || !secondPhone || firstPhone === secondPhone) {
    showAlert("Both phone numbers must be filled and different.");
    return;
  }

  try {
    const res = await fetch("/admin/merge-phone", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ firstPhone, secondPhone }),
    });

    const result = await res.json();
    showAlert(res.ok ? result.message : result.error);

    if (res.ok) {
      form.reset();
    }
  } catch (err) {
    console.error(err);
    showAlert("An error occurred while merging.");
  }
}

async function deleteMember(phone) {
  if (!(await showConfirm("Are you sure you want to delete this member?")))
    return;
  try {
    const res = await fetch(`/admin/member/${phone}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const result = await res.json();
    if (res.ok) {
      showAlert("Member deleted successfully");
      // Optionally reload the member list or remove the row from the table
      location.reload();
    } else {
      showAlert(result.message || "Failed to delete member");
    }
  } catch (err) {
    showAlert("Server error");
  }
}

//Load phone numbers
async function loadPhoneNumbers() {
  try {
    const res = await fetch("/admin/members", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const members = await res.json();
    const datalist = document.getElementById("phonenoList");
    datalist.innerHTML = members
      .map(
        (m) =>
          `<option value="${m.PhoneNumber}">${m.Surname} ${m.othernames}</option>`,
      )
      .join("");
  } catch (err) {
    console.error("Failed to load phone numbers", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadPhoneNumbers();
});

document.addEventListener("DOMContentLoaded", function () {
  // Populate Income Classification dropdown for ledger entry
  const remarkDropdown = document.getElementById("remarkDropdown");
  if (remarkDropdown) {
    fetch("/admin/incomeclass", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Clear existing options except the first (default)
        while (remarkDropdown.options.length > 1) {
          remarkDropdown.remove(1);
        }
        if (Array.isArray(data)) {
          data.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.incomedesc;
            option.textContent = item.incomedesc;
            remarkDropdown.appendChild(option);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load income classifications:", err);
      });
  }
});

//  Add Payment to Member Ledger (Screen D)
document.getElementById("ledgerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector("button[type=submit]");

  const data = {
    phoneno: form.phoneno.value,
    transdate: form.transdate.value,
    amount: parseFloat(form.amount.value),
    remark: form.remark.value,
    comment: form.comment?.value || "",
  };

  console.log("Submitting ledger entry for:", data);

  const today = new Date().toISOString().split("T")[0];
  if (data.transdate > today) {
    showAlert("Transaction date cannot be in the future.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  try {
    const res = await fetch(`/admin/ledger-entry/${data.phoneno}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      if (result.field === "phoneno") {
        const errorElem = document.getElementById("ledgerPhoneError");
        if (errorElem) {
          errorElem.textContent = result.message;
          errorElem.style.color = "red";
          errorElem.style.display = "block";
        }
      } else {
        showAlert(result.message || "Error submitting ledger entry.");
      }
      return;
    }

    // Clear error if successful
    const errorElem = document.getElementById("ledgerPhoneError");
    if (errorElem) errorElem.style.display = "none";

    showAlert("Ledger entry recorded!");
    form.reset();
    loadMemberLedger();
  } catch (err) {
    console.error("Ledger Error:", err.message || err);
    showAlert("Server error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
});

document.getElementById("phoneno")?.addEventListener("input", () => {
  const errorElem = document.getElementById("ledgerPhoneError");
  if (errorElem && document.getElementById("phoneno").value.trim() === "") {
    errorElem.style.display = "none";
  }
});

// Add member ledger to (Screen D)
async function loadMemberLedger() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const res = await fetch(
      `/admin/member-recordledger?from=${firstDay}&to=${lastDay}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      },
    );

    const data = await res.json();
    const body = document.getElementById("ledgerData");

    body.innerHTML = data
      .map(
        (row) => `
      <tr class="border-t" id="ledger-row-${row.id}">
        <td class="p-2">${row.phoneno}</td>
        <td class="p-2 ledger-transdate">${row.transdate ? row.transdate.substring(0, 10) : ""}</td>
        <td class="p-2 ledger-amount">${formatAmount(row.amount)}</td>
        <td class="p-2 ledger-remark">${row.remark}</td>
        <td class="p-2">${formatDate(row.paydate || "—")}</td>
        <td class="p-2 flex gap-1">
          <button onclick="editLedgerEntry(${row.id}, '${row.transdate ? row.transdate.substring(0, 10) : ""}', ${row.amount}, '${(row.remark || "").replace(/'/g, "\\'")}', '${row.phoneno}')"
            class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
          <button onclick="deleteLedgerEntry(${row.id})"
            class="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Load memberLedger Error:", err);
  }
}

// Edit ledger entry - opens inline edit modal
function editLedgerEntry(id, transdate, amount, remark, phoneno) {
  const existing = document.getElementById("ledgerEditModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "ledgerEditModal";
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
      <h3 class="text-lg font-bold mb-4">Edit Ledger Entry</h3>
      <p class="text-sm text-gray-500 mb-3">Phone: ${phoneno}</p>
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Transaction Date</label>
        <input type="date" id="editLedgerDate" value="${transdate}" class="border rounded w-full px-3 py-2 text-sm" />
      </div>
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Amount</label>
        <input type="number" step="0.01" id="editLedgerAmount" value="${amount}" class="border rounded w-full px-3 py-2 text-sm" />
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Remark</label>
        <input type="text" id="editLedgerRemark" value="${remark}" class="border rounded w-full px-3 py-2 text-sm" />
      </div>
      <div class="flex gap-2 justify-end">
        <button onclick="document.getElementById('ledgerEditModal').remove()"
          class="px-4 py-2 bg-gray-300 rounded text-sm">Cancel</button>
        <button id="saveLedgerEditBtn" onclick="saveLedgerEdit(${id})"
          class="px-4 py-2 bg-blue-600 text-white rounded text-sm">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveLedgerEdit(id) {
  const transdate = document.getElementById("editLedgerDate").value;
  const amount = parseFloat(document.getElementById("editLedgerAmount").value);
  const remark = document.getElementById("editLedgerRemark").value;
  const btn = document.getElementById("saveLedgerEditBtn");

  if (!transdate || isNaN(amount) || !remark) {
    showAlert("All fields are required");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const res = await fetch(`/admin/ledger-entry/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ transdate, amount, remark }),
    });
    const result = await res.json();
    if (res.ok) {
      showAlert("Ledger entry updated successfully");
      document.getElementById("ledgerEditModal").remove();
      loadMemberLedger();
    } else {
      showAlert(result.message || "Update failed");
    }
  } catch (err) {
    console.error("Ledger edit error:", err);
    showAlert("Server error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save Changes";
    }
  }
}

async function deleteLedgerEntry(id) {
  if (
    !(await showConfirm(
      "Are you sure you want to delete this ledger entry? This cannot be undone.",
    ))
  )
    return;

  try {
    const res = await fetch(`/admin/ledger-entry/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const result = await res.json();
    if (res.ok) {
      showAlert("Ledger entry deleted successfully");
      loadMemberLedger();
    } else {
      showAlert(result.message || "Delete failed");
    }
  } catch (err) {
    console.error("Ledger delete error:", err);
    showAlert("Server error");
  }
}

async function loadAllMemberLedger() {
  try {
    const startDate = document.getElementById("startDate")?.value || "";
    const endDate = document.getElementById("endDate")?.value || "";

    // Use date-filtered endpoint when dates provided, otherwise fetch all
    let url = "/admin/memberledger";
    if (startDate && endDate) {
      url = `/admin/member-recordledger?from=${startDate}&to=${endDate}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    const data = await res.json();
    const body = document.getElementById("ledgerDataTable");

    if (!body) {
      console.error("ledgerDataTable element not found");
      return;
    }

    if (data.length === 0) {
      body.innerHTML =
        '<tr><td colspan="5" class="p-2 text-center text-gray-500">No records found for the selected date range</td></tr>';
      const recordCount = document.getElementById("recordCount");
      if (recordCount) recordCount.textContent = "0 records found";
      return;
    }

    body.innerHTML = data
      .map(
        (row) => `
      <tr class="border-t hover:bg-gray-50">
        <td class="p-3">${row.phoneno}</td>
        <td class="p-3">${formatDate(row.transdate)}</td>
        <td class="p-3">${formatAmount(row.amount)}</td>
        <td class="p-3">${row.remark || "—"}</td>
        <td class="p-3">${row.paydate ? formatDate(row.paydate) : "—"}</td>
      </tr>
    `,
      )
      .join("");

    const recordCount = document.getElementById("recordCount");
    if (recordCount) {
      recordCount.textContent = `${data.length} records found`;
    }
  } catch (err) {
    console.error("Load memberLedger Error:", err);
    const body = document.getElementById("ledgerDataTable");
    if (body) {
      body.innerHTML =
        '<tr><td colspan="5" class="p-2 text-center text-red-500">Failed to load ledger data</td></tr>';
    }
  }
}

// Function to clear date filters
function clearDateFilters() {
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  if (startDate) startDate.value = "";
  if (endDate) endDate.value = "";
  loadAllMemberLedger();
}

// Function to apply current month filter
function loadCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  if (startDate) startDate.value = `${year}-${month}-01`;
  if (endDate) {
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    endDate.value = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  }
  loadAllMemberLedger();
}

function filterAllLedger() {
  loadAllMemberLedger();
}
function clearAllLedgerFilter() {
  clearDateFilters();
}
function loadAllLedgerCurrentMonth() {
  loadCurrentMonth();
}

// Add OCDA Expense (Screen E)
document.getElementById("ocdaForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector("button[type=submit]");
  const data = {
    docdate: form.docdate.value,
    voucher: form.voucher.value,
    project: form.project.value,
    amount: parseFloat(form.amount.value),
    remarks: form.remarks.value,
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  try {
    const res = await fetch("/admin/ocdaexpenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    showAlert(
      res.ok ? "Saved successfully!" : result.message || "Error saving data",
    );
    if (res.ok) {
      form.reset();
      loadOCDAExpenses(); // refresh display
    }
  } catch (err) {
    console.error("OCDA Submit Error:", err.message || err);
    showAlert("Server error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
});

window.addEventListener("DOMContentLoaded", () => {
  loadAllMemberLedger();
});

async function loadProjectDropdown() {
  try {
    if (!token) {
      throw new Error("Token not found in localStorage.");
    }

    const res = await fetch("/admin/stdxpenses", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    const project = await res.json();
    const dropdown = document.getElementById("projectDropdown");
    dropdown.innerHTML = project
      .map(
        (p) =>
          `<option value="${p.expscode}">${p.expsdesc} (${p.expscode})</option>`,
      )
      .join("");
  } catch (err) {
    console.error("Project List Load Error:", err.message || err);
  }
}

//render ocda update
async function loadOCDAExpenses() {
  try {
    const res = await fetch("/admin/ocdaexpenses", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();
    const body = document.getElementById("ocdaTableBody");
    body.innerHTML = data
      .map(
        (row) => `
      <tr class="border-t">
        <td class="p-2">${row.docdate?.split("T")[0]}</td>
        <td class="p-2">${row.voucher}</td>
        <td class="p-2">${row.project}</td>
        <td class="p-2">${row.remarks}</td>
        <td class="p-2">₦${parseFloat(row.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Load OCDA Expenses Error:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadOCDAExpenses();
  loadProjectDropdown();
});

//  Monthly Summary Update (Screen F)
document
  .getElementById("summaryForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector("button[type=submit]");

    const year = form.year.value;
    const month = form.month.value.padStart(2, "0");

    const data = { year, month };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Generating...";
    }

    try {
      const res = await fetch("/admin/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      showAlert(
        res.ok
          ? `Summary for ${year}-${month} generated!`
          : result.message || "Error generating summary.",
      );

      if (res.ok) {
        form.reset();
        loadMonthlySummary?.(); // refresh if function exists
      }
    } catch (err) {
      console.error("Summary Error:", err);
      showAlert("⚠️ Server error. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Generate";
      }
    }
  });

//enquiry dropdown
async function loadEnquiryDropdowns() {
  try {
    const res = await fetch("/admin/enquiry/options", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const result = await res.json();

    // Populate dropdowns
    const memberSelect = document.getElementById("enquiry-member");
    const wardSelect = document.getElementById("enquiry-ward");
    const quarterSelect = document.getElementById("enquiry-quarter");

    result.members.forEach((m) => {
      memberSelect.innerHTML += `<option value="${m.PhoneNumber}">${m.fullname} (${m.PhoneNumber})</option>`;
    });

    result.wards.forEach((w) => {
      wardSelect.innerHTML += `<option value="${w}">${w}</option>`;
    });

    result.quarters.forEach((q) => {
      quarterSelect.innerHTML += `<option value="${q}">${q}</option>`;
    });
  } catch (err) {
    console.error("Failed to load enquiry dropdowns", err);
  }
}
window.addEventListener("DOMContentLoaded", () => {
  loadAdmins();
  loadEnquiryDropdowns();
});

// Enquiry System (Screen H)
// Toggle dropdowns based on radio selection
document.querySelectorAll('input[name="enquiryType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const type = radio.value;

    ["member", "ward", "quarter"].forEach((t) => {
      const group = document.getElementById(`${t}SelectGroup`);
      group.classList.toggle("hidden", t !== type);
    });

    // Clear dropdown selections
    document.getElementById("enquiry-member").value = "ALL";
    document.getElementById("enquiry-ward").value = "ALL";
    document.getElementById("enquiry-quarter").value = "ALL";
  });
});

//  Submit Enquiry
document
  .getElementById("enquiryForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const type = form.enquiryType.value;
    const mode = form.detail.checked ? "detail" : "summary";
    const start = form.start.value;
    const end = form.end.value;

    //  Grab the right param based on visible group
    let value = "ALL";
    if (type === "member") {
      value = document.getElementById("enquiry-member").value;
    } else if (type === "ward") {
      value = document.getElementById("enquiry-ward").value;
    } else if (type === "quarter") {
      value = document.getElementById("enquiry-quarter").value;
    }

    const params = new URLSearchParams({ type, param: value, mode });
    if (start) params.append("start", start);
    if (end) params.append("end", end);

    try {
      const res = await fetch(`/admin/enquiry?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      const result = await res.json();

      if (!res.ok) return showAlert(result.message || "Enquiry failed.");

      // 👇 CALL IT HERE, passing type and mode!
      renderEnquiryResults(result, type, mode);
    } catch (err) {
      console.error("Enquiry Error:", err);
      showAlert("Server error");
    }
  });

//  Render Results
function renderEnquiryResults(data, type, mode) {
  const summary = Array.isArray(data.summary) ? data.summary : [];
  const detail = Array.isArray(data.detail) ? data.detail : [];

  const wrapper = document.getElementById("enquiryTableWrapper");
  const container = document.getElementById("enquiryResults");
  container.classList.remove("hidden");

  // --- SUMMARY TABLE ---
  let summaryHtml = "";
  if (type === "member") {
    summaryHtml = `
    <table class="w-full border border-gray-400 mb-6 shadow-sm" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Phone Number</th>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Name</th>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Total</th>
        </tr>
      </thead>
      <tbody>
        ${summary
          .map(
            (row) => `
          <tr>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.PhoneNumber || row.phoneno || ""}</td>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.fullname || ""}</td>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.total}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
  } else if (type === "ward") {
    summaryHtml = `
    <table class="w-full border border-gray-400 mb-6 shadow-sm" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Ward</th>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Total</th>
        </tr>
      </thead>
      <tbody>
        ${summary
          .map(
            (row) => `
          <tr>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.Ward || ""}</td>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.total}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
  } else if (type === "quarter") {
    summaryHtml = `
    <table class="w-full border border-gray-400 mb-6 shadow-sm" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Quarter</th>
          <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Total</th>
        </tr>
      </thead>
      <tbody>
        ${summary
          .map(
            (row) => `
          <tr>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.Quarters || row.Quarter || ""}</td>
            <td class="border border-gray-400 px-4 py-2 text-center">${row.total}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
  }

  // --- DETAIL TABLE ---
  let detailHtml = "";
  if (mode === "detail") {
    if (type === "member") {
      const grouped = {};
      detail.forEach((tx) => {
        if (!grouped[tx.phoneno]) grouped[tx.phoneno] = [];
        grouped[tx.phoneno].push(tx);
      });
      detailHtml = Object.entries(grouped)
        .map(
          ([phoneno, txs]) => `
      <div class="mb-8 border border-gray-300 rounded shadow-sm">
        <div class="font-bold text-lg bg-gray-100 px-4 py-2 cursor-pointer toggle-header" data-target="member-${phoneno.replace(/[^a-zA-Z0-9]/g, "_")}">
          ${phoneno} - ${txs[0]?.fullname || ""}
        </div>

        <div id="member-${phoneno.replace(/[^a-zA-Z0-9]/g, "_")}" class="toggle-table hidden">
          <table class="w-full border border-gray-400 shadow-sm" style="border-collapse: collapse;">
            <thead>
              <tr>
                <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Date</th>
                <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Amount</th>
                <th class="border border-gray-400 px-4 py-2 text-center bg-gray-100">Remark</th>
              </tr>
            </thead>
            <tbody>
              ${txs
                .map(
                  (tx) => `
                <tr>
                  <td class="border border-gray-400 px-4 py-2 text-center">${tx.transdate}</td>
                  <td class="border border-gray-400 px-4 py-2 text-center">${tx.amount}</td>
                  <td class="border border-gray-400 px-4 py-2 text-center">${tx.remark}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `,
        )
        .join("");
    } else if (type === "ward") {
      // For 'ward' type, calculate total amount for each member within each ward
      const wardsWithMemberTotals = detail.map((w) => {
        // Group transactions by member within each ward to calculate individual member totals
        const groupedMembers = {};
        (Array.isArray(w.members) ? w.members : []).forEach((tx) => {
          if (!groupedMembers[tx.phoneno]) {
            groupedMembers[tx.phoneno] = {
              phoneno: tx.phoneno,
              fullname: tx.fullname,
              totalAmount: 0,
            };
          }
          groupedMembers[tx.phoneno].totalAmount += parseFloat(tx.amount) || 0;
        });
        return { ...w, members: Object.values(groupedMembers) }; // Convert grouped object back to array
      });

      detailHtml = wardsWithMemberTotals
        .map((w, wardIndex) => {
          const uniqueId = `ward-${wardIndex}-${w.ward.replace(/[^a-zA-Z0-9]/g, "_")}`;

          return `
    <div class="mb-8 border border-gray-300 rounded shadow">
      <div class="font-bold text-blue-600 text-lg bg-gray-50 px-4 py-2 cursor-pointer toggle-header"
          data-target="${uniqueId}">
        Ward: ${w.ward}
      </div>

      <div id="${uniqueId}" class="toggle-tables hidden">
        <table class="w-full border border-gray-400" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th class="border px-4 py-2 bg-gray-100 text-center">Phone</th>
              <th class="border px-4 py-2 bg-gray-100 text-center">Name</th>
              <th class="border px-4 py-2 text-center bg-gray-100">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(Array.isArray(w.members) ? w.members : [])
              .map(
                (m) => `
              <tr>
                <td class="border px-4 py-2 text-center">${m.phoneno}</td>
                <td class="border px-4 py-2 text-center">${m.fullname}</td>
                <td class="border px-4 py-2 text-center">${m.totalAmount}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
        })
        .join("");
    } else if (type === "quarter") {
      // For 'quarter' type, calculate total amount for each ward within each quarter,
      // and also calculate member totals within those wards.
      const quartersWithWardAndMemberTotals = detail.map((q) => {
        const wardsWithTotals = (Array.isArray(q.wards) ? q.wards : []).map(
          (w) => {
            // Group transactions by member within each ward for individual member totals
            const groupedMembers = {};
            (Array.isArray(w.members) ? w.members : []).forEach((tx) => {
              if (!groupedMembers[tx.phoneno]) {
                groupedMembers[tx.phoneno] = {
                  phoneno: tx.phoneno,
                  fullname: tx.fullname,
                  totalAmount: 0,
                };
              }
              groupedMembers[tx.phoneno].totalAmount +=
                parseFloat(tx.amount) || 0;
            });

            // Calculate total for all members within this ward
            const wardTotalAmount = Object.values(groupedMembers).reduce(
              (sum, m) => sum + m.totalAmount,
              0,
            );

            return {
              ...w,
              members: Object.values(groupedMembers),
              wardTotalAmount,
            };
          },
        );

        // Calculate total for the entire quarter
        const quarterTotalAmount = wardsWithTotals.reduce(
          (sum, w) => sum + w.wardTotalAmount,
          0,
        );

        return { ...q, wards: wardsWithTotals, quarterTotalAmount };
      });

      detailHtml = quartersWithWardAndMemberTotals
        .map((q, quarterIndex) => {
          const quarterUniqueId = `quarter-${quarterIndex}-${q.quarter.replace(/[^a-zA-Z0-9]/g, "_")}`;

          return `
    <div class="mb-10 border border-gray-300 rounded shadow">
      <div class="text-xl text-indigo-700 font-bold px-4 py-2 bg-gray-100 cursor-pointer toggle-header" data-target="${quarterUniqueId}">
        Quarter: ${q.quarter}
      </div>

      <div id="${quarterUniqueId}" class="">
        ${q.wards
          .map((w, wardIndex) => {
            const wardInQuarterUniqueId = `quarter-${quarterIndex}-ward-${wardIndex}-${w.ward.replace(/[^a-zA-Z0-9]/g, "_")}`;

            return `
          <div class="ml-4 mt-4 border border-gray-200 rounded">
            <div class="font-semibold text-lg text-blue-500 px-4 py-2 bg-gray-50 cursor-pointer toggle-header"
                data-target="${wardInQuarterUniqueId}">
              Ward: ${w.ward} (Total: ${w.wardTotalAmount.toFixed(2)})
            </div>

            <div id="${wardInQuarterUniqueId}" class="toggle-table hidden">
              <table class="w-full border border-gray-400" style="border-collapse: collapse;">
                <thead>
                  <tr>
                    <th class="border px-4 py-2 bg-gray-100 text-center">Phone</th>
                    <th class="border px-4 py-2 bg-gray-100 text-center">Name</th>
                    <th class="border px-4 py-2 bg-gray-100 text-center">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(Array.isArray(w.members) ? w.members : [])
                    .map(
                      (m) => `
                    <tr>
                      <td class="border px-4 py-2 text-center">${m.phoneno}</td>
                      <td class="border px-4 py-2 text-center">${m.fullname}</td>
                      <td class="border px-4 py-2 text-center">${m.totalAmount.toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
          })
          .join("")}
      </div>
    </div>
  `;
        })
        .join("");
    }
  }

  wrapper.innerHTML = `
  <div class="flex flex-col lg:flex-row gap-6 items-start">
      <div class="w-full lg:w-1/2">
        ${summaryHtml}
      </div>
      <div class="w-full lg:w-1/2">
        ${detailHtml}
      </div>
    </div>
  `;

  // --- CONSOLIDATED TOGGLE EVENT HANDLER ---
  document.addEventListener("click", function (e) {
    console.log("Click detected on:", e.target);
    console.log("Classes:", e.target.classList);

    if (e.target.classList.contains("toggle-header")) {
      e.preventDefault();
      e.stopPropagation();

      const targetId = e.target.getAttribute("data-target");
      console.log("Toggle header clicked, targeting ID:", targetId);

      // Debug: List all elements with IDs
      const allIds = Array.from(document.querySelectorAll("[id]")).map(
        (el) => el.id,
      );
      console.log("All available IDs in DOM:", allIds);

      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        console.log("✅ Found target element:", targetElement);
        console.log(
          "Current classes before toggle:",
          targetElement.classList.toString(),
        );

        targetElement.classList.toggle("hidden");

        console.log(
          "Classes after toggle:",
          targetElement.classList.toString(),
        );
        console.log("Is hidden?", targetElement.classList.contains("hidden"));
      } else {
        console.error("❌ Target element NOT FOUND with ID:", targetId);
        console.error("Available IDs:", allIds);

        // Try alternative search methods
        const byQuery = document.querySelector(`#${CSS.escape(targetId)}`);
        console.log("Alternative query result:", byQuery);

        showAlert(
          `❗ Element with ID "${targetId}" not found!\nAvailable IDs: ${allIds.join(", ")}`,
        );
      }
    }
  });

  // Prepare hidden export table
  const allRows = [...summary, ...detail];
  if (allRows.length > 0) {
    const headers = Object.keys(allRows[0]);
    const headerRow = headers.map((h) => `<th>${h}</th>`).join("");
    const dataRows = allRows
      .map(
        (row) =>
          `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`,
      )
      .join("");

    document.getElementById("enquiryTableExport").innerHTML = `
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table>
    `;
  } else {
    document.getElementById("enquiryTableExport").innerHTML = "";
  }
}

// Export
// function exportEnquiry(type) {
//   const table = document.getElementById("enquiryTableExport");

//   if (type === "excel") {
//     const wb = XLSX.utils.table_to_book(table, { sheet: "Enquiry" });
//     XLSX.writeFile(wb, "enquiry.xlsx");
//   } else if (type === "pdf") {
//     const doc = new jspdf.jsPDF("landscape", "pt", "a4");
//     doc.autoTable({
//       html: "#enquiryTableExport",
//       styles: {
//         font: "helvetica",
//         fontSize: 10,
//         cellPadding: 5,
//         valign: "middle",
//         halign: "center",
//         lineColor: [200, 200, 200],
//         lineWidth: 0.2,
//       },
//       headStyles: {
//         fillColor: [240, 240, 240],
//         textColor: 20,
//         fontStyle: "bold",
//       },
//       alternateRowStyles: { fillColor: [245, 245, 245] },
//       margin: { top: 40 },
//       didDrawPage: function (data) {
//         doc.setFontSize(14);
//         doc.text("OCDA Enquiry Report", data.settings.margin.left, 30);
//       },
//     });
//     doc.save("enquiry.pdf");
//   }
// }

//  Print
function printEnquiry() {
  const content = document.getElementById("enquiryTableWrapper").innerHTML;
  const win = window.open("", "", "width=1000,height=800");
  win.document.write(`
    <html>
      <head>
        <title>Print Enquiry</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #444; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h2>OCDA Enquiry Report</h2>
        ${content}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

// ===== FINAL ACCOUNT REPORT (Item 4) =====
async function loadFinalAccount() {
  const fromInput = document.getElementById("finalAccountFrom");
  const toInput = document.getElementById("finalAccountTo");
  const resultDiv = document.getElementById("finalAccountResult");

  if (!fromInput || !toInput || !resultDiv) return;

  const from = fromInput.value;
  const to = toInput.value;

  if (!from || !to) {
    showAlert("Please select both start and end dates");
    return;
  }

  const fromDate = new Date(from);
  if (fromDate.getDate() !== 1) {
    showAlert("Start date must be the 1st of a month (e.g. 2025-01-01)");
    return;
  }

  resultDiv.innerHTML = '<p class="text-gray-500 text-sm p-4">Loading...</p>';

  try {
    const res = await fetch(`/admin/final-account?from=${from}&to=${to}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!res.ok) {
      resultDiv.innerHTML = `<p class="text-red-500 p-4">${data.message}</p>`;
      return;
    }

    const fmt = (n) =>
      `₦${parseFloat(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB");

    resultDiv.innerHTML = `
      <div id="finalAccountPrintArea" class="border rounded p-6 bg-white max-w-lg mx-auto mt-4">
        <h3 class="text-center font-bold text-lg mb-6 uppercase">Final Account</h3>
        <table class="w-full text-sm border-collapse">
          <tbody>
            <tr style="border-top:1px solid #ccc; border-bottom:1px solid #ccc">
              <td class="py-3 font-semibold">OPENING BALANCE AS AT ${fmtDate(data.fromDate)}</td>
              <td class="py-3 text-right font-mono">${fmt(data.openingBalance)}</td>
            </tr>
            <tr style="border-bottom:1px solid #ccc" class="cursor-pointer hover:bg-blue-50 transition-colors" title="Click to view income breakdown" onclick="loadFinalAccountDrilldown('income','${from}','${to}')">
              <td class="py-3 font-semibold">TOTAL INCOME <span class="text-blue-500 text-xs ml-2">▼ click to expand</span></td>
              <td class="py-3 text-right font-mono">${fmt(data.totalIncome)}</td>
            </tr>
            <tr id="incomeBreakdownRow" class="hidden">
              <td colspan="2" class="pb-3 pt-1"><div id="incomeBreakdownContent" class="bg-blue-50 rounded p-3 text-xs"></div></td>
            </tr>
            <tr style="border-bottom:1px solid #ccc" class="cursor-pointer hover:bg-orange-50 transition-colors" title="Click to view expenses breakdown" onclick="loadFinalAccountDrilldown('expenses','${from}','${to}')">
              <td class="py-3 font-semibold">TOTAL EXPENSES <span class="text-orange-500 text-xs ml-2">▼ click to expand</span></td>
              <td class="py-3 text-right font-mono">${fmt(data.totalExpenses)}</td>
            </tr>
            <tr id="expensesBreakdownRow" class="hidden">
              <td colspan="2" class="pb-3 pt-1"><div id="expensesBreakdownContent" class="bg-orange-50 rounded p-3 text-xs"></div></td>
            </tr>
            <tr style="border-top:2px solid black">
              <td class="py-3 font-bold">CURRENT BALANCE AS AT ${fmtDate(data.toDate)}</td>
              <td class="py-3 text-right font-mono font-bold">${fmt(data.currentBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-center gap-3 mt-4">
        <button onclick="printFinalAccount()" class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Print</button>
        <button onclick="clearFinalAccount()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">Clear</button>
      </div>
    `;
  } catch (err) {
    console.error("Final Account error:", err);
    resultDiv.innerHTML =
      '<p class="text-red-500 p-4">Server error loading final account</p>';
  }
}

function printFinalAccount() {
  const content = document.getElementById("finalAccountPrintArea")?.innerHTML;
  if (!content) return;
  const win = window.open("", "", "width=700,height=600");
  win.document.write(`<html><head><title>Final Account</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td{padding:8px 4px}.text-right{text-align:right}.font-mono{font-family:monospace}.hidden{display:none}</style>
    </head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}

function clearFinalAccount() {
  document.getElementById("finalAccountResult").innerHTML = "";
  document.getElementById("finalAccountFrom").value = "";
  document.getElementById("finalAccountTo").value = "";
}

async function loadFinalAccountDrilldown(type, from, to) {
  const rowId =
    type === "income" ? "incomeBreakdownRow" : "expensesBreakdownRow";
  const contentId =
    type === "income" ? "incomeBreakdownContent" : "expensesBreakdownContent";
  const row = document.getElementById(rowId);
  const content = document.getElementById(contentId);
  if (!row || !content) return;

  // Toggle: if already visible, collapse and return
  if (!row.classList.contains("hidden")) {
    row.classList.add("hidden");
    return;
  }

  content.innerHTML = '<p class="text-gray-400 italic">Loading...</p>';
  row.classList.remove("hidden");

  const fmt = (n) =>
    `₦${parseFloat(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  try {
    if (type === "income") {
      const res = await fetch(
        `/admin/ocda-income-analysis?start=${from}&end=${to}&mode=summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        },
      );
      const data = await res.json();
      if (!data.length) {
        content.innerHTML =
          '<p class="text-gray-500">No income records found.</p>';
        return;
      }
      content.innerHTML = `
        <table class="w-full border-collapse text-xs">
          <thead><tr class="bg-blue-100">
            <th class="border px-2 py-1 text-left">Description</th>
            <th class="border px-2 py-1 text-right">Amount</th>
          </tr></thead>
          <tbody>
            ${data
              .map(
                (r) => `<tr class="border-t">
              <td class="border px-2 py-1">${r.description || r.code || ""}</td>
              <td class="border px-2 py-1 text-right font-mono">${fmt(r.amount)}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;
    } else {
      const res = await fetch(
        `/admin/ocda-expenses-analysis?start=${from}&end=${to}&mode=summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        },
      );
      const data = await res.json();
      if (!data.length) {
        content.innerHTML =
          '<p class="text-gray-500">No expense records found.</p>';
        return;
      }
      content.innerHTML = `
        <table class="w-full border-collapse text-xs">
          <thead><tr class="bg-orange-100">
            <th class="border px-2 py-1 text-left">Description</th>
            <th class="border px-2 py-1 text-right">Amount</th>
          </tr></thead>
          <tbody>
            ${data
              .map(
                (r) => `<tr class="border-t">
              <td class="border px-2 py-1">${r.description || r.code || ""}</td>
              <td class="border px-2 py-1 text-right font-mono">${fmt(r.amount)}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;
    }
  } catch (err) {
    content.innerHTML = '<p class="text-red-500">Failed to load breakdown.</p>';
  }
}

async function loadOCDAExpensesAnalysis({
  start = "",
  end = "",
  code = "ALL",
  mode = "summary",
} = {}) {
  try {
    const params = new URLSearchParams({ start, end, code, mode });
    const res = await fetch(
      `/admin/ocda-expenses-analysis?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      },
    );
    const data = await res.json();
    renderOCDAExpensesAnalysis(data, mode);
  } catch (err) {
    console.error("Failed to load OCDA Expenses Analysis:", err);
    document.getElementById("ocdaExpensesAnalysisTable").innerHTML =
      '<tr><td colspan="5">Failed to load data</td></tr>';
  }
}

function renderOCDAExpensesAnalysis(data, mode) {
  const table = document.getElementById("ocdaExpensesAnalysisTable");
  if (!Array.isArray(data) || data.length === 0) {
    table.innerHTML = "<div>No data found</div>";
    return;
  }

  if (mode === "summary") {
    table.innerHTML = `
      <table class="min-w-full border border-gray-300">
        <thead class="bg-gray-100">
          <tr>
            <th class="p-2 border">Code</th>
            <th class="p-2 border">Description</th>
            <th class="p-2 border">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) => `
            <tr>
              <td class="p-2 border text-center">${row.code}</td>
              <td class="p-2 border text-center">${row.description}</td>
              <td class="p-2 border text-center">${formatAmount(row.amount)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  } else {
    const grouped = {};
    data.forEach((row) => {
      const key = `${row.description} (${row.code})`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    table.innerHTML = Object.entries(grouped)
      .map(
        ([heading, rows], index) => `
      <div class="mb-4 border rounded overflow-hidden shadow">
        <button class="w-full text-left px-4 py-2 bg-gray-100 font-bold" onclick="toggleGroup(${index})">
          ${heading}
        </button>
        <div id="group-${index}" class="hidden px-4 py-2">
          <table class="w-full border border-gray-400" style="border-collapse: collapse;">
            <thead>
              <tr>
                <th class="border px-2 py-1 text-center bg-gray-200">Date</th>
                <th class="border px-2 py-1 text-center bg-gray-200">Voucher No</th>
                <th class="border px-2 py-1 text-center bg-gray-200">Remark</th>
                <th class="border px-2 py-1 text-center bg-gray-200">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                <tr>
                  <td class="border px-2 py-1 text-center">${formatDate(row.date)}</td>
                  <td class="border px-2 py-1 text-center">${row.voucher || ""}</td>
                  <td class="border px-2 py-1 text-center">${row.remark || ""}</td>
                  <td class="border px-2 py-1 text-center">${formatAmount(row.amount)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `,
      )
      .join("");
  }
}

// Add this outside the render function
function toggleGroup(index) {
  const section = document.getElementById(`group-${index}`);
  if (section) section.classList.toggle("hidden");
}

async function toggleExpenseSummaryDrilldown(index) {
  const row = document.getElementById(`exp-drill-${index}`);
  const content = document.getElementById(`exp-drill-content-${index}`);
  if (!row) return;
  if (!row.classList.contains("hidden")) {
    row.classList.add("hidden");
    return;
  }
  row.classList.remove("hidden");

  // Get current form params
  const form = document.getElementById("ocdaExpensesAnalysisForm");
  const start = form?.start?.value || "";
  const end = form?.end?.value || "";
  // Get code from the data row's code attribute stored at render time
  const codeEl = document
    .querySelector(`#exp-drill-${index}`)
    .previousElementSibling?.querySelector("td");
  // Re-fetch detail for this specific code
  try {
    const params = new URLSearchParams({ start, end, mode: "detail" });
    const res = await fetch(`/admin/ocda-expenses-analysis?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    // The data at this index in summary corresponds to the same index in detail groups
    // Filter detail rows that belong to this group by matching the description
    const descCell = document.querySelector(
      `#exp-drill-${index}`,
    ).previousElementSibling;
    const descText =
      descCell?.querySelector("td")?.textContent?.replace("▼", "").trim() || "";

    const rows = data.filter(
      (r) => (r.description || r.remark || "").trim() === descText.trim(),
    );

    if (!rows.length) {
      content.innerHTML =
        '<span class="text-gray-400">No detail records.</span>';
      return;
    }

    content.innerHTML = `
      <table class="w-full border-collapse mt-1">
        <thead><tr class="bg-gray-200">
          <th class="border px-2 py-1 text-left">Date</th>
          <th class="border px-2 py-1 text-left">Remark</th>
          <th class="border px-2 py-1 text-right">Amount</th>
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr class="border-t">
            <td class="border px-2 py-1">${formatDate(r.date)}</td>
            <td class="border px-2 py-1">${r.remark || ""}</td>
            <td class="border px-2 py-1 text-right font-mono">${formatAmount(r.amount)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>`;
  } catch (err) {
    content.innerHTML =
      '<span class="text-red-400">Failed to load details.</span>';
  }
}

document
  .getElementById("ocdaExpensesAnalysisForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.mode.value;
    const start = form.start.value;
    const end = form.end.value;
    const code = form.code.value || "ALL";
    loadOCDAExpensesAnalysis({ start, end, code, mode });
  });

// ===== OCDA Income Analysis Report (Screen J) =====
async function loadOCDAIncomeAnalysis({
  start = "",
  end = "",
  code = "ALL",
  mode = "summary",
} = {}) {
  try {
    const params = new URLSearchParams({ start, end, code, mode });
    const res = await fetch(
      `/admin/ocda-income-analysis?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      },
    );
    const data = await res.json();
    renderOCDAIncomeAnalysis(data, mode);
  } catch (err) {
    console.error("Failed to load OCDA Income Analysis:", err);
    document.getElementById("ocdaIncomeAnalysisTable").innerHTML =
      "<div>Failed to load data</div>";
  }
}

const getCellClasses = () => "p-2 border text-center break-words";

// The toggle function for Income groups
function toggleIncomeGroup(index) {
  const group = document.getElementById(`income-group-${index}`);
  console.log("Toggling income group:", index, group);
  if (group) {
    group.classList.toggle("hidden");
  } else {
    console.error("Income Group not found:", `income-group-${index}`);
  }
}

async function toggleIncomeSummaryDrilldown(index, description) {
  const row = document.getElementById(`inc-drill-${index}`);
  const content = document.getElementById(`inc-drill-content-${index}`);
  if (!row) return;
  if (!row.classList.contains("hidden")) {
    row.classList.add("hidden");
    return;
  }
  row.classList.remove("hidden");

  const form = document.getElementById("ocdaIncomeAnalysisForm");
  const start = form?.start?.value || "";
  const end = form?.end?.value || "";

  try {
    const params = new URLSearchParams({
      start,
      end,
      mode: "detail",
      code: description,
    });
    const res = await fetch(`/admin/ocda-income-analysis?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!data.length || !data[0]?.transactions?.length) {
      content.innerHTML =
        '<span class="text-gray-400">No detail records.</span>';
      return;
    }

    const transactions = data[0].transactions;
    content.innerHTML = `
      <table class="w-full border-collapse mt-1">
        <thead><tr class="bg-gray-200">
          <th class="border px-2 py-1 text-left">Date</th>
          <th class="border px-2 py-1 text-left">Phone (Name)</th>
          <th class="border px-2 py-1 text-right">Amount</th>
        </tr></thead>
        <tbody>
          ${transactions
            .map(
              (t) => `<tr class="border-t">
            <td class="border px-2 py-1">${formatDate(t.date)}</td>
            <td class="border px-2 py-1">${t.phoneno_name || ""}</td>
            <td class="border px-2 py-1 text-right font-mono">${formatAmount(t.amount)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>`;
  } catch (err) {
    content.innerHTML =
      '<span class="text-red-400">Failed to load details.</span>';
  }
}

// Rewritten function for rendering OCDA Income Analysis
function renderOCDAIncomeAnalysis(data, mode) {
  const tableContainer = document.getElementById("ocdaIncomeAnalysisTable");
  if (!tableContainer) {
    console.error(
      "Element with ID 'ocdaIncomeAnalysisTable' not found. Cannot render income analysis.",
    );
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    tableContainer.innerHTML =
      '<div class="text-center text-gray-600 p-4">No income data found</div>';
    return;
  }

  if (mode === "summary") {
    tableContainer.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="p-2 border">Code</th>
              <th class="p-2 border">Description</th>
              <th class="p-2 border">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                <td class="p-2 border text-center break-words">${row.code || "No Code"}</td>
                <td class="p-2 border text-center break-words">${row.description?.trim() || row.code || "N/A"}</td>
                <td class="p-2 border text-center">${formatAmount(row.amount)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // Detail: Grouped table with expand/collapse, includes Comment column
    tableContainer.innerHTML = data
      .map(
        (group, index) => `
      <div class="mb-4 border rounded overflow-hidden shadow">
        <button class="w-full text-left px-4 py-2 bg-gray-100 font-bold hover:bg-gray-200 focus:outline-none" onclick="toggleIncomeGroup(${index})">
          ${group.code} (${group.transactions.length} transactions)
        </button>
        <div id="income-group-${index}" class="hidden">
          <div class="overflow-x-auto">
            <table class="w-full border border-gray-400" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th class="border px-2 py-1 text-center bg-gray-200 whitespace-nowrap">Date</th>
                  <th class="border px-2 py-1 text-center bg-gray-200">Phone(Name)</th>
                  <th class="border px-2 py-1 text-center bg-gray-200 whitespace-nowrap">Amount</th>
                  <th class="border px-2 py-1 text-center bg-gray-200">Comment</th>
                </tr>
              </thead>
              <tbody>
                ${group.transactions
                  .map(
                    (transaction) => `
                  <tr>
                    <td class="border px-2 py-1 text-center whitespace-nowrap">${formatDate(transaction.date)}</td>
                    <td class="border px-2 py-1 text-center overflow-hidden" style="word-break: break-all;">${transaction.phoneno_name}</td>
                    <td class="border px-2 py-1 text-center whitespace-nowrap">${formatAmount(transaction.amount)}</td>
                    <td class="border px-2 py-1 text-center">${transaction.comment || ""}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }
}

document
  .getElementById("ocdaIncomeAnalysisForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.mode.value;
    const start = form.start.value;
    const end = form.end.value;
    const code = form.code.value || "ALL";
    loadOCDAIncomeAnalysis({ start, end, code, mode });
  });

// Account Summary (View Member Ledger)

function showAccountSummary() {
  // Hide all tab content and show this one
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.add("hidden"));
  document.getElementById("account-summary").classList.remove("hidden");

  // Fetch and render account summary data
  fetchTable(
    "/admin/memberledger",
    "accountSummaryData",
    (row) => `
    <tr class="border-t">
      <td class="p-2">${row.phoneno}</td>
      <td class="p-2">${formatDate(row.transdate)}</td>
      <td class="p-2">${formatAmount(row.amount)}</td>
      <td class="p-2">${row.remark}</td>
      <td class="p-2">${formatDate(row.paydate)}</td>     
    </tr>
  `,
  );
}

// ===== MEMBER PAYMENT SCHEDULE REPORT =====

// Populate income classification dropdown on page load
async function loadPaymentScheduleDropdown() {
  try {
    const res = await fetch("/admin/incomeclass", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();
    const sel = document.getElementById("psRemark");
    if (!sel) return;
    // Clear all options except the first "All Classifications" option
    while (sel.options.length > 1) sel.remove(1);
    data.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.incomedesc;
      opt.textContent = item.incomedesc;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error("Payment schedule dropdown error:", err);
  }
}

async function loadPaymentSchedule() {
  const fromMonth = document.getElementById("psFromMonth").value;
  const fromYear = document.getElementById("psFromYear").value;
  const toMonth = document.getElementById("psToMonth").value;
  const toYear = document.getElementById("psToYear").value;
  const remarkSel = document.getElementById("psRemark");
  const remark = remarkSel.value;
  // Get display label for selected option
  const remarkLabel =
    remark === "ALL"
      ? "All Income"
      : remarkSel.options[remarkSel.selectedIndex].text;
  const result = document.getElementById("paymentScheduleResult");

  if (!fromYear || !toYear) {
    showAlert("Please enter both From Year and To Year", "warning");
    return;
  }

  result.innerHTML =
    '<p class="text-gray-400 text-sm p-4">Generating report...</p>';

  try {
    const params = new URLSearchParams({
      fromMonth,
      fromYear,
      toMonth,
      toYear,
      remark,
    });
    const res = await fetch(`/admin/payment-schedule?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!res.ok) {
      result.innerHTML = `<p class="text-red-500 p-4">${data.message}</p>`;
      return;
    }

    if (!data.members.length) {
      result.innerHTML =
        '<p class="text-gray-500 p-4">No payment records found for the selected period.</p>';
      return;
    }

    result.innerHTML = buildPaymentScheduleTable(data, remarkLabel);
  } catch (err) {
    console.error("Payment schedule error:", err);
    result.innerHTML =
      '<p class="text-red-500 p-4">Server error generating report.</p>';
  }
}

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function buildPaymentScheduleTable(data, remarkLabel) {
  const { columns, members, grandTotal } = data;
  const fmtAmt = (n) =>
    n
      ? `₦${parseFloat(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
      : "";

  // Column headers — show month name, and year underneath if range spans two years
  const spansTwoYears = columns.some((c) => c.year !== columns[0].year);
  const colHeaders = columns.map((c) =>
    spansTwoYears
      ? `${MONTH_NAMES[c.month - 1]}<br><span style="font-size:10px;font-weight:normal">${c.year}</span>`
      : MONTH_NAMES[c.month - 1],
  );

  // FIX 1: Use income label instead of "MONTHS"
  const incomeLabel =
    remarkLabel && remarkLabel !== "ALL" ? remarkLabel : "All Income";

  // Column width: distribute evenly, min 65px per month col
  const colW = Math.max(65, Math.floor(700 / columns.length));

  const thead = `
    <thead>
      <tr>
        <th class="ps-cell ps-hdr" rowspan="2">SN</th>
        <th class="ps-cell ps-hdr" rowspan="2">NAMES</th>
        <th class="ps-cell ps-hdr" colspan="${columns.length}">${incomeLabel}</th>
        <th class="ps-cell ps-hdr" rowspan="2">TOTAL</th>
      </tr>
      <tr>
        ${colHeaders.map((h) => `<th class="ps-cell ps-hdr ps-month">${h}</th>`).join("")}
      </tr>
    </thead>`;

  const tbody = members
    .map(
      (m, i) => `
    <tr>
      <td class="ps-cell ps-sn">${i + 1}</td>
      <td class="ps-cell ps-name">${m.fullname}</td>
      ${m.monthly.map((amt) => `<td class="ps-cell ps-amt">${fmtAmt(amt)}</td>`).join("")}
      <td class="ps-cell ps-total">${fmtAmt(m.total)}</td>
    </tr>
  `,
    )
    .join("");

  const grandRow = `
    <tr>
      <td class="ps-cell" colspan="2">GRAND TOTAL</td>
      ${columns.map(() => `<td class="ps-cell"></td>`).join("")}
      <td class="ps-cell ps-grand" colspan="2">
        <span class="ps-grand-val">${fmtAmt(grandTotal)}</span>
      </td>
    </tr>`;

  return `
    <style>
      .ps-wrap { font-family: Arial, sans-serif; font-size: 13px; }
      .ps-table { border-collapse: collapse; width: 100%; }
      .ps-cell { border: 1px solid #555; padding: 5px 8px; }
      .ps-hdr { background: #fff; font-weight: bold; text-align: center; }
      .ps-month { text-align: center; min-width: 70px; }
      .ps-sn { text-align: center; font-weight: bold; }
      .ps-name { font-weight: bold; white-space: nowrap; }
      .ps-amt { text-align: right; }
      .ps-total { text-align: right; font-weight: bold; }
      .ps-grand { text-align: right; font-weight: bold; }
      .ps-grand-label { margin-right: 24px; }
      .ps-grand-val { }
      tfoot {
        display: table-row-group;
      }
    </style>
    <div class="ps-wrap" id="paymentSchedulePrintArea">
      <table class="ps-table">
        ${thead}
        <tbody>${tbody}</tbody>
        <tfoot>${grandRow}</tfoot>
      </table>
    </div>`;
}

function printPaymentSchedule() {
  const el = document.getElementById("paymentSchedulePrintArea");
  if (!el) {
    showAlert("Generate the report first before printing", "warning");
    return;
  }
  const win = window.open("", "", "width=1100,height=800");
  win.document.write(`
    <html>
      <head>
        <title>Member Payment Schedule</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 8mm;
          }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #555; padding: 5px 8px; }
          th { background: #fff; font-weight: bold; text-align: center; }
          .ps-amt { text-align: right; }
          .ps-total { text-align: right; font-weight: bold; }
          .ps-sn { text-align: center; font-weight: bold; }
          .ps-name { font-weight: bold; white-space: nowrap; }
          .ps-grand { text-align: right; font-weight: bold; }
          .ps-grand-label { margin-right: 24px; }
          tfoot {
            display: table-row-group;
          }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${el.outerHTML}</body>
    </html>`);
  win.document.close();
  win.focus();
  win.print();
}

function clearPaymentSchedule() {
  document.getElementById("paymentScheduleResult").innerHTML = "";
  document.getElementById("psFromYear").value = "";
  document.getElementById("psToYear").value = "";
  document.getElementById("psRemark").value = "ALL";
}

// Load dropdown when the tab is opened
document.querySelectorAll(".tab-sub-button, .tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "payment-schedule") loadPaymentScheduleDropdown();
  });
});

// admin-static tables
const staticTypes = ["titles", "qualifications", "wards", "hontitles"];

async function loadStaticTable(type) {
  try {
    const tableBodyId = {
      titles: "titlesTableBody",
      qualifications: "qualificationsTableBody",
      wards: "wardsTableBody",
      hontitles: "hontitlesTableBody",
    }[type];

    const listEl = document.getElementById(tableBodyId);
    if (!listEl) {
      console.error(
        `Element with id ${tableBodyId} not found for type ${type}`,
      );
      return;
    }

    const res = await fetch(`/admin/static/${type}`);
    const data = await res.json();

    listEl.innerHTML = data
      .map((row) => {
        // Use Id if present, else use composite keys
        if (type === "wards") {
          // Use both ward and Quarter as keys if Id is missing
          const key =
            row.Id !== undefined
              ? row.Id
              : `${encodeURIComponent(row.ward)}|${encodeURIComponent(row.Quarter)}`;
          return `<tr data-id="${key}" class="hover:bg-gray-50">
          <td data-field="ward" contenteditable="false" class="text-center py-2 px-3 border border-gray-300">${row.ward || ""}</td>
          <td data-field="Quarter" contenteditable="false" class="text-center py-2 px-3 border border-gray-300">${row.Quarter || ""}</td>
          <td class="text-center py-2 px-3 border border-gray-300">
            <div class="flex justify-center gap-4">
              <button class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs" onclick="editRow('wards', '${row.ward}', '${row.Quarter}', this)">Edit</button>
              <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs" onclick="deleteRow('wards', '${row.ward}', '${row.Quarter}')">Delete</button>
            </div>
          </td>
        </tr>`;
        } else if (type === "hontitles") {
          // Use both Htitle and titlerank as keys if Id is missing
          const key =
            row.Id !== undefined
              ? row.Id
              : `${encodeURIComponent(row.Htitle)}|${encodeURIComponent(row.titlerank)}`;
          return `<tr data-id="${key}" class="hover:bg-gray-50">
          <td data-field="Htitle" contenteditable="false" class="text-center py-2 px-3 border border-gray-300">${row.Htitle || ""}</td>
          <td data-field="titlerank" contenteditable="false" class="text-center py-2 px-3 border border-gray-300">${row.titlerank || ""}</td>
          <td class="text-center py-2 px-3 border border-gray-300">
            <div class="flex justify-center gap-4">
              <button class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs" onclick="editRow('hontitles', '${row.Htitle}', '${row.titlerank}', this)">Edit</button>
              <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs" onclick="deleteRow('hontitles', '${row.Htitle}', '${row.titlerank}')">Delete</button>
            </div>
          </td>
        </tr>`;
        } else {
          // Titles and Qualifications
          const fieldMap = {
            titles: "title",
            qualifications: "qualification",
          };
          const field = fieldMap[type];
          const key =
            row.Id !== undefined ? row.Id : encodeURIComponent(row[field]);
          return `<tr data-id="${key}" class="hover:bg-gray-50">
          <td data-field="${field}" contenteditable="false" class="text-center py-2 px-3 border border-gray-300">${row[field] || ""}</td>
          <td class="text-center py-2 px-3 border border-gray-300">
            <div class="flex justify-center gap-4">
              <button class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs" onclick="editRow('${type}', '${row[field]}', null, this)">Edit</button>
              <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs" onclick="deleteRow('${type}', '${row[field]}')">Delete</button>
            </div>
          </td>
        </tr>`;
        }
      })
      .join("");
  } catch (err) {
    console.error(`Failed to load ${type}:`, err);
  }
}

async function addStaticValue(type) {
  const field = type.slice(0, -1);

  if (type === "wards") {
    const ward = document.getElementById("newWard").value.trim();
    const quarter = document.getElementById("newQuarter").value.trim();
    if (!ward || !quarter) return showAlert("Enter both ward and quarter");
    var body = { ward, Quarter: quarter };
  } else if (type === "hontitles") {
    const htitle = document.getElementById("newHtitle").value.trim();
    const titlerank =
      document.getElementById("newTitlerank")?.value.trim() || "";
    if (!htitle) return showAlert("Enter Hon Title");
    var body = { Htitle: htitle, titlerank };
  } else {
    const input = document.getElementById(`new${capitalize(field)}`);
    const value = input.value.trim();
    if (!value) return showAlert("Enter a value");
    var body = { [field]: value };
  }

  try {
    const res = await fetch(`/admin/static/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      if (type === "wards") {
        document.getElementById("newWard").value = "";
        document.getElementById("newQuarter").value = "";
      } else if (type === "hontitles") {
        document.getElementById("newHtitle").value = "";
        document.getElementById("newTitlerank") &&
          (document.getElementById("newTitlerank").value = "");
      } else {
        document.getElementById(`new${capitalize(field)}`).value = "";
      }
      loadStaticTable(type);
    } else {
      const result = await res.json();
      showAlert(result.error || "Insert failed");
    }
  } catch (err) {
    console.error(`Failed to insert into ${type}:`, err);
  }
}

// Edit Row for all static tables
function editRow(type, key1, key2, btn) {
  const row = btn.closest("tr");
  const fields = row.querySelectorAll("[data-field]");
  const editing = btn.textContent === "Save";

  if (editing) {
    // Save changes
    const body = {};
    fields.forEach((f) => (body[f.dataset.field] = f.textContent.trim()));

    let url = `/admin/static/${type}`;
    let params = "";

    if (type === "wards") {
      params = `?ward=${encodeURIComponent(key1)}&Quarter=${encodeURIComponent(key2)}`;
    } else if (type === "hontitles") {
      params = `?Htitle=${encodeURIComponent(key1)}&titlerank=${encodeURIComponent(key2)}`;
    } else {
      params = `?value=${encodeURIComponent(key1)}`;
    }

    fetch(url + params, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) return showAlert("Update failed");
        showAlert("Saved successfully!");
        btn.textContent = "Edit";
        fields.forEach((f) => f.setAttribute("contenteditable", "false"));
        loadStaticTable(type);
      })
      .catch((err) => {
        console.error("Update error:", err);
      });
  } else {
    // Enable editing
    fields.forEach((f) => f.setAttribute("contenteditable", "true"));
    btn.textContent = "Save";
    showAlert("Editing is enabled. You can now modify the fields.");
  }
}

// Delete Row for all static tables
async function deleteRow(type, key1, key2) {
  if (!(await showConfirm("Are you sure you want to delete this?"))) return;

  let url = `/admin/static/${type}`;
  let params = "";

  if (type === "wards") {
    params = `?ward=${encodeURIComponent(key1)}&Quarter=${encodeURIComponent(key2)}`;
  } else if (type === "hontitles") {
    params = `?Htitle=${encodeURIComponent(key1)}&titlerank=${encodeURIComponent(key2)}`;
  } else {
    params = `?value=${encodeURIComponent(key1)}`;
  }

  fetch(url + params, { method: "DELETE" })
    .then((res) => {
      if (!res.ok) return showAlert("Delete failed");
      showAlert("Deleted successfully!");
      loadStaticTable(type);
    })
    .catch((err) => console.error("Delete error:", err));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.addEventListener("DOMContentLoaded", () => {
  staticTypes.forEach(loadStaticTable);
});

// Submit notice/event
document
  .getElementById("noticeForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type=submit]");

    const token = localStorage.getItem("adminToken");
    const adminId = localStorage.getItem("adminId");
    const title = document.getElementById("noticeTitle").value;
    const content = document.getElementById("noticeContent").value;
    const type = document.getElementById("noticeType").value;

    if (!adminId) {
      showAlert("Admin ID missing. Please log in again.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";
    }

    try {
      const res = await fetch(`${BASE_URL}/admin/notices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, type }),
      });

      const result = await res.json();
      showAlert(result.message);

      if (res.ok) {
        this.reset();
        loadNotices();
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to post notice/event");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Post";
      }
    }
  });

// Function to load
async function loadNotices() {
  console.log("Loading notices...");
  try {
    const res = await fetch(`${BASE_URL}/admin/notices`); // Assuming this is the GET endpoint for notices
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const notices = await res.json();
    const list = document.getElementById("noticesList");

    if (!list) {
      console.error("Error: 'noticesList' element not found.");
      return;
    }

    if (notices.length === 0) {
      list.innerHTML =
        '<p class="text-gray-600">No notices or events posted yet.</p>';
      return;
    }

    list.innerHTML = notices
      .map(
        (n) => `
      <div class="mb-4 p-4 border rounded shadow" data-notice-id="${n.id}">
        <div class="font-bold">${n.title} <span class="text-xs text-gray-500">[${n.type}]</span></div>
        <div class="text-gray-700">${n.content}</div>
        <div class="text-xs text-gray-400">${new Date(n.created_at).toLocaleString()}</div>
        <div class="mt-2 flex space-x-2">
            <button class="bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-3 rounded edit-notice-btn"
                    data-id="${n.id}" 
                    data-title="${n.title}" 
                    data-content="${n.content}" 
                    data-type="${n.type}">Edit</button>
            <button class="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded delete-notice-btn"
                    data-id="${n.id}">Delete</button>
        </div>
      </div>
    `,
      )
      .join("");

    // Attach event listeners after rendering
    attachNoticeEventListeners();
  } catch (err) {
    console.error("Error loading notices:", err);
    const list = document.getElementById("noticesList");
    if (list) {
      list.innerText = "Failed to load notices/events.";
    }
  }
}

// Function to attach event listeners to dynamically created buttons
function attachNoticeEventListeners() {
  // Edit buttons
  document.querySelectorAll(".edit-notice-btn").forEach((button) => {
    button.onclick = function () {
      // Using onclick for simplicity, addEventListener is generally preferred
      const id = this.dataset.id;
      const title = this.dataset.title;
      const content = this.dataset.content;
      const type = this.dataset.type;

      // Populate the modal fields
      document.getElementById("editNoticeId").value = id;
      document.getElementById("editNoticeTitle").value = title;
      document.getElementById("editNoticeContent").value = content;
      document.getElementById("editNoticeType").value = type;

      // Show the modal
      document.getElementById("editNoticeModal").classList.remove("hidden");
    };
  });

  // Delete buttons
  document.querySelectorAll(".delete-notice-btn").forEach((button) => {
    button.onclick = async function () {
      const id = this.dataset.id;
      if (
        await showConfirm("Are you sure you want to delete this notice/event?")
      ) {
        await deleteNotice(id);
      }
    };
  });

  // Modal close button
  document.getElementById("cancelEditNoticeBtn").onclick = function () {
    document.getElementById("editNoticeModal").classList.add("hidden");
  };

  // Modal save button
  document.getElementById("saveEditNoticeBtn").onclick = async function () {
    const id = document.getElementById("editNoticeId").value;
    const title = document.getElementById("editNoticeTitle").value;
    const content = document.getElementById("editNoticeContent").value;
    const type = document.getElementById("editNoticeType").value;

    await updateNotice(id, title, content, type);
  };
}

// Function to supdate request
async function updateNotice(id, title, content, type) {
  try {
    const token = `Bearer ${localStorage.getItem("adminToken")}`;
    if (!token) {
      throw new Error("Token not found in localStorage. Please log in.");
    }

    const res = await fetch(`${BASE_URL}/admin/notices/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ title, content, type }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        `Failed to update notice: ${errorData.message || res.statusText}`,
      );
    }

    const data = await res.json();
    showAlert(data.message); // Or use a more sophisticated notification system

    document.getElementById("editNoticeModal").classList.add("hidden"); // Hide modal
    loadNotices(); // Reload notices to reflect changes
  } catch (err) {
    console.error("Error updating notice:", err);
    showAlert(err.message);
  }
}

// Function to delete request
async function deleteNotice(id) {
  try {
    const token = `Bearer ${localStorage.getItem("adminToken")}`;
    if (!token) {
      throw new Error("Token not found in localStorage. Please log in.");
    }

    const res = await fetch(`${BASE_URL}/admin/notices/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        `Failed to delete notice: ${errorData.message || res.statusText}`,
      );
    }

    const data = await res.json();
    showAlert(data.message);
    loadNotices(); // Reload notices to reflect deletion
  } catch (err) {
    console.error("Error deleting notice:", err);
    showAlert(err.message);
  }
}

// Call loadNotices() when the notices tab is shown
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "notices-section") loadNotices();
    if (btn.dataset.tab === "contactus-section") loadContactUs();
    if (btn.dataset.tab === "faq-section") loadFaqAdmin();
  });
});

// ===== CONTACT US MANAGEMENT (Item 2) =====
async function loadContactUs() {
  try {
    const res = await fetch("/admin/contactus", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        document.getElementById("contactUsTitle").value = data.title || "";
        document.getElementById("contactUsContent").value = data.content || "";
      }
    }
  } catch (err) {
    console.error("Load contact us error:", err);
  }
}

async function saveContactUs() {
  const title = document.getElementById("contactUsTitle").value.trim();
  const content = document.getElementById("contactUsContent").value.trim();
  const btn = document.getElementById("saveContactUsBtn");
  const status = document.getElementById("contactUsStatus");

  if (!title || !content) {
    showAlert("Title and content are required");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const res = await fetch("/admin/contactus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ title, content }),
    });
    const result = await res.json();
    status.textContent = res.ok
      ? "✅ Saved successfully"
      : result.message || "Save failed";
    status.className = `text-sm ${res.ok ? "text-green-600" : "text-red-500"}`;
    status.classList.remove("hidden");
    setTimeout(() => status.classList.add("hidden"), 3000);
  } catch (err) {
    console.error("Save contact us error:", err);
    showAlert("Server error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
}

// ===== FAQ MANAGEMENT (Item 3) =====
async function loadFaqAdmin() {
  const list = document.getElementById("faqAdminList");
  if (!list) return;
  list.innerHTML = '<p class="text-sm text-gray-400">Loading...</p>';

  try {
    const res = await fetch("/admin/faq", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!data.length) {
      list.innerHTML =
        '<p class="text-sm text-gray-500">No FAQ entries yet.</p>';
      return;
    }

    list.innerHTML = data
      .map(
        (item) => `
      <div class="border rounded p-4 bg-white" id="faq-item-${item.id}">
        <div class="flex justify-between items-start gap-2">
          <div class="flex-1">
            <p class="font-semibold text-sm faq-question">${item.question}</p>
            <p class="text-sm text-gray-600 mt-1 faq-answer">${item.answer}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="editFaqEntry(${item.id}, \`${item.question.replace(/`/g, "\\`")}\`, \`${item.answer.replace(/`/g, "\\`")}\`)"
              class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
            <button onclick="deleteFaqEntry(${item.id})"
              class="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Load FAQ admin error:", err);
    list.innerHTML = '<p class="text-red-500 text-sm">Failed to load FAQ</p>';
  }
}

async function addFaqEntry() {
  const question = document.getElementById("newFaqQuestion").value.trim();
  const answer = document.getElementById("newFaqAnswer").value.trim();
  const btn = document.getElementById("addFaqBtn");

  if (!question || !answer) {
    showAlert("Question and answer are required");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Adding...";

  try {
    const res = await fetch("/admin/faq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ question, answer }),
    });
    const result = await res.json();
    if (res.ok) {
      document.getElementById("newFaqQuestion").value = "";
      document.getElementById("newFaqAnswer").value = "";
      loadFaqAdmin();
    } else {
      showAlert(result.message || "Failed to add FAQ entry");
    }
  } catch (err) {
    console.error("Add FAQ error:", err);
    showAlert("Server error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add FAQ Entry";
  }
}

function editFaqEntry(id, question, answer) {
  const existing = document.getElementById("faqEditModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "faqEditModal";
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
      <h3 class="text-lg font-bold mb-4">Edit FAQ Entry</h3>
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Question</label>
        <input type="text" id="editFaqQuestion" value="${question.replace(/"/g, "&quot;")}" class="border rounded w-full px-3 py-2 text-sm" />
      </div>
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1">Answer</label>
        <textarea id="editFaqAnswer" rows="5" class="border rounded w-full px-3 py-2 text-sm">${answer}</textarea>
      </div>
      <div class="flex gap-2 justify-end">
        <button onclick="document.getElementById('faqEditModal').remove()"
          class="px-4 py-2 bg-gray-300 rounded text-sm">Cancel</button>
        <button id="saveFaqEditBtn" onclick="saveFaqEdit(${id})"
          class="px-4 py-2 bg-blue-600 text-white rounded text-sm">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveFaqEdit(id) {
  const question = document.getElementById("editFaqQuestion").value.trim();
  const answer = document.getElementById("editFaqAnswer").value.trim();
  const btn = document.getElementById("saveFaqEditBtn");

  if (!question || !answer) {
    showAlert("Question and answer are required");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const res = await fetch(`/admin/faq/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify({ question, answer }),
    });
    const result = await res.json();
    if (res.ok) {
      showAlert("FAQ entry updated");
      document.getElementById("faqEditModal").remove();
      loadFaqAdmin();
    } else {
      showAlert(result.message || "Update failed");
    }
  } catch (err) {
    console.error("FAQ edit error:", err);
    showAlert("Server error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }
}

async function deleteFaqEntry(id) {
  if (!(await showConfirm("Delete this FAQ entry?"))) return;
  try {
    const res = await fetch(`/admin/faq/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const result = await res.json();
    if (res.ok) {
      loadFaqAdmin();
    } else {
      showAlert(result.message || "Delete failed");
    }
  } catch (err) {
    console.error("FAQ delete error:", err);
    showAlert("Server error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  staticTypes.forEach(loadStaticTable);

  // Prevent default form submission and use AJAX for all static tables
  document
    .getElementById("addHontitleForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      addStaticValue("hontitles");
    });
  document
    .getElementById("addQualificationForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      addStaticValue("qualifications");
    });
  document
    .getElementById("addWardsForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      addStaticValue("wards");
    });
  document
    .getElementById("addTitleForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      addStaticValue("titles");
    });
});

document.addEventListener("DOMContentLoaded", () => {
  // Populate Title
  fetch("/admin/static/titles")
    .then((res) => res.json())
    .then((data) => {
      const titleDropdown = document.getElementById("title");
      data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.title;
        option.textContent = item.title;
        titleDropdown.appendChild(option);
      });
    });

  // Populate HonTitle
  fetch("/admin/static/hontitles")
    .then((res) => res.json())
    .then((data) => {
      const honTitleDropdown = document.getElementById("honTitle");
      data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.Htitle;
        option.textContent = item.Htitle;
        honTitleDropdown.appendChild(option);
      });
    });

  // Populate qualifications
  fetch("/admin/static/qualifications")
    .then((res) => res.json())
    .then((data) => {
      const qualificationDropdown = document.getElementById("qualifications");
      data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.qualification;
        option.textContent = item.qualification;
        qualificationDropdown.appendChild(option);
      });
    });
});

document.addEventListener("DOMContentLoaded", async () => {
  const quarterDropdown = document.getElementById("quarters");
  const wardDropdown = document.getElementById("ward");

  let wardData = [];

  try {
    const res = await fetch("/admin/static/wards");
    wardData = await res.json();

    // Populate quarter dropdown (unique quarters only)
    const uniqueQuarters = [...new Set(wardData.map((item) => item.Quarter))];

    uniqueQuarters.forEach((quarter) => {
      const option = document.createElement("option");
      option.value = quarter;
      option.textContent = quarter;
      quarterDropdown.appendChild(option);
    });

    // Filter and populate wards when a quarter is selected
    quarterDropdown.addEventListener("change", () => {
      const selectedQuarter = quarterDropdown.value;

      // Clear existing ward options except default
      wardDropdown.innerHTML = '<option value="">Select Ward</option>';

      const filteredWards = wardData.filter(
        (item) => item.Quarter === selectedQuarter,
      );
      filteredWards.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.ward;
        option.textContent = item.ward;
        wardDropdown.appendChild(option);
      });
    });
  } catch (err) {
    console.error("Failed to fetch wards:", err);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const stateDropdown = document.getElementById("state");

  try {
    const res = await fetch("/admin/static/states");

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Non-JSON response:", text);
      return;
    }

    const states = await res.json();

    if (!Array.isArray(states)) {
      console.error("Expected array but got:", states);
      return;
    }

    states.forEach((state) => {
      const option = document.createElement("option");
      option.value = state.statecode;
      option.textContent = state.statename;
      stateDropdown.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading states:", err);
  }
});

// =============================================================
// DATA-DRIVEN PDF EXPORT FUNCTIONS
// Replace the corresponding old functions in admin-dashboard.js
// =============================================================

// Shared PDF styles injected into every export wrapper
const PDF_STYLES = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
    h1  { font-size: 15px; text-align: center; margin-bottom: 3px; }
    .sub { text-align: center; font-size: 10px; color: #555; margin-bottom: 14px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead { display: table-header-group; }        /* ✅ was table-row-group — breaks repeat on each page */
    th, td { border: 1px solid #bbb; padding: 5px 7px; }
    th { background: #efefef; font-weight: bold; text-align: center; font-size: 11px; }
    td { text-align: left; }
    td.center { text-align: center; }
    td.amt { text-align: right; font-family: monospace; }
    tfoot td { background: #f5f5f5; font-weight: bold; }
    tfoot { display: table-footer-group; }        /* ✅ added — pins tfoot to bottom of each page */

    tr { page-break-inside: avoid; break-inside: avoid; }          /* ✅ added break-inside (modern) */
    tbody tr { page-break-inside: avoid; break-inside: avoid; }    /* ✅ target tbody rows explicitly */

    .group { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .group-heading {
      background: #e2e2e2; font-weight: bold; padding: 5px 8px;
      border: 1px solid #bbb; font-size: 11px;
      page-break-after: avoid; break-after: avoid;                  /* ✅ added break-after (modern) */
    }

    .page-break { page-break-after: always; break-after: page; }   /* ✅ added break-after: page */

    .grand-total {
      text-align: right; font-size: 12px; font-weight: bold;
      margin-top: 10px; border-top: 2px solid #333; padding-top: 6px;
      page-break-inside: avoid; break-inside: avoid;               /* ✅ added break-inside (modern) */
    }
    .section-title {
      font-size: 12px; font-weight: bold; margin: 10px 0 4px;
      border-bottom: 1px solid #ccc; padding-bottom: 3px;
      page-break-after: avoid; break-after: avoid;                 /* ✅ added break-after (modern) */
    }
    .breakdown-table { margin: 4px 0 8px 0; }
    .breakdown-table th { background: #dde8f5; font-size: 10px; }
    .breakdown-table.expenses th { background: #fdebd0; }
  </style>
`;

// Helper: Nigerian naira format
function fmtN(n) {
  return parseFloat(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  });
}

// Helper: date display
function fmtD(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

// Helper: build and trigger html2pdf download
function triggerPDF(wrapper, filename, orientation = "portrait") {
  html2pdf()
    .set({
      margin: 0.4,
      filename,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation },
    })
    .from(wrapper)
    .save();
}

// =============================================================
// 1. MEMBER LIST  (replaces exportMembers for type "pdf")
// =============================================================
async function exportMembers(type) {
  if (type === "excel") {
    const table = document.getElementById("memberTableExport");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Members" });
    XLSX.writeFile(wb, "members.xlsx");
    return;
  }

  if (type === "print") {
    const table = document.getElementById("memberTableExport");
    const win = window.open("", "", "width=1000,height=800");
    win.document.write(`
      <html><head><title>OCDA Members</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head><body>
        <h2>OCDA Member List</h2>
        ${table.outerHTML}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    return;
  }

  // PDF — fetch fresh data
  const btn = document.querySelector(
    "button[onclick=\"exportMembers('pdf')\"]",
  );
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    const res = await fetch("/admin/members", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      showAlert("No member data to export", "warning");
      return;
    }

    const rows = data
      .map(
        (m) => `
      <tr>
        <td class="center">${m.PhoneNumber || ""}</td>
        <td>${m.Surname || ""}</td>
        <td>${m.othernames || ""}</td>
        <td class="center">${m.Title || ""}</td>
        <td class="center">${m.Sex || ""}</td>
        <td class="center">${m.Quarters || ""}</td>
        <td class="center">${m.Ward || ""}</td>
        <td>${m.Town || ""}</td>
        <td>${m.State || ""}</td>
      </tr>`,
      )
      .join("");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Registered Members</h1>
      <div class="sub">Total: ${data.length} members &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString("en-GB")}</div>
      <table>
        <thead>
          <tr>
            <th>Phone No</th><th>Surname</th><th>Other Names</th>
            <th>Title</th><th>Sex</th><th>Quarter</th>
            <th>Ward</th><th>Town</th><th>State</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    triggerPDF(wrapper, "OCDA_Member_List.pdf", "landscape");
  } catch (err) {
    console.error("Export Members PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 2. MEMBER LEDGER  (new function — call from Export PDF button)
// =============================================================
async function exportMemberLedgerToPDF() {
  const startDate = document.getElementById("startDate")?.value || "";
  const endDate = document.getElementById("endDate")?.value || "";

  const btn = document.querySelector(
    "button[onclick='exportMemberLedgerToPDF()']",
  );
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    let url = "/admin/memberledger";
    if (startDate && endDate) {
      url = `/admin/member-recordledger?from=${startDate}&to=${endDate}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      showAlert("Load the ledger first / no records in range", "warning");
      return;
    }

    const totalAmt = data.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const dateRange =
      startDate || endDate
        ? `Period: ${fmtD(startDate)} – ${fmtD(endDate)}`
        : "All Dates";

    const rows = data
      .map(
        (r) => `
      <tr>
        <td class="center">${r.phoneno || ""}</td>
        <td class="center">${fmtD(r.transdate)}</td>
        <td class="amt">${fmtN(r.amount)}</td>
        <td>${r.remark || "—"}</td>
        <td class="center">${r.paydate ? fmtD(r.paydate) : "—"}</td>
      </tr>`,
      )
      .join("");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Member Ledger</h1>
      <div class="sub">${dateRange} &nbsp;|&nbsp; ${data.length} records</div>
      <table>
        <thead>
          <tr>
            <th>Phone No</th><th>Trans. Date</th>
            <th>Amount (₦)</th><th>Remark</th><th>Pay Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>TOTAL</strong></td>
            <td class="amt">₦${fmtN(totalAmt)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>`;

    triggerPDF(
      wrapper,
      `OCDA_Member_Ledger_${startDate || "all"}_${endDate || "all"}.pdf`,
      "landscape",
    );
  } catch (err) {
    console.error("Export Ledger PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 3. MONTHLY SUMMARY  (new function — call from Export PDF button)
// =============================================================
async function exportSummaryToPDF() {
  const btn = document.querySelector("button[onclick='exportSummaryToPDF()']");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    const res = await fetch("/admin/monthlysummary", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      showAlert("No summary data available to export", "warning");
      return;
    }

    const rows = data
      .map(
        (r) => `
      <tr>
        <td class="center">${r.period || ""}</td>
        <td class="amt">${fmtN(r.openbalance)}</td>
        <td class="amt">${fmtN(r.Debitbalance)}</td>
        <td class="amt">${fmtN(r.Creditbalance)}</td>
        <td class="amt">${fmtN(r.Netbalance)}</td>
      </tr>`,
      )
      .join("");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Monthly Summary</h1>
      <div class="sub">Generated: ${new Date().toLocaleDateString("en-GB")} &nbsp;|&nbsp; ${data.length} period(s)</div>
      <table>
        <thead>
          <tr>
            <th>Period</th><th>Opening Balance (₦)</th>
            <th>Debit (₦)</th><th>Credit (₦)</th><th>Net Balance (₦)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    triggerPDF(wrapper, "OCDA_Monthly_Summary.pdf", "portrait");
  } catch (err) {
    console.error("Export Summary PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 4. FINAL ACCOUNT  (new function — call from Export PDF button)
// =============================================================
async function exportFinalAccountToPDF() {
  const from = document.getElementById("finalAccountFrom")?.value;
  const to = document.getElementById("finalAccountTo")?.value;

  if (!from || !to) {
    showAlert("Generate the report first before exporting", "warning");
    return;
  }

  const btn = document.querySelector(
    "button[onclick='exportFinalAccountToPDF()']",
  );
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    const authHeader = {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    };

    // Fetch all three in parallel
    const [accountRes, incomeRes, expensesRes] = await Promise.all([
      fetch(`/admin/final-account?from=${from}&to=${to}`, {
        headers: authHeader,
      }),
      fetch(
        `/admin/ocda-income-analysis?start=${from}&end=${to}&mode=summary`,
        { headers: authHeader },
      ),
      fetch(
        `/admin/ocda-expenses-analysis?start=${from}&end=${to}&mode=summary`,
        { headers: authHeader },
      ),
    ]);

    const data = await accountRes.json();
    const income = await incomeRes.json();
    const expenses = await expensesRes.json();

    if (!accountRes.ok) {
      showAlert(data.message || "Failed to load final account data", "error");
      return;
    }

    // Build income breakdown sub-table
    const incomeRows =
      Array.isArray(income) && income.length
        ? income
            .map(
              (r) => `
          <tr>
            <td>${r.description?.trim() || r.code || "—"}</td>
            <td class="amt">₦${fmtN(r.amount)}</td>
          </tr>`,
            )
            .join("")
        : `<tr><td colspan="2" class="center">No income records found</td></tr>`;

    const incomeTable = `
      <table class="breakdown-table" style="margin:6px 0 10px 0;">
        <thead>
          <tr><th style="background:#dde8f5;">Income Description</th><th style="background:#dde8f5;">Amount (₦)</th></tr>
        </thead>
        <tbody>${incomeRows}</tbody>
      </table>`;

    // Build expenses breakdown sub-table
    const expensesRows =
      Array.isArray(expenses) && expenses.length
        ? expenses
            .map(
              (r) => `
          <tr>
            <td>${r.description?.trim() || r.code || "—"}</td>
            <td class="amt">₦${fmtN(r.amount)}</td>
          </tr>`,
            )
            .join("")
        : `<tr><td colspan="2" class="center">No expense records found</td></tr>`;

    const expensesTable = `
      <table class="breakdown-table expenses" style="margin:6px 0 10px 0;">
        <thead>
          <tr><th style="background:#fdebd0;">Expense Description</th><th style="background:#fdebd0;">Amount (₦)</th></tr>
        </thead>
        <tbody>${expensesRows}</tbody>
      </table>`;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Final Account</h1>
      <div class="sub">Period: ${fmtD(data.fromDate)} – ${fmtD(data.toDate)}</div>

      <table style="max-width:560px; margin: 0 auto;">
        <tbody>
          <tr>
            <td colspan="2" style="padding:10px 8px; font-weight:bold; border-top:1px solid #ccc; border-bottom:1px solid #ccc;">
              OPENING BALANCE AS AT ${fmtD(data.fromDate)}
            </td>
            <td class="amt" style="padding:10px 8px; border-top:1px solid #ccc; border-bottom:1px solid #ccc;">
              ₦${fmtN(data.openingBalance)}
            </td>
          </tr>

          <tr>
            <td colspan="2" style="padding:10px 8px; font-weight:bold; border-bottom:1px solid #aaa;">
              TOTAL INCOME
            </td>
            <td class="amt" style="padding:10px 8px; border-bottom:1px solid #aaa;">
              ₦${fmtN(data.totalIncome)}
            </td>
          </tr>
          <tr>
            <td style="padding:0; border:none;"></td>
            <td colspan="2" style="padding:0 8px 8px 0; border:none; border-bottom:1px solid #ccc;">
              ${incomeTable}
            </td>
          </tr>

          <tr>
            <td colspan="2" style="padding:10px 8px; font-weight:bold; border-bottom:1px solid #aaa;">
              TOTAL EXPENSES
            </td>
            <td class="amt" style="padding:10px 8px; border-bottom:1px solid #aaa;">
              ₦${fmtN(data.totalExpenses)}
            </td>
          </tr>
          <tr>
            <td style="padding:0; border:none;"></td>
            <td colspan="2" style="padding:0 8px 8px 0; border:none; border-bottom:1px solid #ccc;">
              ${expensesTable}
            </td>
          </tr>

          <tr style="border-top:2px solid #111;">
            <td colspan="2" style="padding:12px 8px; font-weight:bold; font-size:12px;">
              CURRENT BALANCE AS AT ${fmtD(data.toDate)}
            </td>
            <td class="amt" style="padding:12px 8px; font-weight:bold; font-size:12px;">
              ₦${fmtN(data.currentBalance)}
            </td>
          </tr>
        </tbody>
      </table>`;

    triggerPDF(wrapper, `OCDA_Final_Account_${from}_${to}.pdf`, "portrait");
  } catch (err) {
    console.error("Export Final Account PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 5. ENQUIRY  (replaces exportEnquiry for type "pdf")
// =============================================================
async function exportEnquiry(type) {
  if (type === "excel") {
    const table = document.getElementById("enquiryTableExport");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Enquiry" });
    XLSX.writeFile(wb, "enquiry.xlsx");
    return;
  }

  if (type !== "pdf") return;

  const form = document.getElementById("enquiryForm");
  if (!form) return;

  const enquiryType = form.enquiryType.value;
  const mode = form.detail.checked ? "detail" : "summary";
  const start = form.start.value;
  const end = form.end.value;

  let param = "ALL";
  if (enquiryType === "member")
    param = document.getElementById("enquiry-member").value;
  if (enquiryType === "ward")
    param = document.getElementById("enquiry-ward").value;
  if (enquiryType === "quarter")
    param = document.getElementById("enquiry-quarter").value;

  const pdfBtn = document.querySelector(
    "button[onclick=\"exportEnquiry('pdf')\"]",
  );
  if (pdfBtn) {
    pdfBtn.disabled = true;
    pdfBtn.textContent = "Generating…";
  }

  try {
    const params = new URLSearchParams({ type: enquiryType, param, mode });
    if (start) params.append("start", start);
    if (end) params.append("end", end);

    const res = await fetch(`/admin/enquiry?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.message || "Enquiry failed", "error");
      return;
    }

    const summary = Array.isArray(data.summary) ? data.summary : [];
    const detail = Array.isArray(data.detail) ? data.detail : [];

    const dateRange =
      start || end ? `Period: ${fmtD(start)} – ${fmtD(end)}` : "All Dates";

    // ---- SUMMARY HTML ----
    let summaryHTML = "";
    if (enquiryType === "member") {
      summaryHTML = `
        <div class="section-title">Member Summary</div>
        <table>
          <thead><tr><th>Phone No</th><th>Name</th><th>Total (₦)</th></tr></thead>
          <tbody>
            ${summary
              .map(
                (r) => `
              <tr>
                <td class="center">${r.PhoneNumber || r.phoneno || ""}</td>
                <td>${r.fullname || ""}</td>
                <td class="amt">${fmtN(r.total)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;
    } else if (enquiryType === "ward") {
      summaryHTML = `
        <div class="section-title">Ward Summary</div>
        <table>
          <thead><tr><th>Ward</th><th>Total (₦)</th></tr></thead>
          <tbody>
            ${summary
              .map(
                (r) => `
              <tr>
                <td>${r.Ward || ""}</td>
                <td class="amt">${fmtN(r.total)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;
    } else if (enquiryType === "quarter") {
      summaryHTML = `
        <div class="section-title">Quarter Summary</div>
        <table>
          <thead><tr><th>Quarter</th><th>Total (₦)</th></tr></thead>
          <tbody>
            ${summary
              .map(
                (r) => `
              <tr>
                <td>${r.Quarters || r.Quarter || ""}</td>
                <td class="amt">${fmtN(r.total)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;
    }

    // ---- DETAIL HTML ----
    let detailHTML = "";
    if (mode === "detail" && detail.length > 0) {
      if (enquiryType === "member") {
        // detail is flat array of transactions — group by phoneno
        const grouped = {};
        detail.forEach((tx) => {
          const key = tx.phoneno;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(tx);
        });

        detailHTML = `<div class="section-title">Member Transaction Detail</div>`;
        detailHTML += Object.entries(grouped)
          .map(([phoneno, txs]) => {
            const memberTotal = txs.reduce(
              (s, t) => s + parseFloat(t.amount || 0),
              0,
            );
            return `
            <div class="group">
              <div class="group-heading">${phoneno} — ${txs[0]?.fullname || ""} &nbsp;(${txs.length} transactions)</div>
              <table>
                <thead><tr><th>Date</th><th>Amount (₦)</th><th>Remark</th></tr></thead>
                <tbody>
                  ${txs
                    .map(
                      (tx) => `
                    <tr>
                      <td class="center">${fmtD(tx.transdate)}</td>
                      <td class="amt">${fmtN(tx.amount)}</td>
                      <td>${tx.remark || ""}</td>
                    </tr>`,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr><td colspan="1">Subtotal</td><td class="amt">₦${fmtN(memberTotal)}</td><td></td></tr>
                </tfoot>
              </table>
            </div>`;
          })
          .join("");
      } else if (enquiryType === "ward") {
        detailHTML = `<div class="section-title">Ward Transaction Detail</div>`;
        detailHTML += detail
          .map((w) => {
            const members = Array.isArray(w.members) ? w.members : [];
            // Group by member and sum
            const grouped = {};
            members.forEach((tx) => {
              if (!grouped[tx.phoneno])
                grouped[tx.phoneno] = {
                  phoneno: tx.phoneno,
                  fullname: tx.fullname,
                  total: 0,
                };
              grouped[tx.phoneno].total += parseFloat(tx.amount || 0);
            });
            const wardTotal = Object.values(grouped).reduce(
              (s, m) => s + m.total,
              0,
            );

            return `
            <div class="group">
              <div class="group-heading">Ward: ${w.ward}</div>
              <table>
                <thead><tr><th>Phone</th><th>Name</th><th>Total (₦)</th></tr></thead>
                <tbody>
                  ${Object.values(grouped)
                    .map(
                      (m) => `
                    <tr>
                      <td class="center">${m.phoneno}</td>
                      <td>${m.fullname}</td>
                      <td class="amt">${fmtN(m.total)}</td>
                    </tr>`,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr><td colspan="2">Ward Total</td><td class="amt">₦${fmtN(wardTotal)}</td></tr>
                </tfoot>
              </table>
            </div>`;
          })
          .join("");
      } else if (enquiryType === "quarter") {
        detailHTML = `<div class="section-title">Quarter Transaction Detail</div>`;
        detailHTML += detail
          .map((q) => {
            const wards = Array.isArray(q.wards) ? q.wards : [];
            const quarterTotal = wards.reduce((s, w) => {
              const members = Array.isArray(w.members) ? w.members : [];
              return (
                s +
                members.reduce((ms, tx) => ms + parseFloat(tx.amount || 0), 0)
              );
            }, 0);

            return `
            <div class="group">
              <div class="group-heading">Quarter: ${q.quarter} &nbsp;— Total: ₦${fmtN(quarterTotal)}</div>
              ${wards
                .map((w) => {
                  const members = Array.isArray(w.members) ? w.members : [];
                  const grouped = {};
                  members.forEach((tx) => {
                    if (!grouped[tx.phoneno])
                      grouped[tx.phoneno] = {
                        phoneno: tx.phoneno,
                        fullname: tx.fullname,
                        total: 0,
                      };
                    grouped[tx.phoneno].total += parseFloat(tx.amount || 0);
                  });
                  const wardTotal = Object.values(grouped).reduce(
                    (s, m) => s + m.total,
                    0,
                  );

                  return `
                  <table style="margin-left:16px; width:calc(100% - 16px);">
                    <thead>
                      <tr>
                        <th colspan="3" style="text-align:left; background:#dde;">Ward: ${w.ward} — ₦${fmtN(wardTotal)}</th>
                      </tr>
                      <tr><th>Phone</th><th>Name</th><th>Total (₦)</th></tr>
                    </thead>
                    <tbody>
                      ${Object.values(grouped)
                        .map(
                          (m) => `
                        <tr>
                          <td class="center">${m.phoneno}</td>
                          <td>${m.fullname}</td>
                          <td class="amt">${fmtN(m.total)}</td>
                        </tr>`,
                        )
                        .join("")}
                    </tbody>
                  </table>`;
                })
                .join("")}
            </div>`;
          })
          .join("");
      }
    }

    // Grand total from summary
    const grandTotal = summary
      .filter(
        (r) => (r.PhoneNumber || r.Ward || r.Quarters || r.Quarter) !== "ALL",
      )
      .reduce((s, r) => s + parseFloat(r.total || 0), 0);

    const labelMap = { member: "Member", ward: "Ward", quarter: "Quarter" };

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Enquiry Report — ${labelMap[enquiryType]}</h1>
      <div class="sub">
        ${dateRange} &nbsp;|&nbsp; Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}
        &nbsp;|&nbsp; Filter: ${param}
      </div>
      ${summaryHTML}
      ${detailHTML}
      <div class="grand-total">GRAND TOTAL: ₦${fmtN(grandTotal)}</div>`;

    triggerPDF(
      wrapper,
      `OCDA_Enquiry_${enquiryType}_${mode}_${start || "all"}_${end || "all"}.pdf`,
      mode === "detail" ? "landscape" : "portrait",
    );
  } catch (err) {
    console.error("Export Enquiry PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (pdfBtn) {
      pdfBtn.disabled = false;
      pdfBtn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 6. OCDA EXPENSES ANALYSIS  (replaces exportOCDAExpReportToPDF)
// =============================================================
async function exportOCDAExpReportToPDF() {
  const form = document.getElementById("ocdaExpensesAnalysisForm");
  if (!form) return;

  const mode = form.mode.value;
  const start = form.start.value;
  const end = form.end.value;
  const code = form.code.value || "ALL";

  const btn = document.getElementById("exportExpensesBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    const params = new URLSearchParams({ start, end, code, mode });
    const res = await fetch(`/admin/ocda-expenses-analysis?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      showAlert("No data to export", "warning");
      return;
    }

    const dateRange =
      start || end ? `Period: ${fmtD(start)} – ${fmtD(end)}` : "All Dates";
    const grandTotal = data.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    let bodyHTML = "";

    if (mode === "summary") {
      const rows = data
        .map(
          (r) => `
        <tr>
          <td class="center">${r.code || ""}</td>
          <td>${r.description || ""}</td>
          <td class="amt">₦${fmtN(r.amount)}</td>
        </tr>`,
        )
        .join("");

      bodyHTML = `
        <table>
          <thead><tr><th>Code</th><th>Description</th><th>Amount (₦)</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2">TOTAL</td>
              <td class="amt">₦${fmtN(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>`;
    } else {
      // Detail: flat array — group by code+description
      const grouped = {};
      data.forEach((r) => {
        const key = `${r.description || r.code} (${r.code})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      bodyHTML = Object.entries(grouped)
        .map(([heading, rows]) => {
          const groupTotal = rows.reduce(
            (s, r) => s + parseFloat(r.amount || 0),
            0,
          );
          return `
          <div class="group">
            <div class="group-heading">${heading}</div>
            <table>
              <thead><tr><th>Date</th><th>Voucher No</th><th>Remark</th><th>Amount (₦)</th></tr></thead>
              <tbody>
                ${rows
                  .map(
                    (r) => `
                  <tr>
                    <td class="center">${fmtD(r.date)}</td>
                    <td class="center">${r.voucher || ""}</td>
                    <td>${r.remark || ""}</td>
                    <td class="amt">₦${fmtN(r.amount)}</td>
                  </tr>`,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="3">Subtotal</td><td class="amt">₦${fmtN(groupTotal)}</td></tr>
              </tfoot>
            </table>
          </div>`;
        })
        .join("");
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      ${PDF_STYLES}
      <h1>OCDA Expenses Analysis</h1>
      <div class="sub">${dateRange} &nbsp;|&nbsp; Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)} &nbsp;|&nbsp; Code: ${code}</div>
      ${bodyHTML}
      <div class="grand-total">GRAND TOTAL: ₦${fmtN(grandTotal)}</div>`;

    triggerPDF(
      wrapper,
      `OCDA_Expenses_Analysis_${mode}_${start || "all"}_${end || "all"}.pdf`,
      mode === "detail" ? "landscape" : "portrait",
    );
  } catch (err) {
    console.error("Export Expenses PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}

// =============================================================
// 7. OCDA INCOME ANALYSIS  (replaces exportOCDAReportToPDF)
//    FIX: detail mode iterates group.transactions, not group directly
// =============================================================
async function exportOCDAReportToPDF() {
  const form = document.getElementById("ocdaIncomeAnalysisForm");
  if (!form) return;

  const mode = form.mode.value;
  const start = form.start.value;
  const end = form.end.value;
  const code = form.code.value || "ALL";

  const btn = document.querySelector(
    "#ocda-income-analysis button[onclick='exportOCDAReportToPDF()']",
  );
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  try {
    const params = new URLSearchParams({ start, end, code, mode });
    const res = await fetch(`/admin/ocda-income-analysis?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      showAlert("No data to export", "warning");
      return;
    }

    const dateRange =
      start || end ? `Period: ${fmtD(start)} – ${fmtD(end)}` : "All Dates";

    let bodyHTML = "";

    if (mode === "summary") {
      // Summary: flat array of { code, description, amount, transaction_count }
      const grandTotal = data.reduce(
        (s, r) => s + parseFloat(r.amount || 0),
        0,
      );

      const rows = data
        .map(
          (r) => `
        <tr>
          <td class="center">${r.code || "No Code"}</td>
          <td>${r.description?.trim() || r.code || "N/A"}</td>
          <td class="center">${r.transaction_count || ""}</td>
          <td class="amt">₦${fmtN(r.amount)}</td>
        </tr>`,
        )
        .join("");

      bodyHTML = `
        <table>
          <thead>
            <tr><th>Code</th><th>Description</th><th>Transactions</th><th>Amount (₦)</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTAL</td>
              <td class="amt">₦${fmtN(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>`;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        ${PDF_STYLES}
        <h1>OCDA Income Analysis</h1>
        <div class="sub">${dateRange} &nbsp;|&nbsp; Mode: Summary &nbsp;|&nbsp; Filter: ${code}</div>
        ${bodyHTML}
        <div class="grand-total">GRAND TOTAL: ₦${fmtN(grandTotal)}</div>`;

      triggerPDF(
        wrapper,
        `OCDA_Income_Analysis_summary_${start || "all"}_${end || "all"}.pdf`,
        "portrait",
      );
    } else {
      // Detail: array of { code, transactions: [{ date, phoneno_name, amount, comment }] }
      // Each group is one income classification; transactions are the individual ledger entries
      const grandTotal = data.reduce((s, group) => {
        return (
          s +
          (group.transactions || []).reduce(
            (gs, t) => gs + parseFloat(t.amount || 0),
            0,
          )
        );
      }, 0);

      bodyHTML = data
        .map((group) => {
          const txs = Array.isArray(group.transactions)
            ? group.transactions
            : [];
          const groupTotal = txs.reduce(
            (s, t) => s + parseFloat(t.amount || 0),
            0,
          );

          return `
          <div class="group">
            <div class="group-heading">${group.code} &nbsp;— ${txs.length} transaction(s)</div>
            <table>
              <thead>
                <tr><th>Date</th><th>Phone (Name)</th><th>Comment</th><th>Amount (₦)</th></tr>
              </thead>
              <tbody>
                ${txs
                  .map(
                    (t) => `
                  <tr>
                    <td class="center">${fmtD(t.date)}</td>
                    <td>${t.phoneno_name || ""}</td>
                    <td>${t.comment || ""}</td>
                    <td class="amt">₦${fmtN(t.amount)}</td>
                  </tr>`,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="3">Subtotal</td><td class="amt">₦${fmtN(groupTotal)}</td></tr>
              </tfoot>
            </table>
          </div>`;
        })
        .join("");

      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        ${PDF_STYLES}
        <h1>OCDA Income Analysis</h1>
        <div class="sub">${dateRange} &nbsp;|&nbsp; Mode: Detail &nbsp;|&nbsp; Filter: ${code}</div>
        ${bodyHTML}
        <div class="grand-total">GRAND TOTAL: ₦${fmtN(grandTotal)}</div>`;

      triggerPDF(
        wrapper,
        `OCDA_Income_Analysis_detail_${start || "all"}_${end || "all"}.pdf`,
        "landscape",
      );
    }
  } catch (err) {
    console.error("Export Income PDF error:", err);
    showAlert("Failed to export PDF", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export PDF";
    }
  }
}
