import requests

from conftest import API_URL, api_login, unique_ticket_title
from pages.ticket_detail_page import TicketDetailPage


def _create_ticket_via_api(role):
    session = api_login(role)
    headers = {"Authorization": f"Bearer {session['token']}"}
    body = {
        "title": unique_ticket_title(),
        "description": "Seeded via API for a Selenium ticket-merging test.",
        "categoryId": 1,
        "priority": "medium",
        "departmentId": 1,
    }
    res = requests.post(f"{API_URL}/tickets", json=body, headers=headers)
    res.raise_for_status()
    return res.json()


def test_user_cannot_mark_a_ticket_as_duplicate_via_api():
    original = _create_ticket_via_api("user")
    copy = _create_ticket_via_api("user")
    user_session = api_login("user")

    res = requests.post(
        f"{API_URL}/tickets/{copy['id']}/duplicate",
        json={"duplicateOfId": original["id"]},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    )
    assert res.status_code == 403


def test_agent_can_mark_ticket_as_duplicate_in_ui(driver, base_url):
    original = _create_ticket_via_api("user")
    copy = _create_ticket_via_api("user")

    agent_session = api_login("agent")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(copy["displayId"])

    assert not detail.duplicate_banner_visible()
    assert detail.duplicate_controls_visible()

    detail.mark_as_duplicate(original["id"])

    assert original["displayId"] in detail.duplicate_banner_text()
    assert original["title"] in detail.duplicate_banner_text()
    assert detail.status_text() == "Closed"
    assert not detail.duplicate_controls_visible()
    assert f"id={original['id']}" in detail.duplicate_of_link_href()

    activity = " | ".join(detail.activity_texts())
    assert "duplicate link" in activity
    assert original["displayId"] in activity


def test_reopening_a_duplicate_clears_the_link(driver, base_url):
    original = _create_ticket_via_api("user")
    copy = _create_ticket_via_api("user")

    agent_session = api_login("agent")
    headers = {"Authorization": f"Bearer {agent_session['token']}"}
    requests.post(
        f"{API_URL}/tickets/{copy['id']}/duplicate",
        json={"duplicateOfId": original["id"]},
        headers=headers,
    ).raise_for_status()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(copy["displayId"])
    assert detail.duplicate_banner_visible()

    detail.set_status("in-progress", expected_text="In progress")

    assert not detail.duplicate_banner_visible()
    assert detail.duplicate_controls_visible()


def test_cannot_mark_ticket_as_duplicate_of_itself(driver, base_url):
    ticket = _create_ticket_via_api("user")

    agent_session = api_login("agent")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(ticket["displayId"])

    detail.attempt_mark_as_duplicate(ticket["id"])
    assert "itself" in detail.duplicate_error_text().lower()
    assert not detail.duplicate_banner_visible()
