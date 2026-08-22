const form = document.getElementById("forgot-form");
const formError = document.getElementById("form-error");
const resultBox = document.getElementById("result-box");
const resultMessage = document.getElementById("result-message");
const devMailHint = document.getElementById("dev-mail-hint");

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
    devMailHint.hidden = false;
    form.hidden = true;
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
