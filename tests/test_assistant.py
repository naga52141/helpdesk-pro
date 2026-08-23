import requests

from conftest import API_URL, api_login
from pages.assistant_widget import AssistantWidget
from pages.dashboard_page import DashboardPage

# GROQ_API_KEY is an external, usage-billed dependency, so these tests are written to
# pass whether or not one is configured in the environment they run in (CI never sets
# one; local dev might). The actual tool-calling / real-response quality is verified
# manually against a real key rather than asserted here.


def _dashboard_with_session(driver, base_url, role="user"):
    session = api_login(role)
    page = DashboardPage(driver, base_url)
    page.set_session(session["token"], session["user"])
    page.load()
    return page, session


def test_assistant_rejects_unauthenticated_api_access():
    res = requests.post(f"{API_URL}/assistant/chat", json={"message": "hi"})
    assert res.status_code == 401


def test_chat_endpoint_completes_without_hanging_or_crashing():
    session = api_login("user")
    res = requests.post(
        f"{API_URL}/assistant/chat",
        json={"message": "What's overdue?"},
        headers={"Authorization": f"Bearer {session['token']}"},
    )
    # 200 (a real key answered) or 503 (no key configured, graceful decline) are both
    # "handled correctly" here — a 500 would mean something actually broke.
    assert res.status_code in (200, 503)
    body = res.json()
    assert (body.get("reply") or body.get("error"))


def test_widget_starts_closed_and_toggles(driver, base_url):
    _dashboard_with_session(driver, base_url)
    widget = AssistantWidget(driver)

    assert not widget.is_panel_open()
    widget.open()
    assert widget.is_panel_open()
    widget.close()
    assert not widget.is_panel_open()


def test_sending_a_message_shows_it_immediately(driver, base_url):
    _dashboard_with_session(driver, base_url)
    widget = AssistantWidget(driver)

    widget.open().send("what's overdue?")
    assert "what's overdue?" in widget.message_texts()[0]


def test_assistant_reaches_a_final_reply_state(driver, base_url):
    _dashboard_with_session(driver, base_url)
    widget = AssistantWidget(driver)

    widget.open().send("hello")
    reply = widget.wait_for_reply()

    assert reply.strip() != ""
    assert "Thinking" not in reply
