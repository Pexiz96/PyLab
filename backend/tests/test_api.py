from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_content_status():
    response = client.get("/content-status")
    assert response.status_code == 200
    body = response.json()
    assert body["lesson_count"] > 0
    assert body["error_count"] == 0


def test_lessons_endpoint():
    response = client.get("/lessons")
    assert response.status_code == 200
    lessons = response.json()
    assert isinstance(lessons, list)
    assert len(lessons) > 0


def test_unknown_lesson_returns_404():
    response = client.get("/lessons/does-not-exist")
    assert response.status_code == 404
