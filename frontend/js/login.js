const roleTabs = document.querySelectorAll(".role-tab");
const roleLabel = document.getElementById("role-label");
const form = document.getElementById("login-form");
const formError = document.getElementById("form-error");

let selectedRole = "user";

roleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    selectedRole = tab.dataset.role;
    roleLabel.textContent = tab.textContent;
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    formError.textContent = "Please enter both email and password.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  // Backend isn't connected yet — this just confirms the form works.
  console.log("Login attempt:", { role: selectedRole, email });
  alert(`(Demo) Would log in as ${selectedRole}: ${email}\nBackend not connected yet.`);
});
