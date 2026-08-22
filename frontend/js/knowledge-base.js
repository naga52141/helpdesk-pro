const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("filter-category");
const clearBtn = document.getElementById("clear-filters");
const kbList = document.getElementById("kb-list");
const kbCount = document.getElementById("kb-count");
const errorEl = document.getElementById("kb-error");

function buildFilterQuery() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  if (search) params.set("search", search);
  if (categoryFilter.value !== "all") params.set("category", categoryFilter.value);
  return params.toString();
}

async function loadCategories() {
  const categories = await apiFetch("/categories");
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    categoryFilter.appendChild(opt);
  });
}

async function render() {
  errorEl.hidden = true;

  try {
    const articles = await apiFetch(`/articles?${buildFilterQuery()}`);
    kbCount.textContent = `Showing ${articles.length} article${articles.length === 1 ? "" : "s"}`;
    renderList(articles);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    kbList.innerHTML = "";
    kbCount.textContent = "";
  }
}

function renderList(articles) {
  kbList.innerHTML = "";

  if (articles.length === 0) {
    kbList.innerHTML = `<p class="text-muted">No articles match your search.</p>`;
    return;
  }

  articles.forEach((a) => {
    const card = document.createElement("a");
    card.href = `article-detail.html?id=${a.id}`;
    card.className = "kb-card";
    card.innerHTML = `
      <div class="kb-card-title">${a.title}</div>
      <div class="kb-card-meta">${a.category} &middot; by ${a.author} &middot; updated ${new Date(a.updatedAt).toLocaleDateString()}</div>
      <div class="kb-card-excerpt">${a.excerpt}</div>
    `;
    kbList.appendChild(card);
  });
}

[searchInput, categoryFilter].forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  render();
});

requireSession();
loadCategories();
render();
