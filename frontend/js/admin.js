const session = requireSession();

const contentEl = document.getElementById("admin-content");
const deniedEl = document.getElementById("access-denied");
const errorEl = document.getElementById("admin-error");

if (session.user.role !== "admin") {
  deniedEl.hidden = false;
  contentEl.hidden = true;
} else {
  contentEl.hidden = false;
  initTabs();
  loadUsers();
  loadCategories();
  loadDepartments();
  loadSlaRules();
  loadCannedResponses();
}

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      document.querySelectorAll(".admin-panel").forEach((p) => (p.hidden = true));
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

// ---------- Users ----------

async function loadUsers() {
  try {
    const users = await apiFetch("/users");
    const body = document.getElementById("users-table-body");
    body.innerHTML = "";

    users.forEach((u) => {
      const row = document.createElement("tr");
      const isSelf = u.id === session.user.id;

      const roleCell = isSelf
        ? `<span class="self-row-note">You</span>`
        : `<select class="role-select" data-user-id="${u.id}">
             <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
             <option value="agent" ${u.role === "agent" ? "selected" : ""}>Agent</option>
             <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
           </select>`;

      row.innerHTML = `
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.department || "—"}</td>
        <td>${roleCell}</td>
        <td>${isSelf ? "" : `<button type="button" class="btn-tiny" data-save-user="${u.id}">Save</button>`}</td>
      `;
      body.appendChild(row);
    });

    body.querySelectorAll("[data-save-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.saveUser;
        const role = body.querySelector(`select[data-user-id="${userId}"]`).value;
        try {
          await apiFetch(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
          btn.textContent = "Saved";
          setTimeout(() => (btn.textContent = "Save"), 1200);
        } catch (err) {
          showError(err.message);
        }
      });
    });
  } catch (err) {
    showError(err.message);
  }
}

// ---------- Categories & Departments (identical shape, one renderer) ----------

function renderNameTable(bodyId, items, apiPath, onChange) {
  const body = document.getElementById(bodyId);
  body.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="row-edit">
          <input type="text" value="${item.name}" data-id="${item.id}" />
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn-tiny" data-action="rename" data-id="${item.id}">Save</button>
          <button type="button" class="btn-tiny btn-tiny-danger" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </td>
    `;
    body.appendChild(row);
  });

  body.querySelectorAll('[data-action="rename"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const input = body.querySelector(`input[data-id="${id}"]`);
      try {
        await apiFetch(`${apiPath}/${id}`, { method: "PATCH", body: JSON.stringify({ name: input.value.trim() }) });
        btn.textContent = "Saved";
        setTimeout(() => (btn.textContent = "Save"), 1200);
        onChange();
      } catch (err) {
        showError(err.message);
      }
    });
  });

  body.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`${apiPath}/${btn.dataset.id}`, { method: "DELETE" });
        onChange();
      } catch (err) {
        showError(err.message);
      }
    });
  });
}

async function loadCategories() {
  try {
    const categories = await apiFetch("/categories");
    renderNameTable("categories-table-body", categories, "/categories", loadCategories);
  } catch (err) {
    showError(err.message);
  }
}

async function loadDepartments() {
  try {
    const departments = await apiFetch("/departments");
    renderNameTable("departments-table-body", departments, "/departments", loadDepartments);
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById("category-add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("category-name-input");
  const errEl = document.getElementById("category-error");
  errEl.hidden = true;
  try {
    await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name: input.value.trim() }) });
    input.value = "";
    loadCategories();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

document.getElementById("department-add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("department-name-input");
  const errEl = document.getElementById("department-error");
  errEl.hidden = true;
  try {
    await apiFetch("/departments", { method: "POST", body: JSON.stringify({ name: input.value.trim() }) });
    input.value = "";
    loadDepartments();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

// ---------- SLA Rules ----------

async function loadSlaRules() {
  try {
    const rules = await apiFetch("/sla-rules");
    const body = document.getElementById("sla-table-body");
    body.innerHTML = "";

    rules.forEach((rule) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${capitalize(rule.priority)}</td>
        <td><input type="number" min="1" value="${rule.responseHours}" data-field="response" data-priority="${rule.priority}" /></td>
        <td><input type="number" min="1" value="${rule.resolutionHours}" data-field="resolution" data-priority="${rule.priority}" /></td>
        <td><button type="button" class="btn-tiny" data-save-priority="${rule.priority}">Save</button></td>
      `;
      body.appendChild(row);
    });

    body.querySelectorAll("[data-save-priority]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const priority = btn.dataset.savePriority;
        const responseHours = body.querySelector(`input[data-field="response"][data-priority="${priority}"]`).value;
        const resolutionHours = body.querySelector(`input[data-field="resolution"][data-priority="${priority}"]`).value;
        const errEl = document.getElementById("sla-error");
        errEl.hidden = true;
        try {
          await apiFetch(`/sla-rules/${priority}`, {
            method: "PATCH",
            body: JSON.stringify({ responseHours: Number(responseHours), resolutionHours: Number(resolutionHours) }),
          });
          btn.textContent = "Saved";
          setTimeout(() => (btn.textContent = "Save"), 1200);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        }
      });
    });
  } catch (err) {
    showError(err.message);
  }
}

// ---------- Canned Responses ----------

async function loadCannedResponses() {
  try {
    const responses = await apiFetch("/canned-responses");
    const body = document.getElementById("canned-responses-table-body");
    body.innerHTML = "";

    responses.forEach((cr) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="text" value="${cr.title}" data-title-id="${cr.id}" /></td>
        <td class="canned-response-body-cell"><textarea rows="2" data-body-id="${cr.id}">${cr.body}</textarea></td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-tiny" data-action="save-canned" data-id="${cr.id}">Save</button>
            <button type="button" class="btn-tiny btn-tiny-danger" data-action="delete-canned" data-id="${cr.id}">Delete</button>
          </div>
        </td>
      `;
      body.appendChild(row);
    });

    body.querySelectorAll('[data-action="save-canned"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const title = body.querySelector(`input[data-title-id="${id}"]`).value.trim();
        const responseBody = body.querySelector(`textarea[data-body-id="${id}"]`).value.trim();
        const errEl = document.getElementById("canned-response-error");
        errEl.hidden = true;
        try {
          await apiFetch(`/canned-responses/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ title, body: responseBody }),
          });
          btn.textContent = "Saved";
          setTimeout(() => (btn.textContent = "Save"), 1200);
        } catch (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        }
      });
    });

    body.querySelectorAll('[data-action="delete-canned"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiFetch(`/canned-responses/${btn.dataset.id}`, { method: "DELETE" });
          loadCannedResponses();
        } catch (err) {
          const errEl = document.getElementById("canned-response-error");
          errEl.textContent = err.message;
          errEl.hidden = false;
        }
      });
    });
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById("canned-response-add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const titleInput = document.getElementById("canned-response-title-input");
  const bodyInput = document.getElementById("canned-response-body-input");
  const errEl = document.getElementById("canned-response-error");
  errEl.hidden = true;

  try {
    await apiFetch("/canned-responses", {
      method: "POST",
      body: JSON.stringify({ title: titleInput.value.trim(), body: bodyInput.value.trim() }),
    });
    titleInput.value = "";
    bodyInput.value = "";
    loadCannedResponses();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});
