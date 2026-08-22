from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class TicketDetailPage(BasePage):
    def load(self, display_id):
        self.driver.get(f"{self.base_url}/ticket-detail.html?id={display_id}")
        # ticket-detail.js fetches the ticket + agents before rendering anything — wait for
        # that to actually finish (content or not-found becomes visible) before any getter
        # below reads the DOM, or a read can land in the pre-render empty state.
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "ticket-content").is_displayed()
            or d.find_element(By.ID, "not-found").is_displayed()
        )
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

    def reopen_button_visible(self):
        return self.find(By.ID, "reopen-btn").is_displayed()

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

    def assign_to(self, agent_name):
        before = self.find(By.ID, "d-agent").text
        Select(self.find(By.ID, "assign-select")).select_by_visible_text(agent_name)
        self.find_clickable(By.ID, "assign-btn").click()
        WebDriverWait(self.driver, 10).until(lambda d: self.find(By.ID, "d-agent").text != before)
        return self

    def activity_texts(self):
        self.find(By.ID, "activity-list")
        return [i.text for i in self.driver.find_elements(By.CSS_SELECTOR, ".activity-item")]

    def attachment_link_text(self):
        links = self.driver.find_elements(By.CSS_SELECTOR, "#d-attachment .attachment-link")
        return links[0].text if links else None

    def click_attachment_link(self):
        self.find(By.CSS_SELECTOR, "#d-attachment .attachment-link").click()
        return self

    def csat_prompt_visible(self):
        return self.find(By.ID, "csat-prompt").is_displayed()

    def csat_result_visible(self):
        return self.find(By.ID, "csat-result").is_displayed()

    def csat_result_text(self):
        return self.find(By.ID, "csat-result").text

    def submit_csat(self, rating, comment=None):
        self.find_clickable(By.CSS_SELECTOR, f'.csat-star[data-value="{rating}"]').click()
        if comment:
            self.find(By.ID, "csat-comment").send_keys(comment)
        self.find_clickable(By.ID, "csat-submit-btn").click()
        WebDriverWait(self.driver, 10).until(lambda d: self.csat_result_visible())
        return self

    def csat_error_text(self):
        return self.wait_until_visible(By.ID, "csat-error").text
