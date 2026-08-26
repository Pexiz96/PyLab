from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def first_lesson():
    response = client.get("/lessons")
    assert response.status_code == 200
    return response.json()[0]


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.5.0"


def test_content_status():
    response = client.get("/content-status")
    assert response.status_code == 200
    body = response.json()
    assert body["lesson_count"] >= 28
    assert body["error_count"] == 0


def test_lessons_endpoint():
    response = client.get("/lessons")
    assert response.status_code == 200
    lessons = response.json()
    assert isinstance(lessons, list)
    assert len(lessons) >= 28


def test_unknown_lesson_returns_404():
    response = client.get("/lessons/does-not-exist")
    assert response.status_code == 404


def test_unknown_mastery_lesson_returns_404():
    response = client.post("/mastery/attempt", json={"lesson_id": "does-not-exist", "passed": True})
    assert response.status_code == 404


def test_progress_rejects_out_of_range_step():
    lesson = first_lesson()
    response = client.post(
        "/progress",
        json={"lesson_id": lesson["id"], "step_index": len(lesson["steps"]), "completed": False},
    )
    assert response.status_code == 422


def test_empty_code_is_rejected():
    response = client.post("/run", json={"code": ""})
    assert response.status_code == 422


def test_profile_contains_learning_metrics():
    response = client.get("/profile")
    assert response.status_code == 200
    body = response.json()
    assert "average_mastery" in body
    assert "mastery_stats" in body
    assert "completed_lessons" in body
    assert set(body["mastery_stats"]) == {"secure", "good", "building", "weak"}
