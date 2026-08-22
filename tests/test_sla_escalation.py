import subprocess

import pymysql
import requests

from conftest import API_URL, BACKEND_DIR, DB_CONFIG, api_login, unique_ticket_title


def _run_sla_breach_check():
    result = subprocess.run(
        ["node", "-e", "require('./src/utils/slaWarnings').checkSlaBreaches().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 0, f"checkSlaBreaches() failed: {result.stderr}"


def _force_overdue(ticket_id):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE tickets SET sla_due_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = %s", (ticket_id,))
        conn.commit()
    finally:
        conn.close()


def test_overdue_ticket_gets_priority_escalated_once():
    user_session = api_login("user")
    agent_session = api_login("agent")

    ticket = requests.post(
        f"{API_URL}/tickets",
        json={"title": unique_ticket_title(), "description": "test", "categoryId": 1, "priority": "medium", "departmentId": 1},
        headers={"Authorization": f"Bearer {user_session['token']}"},
    ).json()
    requests.patch(
        f"{API_URL}/tickets/{ticket['id']}",
        json={"assignedTo": agent_session["user"]["id"]},
        headers={"Authorization": f"Bearer {agent_session['token']}"},
    )
    _force_overdue(ticket["id"])

    _run_sla_breach_check()

    updated = requests.get(f"{API_URL}/tickets/{ticket['id']}", headers={"Authorization": f"Bearer {agent_session['token']}"}).json()
    assert updated["priority"] == "high"

    system_entry = next(h for h in updated["history"] if h["field"] == "priority")
    assert system_entry["changedBy"] == "System"
    assert system_entry["oldValue"] == "medium"
    assert system_entry["newValue"] == "high"

    agent_notifications = requests.get(f"{API_URL}/notifications", headers={"Authorization": f"Bearer {agent_session['token']}"}).json()
    assert any(n["type"] == "sla_breach" and ticket["displayId"] in n["message"] for n in agent_notifications["notifications"])

    # Running it again should not escalate a second time (medium->high already recorded).
    _run_sla_breach_check()
    unchanged = requests.get(f"{API_URL}/tickets/{ticket['id']}", headers={"Authorization": f"Bearer {agent_session['token']}"}).json()
    assert unchanged["priority"] == "high"
    assert len([h for h in unchanged["history"] if h["field"] == "priority"]) == 1
