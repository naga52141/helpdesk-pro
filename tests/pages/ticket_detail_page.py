from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class TicketDetailPage(BasePage):
    def load(self, display_id):
        self.driver.get(f"{self.base_url}/ticket-detail.html?id={display_id}")
        return self

    def is_not_found(self):
        el = self.wait_until_visible(By.ID, "not-found")
        return el.is_displayed()

    def title_text(self):
        return self.find(By.ID, "d-title").text

    def status_text(self):
        return self.find(By.ID, "d-status-pill").text

    def agent_controls_visible(self):
        return self.find(By.ID, "agent-controls").is_displayed()

    def set_status(self, status_value, expected_text):
        Select(self.find(By.ID, "status-select")).select_by_value(status_value)
        self.find_clickable(By.ID, "status-btn").click()
        # The click fires a PATCH request; wait for the pill to actually reflect it
        # rather than reading the pre-update DOM.
        WebDriverWait(self.driver, 10).until(
            EC.text_to_be_present_in_element((By.ID, "d-status-pill"), expected_text)
        )
        return self

    def post_comment(self, text):
        before = len(self.comment_texts())
        box = self.find(By.ID, "comment-text")
        box.send_keys(text)
        self.find_clickable(By.CSS_SELECTOR, "#comment-form button[type=submit]").click()
        WebDriverWait(self.driver, 10).until(lambda d: len(self.comment_texts()) > before)
        return self

    def comment_texts(self):
        self.find(By.ID, "comments-list")
        comments = self.driver.find_elements(By.CSS_SELECTOR, "#comments-list .comment")
        return [c.text for c in comments]
