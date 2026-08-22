import re

import requests

from conftest import API_URL, unique_test_email, wait_for_email
from pages.forgot_password_page import ForgotPasswordPage
from pages.login_page import LoginPage
from pages.reset_password_page import ResetPasswordPage


def _register_test_account():
    email = unique_test_email()
    res = requests.post(
        f"{API_URL}/auth/register",
        json={"name": "Reset Flow Test", "email": email, "password": "OriginalPass123!", "departmentId": 1},
    )
    res.raise_for_status()
    return email


def _reset_link_from_email(to_email):
    message = wait_for_email(to_email, subject_contains="Reset your HelpDesk Pro password")
    match = re.search(r'href="([^"]+reset-password\.html\?token=[^"]+)"', message["HTML"])
    assert match, f"No reset link found in email body: {message['HTML']}"
    return match.group(1)


def test_forgot_password_generic_message_for_unknown_email(driver, base_url):
    page = ForgotPasswordPage(driver, base_url).load()
    page.submit("no-such-account@nowhere.com")

    assert "if an account exists" in page.result_message().lower()


def test_forgot_password_reset_and_login_end_to_end(driver, base_url):
    email = _register_test_account()

    forgot = ForgotPasswordPage(driver, base_url).load()
    forgot.submit(email)
    assert "if an account exists" in forgot.result_message().lower()

    reset_href = _reset_link_from_email(email)

    driver.get(reset_href)
    reset_page = ResetPasswordPage(driver, base_url)
    reset_page.submit("BrandNewPass456!")
    alert_text = reset_page.accept_success_alert()
    assert "password updated" in alert_text.lower()

    login = LoginPage(driver, base_url)
    login.load()
    login.login(email, "BrandNewPass456!")
    login.wait_until_url_contains("dashboard.html")


def test_reset_with_invalid_token_shows_error(driver, base_url):
    page = ResetPasswordPage(driver, base_url).load("not-a-real-token")
    page.submit("SomePassword123!")
    assert "invalid or has expired" in page.error_text().lower()


def test_reset_token_cannot_be_reused(driver, base_url):
    email = _register_test_account()

    forgot = ForgotPasswordPage(driver, base_url).load()
    forgot.submit(email)
    reset_href = _reset_link_from_email(email)

    driver.get(reset_href)
    first_use = ResetPasswordPage(driver, base_url)
    first_use.submit("FirstReset123!")
    first_use.accept_success_alert()

    driver.get(reset_href)
    second_use = ResetPasswordPage(driver, base_url)
    second_use.submit("SecondReset123!")
    assert "invalid or has expired" in second_use.error_text().lower()
