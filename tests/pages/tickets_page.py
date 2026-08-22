from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from .base_page import BasePage


class TicketsPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/tickets.html")
        return self

    def title_text(self):
        return self.find(By.ID, "tickets-title").text

    def count_text(self):
        # #tickets-count starts empty and is only filled in once the initial async
        # render() finishes — wait for real content, not just the element's presence.
        return WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "tickets-count").text or False
        )

    def row_titles(self):
        """Re-reads rows on staleness — the queue re-renders on every filter change,
        so a read racing an in-flight fetch can land on an element that just got replaced."""
        def _read(driver):
            try:
                els = driver.find_elements(By.CSS_SELECTOR, "#tickets-body tr td:nth-child(2)")
                return [e.text for e in els]
            except StaleElementReferenceException:
                return False

        return WebDriverWait(self.driver, 10).until(_read)

    def search(self, text):
        # Set the value and fire a single input event, rather than send_keys' one-event-per-
        # keystroke — each keystroke triggers its own fetch+render in tickets.js, and those
        # can resolve out of order, so this avoids a real race instead of masking it.
        box = self.find(By.ID, "search-input")
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));",
            box, text,
        )
        return self

    def open_ticket_by_title(self, title):
        link = self.find(By.XPATH, f"//tbody[@id='tickets-body']//tr[.//td[text()='{title}']]//a[@class='ticket-id']")
        display_id = link.text
        link.click()
        return display_id
