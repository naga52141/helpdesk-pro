from selenium.webdriver.common.by import By

from .base_page import BasePage


class DashboardPage(BasePage):
    def load(self):
        self.driver.get(f"{self.base_url}/dashboard.html")
        return self

    def user_chip_name(self):
        return self.find(By.ID, "current-user-name").text

    def user_chip_role(self):
        return self.find(By.ID, "current-user-role").text

    def stat_cards(self):
        self.find(By.CSS_SELECTOR, "#stat-grid .stat-card")
        return self.driver.find_elements(By.CSS_SELECTOR, "#stat-grid .stat-card")

    def analytics_link_present(self):
        links = self.driver.find_elements(By.CSS_SELECTOR, ".nav-link.staff-only")
        return bool(links) and links[0].is_displayed()

    def logout(self):
        self.find_clickable(By.ID, "logout-btn").click()
        return self

    def go_to_new_ticket(self):
        self.find_clickable(By.CSS_SELECTOR, ".btn-new-ticket").click()
        return self

    def go_to_tickets(self):
        self.find_clickable(By.CSS_SELECTOR, ".navbar-links .nav-link:nth-child(2)").click()
        return self
