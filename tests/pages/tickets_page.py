from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait

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
        so a read racing an in-flight fetch can land on an element that just got replaced.

        Counts from the end of the row (title is always 6 columns before the last —
        category, priority, status, assignedAgent, department, updated) rather than
        from the start, since staff sessions get an extra leading checkbox column that
        a fixed from-the-front index would silently misread."""
        def _read(driver):
            try:
                els = driver.find_elements(By.CSS_SELECTOR, "#tickets-body tr td:nth-last-child(7)")
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

    def row_checkbox(self, ticket_id):
        return self.find(By.CSS_SELECTOR, f'.row-checkbox[data-id="{ticket_id}"]')

    def select_ticket(self, ticket_id):
        self.row_checkbox(ticket_id).click()
        return self

    def click_select_all(self):
        self.find_clickable(By.ID, "select-all-checkbox").click()
        return self

    def bulk_bar_visible(self):
        return self.find(By.ID, "bulk-actions-bar").is_displayed()

    def bulk_selected_count_text(self):
        return self.find(By.ID, "bulk-selected-count").text

    def clear_bulk_selection(self):
        self.find_clickable(By.ID, "bulk-clear-btn").click()
        return self

    def apply_bulk_action(self, status=None, priority=None, assign_to_name=None):
        if status:
            Select(self.find(By.ID, "bulk-status")).select_by_value(status)
        if priority:
            Select(self.find(By.ID, "bulk-priority")).select_by_value(priority)
        if assign_to_name:
            Select(self.find(By.ID, "bulk-assign")).select_by_visible_text(assign_to_name)

        self.find_clickable(By.ID, "bulk-apply-btn").click()
        WebDriverWait(self.driver, 10).until(
            lambda d: self.find(By.ID, "bulk-actions-bar").get_attribute("hidden") is not None
        )
        return self

    def bulk_error_text(self):
        return self.wait_until_visible(By.ID, "bulk-error").text
