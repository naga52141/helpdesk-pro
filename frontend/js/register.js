const form = document.getElementById("register-form");
const formError = document.getElementById("form-error");
const departmentSelect = document.getElementById("department");

if (getSession()) {
  window.location.href = "dashboard.html";
}

async function loadDepartments() {
  try {
    const departments = await apiFetch("/departments");
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
loadDepartments();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const departmentId = departmentSelect.value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!fullName || !email || !departmentId || !password || !confirmPassword) {
    formError.textContent = "Please fill in every field.";
    formError.hidden = false;
    return;
  }

  if (password !== confirmPassword) {
    formError.textContent = "Passwords do not match.";
    formError.hidden = false;
    return;
  }

  if (password.length < 8) {
    formError.textContent = "Password must be at least 8 characters.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  try {
    const { token, user } = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: fullName, email, password, departmentId: Number(departmentId) }),
    });
    setSession({ token, user });
    window.location.href = "dashboard.html";
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
