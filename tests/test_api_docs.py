from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from conftest import DOCS_URL

EXPECTED_TAGS = {
    "Auth", "Tickets", "Knowledge Base", "Canned Responses", "Notifications",
    "Dashboard", "Analytics", "Users", "SLA Rules", "Lookups",
}


def test_docs_page_renders_every_documented_operation(driver):
    driver.get(DOCS_URL)
    WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, ".opblock"))

    assert driver.find_element(By.CSS_SELECTOR, ".title").text.startswith("HelpDesk Pro API")

    tag_names = {t.text.split("\n")[0] for t in driver.find_elements(By.CSS_SELECTOR, ".opblock-tag")}
    assert tag_names == EXPECTED_TAGS

    # Not a hardcoded headcount — just confirms the page actually rendered a full set of
    # operations rather than an empty/broken spec, which a corrupted openapi.js could produce.
    assert len(driver.find_elements(By.CSS_SELECTOR, ".opblock")) > 30


# Confirms the interactive docs genuinely work end-to-end — a real fetch from the
# rendered page against the real running API — not just that the page paints.
def test_docs_try_it_out_executes_a_real_request(driver):
    driver.get(DOCS_URL)
    WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, ".opblock"))

    target = next(op for op in driver.find_elements(By.CSS_SELECTOR, ".opblock") if "List categories" in op.text)
    target.find_element(By.CSS_SELECTOR, ".opblock-summary").click()
    WebDriverWait(driver, 5).until(lambda d: target.find_element(By.CSS_SELECTOR, "button.try-out__btn"))
    target.find_element(By.CSS_SELECTOR, "button.try-out__btn").click()
    target.find_element(By.CSS_SELECTOR, "button.execute").click()

    # Parsed from the block's own text rather than a specific CSS class — Swagger UI
    # reuses very similar table markup for both the live "Server response" result and
    # the static per-spec "Responses" documentation just below it, so a class-based
    # selector risks silently reading the wrong one.
    WebDriverWait(driver, 10).until(lambda d: "Server response" in target.text)
    server_response_section = target.text.split("Server response")[1].split("Response body")[0]
    assert "200" in server_response_section
