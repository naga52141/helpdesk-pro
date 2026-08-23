import pyotp
import requests

from conftest import API_URL, unique_test_email
from pages.account_page import AccountPage
from pages.login_page import LoginPage

# 2FA tests mutate account-level state (totp_secret/totp_enabled), so each test gets its
# own throwaway registered user rather than touching the shared USERS fixtures — those are
# reused by nearly every other test file via api_login(), and a stuck-enabled 2FA account
# would break plain-password logins everywhere else in the suite.
TEST_PASSWORD = "TwoFactorTest123!"


def _register_test_user():
    email = unique_test_email()
    res = requests.post(f"{API_URL}/auth/register", json={
        "name": "2FA Test User",
        "email": email,
        "password": TEST_PASSWORD,
        "departmentId": 1,
    })
    res.raise_for_status()
    body = res.json()
    return {"email": email, "password": TEST_PASSWORD, "token": body["token"], "user": body["user"]}


def _account_page_for_new_user(driver, base_url):
    user = _register_test_user()
    page = AccountPage(driver, base_url)
    page.set_session(user["token"], user["user"])
    page.load()
    return page, user


def test_2fa_status_defaults_to_disabled(driver, base_url):
    page, _ = _account_page_for_new_user(driver, base_url)
    assert page.is_disabled_state()


def test_enabling_2fa_requires_the_correct_code(driver, base_url):
    page, _ = _account_page_for_new_user(driver, base_url)

    page.start_setup()
    assert page.qr_code_src().startswith("data:image/png;base64,")
    secret = page.setup_secret()
    assert len(secret) >= 16

    page.submit_verify_code("000000")
    assert "invalid" in page.verify_error_text().lower()

    totp = pyotp.TOTP(secret)
    page.submit_verify_code(totp.now())
    page.wait_for_enabled_state()
    assert "on" in page.success_message_text().lower()


def test_cancel_setup_leaves_2fa_disabled(driver, base_url):
    page, _ = _account_page_for_new_user(driver, base_url)
    page.start_setup()
    page.cancel_setup()
    assert page.is_disabled_state()


def test_login_requires_totp_once_enabled(driver, base_url):
    page, user = _account_page_for_new_user(driver, base_url)

    page.start_setup()
    secret = page.setup_secret()
    totp = pyotp.TOTP(secret)
    page.submit_verify_code(totp.now())
    page.wait_for_enabled_state()

    driver.execute_script("localStorage.clear();")
    login_page = LoginPage(driver, base_url)
    login_page.load()
    login_page.login(user["email"], user["password"])
    assert login_page.totp_step_visible()

    login_page.submit_totp_code("000000")
    assert "invalid" in login_page.totp_error_text().lower()

    login_page.submit_totp_code(totp.now())
    login_page.wait_until_url_contains("dashboard.html")


def test_pending_totp_token_rejected_as_bearer_token(driver, base_url):
    page, user = _account_page_for_new_user(driver, base_url)

    page.start_setup()
    secret = page.setup_secret()
    totp = pyotp.TOTP(secret)
    page.submit_verify_code(totp.now())
    page.wait_for_enabled_state()

    login_res = requests.post(f"{API_URL}/auth/login", json={"email": user["email"], "password": user["password"]})
    login_res.raise_for_status()
    assert login_res.json()["requiresTotp"] is True
    temp_token = login_res.json()["tempToken"]

    res = requests.get(f"{API_URL}/tickets", headers={"Authorization": f"Bearer {temp_token}"})
    assert res.status_code == 401


def test_disable_requires_the_correct_password(driver, base_url):
    page, _ = _account_page_for_new_user(driver, base_url)

    page.start_setup()
    secret = page.setup_secret()
    totp = pyotp.TOTP(secret)
    page.submit_verify_code(totp.now())
    page.wait_for_enabled_state()

    page.submit_disable("wrong-password")
    assert "incorrect" in page.disable_error_text().lower()
    assert page.is_enabled_state()

    page.submit_disable(TEST_PASSWORD)
    page.wait_for_disabled_state()
    assert "off" in page.success_message_text().lower()
