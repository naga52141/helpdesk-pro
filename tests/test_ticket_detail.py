import requests

from conftest import API_URL, api_login, unique_ticket_title
from pages.ticket_detail_page import TicketDetailPage


def _create_ticket_via_api(role):
    session = api_login(role)
    headers = {"Authorization": f"Bearer {session['token']}"}
    body = {
        "title": unique_ticket_title(),
        "description": "Seeded via API for a Selenium ticket-detail test.",
        "categoryId": 1,
        "priority": "medium",
        "departmentId": 1,
    }
    res = requests.post(f"{API_URL}/tickets", json=body, headers=headers)
    res.raise_for_status()
    return res.json()


def test_agent_can_change_ticket_status(driver, base_url):
    ticket = _create_ticket_via_api("user")

    agent_session = api_login("agent")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(ticket["displayId"])

    assert detail.title_text() == ticket["title"]
    assert detail.agent_controls_visible()

    detail.set_status("in-progress", expected_text="In progress")
    assert detail.status_text() == "In progress"


def test_agent_can_post_comment(driver, base_url):
    ticket = _create_ticket_via_api("user")

    agent_session = api_login("agent")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(ticket["displayId"])

    detail.post_comment("Looking into this now.")

    comments = detail.comment_texts()
    assert any("Looking into this now." in c for c in comments)


def test_user_cannot_access_a_ticket_they_did_not_create(driver, base_url):
    # user2 (Demo User) opens a ticket created by user (Sam Torres) — should be treated as not found.
    ticket = _create_ticket_via_api("user")

    other_user_session = api_login("user2")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(other_user_session["token"], other_user_session["user"])
    detail.load(ticket["displayId"])

    assert detail.is_not_found()
