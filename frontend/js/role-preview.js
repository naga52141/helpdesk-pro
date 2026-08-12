// Persists the demo role switcher across page navigation until real login/sessions exist.
const ROLE_PREVIEW_KEY = "hdpro_preview_role";

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
