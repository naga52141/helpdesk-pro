from conftest import api_login
from pages.analytics_page import AnalyticsPage
from pages.dashboard_page import DashboardPage


def test_analytics_link_and_page_blocked_for_user_role(driver, base_url):
    session = api_login("user")

    dashboard = DashboardPage(driver, base_url)
    dashboard.set_session(session["token"], session["user"])
    dashboard.load()
    assert not dashboard.analytics_link_present()

    analytics = AnalyticsPage(driver, base_url)
    analytics.load()
    assert analytics.is_access_denied()


def test_analytics_loads_charts_for_agent(driver, base_url):
    session = api_login("agent")

    analytics = AnalyticsPage(driver, base_url)
    analytics.set_session(session["token"], session["user"])
    analytics.load()

    assert analytics.kpi_resolution_time() != "—"
    assert analytics.category_chart_has_bars()
    assert len(analytics.agent_table_rows()) >= 1
