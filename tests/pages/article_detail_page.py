from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from .base_page import BasePage


class ArticleDetailPage(BasePage):
    def load(self, article_id):
        self.driver.get(f"{self.base_url}/article-detail.html?id={article_id}")
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "article-content-wrap").is_displayed()
            or d.find_element(By.ID, "not-found").is_displayed()
        )
        return self

    def is_not_found(self):
        return self.find(By.ID, "not-found").is_displayed()

    def title_text(self):
        return self.find(By.ID, "a-title").text

    def content_text(self):
        return self.driver.execute_script(
            "return document.getElementById('a-content').textContent;"
        )

    def actions_visible(self):
        return self.find(By.ID, "article-actions").is_displayed()

    def click_edit(self):
        self.find_clickable(By.ID, "edit-link").click()
        return self

    def delete(self):
        self.find_clickable(By.ID, "delete-btn").click()
        alert = self.driver.switch_to.alert
        alert.accept()
        self.wait_until_url_contains("knowledge-base.html")
        return self
