import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LESSONS_DIR = BASE_DIR / "content" / "lessons"


def _validate_lesson(lesson: dict, path: Path) -> None:
    required = ("id", "title", "steps")
    missing = [key for key in required if key not in lesson]
    if missing:
        raise ValueError(f"{path.name}: fehlende Felder: {', '.join(missing)}")
    if not isinstance(lesson["steps"], list) or not lesson["steps"]:
        raise ValueError(f"{path.name}: steps muss eine nicht-leere Liste sein")


def load_lessons_with_errors():
    lessons = []
    errors = []

    for path in sorted(LESSONS_DIR.glob("*.json")):
        try:
            lesson = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(lesson, dict):
                raise ValueError("Wurzelelement muss ein JSON-Objekt sein")
            _validate_lesson(lesson, path)
            lessons.append(lesson)
        except (json.JSONDecodeError, OSError, ValueError) as exc:
            errors.append({"file": path.name, "error": str(exc)})

    return lessons, errors


def load_lessons():
    lessons, _ = load_lessons_with_errors()
    return lessons


def content_status():
    lessons, errors = load_lessons_with_errors()
    return {
        "lesson_count": len(lessons),
        "error_count": len(errors),
        "errors": errors,
    }


def get_lesson(lesson_id: str):
    for lesson in load_lessons():
        if lesson["id"] == lesson_id:
            return lesson
    return None
