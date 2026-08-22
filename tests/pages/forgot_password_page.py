from selenium.webdriver.common.by import By

from .base_page import BasePage


class ForgotPasswordPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/forgot-password.html")
        return self

    def submit(self, email):
        self.find(By.ID, "email").send_keys(email)
        self.find_clickable(By.CSS_SELECTOR, "#forgot-form button[type=submit]").click()
        # #result-box only appears once the async submit resolves — wait for it here so
        # every getter below is safe to call independently, not just after result_message().
        self.wait_until_visible(By.ID, "result-box")
        return self

    def result_message(self):
        return self.find(By.ID, "result-message").text

    def demo_reset_link_href(self):
        link = self.find(By.ID, "reset-link")
        return link.get_attribute("href") if link.is_displayed() else None
