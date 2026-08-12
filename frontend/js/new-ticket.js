const requesterField = document.getElementById("requester-field");
const adminLink = document.querySelector(".admin-only");
const form = document.getElementById("ticket-form");
const formError = document.getElementById("form-error");

function setRole(role) {
  const showRequester = role === "agent" || role === "admin";
  requesterField.hidden = !showRequester;
  document.getElementById("requester").required = showRequester;
  adminLink.hidden = role !== "admin";
}

setRole(initRolePreview(setRole));

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const priority = document.getElementById("priority").value;
  const department = document.getElementById("department").value;

  if (!title || !description || !category || !priority || !department) {
    formError.textContent = "Please fill in all required fields.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  // Backend isn't connected yet — this just confirms the form works.
  const fakeId = "T-" + Math.floor(1000 + Math.random() * 9000);
  console.log("New ticket:", { title, description, category, priority, department });
  alert(`(Demo) Ticket ${fakeId} created: "${title}"\nBackend not connected yet.`);
  window.location.href = "dashboard.html";
});
