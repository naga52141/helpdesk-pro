import requests

from conftest import API_URL, api_login, unique_name, unique_ticket_title
from pages.admin_page import AdminPage
from pages.ticket_detail_page import TicketDetailPage


def test_non_staff_cannot_access_canned_responses_api(driver, base_url):
    session = api_login("user")
    r = requests.get(f"{API_URL}/canned-responses", headers={"Authorization": f"Bearer {session['token']}"})
    assert r.status_code == 403


def test_admin_can_add_edit_and_delete_a_canned_response(driver, base_url):
    session = api_login("admin")
    admin = AdminPage(driver, base_url)
    admin.set_session(session["token"], session["user"])
    admin.load()
    admin.switch_tab("canned-responses")

    title = unique_name("Canned")
    admin.add_canned_response(title, "Body text for the automated test.")
    assert title in admin.canned_response_titles()

    edited_title = f"{title} EDITED"
    admin.rename_canned_response(title, edited_title)
    assert edited_title in admin.canned_response_titles()

    admin.delete_canned_response(edited_title)
    assert edited_title not in admin.canned_response_titles()


def test_canned_response_select_hidden_for_regular_user(driver, base_url):
    user_session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    ).json()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(user_session["token"], user_session["user"])
    detail.load(ticket["displayId"])

    assert detail.canned_response_select_visible() is False


def test_agent_can_insert_canned_response_into_comment_draft(driver, base_url):
    session = api_login("admin")
    admin = AdminPage(driver, base_url)
    admin.set_session(session["token"], session["user"])
    admin.load()
    admin.switch_tab("canned-responses")

    title = unique_name("Canned")
    body = "This is the canned response body used for the insert test."
    admin.add_canned_response(title, body)

    user_session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    ).json()

    agent_session = api_login("agent")
    detail = TicketDetailPage(driver, base_url)
    detail.set_session(agent_session["token"], agent_session["user"])
    detail.load(ticket["displayId"])

    assert detail.canned_response_select_visible() is True
    assert title in detail.canned_response_titles()

    detail.insert_canned_response(title)
    assert detail.comment_draft_text() == body

    # A second insert appends rather than replacing.
    detail.insert_canned_response(title)
    assert detail.comment_draft_text() == f"{body}\n\n{body}"

    # detail.set_session() switched the browser's stored session to the agent — restore
    # the admin session before reusing `admin` to clean up, or admin.html denies access.
    admin.set_session(session["token"], session["user"])
    admin.load()
    admin.switch_tab("canned-responses")
    admin.delete_canned_response(title)
