import glob
import os
import time

import requests

from conftest import API_URL, api_login, unique_ticket_title
from pages.tickets_page import TicketsPage


def test_export_csv_downloads_a_file_matching_the_current_filter(driver, base_url, download_dir):
    session = api_login("user")
    title = unique_ticket_title()
    requests.post(
        f"{API_URL}/tickets",
        json={"title": title, "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    )

    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.search(title)
    tickets.export_csv()

    deadline = time.time() + 10
    csv_files = []
    while time.time() < deadline and not csv_files:
        csv_files = glob.glob(os.path.join(download_dir, "tickets-*.csv"))
        time.sleep(0.2)

    assert csv_files, f"expected a tickets-*.csv download in {download_dir}"

    with open(csv_files[0]) as f:
        content = f.read()

    lines = content.strip().split("\n")
    assert lines[0] == "ID,Title,Category,Priority,Status,Assigned Agent,Department,Updated"
    assert len(lines) == 2  # header + the one ticket matching the search filter
    assert title in lines[1]


# Regression coverage for csvEscape: a title containing a comma must not split into
# extra columns, and embedded quotes must be doubled rather than breaking the quoting.
def test_export_csv_escapes_commas_and_quotes_in_titles(driver, base_url, download_dir):
    session = api_login("user")
    tricky_title = f'{unique_ticket_title()}, "quoted" and, comma-y'
    requests.post(
        f"{API_URL}/tickets",
        json={"title": tricky_title, "description": "test", "categoryId": 1, "priority": "low", "departmentId": 1},
        headers={"Authorization": f"Bearer {session['token']}"},
    )

    tickets = TicketsPage(driver, base_url)
    tickets.set_session(session["token"], session["user"])
    tickets.load()
    tickets.search(tricky_title)
    tickets.export_csv()

    deadline = time.time() + 10
    csv_files = []
    while time.time() < deadline and not csv_files:
        csv_files = glob.glob(os.path.join(download_dir, "tickets-*.csv"))
        time.sleep(0.2)

    assert csv_files

    import csv
    with open(csv_files[0], newline="") as f:
        rows = list(csv.reader(f))

    assert len(rows) == 2
    assert rows[1][1] == tricky_title  # title survives the round trip as a single field
