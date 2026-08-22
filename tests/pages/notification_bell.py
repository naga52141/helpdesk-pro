from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


class NotificationBell:
    """Shared navbar component present on every protected page — not a full page, just a widget."""

    def __init__(self, driver):
        self.driver = driver

    def is_dropdown_visible(self):
        return self.driver.find_element(By.ID, "notification-dropdown").is_displayed()

    def badge_is_visible(self):
        return self.driver.find_element(By.ID, "notification-badge").is_displayed()

    def badge_text(self):
        return self.driver.find_element(By.ID, "notification-badge").text

    def open(self):
        self.driver.find_element(By.ID, "notification-bell").click()
        WebDriverWait(self.driver, 10).until(lambda d: self.is_dropdown_visible())
        return self

    def mark_all_read(self):
        self.driver.find_element(By.ID, "mark-all-read-btn").click()
        WebDriverWait(self.driver, 10).until(lambda d: not self.is_dropdown_visible())
        return self

    def item_texts(self):
        WebDriverWait(self.driver, 10).until(lambda d: d.find_element(By.ID, "notification-list"))
        return [i.text for i in self.driver.find_elements(By.CSS_SELECTOR, ".notification-item")]

    def click_first_item(self):
        self.driver.find_elements(By.CSS_SELECTOR, ".notification-item")[0].click()
