const form = document.getElementById("login-form");
const formError = document.getElementById("form-error");

if (getSession()) {
  window.location.href = "dashboard.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    formError.textContent = "Please enter both email and password.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  try {
    const { token, user } = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession({ token, user });
    window.location.href = "dashboard.html";
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
