from selenium.common.exceptions import StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class AdminPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/admin.html")
        return self

    def is_access_denied(self):
        el = self.wait_until_visible(By.ID, "access-denied")
        return el.is_displayed()

    def switch_tab(self, tab_name):
        self.find_clickable(By.CSS_SELECTOR, f'.admin-tab[data-tab="{tab_name}"]').click()
        return self

    def _user_row(self, email):
        # #users-table-body exists (empty) before loadUsers()'s fetch resolves — wait for
        # a matching row to actually appear, not just for the container to exist.
        def _find(d):
            rows = d.find_elements(By.CSS_SELECTOR, "#users-table-body tr")
            return next((r for r in rows if email in r.text), False)

        return WebDriverWait(self.driver, 10).until(_find)

    def user_role_text(self, email):
        row = self._user_row(email)
        select_els = row.find_elements(By.CSS_SELECTOR, "select")
        if select_els:
            return Select(select_els[0]).first_selected_option.text
        return row.text  # "You" row has no select

    def set_user_role(self, email, role):
        row = self._user_row(email)
        Select(row.find_element(By.CSS_SELECTOR, "select")).select_by_value(role)
        save_btn = row.find_element(By.CSS_SELECTOR, "[data-save-user]")
        save_btn.click()
        WebDriverWait(self.driver, 10).until(lambda d: save_btn.text == "Saved")
        return self

    def add_category(self, name):
        self.find(By.ID, "category-name-input").send_keys(name)
        self.find_clickable(By.CSS_SELECTOR, "#category-add-form button[type=submit]").click()
        return self

    def wait_for_category(self, name, timeout=10):
        WebDriverWait(self.driver, timeout).until(lambda d: name in self.category_names())
        return self

    def category_names(self):
        # The table reloads out from under us after add/rename/delete, so a read racing
        # that reload can land on elements that just got replaced — retry on staleness.
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "categories-table-body")))
        for _ in range(5):
            try:
                inputs = self.driver.find_elements(By.CSS_SELECTOR, "#categories-table-body input[type=text]")
                return [i.get_attribute("value") for i in inputs]
            except StaleElementReferenceException:
                continue
        raise StaleElementReferenceException("categories-table-body kept re-rendering")

    def _category_row(self, name):
        for _ in range(5):
            try:
                return next(
                    r for r in self.driver.find_elements(By.CSS_SELECTOR, "#categories-table-body tr")
                    if r.find_element(By.CSS_SELECTOR, "input").get_attribute("value") == name
                )
            except StaleElementReferenceException:
                continue
        raise StaleElementReferenceException(f"categories-table-body kept re-rendering while looking for {name!r}")

    def rename_category(self, old_name, new_name):
        # Renaming reloads the whole table (see admin.js's onChange), so the row/button
        # references go stale right after the click — poll the fresh list state instead.
        row = self._category_row(old_name)
        input_el = row.find_element(By.CSS_SELECTOR, "input")
        input_el.clear()
        input_el.send_keys(new_name)
        row.find_element(By.CSS_SELECTOR, '[data-action="rename"]').click()
        WebDriverWait(self.driver, 10).until(lambda d: new_name in self.category_names())
        return self

    def delete_category(self, name):
        row = self._category_row(name)
        row.find_element(By.CSS_SELECTOR, '[data-action="delete"]').click()
        WebDriverWait(self.driver, 10).until(lambda d: name not in self.category_names())
        return self

    def category_error_text(self):
        return self.wait_until_visible(By.ID, "category-error").text

    def set_sla_rule(self, priority, response_hours, resolution_hours):
        # Same story as _user_row — wait for the matching row, not just the empty container.
        def _find(d):
            rows = d.find_elements(By.CSS_SELECTOR, "#sla-table-body tr")
            return next((r for r in rows if r.text.lower().startswith(priority)), False)

        row = WebDriverWait(self.driver, 10).until(_find)
        response_input = row.find_element(By.CSS_SELECTOR, 'input[data-field="response"]')
        resolution_input = row.find_element(By.CSS_SELECTOR, 'input[data-field="resolution"]')
        response_input.clear()
        response_input.send_keys(str(response_hours))
        resolution_input.clear()
        resolution_input.send_keys(str(resolution_hours))
        save_btn = row.find_element(By.CSS_SELECTOR, "[data-save-priority]")
        save_btn.click()
        WebDriverWait(self.driver, 10).until(lambda d: save_btn.text == "Saved")
        return self
