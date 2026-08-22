import socket
import subprocess
import tempfile
import time
from pathlib import Path
from uuid import uuid4

import pymysql
import pytest
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

BACKEND_PORT = 4000
FRONTEND_PORT = 8935

BASE_URL = f"http://localhost:{FRONTEND_PORT}"
API_URL = f"http://localhost:{BACKEND_PORT}/api"

# Demo accounts seeded by backend/database/seed.sql (see scripts/set-demo-passwords.js)
DEMO_PASSWORD = "Password123!"
USERS = {
    "admin": {"email": "admin@helpdeskpro.local", "password": DEMO_PASSWORD, "name": "Admin User"},
    "agent": {"email": "alex.kim@helpdeskpro.local", "password": DEMO_PASSWORD, "name": "Alex Kim"},
    "agent2": {"email": "priya.nair@helpdeskpro.local", "password": DEMO_PASSWORD, "name": "Priya Nair"},
    "user": {"email": "sam.torres@company.com", "password": DEMO_PASSWORD, "name": "Sam Torres"},
    "user2": {"email": "demo.user@company.com", "password": DEMO_PASSWORD, "name": "Demo User"},
}

# Markers so test-created data is easy to find and wipe afterward.
TEST_TICKET_PREFIX = "[Selenium]"
TEST_EMAIL_DOMAIN = "selenium-test.local"
TEST_NAME_PREFIX = "[Selenium]"

DB_CONFIG = dict(host="localhost", user="root", password="", database="helpdeskpro", cursorclass=pymysql.cursors.DictCursor)


def _port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("localhost", port)) == 0


def _wait_for_port(port, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if _port_open(port):
            return True
        time.sleep(0.3)
    return False


@pytest.fixture(scope="session", autouse=True)
def backend_server():
    """Reuses an already-running backend on :4000, or starts one for the test session."""
    if _port_open(BACKEND_PORT):
        yield
        return

    proc = subprocess.Popen(
        ["node", "src/server.js"], cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    if not _wait_for_port(BACKEND_PORT):
        proc.terminate()
        raise RuntimeError("Backend server did not start on port 4000")
    yield
    proc.terminate()
    proc.wait(timeout=5)


@pytest.fixture(scope="session", autouse=True)
def frontend_server():
    """Serves the static frontend over HTTP so relative fetch()/localStorage behave like a real deployment."""
    if _port_open(FRONTEND_PORT):
        yield
        return

    proc = subprocess.Popen(
        ["python3", "-m", "http.server", str(FRONTEND_PORT)], cwd=FRONTEND_DIR,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    if not _wait_for_port(FRONTEND_PORT):
        proc.terminate()
        raise RuntimeError("Frontend static server did not start on port 8935")
    yield
    proc.terminate()
    proc.wait(timeout=5)


@pytest.fixture(scope="session", autouse=True)
def wait_for_health(backend_server, frontend_server):
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            if requests.get(f"{API_URL}/health", timeout=1).ok:
                return
        except requests.RequestException:
            pass
        time.sleep(0.3)
    raise RuntimeError("Backend health check never succeeded")


@pytest.fixture
def download_dir():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def driver(download_dir):
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    drv = webdriver.Chrome(options=options)
    drv.implicitly_wait(0)
    # Headless Chrome blocks downloads by default — needed for the attachment download test.
    drv.execute_cdp_cmd("Page.setDownloadBehavior", {"behavior": "allow", "downloadPath": download_dir})
    yield drv
    drv.quit()


@pytest.fixture
def driver2():
    """A second independent browser session, for tests proving a live update pushed by
    one client (via Socket.IO) is actually observed by a different client's open page,
    rather than just by the action's own client re-rendering itself."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    drv = webdriver.Chrome(options=options)
    drv.implicitly_wait(0)
    yield drv
    drv.quit()


@pytest.fixture
def base_url(wait_for_health):
    return BASE_URL


def api_login(role):
    creds = USERS[role]
    res = requests.post(f"{API_URL}/auth/login", json={"email": creds["email"], "password": creds["password"]})
    res.raise_for_status()
    return res.json()


def unique_test_email():
    return f"selenium.{uuid4().hex[:10]}@{TEST_EMAIL_DOMAIN}"


def unique_ticket_title():
    return f"{TEST_TICKET_PREFIX} Test ticket {uuid4().hex[:8]}"


def unique_name(label):
    return f"{TEST_NAME_PREFIX} {label} {uuid4().hex[:8]}"


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(wait_for_health):
    yield
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            # Attachment rows cascade-delete with their ticket, but the uploaded files on
            # disk don't — grab their paths first so they can be removed too.
            cur.execute(
                """SELECT a.file_path FROM attachments a JOIN tickets t ON a.ticket_id = t.id
                   WHERE t.title LIKE %s""",
                (f"{TEST_TICKET_PREFIX}%",),
            )
            upload_paths = [row["file_path"] for row in cur.fetchall()]

            cur.execute("DELETE FROM tickets WHERE title LIKE %s", (f"{TEST_TICKET_PREFIX}%",))
            cur.execute("DELETE FROM users WHERE email LIKE %s", (f"%@{TEST_EMAIL_DOMAIN}",))
            cur.execute("DELETE FROM categories WHERE name LIKE %s", (f"{TEST_NAME_PREFIX}%",))
            cur.execute("DELETE FROM departments WHERE name LIKE %s", (f"{TEST_NAME_PREFIX}%",))
        conn.commit()

        uploads_dir = BACKEND_DIR / "uploads"
        for file_path in upload_paths:
            (uploads_dir / file_path).unlink(missing_ok=True)
    finally:
        conn.close()
