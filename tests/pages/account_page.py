from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from .base_page import BasePage


class AccountPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/account.html")
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "twofa-loading").get_attribute("hidden") is not None
        )
        return self

    def is_disabled_state(self):
        return self.find(By.ID, "twofa-disabled-state").get_attribute("hidden") is None

    def is_enabled_state(self):
        return self.find(By.ID, "twofa-enabled-state").get_attribute("hidden") is None

    def start_setup(self):
        self.find_clickable(By.ID, "twofa-start-setup-btn").click()
        WebDriverWait(self.driver, 10).until(
            lambda d: d.find_element(By.ID, "twofa-setup-flow").get_attribute("hidden") is None
        )
        return self

    def setup_secret(self):
        return self.find(By.ID, "twofa-secret-text").text

    def qr_code_src(self):
        return self.find(By.ID, "twofa-qr-code").get_attribute("src")

    def submit_verify_code(self, code):
        box = self.find(By.ID, "twofa-verify-code")
        box.clear()
        box.send_keys(code)
        self.find_clickable(By.CSS_SELECTOR, "#twofa-verify-form button[type=submit]").click()
        return self

    def verify_error_text(self):
        return self.wait_until_visible(By.ID, "twofa-verify-error").text

    def cancel_setup(self):
        self.find_clickable(By.ID, "twofa-cancel-setup-btn").click()
        return self

    def submit_disable(self, password):
        box = self.find(By.ID, "twofa-disable-password")
        box.clear()
        box.send_keys(password)
        self.find_clickable(By.CSS_SELECTOR, "#twofa-disable-form button[type=submit]").click()
        return self

    def disable_error_text(self):
        return self.wait_until_visible(By.ID, "twofa-disable-error").text

    def success_message_text(self):
        return self.wait_until_visible(By.ID, "twofa-success-message").text

    def wait_for_enabled_state(self, timeout=10):
        WebDriverWait(self.driver, timeout).until(
            lambda d: d.find_element(By.ID, "twofa-enabled-state").get_attribute("hidden") is None
        )
        return self

    def wait_for_disabled_state(self, timeout=10):
        WebDriverWait(self.driver, timeout).until(
            lambda d: d.find_element(By.ID, "twofa-disabled-state").get_attribute("hidden") is None
        )
        return self
