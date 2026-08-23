// Shared by every page that registers keyboard shortcuts — builds a single overlay
// listing them, openable via "?" or a page-supplied button, closable via Escape,
// backdrop click, or the close button.

function isTypingContext(el) {
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function initShortcutsHelp(shortcuts) {
  let overlay = null;

  function build() {
    const el = document.createElement("div");
    el.className = "shortcuts-help-overlay";
    el.hidden = true;
    el.innerHTML = `
      <div class="shortcuts-help-panel" role="dialog" aria-label="Keyboard shortcuts">
        <div class="shortcuts-help-header">
          <h3>Keyboard shortcuts</h3>
          <button type="button" class="shortcuts-help-close" aria-label="Close">&times;</button>
        </div>
        <dl class="shortcuts-help-list">
          ${shortcuts.map((s) => `<dt>${s.keys}</dt><dd>${s.description}</dd>`).join("")}
        </dl>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector(".shortcuts-help-close").addEventListener("click", hide);
    el.addEventListener("click", (event) => {
      if (event.target === el) hide();
    });
    return el;
  }

  function show() {
    if (!overlay) overlay = build();
    overlay.hidden = false;
  }

  function hide() {
    if (overlay) overlay.hidden = true;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "?" && !isTypingContext(event.target)) {
      event.preventDefault();
      show();
    } else if (event.key === "Escape" && overlay && !overlay.hidden) {
      hide();
    }
  });

  return { show, hide };
}
