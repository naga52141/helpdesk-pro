import requests

from conftest import API_URL, api_login, unique_ticket_title
from pages.dashboard_page import DashboardPage
from pages.new_ticket_page import NewTicketPage
from pages.notification_bell import NotificationBell
from pages.ticket_detail_page import TicketDetailPage


def _create_ticket(role):
    session = api_login(role)
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()
    return session, ticket


# Regression coverage for the CSS-specificity bug where the dropdown was permanently
# visible and intercepting clicks on the page underneath it — this must check real
# rendered visibility (is_displayed), not just the JS `hidden` property, or it can't catch it.
def test_notification_dropdown_hidden_by_default(driver, base_url):
    session = api_login("user")

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()
    assert NotificationBell(driver).is_dropdown_visible() is False

    new_ticket = NewTicketPage(driver, base_url)
    new_ticket.set_session(session["token"], session["user"])
    new_ticket.load()
    assert NotificationBell(driver).is_dropdown_visible() is False


# Regression coverage for the CSS-specificity bug where the badge set `display: flex`
# unconditionally, so it was permanently visible (as "0") even with zero unread — must
# check real rendered visibility (is_displayed), not just the JS `hidden` property.
def test_notification_badge_hidden_when_no_unread(driver, base_url):
    session = api_login("agent2")  # an account unlikely to have unread notifications from other tests

    requests.post(f"{API_URL}/notifications/read-all", headers={"Authorization": f"Bearer {session['token']}"})

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()

    assert NotificationBell(driver).badge_is_visible() is False


def test_bell_opens_dropdown_and_mark_all_read_closes_it(driver, base_url):
    session = api_login("user")
    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()

    bell = NotificationBell(driver)
    bell.open()
    assert bell.is_dropdown_visible() is True

    bell.mark_all_read()
    assert bell.is_dropdown_visible() is False


def test_comment_notifies_the_other_party_and_clicking_it_navigates_to_ticket(driver, base_url):
    user_session, ticket = _create_ticket("user")
    agent_session = api_login("agent")

    requests.patch(
        f"{API_URL}/tickets/{ticket['id']}",
        json={"assignedTo": 2},  # Alex Kim
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )
    requests.post(
        f"{API_URL}/tickets/{ticket['id']}/comments",
        json={"comment": "Looking into this."},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(user_session["token"], user_session["user"])
    dashboard.load()

    bell = NotificationBell(driver)
    assert bell.badge_is_visible()
    bell.open()
    items = bell.item_texts()
    assert any(ticket["displayId"] in text for text in items)

    bell.click_first_item()
    detail = TicketDetailPage(driver, base_url)
    detail.wait_until_url_contains(f"id={ticket['displayId']}")
    assert detail.title_text() == ticket["title"]

    # Clicking the item marks that one notification read, which should drop the count.
    notifications = requests.get(
        f"{API_URL}/notifications", headers={"Authorization": f"Bearer {user_session['token']}"}
    ).json()
    clicked = next(n for n in notifications["notifications"] if ticket["displayId"] in n["message"])
    assert clicked["isRead"] == 1


def test_status_change_does_not_notify_the_agent_who_made_it(driver, base_url):
    user_session, ticket = _create_ticket("user")
    agent_session = api_login("agent")

    requests.patch(
        f"{API_URL}/tickets/{ticket['id']}",
        json={"status": "in-progress"},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )

    agent_notifications = requests.get(
        f"{API_URL}/notifications", headers={"Authorization": f"Bearer {agent_session['token']}"}
    ).json()
    assert not any(ticket["displayId"] in n["message"] for n in agent_notifications["notifications"])

    user_notifications = requests.get(
        f"{API_URL}/notifications", headers={"Authorization": f"Bearer {user_session['token']}"}
    ).json()
    assert any(ticket["displayId"] in n["message"] and n["type"] == "status_change" for n in user_notifications["notifications"])
