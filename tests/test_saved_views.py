import requests
from selenium.webdriver.common.by import By

from conftest import API_URL, api_login, unique_name
from pages.tickets_page import TicketsPage


def _tickets_page(driver, base_url, role="user"):
    session = api_login(role)
    page = TicketsPage(driver, base_url)
    page.set_session(session["token"], session["user"])
    page.load()
    page.count_text()
    return page, session


def test_saved_views_rejects_unauthenticated_api_access():
    res = requests.get(f"{API_URL}/saved-views")
    assert res.status_code == 401


def test_save_apply_and_delete_a_view(driver, base_url):
    page, _ = _tickets_page(driver, base_url)

    name = unique_name("View")
    page.set_status_filter("open")
    page.save_current_view(name)
    assert name in page.saved_view_names()

    page.clear_filters()
    assert page.status_filter_value() == "all"

    page.apply_saved_view(name)
    assert page.status_filter_value() == "open"

    page.delete_saved_view(name)
    assert name not in page.saved_view_names()


def test_saved_views_are_scoped_per_user(driver, base_url):
    user_page, user_session = _tickets_page(driver, base_url, role="user")

    name = unique_name("PrivateView")
    user_page.set_priority_filter("critical")
    try:
        user_page.save_current_view(name)
        assert name in user_page.saved_view_names()

        agent_res = requests.get(
            f"{API_URL}/saved-views",
            headers={"Authorization": f"Bearer {api_login('agent')['token']}"},
        )
        assert name not in [v["name"] for v in agent_res.json()]
    finally:
        res = requests.get(
            f"{API_URL}/saved-views",
            headers={"Authorization": f"Bearer {user_session['token']}"},
        )
        for view in res.json():
            if view["name"] == name:
                requests.delete(
                    f"{API_URL}/saved-views/{view['id']}",
                    headers={"Authorization": f"Bearer {user_session['token']}"},
                )


def test_save_view_requires_a_name(driver, base_url):
    page, _ = _tickets_page(driver, base_url)

    # the name input has the required attribute, so the browser blocks submission client-side
    driver.find_element(By.CSS_SELECTOR, "#save-view-form button[type=submit]").click()
    assert page.saved_view_names() == []
