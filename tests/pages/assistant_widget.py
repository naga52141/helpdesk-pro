from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


class AssistantWidget:
    """Shared floating widget present on every authenticated page — not a full page,
    just a component, same pattern as NotificationBell."""

    def __init__(self, driver):
        self.driver = driver

    def is_panel_open(self):
        return self.driver.find_element(By.CSS_SELECTOR, ".assistant-panel").get_attribute("hidden") is None

    def open(self):
        self.driver.find_element(By.CSS_SELECTOR, ".assistant-launcher").click()
        WebDriverWait(self.driver, 10).until(lambda d: self.is_panel_open())
        return self

    def close(self):
        self.driver.find_element(By.CSS_SELECTOR, ".assistant-close-btn").click()
        WebDriverWait(self.driver, 10).until(lambda d: not self.is_panel_open())
        return self

    def send(self, text):
        box = self.driver.find_element(By.CSS_SELECTOR, ".assistant-form input")
        box.send_keys(text)
        self.driver.find_element(By.CSS_SELECTOR, ".assistant-form button[type=submit]").click()
        return self

    def message_texts(self):
        return [m.text for m in self.driver.find_elements(By.CSS_SELECTOR, ".assistant-msg")]

    def wait_for_reply(self, timeout=15):
        WebDriverWait(self.driver, timeout).until(
            lambda d: "Thinking" not in d.find_elements(By.CSS_SELECTOR, ".assistant-msg")[-1].text
        )
        return self.message_texts()[-1]

    def last_message_is_error(self):
        msgs = self.driver.find_elements(By.CSS_SELECTOR, ".assistant-msg")
        return "assistant-msg-error" in msgs[-1].get_attribute("class")
