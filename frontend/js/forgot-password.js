const form = document.getElementById("forgot-form");
const formError = document.getElementById("form-error");
const resultBox = document.getElementById("result-box");
const resultMessage = document.getElementById("result-message");
const demoCaveat = document.getElementById("demo-caveat");
const resetLink = document.getElementById("reset-link");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();

  if (!email) {
    formError.textContent = "Please enter your email.";
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  try {
    const data = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    resultMessage.textContent = data.message;
    resultBox.hidden = false;
    form.hidden = true;

    if (data.demoResetToken) {
      demoCaveat.hidden = false;
      resetLink.hidden = false;
      resetLink.href = `reset-password.html?token=${encodeURIComponent(data.demoResetToken)}`;
    }
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
