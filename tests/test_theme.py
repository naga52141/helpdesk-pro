import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from conftest import API_URL, api_login, unique_ticket_title
from pages.dashboard_page import DashboardPage
from pages.login_page import LoginPage
from pages.theme_toggle import ThemeToggle
from pages.tickets_page import TicketsPage

LIGHT_CARD_BG = "rgb(255, 255, 255)"
DARK_CARD_BG = "rgb(27, 34, 54)"


def _force_os_scheme(driver, scheme):
    driver.execute_cdp_cmd(
        "Emulation.setEmulatedMedia", {"features": [{"name": "prefers-color-scheme", "value": scheme}]}
    )


def _clear_stored_theme(driver, base_url):
    driver.get(f"{base_url}/index.html")
    driver.execute_script("localStorage.removeItem('hdpro_theme');")


def test_toggle_switches_theme_and_persists_across_reload(driver, base_url):
    _force_os_scheme(driver, "light")
    _clear_stored_theme(driver, base_url)
    LoginPage(driver, base_url).load()

    toggle = ThemeToggle(driver)
    assert toggle.current_theme() is None
    assert toggle.card_background() == LIGHT_CARD_BG

    toggle.click()
    assert toggle.current_theme() == "dark"
    assert toggle.stored_theme() == "dark"
    assert toggle.card_background() == DARK_CARD_BG

    driver.get(f"{base_url}/index.html")
    assert toggle.current_theme() == "dark"
    assert toggle.card_background() == DARK_CARD_BG

    # Toggling again flips back to light — same widget works both directions.
    toggle.click()
    assert toggle.current_theme() == "light"
    assert toggle.card_background() == LIGHT_CARD_BG


def test_no_stored_preference_follows_os_setting_without_setting_the_attribute(driver, base_url):
    _force_os_scheme(driver, "dark")
    _clear_stored_theme(driver, base_url)
    driver.get(f"{base_url}/index.html")

    toggle = ThemeToggle(driver)
    # No explicit choice was ever made, so the attribute stays unset — the CSS media
    # query is what's rendering dark here, not a JS-applied override.
    assert toggle.current_theme() is None
    assert toggle.card_background() == DARK_CARD_BG

    _force_os_scheme(driver, "light")
    driver.get(f"{base_url}/index.html")
    assert toggle.current_theme() is None
    assert toggle.card_background() == LIGHT_CARD_BG


def test_theme_choice_persists_across_login_and_navigation(driver, base_url):
    _force_os_scheme(driver, "light")
    session = api_login("user")

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()
    driver.execute_script("localStorage.setItem('hdpro_theme', 'dark');")
    driver.get(f"{base_url}/dashboard.html")

    assert ThemeToggle(driver).current_theme() == "dark"

    TicketsPage(driver, base_url).load()
    assert ThemeToggle(driver).current_theme() == "dark"
    assert ThemeToggle(driver).card_background() == DARK_CARD_BG


# Regression check: .btn-tiny used to only be defined in admin.css, which
# ticket-detail.html never loads — leaving this button as an unstyled browser default.
def test_live_update_refresh_button_has_real_styling(driver, base_url):
    session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    driver.get(f"{base_url}/ticket-detail.html?id={ticket['displayId']}")
    WebDriverWait(driver, 10).until(lambda d: d.find_element(By.ID, "ticket-content").is_displayed())

    driver.execute_script("document.getElementById('live-update-banner').hidden = false;")
    btn = driver.find_element(By.ID, "live-update-refresh-btn")
    border_radius = driver.execute_script("return getComputedStyle(arguments[0]).borderRadius;", btn)
    assert border_radius == "6px"
