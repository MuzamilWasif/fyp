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


# --------------------------------------------------------------------------
# Role-scoped dashboard + action queue
# --------------------------------------------------------------------------

def test_dashboard_is_role_scoped():
    """A student's dashboard counts only their own cases, never the institution's."""
    ed = client.get("/api/dashboard/stats", headers=login("examdept@au.edu.pk")).json()
    stu = client.get("/api/dashboard/stats", headers=login("student@au.edu.pk")).json()

    assert ed["scope"] == "institution"
    assert stu["scope"] == "own"
    assert stu["total_cases"] <= ed["total_cases"]
    # AI alerts are hall-level information a student must not receive
    assert stu["new_alerts"] == 0


def test_dashboard_exposes_deltas_and_action_counter():
    data = client.get("/api/dashboard/stats", headers=login("hod@au.edu.pk")).json()
    for key in ("deltas", "this_month", "last_month", "action_required", "scope", "transcript_blocks"):
        assert key in data, key
    assert set(data["deltas"]) == {"total_cases", "decided_cases"}
    assert data["deltas"]["total_cases"] == data["this_month"]["created"] - data["last_month"]["created"]
    assert isinstance(data["action_required"], int)
    # original contract still intact
    assert len(data["monthly_trend"]) == 12


def test_action_queue_matches_each_role():
    inv = login("invigilator@au.edu.pk")
    r = client.post("/api/cases", json={
        "student_reg_no": "232430", "student_name": "Test Student", "student_department": "CS",
        "violation_type": "notes_paper", "description": "Notes in pocket",
    }, headers=inv)
    assert r.status_code == 200
    cid = r.json()["id"]

    # a freshly submitted case is waiting on the HOD
    hod = login("hod@au.edu.pk")
    queue = client.get("/api/cases", params={"pending": True}, headers=hod).json()
    assert cid in [c["id"] for c in queue]

    # ...and not on the DEC yet
    dec = login("dec@au.edu.pk")
    assert cid not in [c["id"] for c in client.get("/api/cases", params={"pending": True}, headers=dec).json()]

    # after HOD approval it moves to the DEC queue
    client.post(f"/api/cases/{cid}/transition", json={"action": "approve"}, headers=hod)
    assert cid in [c["id"] for c in client.get("/api/cases", params={"pending": True}, headers=dec).json()]
    assert cid not in [c["id"] for c in client.get("/api/cases", params={"pending": True}, headers=hod).json()]

    # students are never in a queue
    stu = login("student@au.edu.pk")
    assert client.get("/api/cases", params={"pending": True}, headers=stu).json() == []


def test_case_list_rejects_unknown_status():
    r = client.get("/api/cases", params={"status": "not_a_status"}, headers=login("hod@au.edu.pk"))
    assert r.status_code == 422


def test_invigilator_only_sees_own_cases():
    inv = login("invigilator@au.edu.pk")
    rows = client.get("/api/cases", headers=inv).json()
    assert rows, "invigilator should see the cases they reported"
    assert all(c["student_reg_no"] for c in rows)


# --------------------------------------------------------------------------
# Student response, committee history and CSV export
# --------------------------------------------------------------------------

def _new_case(reg_no="232430", name="Test Student", violation="mobile_phone"):
    inv = login("invigilator@au.edu.pk")
    r = client.post("/api/cases", json={
        "student_reg_no": reg_no, "student_name": name, "student_department": "CS",
        "exam_name": "Data Structures Final", "room": "A-101", "seat": "A12",
        "violation_type": violation, "description": "seeded by test",
    }, headers=inv)
    assert r.status_code == 200, r.text
    return r.json()


def test_student_can_submit_one_explanation_on_own_case():
    case = _new_case()
    stu = login("student@au.edu.pk")

    r = client.post(f"/api/cases/{case['id']}/student-response",
                    json={"text": "The phone was switched off in my bag."}, headers=stu)
    assert r.status_code == 200, r.text
    actions = r.json()["actions"]
    mine = [a for a in actions if a["action"] == "student_response"]
    assert len(mine) == 1
    assert mine[0]["actor_role"] == "student"
    assert "switched off" in mine[0]["comment"]


def test_student_response_rejects_empty_text():
    case = _new_case()
    stu = login("student@au.edu.pk")
    r = client.post(f"/api/cases/{case['id']}/student-response", json={"text": "   "}, headers=stu)
    assert r.status_code == 422


def test_student_cannot_respond_on_someone_elses_case():
    case = _new_case(reg_no="219902", name="Bilal Ahmed")
    stu = login("student@au.edu.pk")
    r = client.post(f"/api/cases/{case['id']}/student-response",
                    json={"text": "not mine"}, headers=stu)
    assert r.status_code == 403


def test_student_response_blocked_after_closure():
    case = _new_case()
    ed = login("examdept@au.edu.pk")
    client.post(f"/api/cases/{case['id']}/transition", json={"action": "close"}, headers=ed)
    r = client.post(f"/api/cases/{case['id']}/student-response",
                    json={"text": "too late"}, headers=login("student@au.edu.pk"))
    assert r.status_code == 400


def test_staff_cannot_use_the_student_response_endpoint():
    case = _new_case()
    r = client.post(f"/api/cases/{case['id']}/student-response",
                    json={"text": "not a student"}, headers=login("hod@au.edu.pk"))
    assert r.status_code == 403


def test_committee_sees_full_student_ufm_history():
    first = _new_case(violation="notes_paper")
    second = _new_case(violation="mobile_phone")

    r = client.get(f"/api/cases/{second['id']}/student-history", headers=login("committee@au.edu.pk"))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["student_reg_no"] == "232430"
    assert data["total_cases"] >= 2
    assert data["prior_cases"] == data["total_cases"] - 1
    ids = [c["id"] for c in data["cases"]]
    assert first["id"] in ids and second["id"] in ids
    assert [c for c in data["cases"] if c["is_current"]][0]["id"] == second["id"]


def test_student_cannot_read_ufm_history():
    case = _new_case()
    r = client.get(f"/api/cases/{case['id']}/student-history", headers=login("student@au.edu.pk"))
    assert r.status_code == 403


def test_history_404_for_unknown_case():
    r = client.get("/api/cases/999999/student-history", headers=login("committee@au.edu.pk"))
    assert r.status_code == 404


def test_csv_export_is_role_scoped():
    _new_case()
    ed = client.get("/api/cases/export.csv", headers=login("examdept@au.edu.pk"))
    assert ed.status_code == 200, ed.text
    assert ed.headers["content-type"].startswith("text/csv")
    assert "attachment" in ed.headers["content-disposition"]

    header, *rows = [line for line in ed.text.splitlines() if line.strip()]
    assert header.startswith("Case No,Status,Student Reg No")
    assert len(rows) >= 2

    # a student's export contains only their own cases
    stu = client.get("/api/cases/export.csv", headers=login("student@au.edu.pk"))
    assert stu.status_code == 200
    stu_rows = [line for line in stu.text.splitlines()[1:] if line.strip()]
    assert stu_rows, "student should still be able to export their own record"
    assert all("232430" in row for row in stu_rows)
    assert len(stu_rows) < len(rows)


def test_csv_export_rejects_unknown_status():
    r = client.get("/api/cases/export.csv", params={"status": "bogus"},
                   headers=login("examdept@au.edu.pk"))
    assert r.status_code == 422
