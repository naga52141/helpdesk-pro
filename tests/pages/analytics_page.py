from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class AnalyticsPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/analytics.html")
        return self

    def is_access_denied(self):
        el = self.wait_until_visible(By.ID, "access-denied")
        return el.is_displayed()

    def kpi_resolution_time(self):
        # Starts as the "—" placeholder until the async /analytics/summary fetch resolves.
        WebDriverWait(self.driver, 10).until_not(
            EC.text_to_be_present_in_element((By.ID, "kpi-resolution-time"), "—")
        )
        return self.find(By.ID, "kpi-resolution-time").text

    def category_chart_has_bars(self):
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#category-viz .viz-bar"))
        )
        bars = self.driver.find_elements(By.CSS_SELECTOR, "#category-viz .viz-bar")
        return len(bars) > 0

    def agent_table_rows(self):
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#agent-table-body tr"))
        )
        return self.driver.find_elements(By.CSS_SELECTOR, "#agent-table-body tr")
