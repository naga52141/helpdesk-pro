from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

from conftest import api_login
from pages.ticket_detail_page import TicketDetailPage
from pages.tickets_page import TicketsPage


def test_j_and_k_move_row_focus(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    assert tickets.focused_row_index() == -1

    tickets.press_key("j")
    assert tickets.focused_row_index() == 0

    tickets.press_key("j").press_key("j")
    assert tickets.focused_row_index() == 2

    tickets.press_key("k")
    assert tickets.focused_row_index() == 1


def test_enter_opens_the_focused_ticket(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    expected_id = driver.find_element(By.CSS_SELECTOR, "#tickets-body tr .ticket-id").text
    tickets.press_key("j")
    tickets.press_key(Keys.ENTER)

    tickets.wait_until_url_contains("ticket-detail.html")
    assert f"id={expected_id}" in driver.current_url


def test_slash_focuses_the_search_box(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    tickets.press_key("/")
    assert driver.execute_script("return document.activeElement.id;") == "search-input"


def test_question_mark_opens_and_escape_closes_help_overlay(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    assert tickets.shortcuts_overlay_visible() is False

    tickets.press_key("?")
    assert tickets.shortcuts_overlay_visible() is True

    tickets.press_key(Keys.ESCAPE)
    assert tickets.shortcuts_overlay_visible() is False


def test_shortcuts_help_button_opens_overlay(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    tickets.open_shortcuts_help()
    assert tickets.shortcuts_overlay_visible() is True


# Regression coverage: shortcut letters are common in real search terms (e.g. "jkr
# printer"), so the keydown handler must stay silent while an input has focus.
def test_shortcuts_do_not_fire_while_typing_in_the_search_box(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    search_box = driver.find_element(By.ID, "search-input")
    search_box.click()
    search_box.send_keys("jkr?")

    assert search_box.get_attribute("value") == "jkr?"
    assert tickets.focused_row_index() == -1
    assert tickets.shortcuts_overlay_visible() is False


def test_r_focuses_the_comment_box_on_ticket_detail(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()
    display_id = driver.find_element(By.CSS_SELECTOR, "#tickets-body tr .ticket-id").text

    detail = TicketDetailPage(driver, base_url)
    detail.load(display_id)

    detail.press_key("r")
    assert driver.execute_script("return document.activeElement.id;") == "comment-text"
