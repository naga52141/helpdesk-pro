// Floating chat widget on every authenticated page — builds its own DOM (same pattern
// as shortcuts-help.js) so no page markup needs touching, just this one script tag.

(function () {
  const session = getSession();
  if (!session) return;

  let history = [];

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "assistant-launcher";
  launcher.setAttribute("aria-label", "Open assistant");
  launcher.textContent = "\u{1F4AC}";
  document.body.appendChild(launcher);

  const panel = document.createElement("div");
  panel.className = "assistant-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="assistant-panel-header">
      <span>Assistant</span>
      <button type="button" class="assistant-close-btn" aria-label="Close assistant">&times;</button>
    </div>
    <div class="assistant-messages">
      <p class="assistant-empty-state">Ask about your tickets — try "what's overdue?" or "summarize T-1".</p>
    </div>
    <form class="assistant-form">
      <input type="text" placeholder="Ask the assistant..." autocomplete="off" />
      <button type="submit">Send</button>
    </form>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector(".assistant-messages");
  const formEl = panel.querySelector(".assistant-form");
  const inputEl = panel.querySelector("input");
  const sendBtn = panel.querySelector("button[type=submit]");

  launcher.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) inputEl.focus();
  });

  panel.querySelector(".assistant-close-btn").addEventListener("click", () => {
    panel.hidden = true;
  });

  function appendMessage(role, text) {
    const emptyState = messagesEl.querySelector(".assistant-empty-state");
    if (emptyState) emptyState.remove();

    const div = document.createElement("div");
    div.className = `assistant-msg assistant-msg-${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;

    appendMessage("user", text);
    const pending = appendMessage("assistant", "Thinking...");

    try {
      const { reply } = await apiFetch("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history }),
      });
      pending.textContent = reply;

      history.push({ role: "user", content: text }, { role: "assistant", content: reply });
      if (history.length > 20) history = history.slice(-20);
    } catch (err) {
      pending.textContent = err.message;
      pending.className = "assistant-msg assistant-msg-error";
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  });
})();
