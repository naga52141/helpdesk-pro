from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

from .base_page import BasePage


class ArticleFormPage(BasePage):
    def load(self, article_id=None):
        suffix = f"?id={article_id}" if article_id else ""
        self.driver.get(f"{self.base_url}/article-form.html{suffix}")
        return self

    def is_access_denied(self):
        return self.wait_until_visible(By.ID, "access-denied").is_displayed()

    def heading_text(self):
        return self.find(By.ID, "form-heading").text

    def fill(self, title=None, category_index=None, content=None):
        if title is not None:
            box = self.find(By.ID, "title")
            box.clear()
            box.send_keys(title)
        if category_index is not None:
            Select(self.find(By.ID, "category")).select_by_index(category_index)
        if content is not None:
            box = self.find(By.ID, "content")
            box.clear()
            box.send_keys(content)
        return self

    def submit(self):
        self.find_clickable(By.CSS_SELECTOR, "#article-form button[type=submit]").click()
        WebDriverWait(self.driver, 10).until(lambda d: "article-detail.html" in d.current_url)
        return self

    def error_text(self):
        return self.wait_until_visible(By.ID, "form-error").text
