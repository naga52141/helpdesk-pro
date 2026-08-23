from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from .base_page import BasePage


class LoginPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/index.html")
        return self

    def login(self, email, password):
        self.find(By.ID, "email").send_keys(email)
        self.find(By.ID, "password").send_keys(password)
        self.find_clickable(By.CSS_SELECTOR, "#login-form button[type=submit]").click()
        return self

    def error_text(self):
        return self.wait_until_visible(By.ID, "form-error").text

    def go_to_register(self):
        self.find_clickable(By.LINK_TEXT, "Create an account").click()
        return self

    def totp_step_visible(self):
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "totp-form").get_attribute("hidden") is None
        )
        return self.find(By.ID, "totp-form").is_displayed()

    def submit_totp_code(self, code):
        box = self.find(By.ID, "totp-code")
        box.clear()
        box.send_keys(code)
        self.find_clickable(By.CSS_SELECTOR, "#totp-form button[type=submit]").click()
        return self

    def totp_error_text(self):
        return self.wait_until_visible(By.ID, "totp-error").text

    def click_use_different_account(self):
        self.find_clickable(By.ID, "totp-back-btn").click()
        return self
