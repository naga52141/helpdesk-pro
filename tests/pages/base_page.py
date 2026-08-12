import json

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class BasePage:
    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url

    def find(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located((by, value)))

    def find_clickable(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(EC.element_to_be_clickable((by, value)))

    def find_all(self, by, value, timeout=10):
        WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located((by, value)))
        return self.driver.find_elements(by, value)

    def wait_until_url_contains(self, fragment, timeout=10):
        WebDriverWait(self.driver, timeout).until(EC.url_contains(fragment))

    def wait_until_visible(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located((by, value)))

    def wait_until_hidden(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(EC.invisibility_of_element_located((by, value)))

    def set_session(self, token, user):
        """Injects a logged-in session directly, skipping the login form for tests that aren't about login itself."""
        self.driver.get(f"{self.base_url}/index.html")
        session = json.dumps({"token": token, "user": user})
        self.driver.execute_script("localStorage.setItem('hdpro_session', arguments[0]);", session)
