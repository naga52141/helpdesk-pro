const session = requireSession();
const isStaff = session.user.role === "agent" || session.user.role === "admin";

const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");

const notFoundEl = document.getElementById("not-found");
const contentWrap = document.getElementById("article-content-wrap");
const detailErrorEl = document.getElementById("detail-error");

async function init() {
  try {
    const article = await apiFetch(`/articles/${articleId}`);
    notFoundEl.hidden = true;
    contentWrap.hidden = false;
    render(article);
  } catch (err) {
    if (err.message === "Article not found") {
      notFoundEl.hidden = false;
      contentWrap.hidden = true;
    } else {
      detailErrorEl.textContent = err.message;
      detailErrorEl.hidden = false;
    }
  }
}

function render(article) {
  document.getElementById("a-title").textContent = article.title;
  document.getElementById("a-meta").textContent =
    `${article.category} · by ${article.author} · updated ${new Date(article.updatedAt).toLocaleDateString()}`;
  document.getElementById("a-content").textContent = article.content;

  if (isStaff) {
    document.getElementById("article-actions").hidden = false;
    document.getElementById("edit-link").href = `article-form.html?id=${article.id}`;
  }
}

document.getElementById("delete-btn").addEventListener("click", async () => {
  if (!confirm("Delete this article? This cannot be undone.")) return;

  try {
    await apiFetch(`/articles/${articleId}`, { method: "DELETE" });
    window.location.href = "knowledge-base.html";
  } catch (err) {
    detailErrorEl.textContent = err.message;
    detailErrorEl.hidden = false;
  }
});

init();
