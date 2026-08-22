from selenium.webdriver.common.by import By


class ThemeToggle:
    """Shared theme toggle widget present on every page — not a full page on its own."""

    def __init__(self, driver):
        self.driver = driver

    def click(self):
        self.driver.find_element(By.ID, "theme-toggle").click()
        return self

    def current_theme(self):
        return self.driver.execute_script("return document.documentElement.getAttribute('data-theme');")

    def stored_theme(self):
        return self.driver.execute_script("return localStorage.getItem('hdpro_theme');")

    def card_background(self):
        # Any themed surface works here — .login-card and .navbar are both driven by --color-card.
        el = self.driver.find_element(By.CSS_SELECTOR, ".login-card, .navbar")
        return self.driver.execute_script("return getComputedStyle(arguments[0]).backgroundColor;", el)
