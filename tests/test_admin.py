from conftest import USERS, api_login, unique_name
from pages.admin_page import AdminPage


def _logged_in_admin_page(driver, base_url, role="admin"):
    session = api_login(role)
    page = AdminPage(driver, base_url)
    page.set_session(session["token"], session["user"])
    return page


def test_admin_page_blocked_for_agent(driver, base_url):
    page = _logged_in_admin_page(driver, base_url, role="agent")
    page.load()
    assert page.is_access_denied()


def test_admin_can_promote_and_revert_a_user_role(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load()

    target_email = USERS["user2"]["email"]  # Demo User — safe to toggle, not used as a fixed identity elsewhere
    try:
        page.set_user_role(target_email, "agent")
        assert page.user_role_text(target_email) == "Agent"
    finally:
        page.set_user_role(target_email, "user")
        assert page.user_role_text(target_email) == "User"


def test_admin_cannot_change_own_role(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load()
    assert "You" in page.user_role_text(USERS["admin"]["email"])


def test_admin_can_add_rename_and_delete_category(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("categories")

    name = unique_name("Category")
    page.add_category(name)
    page.wait_for_category(name)

    renamed = f"{name} Renamed"
    page.rename_category(name, renamed)
    assert renamed in page.category_names()
    assert name not in page.category_names()

    page.delete_category(renamed)
    assert renamed not in page.category_names()


def test_admin_cannot_create_duplicate_category(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("categories")

    name = unique_name("Dup")
    page.add_category(name)
    page.wait_for_category(name)
    try:
        page.add_category(name)
        assert "already exists" in page.category_error_text().lower()
    finally:
        page.delete_category(name)


def test_admin_can_edit_sla_rule_and_revert(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("sla")

    try:
        page.set_sla_rule("low", 10, 80)
    finally:
        page.set_sla_rule("low", 8, 72)
