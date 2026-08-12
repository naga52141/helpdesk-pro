from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from conftest import USERS, api_login, unique_test_email
from pages.dashboard_page import DashboardPage
from pages.login_page import LoginPage
from pages.register_page import RegisterPage


def test_login_success_redirects_to_dashboard(driver, base_url):
    login = LoginPage(driver, base_url).load()
    login.login(USERS["user"]["email"], USERS["user"]["password"])
    login.wait_until_url_contains("dashboard.html")

    dashboard = DashboardPage(driver, base_url)
    assert dashboard.user_chip_name() == USERS["user"]["name"]
    assert dashboard.user_chip_role() == "USER"


def test_login_invalid_password_shows_error(driver, base_url):
    login = LoginPage(driver, base_url).load()
    login.login(USERS["user"]["email"], "wrong-password")

    assert "Invalid email or password" in login.error_text()
    assert "dashboard.html" not in driver.current_url


def test_login_empty_fields_shows_client_side_error(driver, base_url):
    login = LoginPage(driver, base_url).load()
    login.find_clickable(By.CSS_SELECTOR, "#login-form button[type=submit]").click()

    assert "enter both" in login.error_text().lower()


def test_register_new_user_and_land_on_dashboard(driver, base_url):
    email = unique_test_email()
    register = RegisterPage(driver, base_url).load()
    register.register("Selenium Test User", email, "Password123!")
    register.wait_until_url_contains("dashboard.html")

    dashboard = DashboardPage(driver, base_url)
    assert dashboard.user_chip_name() == "Selenium Test User"
    assert dashboard.user_chip_role() == "USER"


def test_register_existing_email_shows_error(driver, base_url):
    register = RegisterPage(driver, base_url).load()
    register.register("Duplicate", USERS["user"]["email"], "Password123!")

    assert "already exists" in register.error_text().lower()


def test_logout_clears_session_and_redirects_to_login(driver, base_url):
    session = api_login("user")
    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()
    dashboard.logout()
    dashboard.wait_until_url_contains("index.html")

    assert driver.execute_script("return localStorage.getItem('hdpro_session');") is None


def test_visiting_protected_page_without_session_redirects_to_login(driver, base_url):
    driver.get(f"{base_url}/dashboard.html")
    WebDriverWait(driver, 10).until(EC.url_contains("index.html"))
    assert "index.html" in driver.current_url
