from selenium.webdriver.common.by import By

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
