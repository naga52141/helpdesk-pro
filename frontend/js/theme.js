// Loaded synchronously in <head>, before any CSS paints, so the right theme applies on
// first paint with no flash. Button wiring is deferred since the button itself doesn't
// exist in the DOM yet at this point in <head> parsing.
(function () {
  const STORAGE_KEY = "hdpro_theme";

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  applyTheme(localStorage.getItem(STORAGE_KEY));

  function currentTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const MOON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  const SUN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

  // Shows the icon (and label) for what clicking will switch TO, not the current state.
  function iconFor(theme) {
    return theme === "dark" ? SUN : MOON;
  }

  function labelFor(theme) {
    return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }

  function wireToggleButton() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const current = currentTheme();
    btn.innerHTML = iconFor(current);
    btn.setAttribute("aria-label", labelFor(current));
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      btn.innerHTML = iconFor(next);
      btn.setAttribute("aria-label", labelFor(next));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireToggleButton);
  } else {
    wireToggleButton();
  }
})();
