from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

from .base_page import BasePage


class RegisterPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/register.html")
        return self

    def register(self, full_name, email, password, department="IT"):
        self.find(By.ID, "full-name").send_keys(full_name)
        self.find(By.ID, "email").send_keys(email)

        # Department options are fetched from the API after load — wait for more than the placeholder.
        self.find(By.CSS_SELECTOR, "#department option:nth-child(2)")
        Select(self.find(By.ID, "department")).select_by_visible_text(department)

        self.find(By.ID, "password").send_keys(password)
        self.find(By.ID, "confirm-password").send_keys(password)
        self.find_clickable(By.CSS_SELECTOR, "#register-form button[type=submit]").click()
        return self

    def error_text(self):
        return self.wait_until_visible(By.ID, "form-error").text
