import os
import tempfile
import time

import requests
from selenium.webdriver.common.by import By

from conftest import API_URL, api_login, unique_ticket_title
from pages.new_ticket_page import NewTicketPage
from pages.ticket_detail_page import TicketDetailPage


def test_upload_and_download_attachment(driver, base_url, download_dir):
    title = unique_ticket_title()
    file_content = f"Selenium attachment test — {title}"

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(file_content)
        upload_path = f.name

    try:
        session = api_login("user")
        new_ticket = NewTicketPage(driver, base_url)
        new_ticket.set_session(session["token"], session["user"])
        new_ticket.load()
        new_ticket.submit_ticket(
            title, "Ticket with an attachment", category="Software", priority="low", file_path=upload_path
        )
        alert_text = new_ticket.accept_success_alert()
        display_id = alert_text.split()[1]  # "Ticket T-42 created: ..." -> "T-42"

        detail = TicketDetailPage(driver, base_url)
        detail.load(display_id)

        uploaded_filename = os.path.basename(upload_path)
        assert detail.attachment_link_text() == uploaded_filename

        detail.click_attachment_link()

        downloaded_path = os.path.join(download_dir, uploaded_filename)
        deadline = time.time() + 10
        while time.time() < deadline and not os.path.exists(downloaded_path):
            time.sleep(0.2)

        assert os.path.exists(downloaded_path), f"Expected download at {downloaded_path}"
        with open(downloaded_path) as f:
            assert f.read() == file_content
    finally:
        os.unlink(upload_path)


def test_ticket_without_attachment_shows_none(driver, base_url):
    session = api_login("user")
    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "no attachment", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()

    detail = TicketDetailPage(driver, base_url)
    detail.set_session(session["token"], session["user"])
    detail.load(ticket["displayId"])

    assert detail.attachment_link_text() is None
    assert detail.find(By.ID, "d-attachment").text == "None"
