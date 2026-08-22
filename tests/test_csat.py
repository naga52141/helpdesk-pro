import requests

from conftest import API_URL, api_login, unique_ticket_title
from pages.ticket_detail_page import TicketDetailPage


def _create_and_resolve_ticket():
    user_session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    ).json()

    agent_session = api_login("agent")
    requests.patch(
        f"{API_URL}/tickets/{ticket['id']}",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )
    return user_session, agent_session, ticket


def test_csat_prompt_hidden_on_open_ticket(driver, base_url):
    user_session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    ).json()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(user_session["token"], user_session["user"])
    detail.load(ticket["displayId"])

    assert detail.csat_prompt_visible() is False
    assert detail.csat_result_visible() is False


def test_csat_prompt_hidden_for_agent(driver, base_url):
    _, agent_session, ticket = _create_and_resolve_ticket()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(ticket["displayId"])

    assert detail.csat_prompt_visible() is False
    assert detail.csat_result_visible() is False


def test_csat_submit_and_persists_across_reload(driver, base_url):
    user_session, _, ticket = _create_and_resolve_ticket()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(user_session["token"], user_session["user"])
    detail.load(ticket["displayId"])

    assert detail.csat_prompt_visible() is True
    detail.submit_csat(5, comment="Great support!")

    result_text = detail.csat_result_text()
    assert "5" in result_text
    assert "Great support!" in result_text

    detail.load(ticket["displayId"])
    assert detail.csat_result_visible() is True
    assert detail.csat_prompt_visible() is False

    # The UI never re-offers the form once rated — confirm the API backs that up too.
    res = requests.post(
        f"{API_URL}/tickets/{ticket['id']}/csat",
        json={"rating": 3},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    )
    assert res.status_code == 409
