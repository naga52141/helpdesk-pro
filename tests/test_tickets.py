import re

from selenium.webdriver.common.by import By

from conftest import api_login, unique_ticket_title
from pages.new_ticket_page import NewTicketPage
from pages.tickets_page import TicketsPage


def _logged_in(page_cls, driver, base_url, role):
    session = api_login(role)
    page = page_cls(driver, base_url)
    page.set_session(session["token"], session["user"])
    return page


def test_user_can_create_ticket_and_see_it_in_my_tickets(driver, base_url):
    title = unique_ticket_title()

    new_ticket = _logged_in(NewTicketPage, driver, base_url, "user")
    new_ticket.load()
    new_ticket.submit_ticket(title, "Created by the Selenium suite.", category="Software", priority="medium")
    alert_text = new_ticket.accept_success_alert()
    assert title in alert_text

    tickets = TicketsPage(driver, base_url).load()
    assert tickets.title_text() == "My tickets"
    assert title in tickets.row_titles()


def test_new_ticket_requires_fields(driver, base_url):
    new_ticket = _logged_in(NewTicketPage, driver, base_url, "user")
    new_ticket.load()
    new_ticket.find_clickable(By.CSS_SELECTOR, ".btn-submit").click()

    assert "fill in all required fields" in new_ticket.error_text().lower()


def test_agent_sees_all_tickets_in_queue(driver, base_url):
    tickets = _logged_in(TicketsPage, driver, base_url, "agent")
    tickets.load()

    assert tickets.title_text() == "All tickets"
    shown, total = (int(n) for n in re.match(r"Showing (\d+) of (\d+) tickets", tickets.count_text()).groups())
    assert shown == total
    assert total >= 5  # at least the seeded tickets


def test_search_filters_ticket_queue(driver, base_url):
    tickets = _logged_in(TicketsPage, driver, base_url, "agent")
    tickets.load()
    tickets.search("VPN")

    titles = tickets.row_titles()
    assert len(titles) >= 1
    assert all("vpn" in t.lower() for t in titles)
