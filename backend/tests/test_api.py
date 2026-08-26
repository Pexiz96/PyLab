import os
import tempfile
from pathlib import Path

TEST_DB = Path(tempfile.gettempdir()) / f"pylab_test_{os.getpid()}.db"
os.environ["PYLAB_DB_PATH"] = str(TEST_DB)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def first_lesson():
    response = client.get("/lessons")
    assert response.status_code == 200
    return response.json()[0]


def first_code_step():
    for lesson in client.get("/lessons").json():
        for step in lesson["steps"]:
            if step["type"] == "code":
                return lesson, step
    raise AssertionError("Keine Code-Aufgabe gefunden")


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.6.0"


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


def test_completed_progress_is_not_lost_when_revisiting_old_steps():
    lesson = first_lesson()
    last_index = len(lesson["steps"]) - 1

    assert client.post(
        "/progress",
        json={"lesson_id": lesson["id"], "step_index": last_index, "completed": True},
    ).status_code == 200

    assert client.post(
        "/progress",
        json={"lesson_id": lesson["id"], "step_index": 0, "completed": False},
    ).status_code == 200

    progress = client.get("/profile").json()["progress"]
    saved = next(item for item in progress if item["lesson_id"] == lesson["id"])
    assert saved["completed"] == 1
    assert saved["step_index"] == last_index


def test_empty_code_is_rejected():
    response = client.post("/run", json={"code": ""})
    assert response.status_code == 422


def test_lesson_grading_does_not_trust_expected_output_from_browser():
    lesson, step = first_code_step()
    response = client.post(
        "/check",
        json={
            "code": 'print("browser-says-correct")',
            "lesson_id": lesson["id"],
            "step_id": step["id"],
            "expected_output": "browser-says-correct",
            "xp": 50,
        },
    )
    assert response.status_code == 200
    assert response.json()["passed"] is False


def test_unknown_non_practice_step_cannot_be_graded():
    lesson = first_lesson()
    response = client.post(
        "/check",
        json={
            "code": "print(1)",
            "lesson_id": lesson["id"],
            "step_id": "invented-step",
            "expected_output": "1",
        },
    )
    assert response.status_code == 404


def test_profile_contains_learning_metrics():
    response = client.get("/profile")
    assert response.status_code == 200
    body = response.json()
    assert "average_mastery" in body
    assert "attempted_mastery_average" in body
    assert "mastery_stats" in body
    assert "completed_lessons" in body
    assert "lesson_count" in body
    assert set(body["mastery_stats"]) == {"secure", "good", "building", "weak", "unrated"}
    assert 0 <= body["average_mastery"] <= 100
