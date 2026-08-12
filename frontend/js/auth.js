const SESSION_KEY = "hdpro_session";

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Call at the top of any page that requires a logged-in user.
// Redirects to login and halts the rest of the page's script if there's no session.
function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    throw new Error("Not authenticated");
  }

  const nameEl = document.getElementById("current-user-name");
  const roleEl = document.getElementById("current-user-role");
  if (nameEl) nameEl.textContent = session.user.name;
  if (roleEl) roleEl.textContent = capitalize(session.user.role);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const adminLink = document.querySelector(".admin-only");
  if (adminLink) adminLink.hidden = session.user.role !== "admin";

  const isAgentOrAdmin = session.user.role === "agent" || session.user.role === "admin";
  document.querySelectorAll(".staff-only").forEach((el) => {
    el.hidden = !isAgentOrAdmin;
  });

  return session;
}
