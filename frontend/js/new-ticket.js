const form = document.getElementById("ticket-form");
const formError = document.getElementById("form-error");
const categorySelect = document.getElementById("category");
const departmentSelect = document.getElementById("department");

async function loadLookups() {
  try {
    const [categories, departments] = await Promise.all([
      apiFetch("/categories"),
      apiFetch("/departments"),
    ]);
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
    departments.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      departmentSelect.appendChild(opt);
    });
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

requireSession();
loadLookups();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const categoryId = categorySelect.value;
  const priority = document.getElementById("priority").value;
  const departmentId = departmentSelect.value;
  const deviceInfo = document.getElementById("device-info").value.trim();

  if (!title || !description || !categoryId || !priority || !departmentId) {
    formError.textContent = "Please fill in all required fields.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  try {
    const ticket = await apiFetch("/tickets", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        categoryId: Number(categoryId),
        priority,
        departmentId: Number(departmentId),
        deviceInfo: deviceInfo || null,
      }),
    });

    const file = document.getElementById("attachment").files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await apiFetch(`/tickets/${ticket.id}/attachments`, { method: "POST", body: formData });
      } catch (uploadErr) {
        // The ticket itself was created successfully — don't block on a failed attachment.
        alert(`Ticket ${ticket.displayId} created, but the attachment failed to upload: ${uploadErr.message}`);
        window.location.href = "dashboard.html";
        return;
      }
    }

    alert(`Ticket ${ticket.displayId} created: "${ticket.title}"`);
    window.location.href = "dashboard.html";
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
