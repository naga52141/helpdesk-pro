import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from conftest import API_URL, api_login, unique_ticket_title
from pages.dashboard_page import DashboardPage
from pages.notification_bell import NotificationBell
from pages.ticket_detail_page import TicketDetailPage
from pages.tickets_page import TicketsPage


def _create_ticket(role, title=None):
    session = api_login(role)
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": title or unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()
    return session, ticket


# Proves the Socket.IO push actually reaches a second, independent browser session —
# not just that the client which made the change re-renders its own page.
def test_new_ticket_appears_live_in_another_sessions_open_queue(driver, base_url):
    agent_session = api_login("agent")

    tickets = TicketsPage(driver, base_url)
    tickets.set_session(agent_session["token"], agent_session["user"])
    tickets.load()
    tickets.count_text()  # wait for the initial render to finish before the live push races it

    title = unique_ticket_title()
    _create_ticket("user", title=title)

    WebDriverWait(driver, 10).until(lambda d: title in tickets.row_titles())


def test_comment_pushes_live_update_banner_to_ticket_viewer(driver, base_url):
    user_session, ticket = _create_ticket("user")
    agent_session = api_login("agent")

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(user_session["token"], user_session["user"])
    detail.load(ticket["displayId"])
    assert detail.live_update_banner_visible() is False

    requests.post(
        f"{API_URL}/tickets/{ticket['id']}/comments",
        json={"comment": "Live update check."},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )

    detail.wait_for_live_update_banner()

    detail.click_live_update_refresh()
    WebDriverWait(driver, 10).until(lambda d: d.find_element(By.ID, "ticket-content").is_displayed())
    assert any("Live update check." in c for c in detail.comment_texts())


def test_status_change_pushes_notification_badge_without_reload(driver, base_url):
    user_session, ticket = _create_ticket("user")
    agent_session = api_login("agent")

    requests.post(f"{API_URL}/notifications/read-all", headers={"Authorization": f"Bearer {user_session['token']}"})

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(user_session["token"], user_session["user"])
    dashboard.load()
    bell = NotificationBell(driver)
    assert bell.badge_is_visible() is False

    requests.patch(
        f"{API_URL}/tickets/{ticket['id']}",
        json={"status": "in-progress"},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )

    WebDriverWait(driver, 10).until(lambda d: bell.badge_is_visible())
    assert bell.badge_text() == "1"


# Two genuinely separate sessions (not the same page acting on itself) proves the queue
# push is a real broadcast to the "staff" room, not a same-tab side effect.
def test_live_update_reaches_a_truly_separate_browser_session(driver, driver2, base_url):
    agent_session = api_login("agent")
    agent2_session = api_login("agent2")

    viewer = TicketsPage(driver, base_url)
    viewer.set_session(agent_session["token"], agent_session["user"])
    viewer.load()
    viewer.count_text()

    actor = TicketsPage(driver2, base_url)
    actor.set_session(agent2_session["token"], agent2_session["user"])
    actor.load()

    title = unique_ticket_title()
    requests.post(
        f"{API_URL}/tickets",
        json={"title": title, "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {agent2_session['token']}"},
    )

    WebDriverWait(driver, 10).until(lambda d: title in viewer.row_titles())
