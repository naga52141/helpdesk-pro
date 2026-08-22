const session = requireSession();
const isStaff = session.user.role === "agent" || session.user.role === "admin";

const deniedEl = document.getElementById("access-denied");
const formCard = document.getElementById("article-form-card");
const form = document.getElementById("article-form");
const formError = document.getElementById("form-error");
const categorySelect = document.getElementById("category");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const heading = document.getElementById("form-heading");
const submitBtn = document.getElementById("submit-btn");

const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");
const isEditMode = Boolean(articleId);

if (!isStaff) {
  deniedEl.hidden = false;
  formCard.hidden = true;
} else {
  deniedEl.hidden = true;
  formCard.hidden = false;
  init();
}

async function init() {
  try {
    const categories = await apiFetch("/categories");
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });

    if (isEditMode) {
      heading.textContent = "Edit Article";
      submitBtn.textContent = "Save Changes";
      const article = await apiFetch(`/articles/${articleId}`);
      titleInput.value = article.title;
      contentInput.value = article.content;
      categorySelect.value = article.categoryId;
    }
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const categoryId = categorySelect.value;

  if (!title || !content || !categoryId) {
    formError.textContent = "Please fill in all required fields.";
    formError.hidden = false;
    return;
  }

  formError.hidden = true;

  try {
    if (isEditMode) {
      await apiFetch(`/articles/${articleId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, categoryId: Number(categoryId) }),
      });
      window.location.href = `article-detail.html?id=${articleId}`;
    } else {
      const created = await apiFetch("/articles", {
        method: "POST",
        body: JSON.stringify({ title, content, categoryId: Number(categoryId) }),
      });
      window.location.href = `article-detail.html?id=${created.id}`;
    }
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});
