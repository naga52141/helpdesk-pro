const session = requireSession();

const els = {
  error: document.getElementById("twofa-error"),
  loading: document.getElementById("twofa-loading"),
  disabledState: document.getElementById("twofa-disabled-state"),
  enabledState: document.getElementById("twofa-enabled-state"),
  setupFlow: document.getElementById("twofa-setup-flow"),
  successMessage: document.getElementById("twofa-success-message"),
  qrCode: document.getElementById("twofa-qr-code"),
  secretText: document.getElementById("twofa-secret-text"),
  verifyForm: document.getElementById("twofa-verify-form"),
  verifyCode: document.getElementById("twofa-verify-code"),
  verifyError: document.getElementById("twofa-verify-error"),
  disableForm: document.getElementById("twofa-disable-form"),
  disablePassword: document.getElementById("twofa-disable-password"),
  disableError: document.getElementById("twofa-disable-error"),
};

function showState(state) {
  els.disabledState.hidden = state !== "disabled";
  els.enabledState.hidden = state !== "enabled";
  els.setupFlow.hidden = state !== "setup";
  els.loading.hidden = true;
}

async function loadStatus() {
  els.error.hidden = true;
  els.successMessage.hidden = true;
  try {
    const { enabled } = await apiFetch("/auth/2fa/status");
    showState(enabled ? "enabled" : "disabled");
  } catch (err) {
    els.error.textContent = err.message;
    els.error.hidden = false;
  }
}

document.getElementById("twofa-start-setup-btn").addEventListener("click", async () => {
  els.error.hidden = true;
  try {
    const { secret, qrCodeDataUrl } = await apiFetch("/auth/2fa/setup", { method: "POST" });
    els.qrCode.src = qrCodeDataUrl;
    els.secretText.textContent = secret;
    els.verifyCode.value = "";
    showState("setup");
  } catch (err) {
    els.error.textContent = err.message;
    els.error.hidden = false;
  }
});

document.getElementById("twofa-cancel-setup-btn").addEventListener("click", () => {
  showState("disabled");
});

els.verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.verifyError.hidden = true;
  try {
    await apiFetch("/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ token: els.verifyCode.value.trim() }),
    });
    els.successMessage.textContent = "Two-factor authentication is now on.";
    els.successMessage.hidden = false;
    showState("enabled");
  } catch (err) {
    els.verifyError.textContent = err.message;
    els.verifyError.hidden = false;
  }
});

els.disableForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.disableError.hidden = true;
  try {
    await apiFetch("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ password: els.disablePassword.value }),
    });
    els.disablePassword.value = "";
    els.successMessage.textContent = "Two-factor authentication is now off.";
    els.successMessage.hidden = false;
    showState("disabled");
  } catch (err) {
    els.disableError.textContent = err.message;
    els.disableError.hidden = false;
  }
});

loadStatus();
