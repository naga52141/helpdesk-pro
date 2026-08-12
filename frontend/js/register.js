const form = document.getElementById("register-form");
const formError = document.getElementById("form-error");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const fullName = document.getElementById("full-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const department = document.getElementById("department").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!fullName || !email || !department || !password || !confirmPassword) {
    formError.textContent = "Please fill in every field.";
    formError.hidden = false;
    return;
  }

  if (password !== confirmPassword) {
    formError.textContent = "Passwords do not match.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  // Backend isn't connected yet — this just confirms the form works.
  console.log("Register attempt:", { fullName, email, department });
  alert(`(Demo) Would create account for ${fullName} (${email})\nBackend not connected yet.`);
});
