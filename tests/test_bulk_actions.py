import requests
from selenium.webdriver.common.by import By

from conftest import API_URL, api_login, unique_ticket_title
from pages.tickets_page import TicketsPage


def _create_ticket(role="user", title=None):
    session = api_login(role)
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": title or unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()
    return session, ticket


def test_regular_user_sees_no_bulk_controls(driver, base_url):
    session = api_login("user")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    assert driver.find_elements(By.CSS_SELECTOR, ".row-checkbox") == []


def test_agent_can_select_tickets_and_bulk_bar_updates_count(driver, base_url):
    _, ticket_a = _create_ticket()
    _, ticket_b = _create_ticket()

    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    assert tickets.bulk_bar_visible() is False

    tickets.select_ticket(ticket_a["id"])
    assert tickets.bulk_bar_visible() is True
    assert tickets.bulk_selected_count_text() == "1 ticket selected"

    tickets.select_ticket(ticket_b["id"])
    assert tickets.bulk_selected_count_text() == "2 tickets selected"

    tickets.clear_bulk_selection()
    assert tickets.bulk_bar_visible() is False


def test_agent_can_bulk_update_status_priority_and_assignment(driver, base_url):
    _, ticket_a = _create_ticket()
    _, ticket_b = _create_ticket()

    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    tickets.select_ticket(ticket_a["id"])
    tickets.select_ticket(ticket_b["id"])
    tickets.apply_bulk_action(status="in-progress", priority="high", assign_to_name="Priya Nair")

    for ticket in (ticket_a, ticket_b):
        detail = requests.get(f"{API_URL}/tickets/{ticket['id']}", headers={"Authorization": f"Bearer {session['token']}"}).json()
        assert detail["status"] == "in-progress"
        assert detail["priority"] == "high"
        assert detail["assignedAgent"] == "Priya Nair"
        assert {h["field"] for h in detail["history"]} == {"status", "priority", "assigned_to"}


def test_select_all_selects_every_visible_row(driver, base_url):
    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    row_count = len(tickets.row_titles())

    tickets.click_select_all()
    assert tickets.bulk_selected_count_text() == f"{row_count} ticket{'s' if row_count != 1 else ''} selected"


def test_apply_with_no_fields_chosen_shows_an_error(driver, base_url):
    _, ticket = _create_ticket()

    session = api_login("agent")
    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.count_text()

    tickets.select_ticket(ticket["id"])
    tickets.find_clickable(By.ID, "bulk-apply-btn").click()
    assert "at least one" in tickets.bulk_error_text().lower()


def test_bulk_endpoint_rejects_non_staff(driver, base_url):
    session = api_login("user")
    r = requests.patch(
        f"{API_URL}/tickets/bulk",
        json={"ticketIds": [1], "status": "open"},
        headers={"Authorization": f"Bearer {session['token']}"},
    )
    assert r.status_code == 403
