import requests

from conftest import API_URL, api_login, unique_article_title
from pages.article_detail_page import ArticleDetailPage
from pages.article_form_page import ArticleFormPage
from pages.knowledge_base_page import KnowledgeBasePage
from pages.new_ticket_page import NewTicketPage


def _create_article(role="agent", title=None, category_id=3):
    session = api_login(role)
    article = requests.post(
        f"{API_URL}/articles",
        json={"title": title or unique_article_title(), "content": "Some help content.", "categoryId": category_id},
        headers={"Authorization": f"Bearer {session['token']}"},
    ).json()
    return session, article


def test_list_shows_seeded_articles_and_search_narrows_them(driver, base_url):
    session = api_login("user")
    kb = KnowledgeBasePage(driver, base_url)
    kb.set_session(session["token"], session["user"])
    kb.load()

    titles = kb.card_titles()
    assert any("VPN" in t for t in titles)
    assert len(titles) >= 5  # the 5 seeded demo articles, plus whatever tests have added

    kb.search("VPN")
    filtered = kb.card_titles()
    assert filtered == ["Connecting to the office VPN"]

    kb.clear_filters()
    assert len(kb.card_titles()) == len(titles)


def test_category_filter_narrows_results(driver, base_url):
    session = api_login("user")
    kb = KnowledgeBasePage(driver, base_url)
    kb.set_session(session["token"], session["user"])
    kb.load()

    kb.filter_by_category("Hardware")
    titles = kb.card_titles()
    assert titles == ["Requesting a new laptop or hardware"]


def test_new_article_button_visible_for_agent_hidden_for_user(driver, base_url):
    user_session = api_login("user")
    kb = KnowledgeBasePage(driver, base_url)
    kb.set_session(user_session["token"], user_session["user"])
    kb.load()
    assert kb.new_article_button_visible() is False

    agent_session = api_login("agent")
    kb.set_session(agent_session["token"], agent_session["user"])
    kb.load()
    assert kb.new_article_button_visible() is True


# Regression coverage: article-form.html is staff-only, same pattern as admin.html —
# a plain user hitting the URL directly (not just hiding the nav entry) must be blocked.
def test_user_cannot_access_article_form_directly(driver, base_url):
    session = api_login("user")
    form = ArticleFormPage(driver, base_url)
    form.set_session(session["token"], session["user"])
    form.load()

    assert form.is_access_denied() is True


def test_agent_can_create_edit_and_delete_an_article(driver, base_url):
    session = api_login("agent")
    form = ArticleFormPage(driver, base_url)
    form.set_session(session["token"], session["user"])
    form.load()

    title = unique_article_title()
    form.fill(title=title, category_index=1, content="Line one.\nLine two.")
    form.submit()

    detail = ArticleDetailPage(driver, base_url)
    assert detail.title_text() == title
    assert detail.actions_visible() is True
    assert "Line one.\nLine two." in detail.content_text()

    detail.click_edit()
    edit_form = ArticleFormPage(driver, base_url)
    assert edit_form.heading_text() == "Edit Article"
    edited_title = f"{title} EDITED"
    edit_form.fill(title=edited_title)
    edit_form.submit()

    assert ArticleDetailPage(driver, base_url).title_text() == edited_title

    ArticleDetailPage(driver, base_url).delete()
    assert "knowledge-base.html" in driver.current_url


def test_viewing_a_nonexistent_article_shows_not_found(driver, base_url):
    session = api_login("user")
    detail = ArticleDetailPage(driver, base_url)
    detail.set_session(session["token"], session["user"])
    detail.load(999999)

    assert detail.is_not_found() is True


def test_regular_user_has_no_edit_controls_on_article_detail(driver, base_url):
    _, article = _create_article(role="agent")
    session = api_login("user")
    detail = ArticleDetailPage(driver, base_url)
    detail.set_session(session["token"], session["user"])
    detail.load(article["id"])

    assert detail.actions_visible() is False


# The whole point of the knowledge base is deflecting tickets — this checks the
# suggestion box on the ticket form actually surfaces a matching article by title.
def test_new_ticket_form_suggests_matching_kb_articles(driver, base_url):
    session = api_login("user")
    new_ticket = NewTicketPage(driver, base_url)
    new_ticket.set_session(session["token"], session["user"])
    new_ticket.load()

    assert new_ticket.kb_suggestions_visible() is False

    new_ticket.set_title_for_suggestions("Can't connect to the VPN")
    new_ticket.wait_for_kb_suggestions()
    assert "Connecting to the office VPN" in new_ticket.kb_suggestion_titles()

    new_ticket.set_title_for_suggestions("no")
    new_ticket.wait_for_no_kb_suggestions()
