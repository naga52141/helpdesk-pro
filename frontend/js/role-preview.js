// Persists the demo role switcher across page navigation until real login/sessions exist.
const ROLE_PREVIEW_KEY = "hdpro_preview_role";

// Stand-in for real login (Step 7). Maps each preview role to an actual seeded user row
// so API calls (createdBy, assignedTo, scope=mine, etc.) have a real user id to work with.
const DEMO_USERS = {
  user: { id: 5, name: "Sam Torres" },
  agent: { id: 2, name: "Alex Kim" },
  admin: { id: 1, name: "Admin User" },
};

function getCurrentUser() {
  const role = localStorage.getItem(ROLE_PREVIEW_KEY) || "user";
  return { role, ...DEMO_USERS[role] };
}

function initRolePreview(onRoleChange) {
  const tabs = document.querySelectorAll(".role-tab");
  let role = localStorage.getItem(ROLE_PREVIEW_KEY) || "user";
  if (!["user", "agent", "admin"].includes(role)) role = "user";

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.role === role);
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      role = tab.dataset.role;
      localStorage.setItem(ROLE_PREVIEW_KEY, role);
      onRoleChange(role);
    });
  });

  return role;
}
