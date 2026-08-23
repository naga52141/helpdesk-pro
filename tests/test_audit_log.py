import requests

from conftest import API_URL, USERS, api_login, unique_name
from pages.admin_page import AdminPage


def _logged_in_admin_page(driver, base_url, role="admin"):
    session = api_login(role)
    page = AdminPage(driver, base_url)
    page.set_session(session["token"], session["user"])
    return page


def test_audit_log_rejects_agent_via_api():
    session = api_login("agent")
    res = requests.get(f"{API_URL}/audit-log", headers={"Authorization": f"Bearer {session['token']}"})
    assert res.status_code == 403


def test_audit_log_records_category_create_rename_delete(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("categories")

    name = unique_name("AuditCat")
    page.add_category(name)
    page.wait_for_category(name)

    renamed = f"{name} Renamed"
    page.rename_category(name, renamed)
    page.delete_category(renamed)

    page.load().switch_tab("audit-log")
    rows = page.audit_log_row_texts()

    assert any("create" in row and "category" in row and name in row for row in rows)
    assert any("rename" in row and f"{name} -> {renamed}" in row for row in rows)
    assert any("delete" in row and "category" in row and renamed in row for row in rows)


def test_audit_log_records_sla_rule_update_and_revert(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("sla")

    try:
        page.set_sla_rule("low", 11, 81)
        page.load().switch_tab("audit-log")
        page.wait_for_audit_entry("low: response 11h, resolution 81h")
    finally:
        page.load().switch_tab("sla")
        page.set_sla_rule("low", 8, 72)


def test_audit_log_records_role_change_and_revert(driver, base_url):
    page = _logged_in_admin_page(driver, base_url)
    page.load().switch_tab("users")

    target_email = USERS["user2"]["email"]
    target_name = USERS["user2"]["name"]
    try:
        page.set_user_role(target_email, "agent")
        page.load().switch_tab("audit-log")
        page.wait_for_audit_entry(f"{target_name}: user -> agent")
    finally:
        page.load().switch_tab("users")
        page.set_user_role(target_email, "user")
