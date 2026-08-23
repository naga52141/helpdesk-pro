const form = document.getElementById("login-form");
const formError = document.getElementById("form-error");
const totpForm = document.getElementById("totp-form");
const totpCode = document.getElementById("totp-code");
const totpError = document.getElementById("totp-error");
const footerLinks = document.getElementById("login-footer-links");
const footerSignup = document.getElementById("login-footer-signup");

let pendingTempToken = null;

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
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (result.requiresTotp) {
      pendingTempToken = result.tempToken;
      form.hidden = true;
      footerLinks.hidden = true;
      footerSignup.hidden = true;
      totpForm.hidden = false;
      totpCode.focus();
      return;
    }

    setSession({ token: result.token, user: result.user });
    window.location.href = "dashboard.html";
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});

totpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  totpError.hidden = true;

  try {
    const { token, user } = await apiFetch("/auth/2fa/login", {
      method: "POST",
      body: JSON.stringify({ tempToken: pendingTempToken, token: totpCode.value.trim() }),
    });
    setSession({ token, user });
    window.location.href = "dashboard.html";
  } catch (err) {
    totpError.textContent = err.message;
    totpError.hidden = false;
  }
});

document.getElementById("totp-back-btn").addEventListener("click", (event) => {
  event.preventDefault();
  window.location.reload();
});
