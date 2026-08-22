const token = new URLSearchParams(window.location.search).get("token");

const form = document.getElementById("reset-form");
const formError = document.getElementById("form-error");

if (!token) {
  formError.textContent = "This reset link is missing its token. Please request a new one.";
  formError.hidden = false;
  form.querySelector("button[type=submit]").disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

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
    await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    alert("Password updated. You can now log in with your new password.");
    window.location.href = "index.html";
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
