from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from .base_page import BasePage


class ResetPasswordPage(BasePage):
    def load(self, token):
        self.driver.get(f"{self.base_url}/reset-password.html?token={token}")
        return self

    def submit(self, password, confirm_password=None):
        self.find(By.ID, "password").send_keys(password)
        self.find(By.ID, "confirm-password").send_keys(confirm_password if confirm_password is not None else password)
        self.find_clickable(By.CSS_SELECTOR, "#reset-form button[type=submit]").click()
        return self

    def accept_success_alert(self):
        alert = WebDriverWait(self.driver, 10).until(EC.alert_is_present())
        text = alert.text
        alert.accept()
        self.wait_until_url_contains("index.html")
        return text

    def error_text(self):
        return self.wait_until_visible(By.ID, "form-error").text
