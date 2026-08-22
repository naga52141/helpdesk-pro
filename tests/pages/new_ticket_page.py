from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class NewTicketPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/new-ticket.html")
        return self

    def submit_ticket(self, title, description, category="Hardware", priority="low", department="IT", device_info="", file_path=None):
        self.find(By.ID, "title").send_keys(title)
        self.find(By.ID, "description").send_keys(description)

        self.find(By.CSS_SELECTOR, "#category option:nth-child(2)")
        Select(self.find(By.ID, "category")).select_by_visible_text(category)
        Select(self.find(By.ID, "priority")).select_by_value(priority)
        Select(self.find(By.ID, "department")).select_by_visible_text(department)

        if device_info:
            self.find(By.ID, "device-info").send_keys(device_info)

        if file_path:
            # Selenium's normal way to "choose a file": send the absolute path to the <input type=file>.
            self.find(By.ID, "attachment").send_keys(file_path)

        self.find_clickable(By.CSS_SELECTOR, ".btn-submit").click()
        return self

    def accept_success_alert(self):
        """The success path pops a native alert with the new ticket ID, then redirects to the dashboard."""
        alert = WebDriverWait(self.driver, 10).until(EC.alert_is_present())
        text = alert.text
        alert.accept()
        self.wait_until_url_contains("dashboard.html")
        return text

    def error_text(self):
        return self.wait_until_visible(By.ID, "form-error").text

    def set_title_for_suggestions(self, text):
        # A single dispatched input event, not send_keys — each keystroke fires its own
        # debounced search, and out-of-order responses would make this flaky otherwise.
        box = self.find(By.ID, "title")
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            box, text,
        )
        return self

    def kb_suggestions_visible(self):
        return self.find(By.ID, "kb-suggestions").is_displayed()

    def kb_suggestion_titles(self):
        return [el.text for el in self.driver.find_elements(By.CSS_SELECTOR, "#kb-suggestions-list .kb-suggestion-link")]

    def wait_for_kb_suggestions(self, timeout=10):
        # The debounce (400ms) plus the search request both land after set_title_for_suggestions
        # returns, so callers need to wait for the box rather than checking it immediately.
        WebDriverWait(self.driver, timeout).until(lambda d: self.kb_suggestions_visible())
        return self

    def wait_for_no_kb_suggestions(self, timeout=10):
        WebDriverWait(self.driver, timeout).until(lambda d: not self.kb_suggestions_visible())
        return self
