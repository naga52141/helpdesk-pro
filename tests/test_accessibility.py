from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from conftest import api_login
from pages.admin_page import AdminPage
from pages.dashboard_page import DashboardPage
from pages.tickets_page import TicketsPage


def _luminance(rgb):
    def chan(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def _contrast_ratio(rgb1, rgb2):
    l1, l2 = _luminance(rgb1), _luminance(rgb2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def _parse_rgb(css_rgb):
    nums = css_rgb[css_rgb.index("(") + 1: css_rgb.index(")")].split(",")
    return tuple(int(float(n)) for n in nums[:3])


# Regression coverage for a real bug this audit found: keyboard focus on the skip
# link's activation used to fall back to <body> instead of the main landmark, since
# <main> wasn't a valid focus target without tabindex="-1".
def test_skip_link_is_first_tab_stop_and_moves_focus_to_main(driver, base_url):
    session = api_login("user")
    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()

    driver.find_element(By.TAG_NAME, "body").send_keys(Keys.TAB)
    first_stop_class = driver.execute_script("return document.activeElement.className;")
    assert "skip-link" in first_stop_class

    driver.switch_to.active_element.send_keys(Keys.ENTER)
    active = driver.execute_script("return document.activeElement.tagName + '#' + document.activeElement.id;")
    assert active == "MAIN#main-content"


# Regression coverage for the outline:none fields that had no strong focus indicator —
# checks the real computed box-shadow, not just that a CSS rule exists somewhere.
def test_search_input_shows_a_visible_focus_ring(driver, base_url):
    session = api_login("user")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()

    search = driver.find_element(By.ID, "search-input")
    search.click()
    box_shadow = driver.execute_script("return getComputedStyle(arguments[0]).boxShadow;", search)
    assert box_shadow != "none"


def test_notification_bell_aria_expanded_reflects_dropdown_state(driver, base_url):
    session = api_login("user")
    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()

    bell = driver.find_element(By.ID, "notification-bell")
    assert bell.get_attribute("aria-haspopup") == "true"
    assert bell.get_attribute("aria-expanded") == "false"

    bell.click()
    assert bell.get_attribute("aria-expanded") == "true"

    bell.click()
    assert bell.get_attribute("aria-expanded") == "false"


def test_theme_toggle_aria_label_reflects_the_action_it_performs(driver, base_url):
    session = api_login("user")
    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()

    toggle = driver.find_element(By.ID, "theme-toggle")
    label_before = toggle.get_attribute("aria-label")
    assert label_before in ("Switch to light theme", "Switch to dark theme")

    theme_before = driver.execute_script(
        "return document.documentElement.getAttribute('data-theme') "
        "|| (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');"
    )
    expected_before = "Switch to light theme" if theme_before == "dark" else "Switch to dark theme"
    assert label_before == expected_before

    toggle.click()
    label_after = toggle.get_attribute("aria-label")
    assert label_after != label_before


def test_admin_tabs_have_tab_roles_and_sync_aria_selected(driver, base_url):
    session = api_login("admin")
    admin = AdminPage(driver, base_url)
    admin.set_session(session["token"], session["user"])
    admin.load()

    users_tab = driver.find_element(By.CSS_SELECTOR, '.admin-tab[data-tab="users"]')
    categories_tab = driver.find_element(By.CSS_SELECTOR, '.admin-tab[data-tab="categories"]')
    assert users_tab.get_attribute("role") == "tab"
    assert users_tab.get_attribute("aria-selected") == "true"
    assert categories_tab.get_attribute("aria-selected") == "false"

    panel = driver.find_element(By.ID, "panel-categories")
    assert panel.get_attribute("role") == "tabpanel"
    assert panel.get_attribute("aria-labelledby") == "tab-categories"

    admin.switch_tab("categories")
    assert categories_tab.get_attribute("aria-selected") == "true"
    assert users_tab.get_attribute("aria-selected") == "false"


# Locks in the contrast fix found by this audit — computes the real WCAG ratio from
# the page's actual rendered colors rather than trusting the hex values in the CSS.
def test_status_pill_text_meets_aa_contrast(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()

    pills = driver.find_elements(By.CSS_SELECTOR, ".pill")
    assert pills, "expected at least one status/priority pill to be rendered"

    for pill in pills[:6]:
        fg = _parse_rgb(driver.execute_script("return getComputedStyle(arguments[0]).color;", pill))
        bg = _parse_rgb(driver.execute_script("return getComputedStyle(arguments[0]).backgroundColor;", pill))
        ratio = _contrast_ratio(fg, bg)
        assert ratio >= 4.5, f"pill {pill.get_attribute('class')} contrast {ratio:.2f}:1 fails AA"
