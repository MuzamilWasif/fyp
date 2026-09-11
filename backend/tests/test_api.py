"""End-to-end API tests: auth, RBAC, and the full UFM case lifecycle."""
import os, sys, tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkstemp(suffix='.db')[1]}"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.seed import run as seed

seed()
client = TestClient(app)


def login(email):
    r = client.post("/api/auth/login", data={"username": email, "password": "password123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_login_rejects_bad_password():
    r = client.post("/api/auth/login", data={"username": "hod@au.edu.pk", "password": "wrong"})
    assert r.status_code == 401


def test_student_cannot_create_case():
    r = client.post("/api/cases", json={
        "student_reg_no": "1", "student_name": "x", "violation_type": "mobile_phone"
    }, headers=login("student@au.edu.pk"))
    assert r.status_code == 403


def test_full_case_lifecycle():
    inv = login("invigilator@au.edu.pk")
    r = client.post("/api/cases", json={
        "student_reg_no": "232430", "student_name": "Test Student", "student_department": "CS",
        "exam_name": "Data Structures Final", "room": "A-101", "seat": "A12",
        "violation_type": "mobile_phone", "description": "Phone under desk",
    }, headers=inv)
    assert r.status_code == 200, r.text
    case = r.json()
    cid = case["id"]
    assert case["status"] == "submitted"
    assert case["result_hold"] is True

    # student sees own case
    stu = login("student@au.edu.pk")
    r = client.get(f"/api/cases/{cid}", headers=stu)
    assert r.status_code == 200

    # HOD approves (digital sign)
    hod = login("hod@au.edu.pk")
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "approve", "comment": "verified"}, headers=hod)
    assert r.status_code == 200 and r.json()["status"] == "hod_approved"
    assert r.json()["hod_signed"] is True

    # HOD cannot decide
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "decide"}, headers=hod)
    assert r.status_code == 403

    # DEC forwards
    dec = login("dec@au.edu.pk")
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "forward"}, headers=dec)
    assert r.status_code == 200 and r.json()["status"] == "dec_forwarded"

    # Exam Dept forwards to committee
    ed = login("examdept@au.edu.pk")
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "forward"}, headers=ed)
    assert r.status_code == 200 and r.json()["status"] == "exam_dept_forwarded"

    # Committee decides
    com = login("committee@au.edu.pk")
    r = client.post(f"/api/cases/{cid}/transition", json={
        "action": "decide", "final_decision": "Guilty of UFM", "penalty": "F grade in course"
    }, headers=com)
    assert r.status_code == 200
    assert r.json()["status"] == "decided" and r.json()["penalty"] == "F grade in course"

    # Exam Dept releases result and closes
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "release_result"}, headers=ed)
    assert r.json()["result_hold"] is False
    r = client.post(f"/api/cases/{cid}/transition", json={"action": "close"}, headers=ed)
    assert r.json()["status"] == "closed"

    # audit trail recorded the flow
    r = client.get("/api/audit", params={"entity": "case", "entity_id": cid}, headers=ed)
    actions = [row["action"] for row in r.json()]
    assert "case_created" in actions and "case_decide" in actions and "case_close" in actions


def test_ai_alert_to_case():
    r = client.post("/api/alerts", json={
        "camera_id": "CAM-A101-1", "room": "A-101", "label": "mobile_phone",
        "confidence": 0.91, "frame_count": 9, "evidence_path": ""
    })
    assert r.status_code == 200
    alert = r.json()
    assert 0.8 < alert["severity"] <= 0.95  # weighted suspicion score

    inv = login("invigilator@au.edu.pk")
    r = client.post("/api/cases", json={
        "student_reg_no": "232430", "student_name": "Test Student",
        "violation_type": "mobile_phone", "source": "ai", "alert_id": alert["id"],
    }, headers=inv)
    assert r.status_code == 200
    r = client.get("/api/alerts", headers=inv)
    linked = [a for a in r.json() if a["id"] == alert["id"]][0]
    assert linked["status"] == "case_created"


def test_seat_lookup_autofill():
    inv = login("invigilator@au.edu.pk")
    exams = client.get("/api/admin/exams", headers=inv).json()
    assert exams
    r = client.get("/api/lookup/seat", params={"exam_id": exams[0]["id"], "seat": "A12"}, headers=inv)
    assert r.status_code == 200
    assert r.json()["student_reg_no"] == "232430"


def test_dashboard_stats():
    r = client.get("/api/dashboard/stats", headers=login("examdept@au.edu.pk"))
    data = r.json()
    assert data["total_cases"] >= 2
    assert "monthly_trend" in data and len(data["monthly_trend"]) == 12
