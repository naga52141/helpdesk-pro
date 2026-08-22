from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

from .base_page import BasePage


class KnowledgeBasePage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/knowledge-base.html")
        return self

    def count_text(self):
        return WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "kb-count").text or False
        )

    def card_titles(self):
        self.count_text()  # wait for the initial async render before reading cards
        return [el.text for el in self.driver.find_elements(By.CSS_SELECTOR, ".kb-card-title")]

    def _wait_for_render_change(self, previous_count):
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "kb-count").text != previous_count
        )

    def search(self, text):
        # A single dispatched input event, not send_keys — see TicketsPage.search for why.
        previous_count = self.driver.find_element(By.ID, "kb-count").text
        box = self.find(By.ID, "search-input")
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            box, text,
        )
        self._wait_for_render_change(previous_count)
        return self

    def filter_by_category(self, category):
        previous_count = self.driver.find_element(By.ID, "kb-count").text
        Select(self.find(By.ID, "filter-category")).select_by_value(category)
        self._wait_for_render_change(previous_count)
        return self

    def clear_filters(self):
        previous_count = self.driver.find_element(By.ID, "kb-count").text
        self.find_clickable(By.ID, "clear-filters").click()
        self._wait_for_render_change(previous_count)
        return self

    def new_article_button_visible(self):
        return self.find(By.CSS_SELECTOR, ".btn-new-article").is_displayed()

    def open_article_by_title(self, title):
        self.find(By.XPATH, f"//div[@class='kb-card-title' and text()='{title}']/..").click()
        return self
