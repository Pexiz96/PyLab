import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LESSONS_DIR = BASE_DIR / "content" / "lessons"
ALLOWED_STEP_TYPES = {"lesson", "quiz", "code", "summary"}


def _require_text(mapping: dict, key: str, context: str) -> None:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context}: '{key}' muss ein nicht-leerer Text sein")


def _validate_step(step: dict, path: Path, seen_ids: set[str]) -> None:
    if not isinstance(step, dict):
        raise ValueError(f"{path.name}: jeder Schritt muss ein JSON-Objekt sein")

    _require_text(step, "id", path.name)
    _require_text(step, "type", f"{path.name}:{step.get('id', '?')}")
    _require_text(step, "title", f"{path.name}:{step.get('id', '?')}")

    step_id = step["id"]
    step_type = step["type"]

    if step_id in seen_ids:
        raise ValueError(f"{path.name}: doppelte Schritt-ID '{step_id}'")
    seen_ids.add(step_id)

    if step_type not in ALLOWED_STEP_TYPES:
        raise ValueError(
            f"{path.name}:{step_id}: unbekannter type '{step_type}'. "
            f"Erlaubt: {', '.join(sorted(ALLOWED_STEP_TYPES))}"
        )

    if step_type == "lesson":
        body = step.get("body")
        if not isinstance(body, list) or not body or not all(isinstance(item, str) and item.strip() for item in body):
            raise ValueError(f"{path.name}:{step_id}: lesson braucht eine nicht-leere body-Liste")

    elif step_type == "quiz":
        _require_text(step, "question", f"{path.name}:{step_id}")
        options = step.get("options")
        correct = step.get("correct")
        if not isinstance(options, list) or len(options) < 2 or not all(isinstance(item, str) for item in options):
            raise ValueError(f"{path.name}:{step_id}: quiz braucht mindestens zwei Textoptionen")
        if not isinstance(correct, int) or not 0 <= correct < len(options):
            raise ValueError(f"{path.name}:{step_id}: correct muss auf eine vorhandene Option zeigen")

    elif step_type == "code":
        _require_text(step, "task", f"{path.name}:{step_id}")
        if "starter_code" not in step or not isinstance(step["starter_code"], str):
            raise ValueError(f"{path.name}:{step_id}: code braucht starter_code")
        if "expected_output" not in step or not isinstance(step["expected_output"], str):
            raise ValueError(f"{path.name}:{step_id}: code braucht expected_output")
        hints = step.get("hints", [])
        if hints and (not isinstance(hints, list) or not all(isinstance(item, str) for item in hints)):
            raise ValueError(f"{path.name}:{step_id}: hints muss eine Textliste sein")

    elif step_type == "summary":
        items = step.get("items")
        if not isinstance(items, list) or not items or not all(isinstance(item, str) and item.strip() for item in items):
            raise ValueError(f"{path.name}:{step_id}: summary braucht eine nicht-leere items-Liste")


def _validate_lesson(lesson: dict, path: Path) -> None:
    for key in ("id", "title", "subtitle", "difficulty"):
        _require_text(lesson, key, path.name)

    estimated_minutes = lesson.get("estimated_minutes")
    if not isinstance(estimated_minutes, int) or estimated_minutes <= 0:
        raise ValueError(f"{path.name}: estimated_minutes muss eine positive Ganzzahl sein")

    steps = lesson.get("steps")
    if not isinstance(steps, list) or not steps:
        raise ValueError(f"{path.name}: steps muss eine nicht-leere Liste sein")

    seen_ids: set[str] = set()
    for step in steps:
        _validate_step(step, path, seen_ids)


def load_lessons_with_errors():
    lessons = []
    errors = []
    seen_lesson_ids: set[str] = set()

    for path in sorted(LESSONS_DIR.glob("*.json")):
        try:
            lesson = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(lesson, dict):
                raise ValueError("Wurzelelement muss ein JSON-Objekt sein")

            _validate_lesson(lesson, path)

            lesson_id = lesson["id"]
            if lesson_id in seen_lesson_ids:
                raise ValueError(f"doppelte Lektions-ID '{lesson_id}'")
            seen_lesson_ids.add(lesson_id)

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
        "status": "ok" if not errors else "degraded",
        "lesson_count": len(lessons),
        "error_count": len(errors),
        "errors": errors,
    }


def get_lesson(lesson_id: str):
    for lesson in load_lessons():
        if lesson["id"] == lesson_id:
            return lesson
    return None
