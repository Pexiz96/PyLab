from app.content import load_lessons_with_errors


def test_all_lesson_files_are_valid():
    lessons, errors = load_lessons_with_errors()

    assert lessons, "Es wurden keine Lektionen geladen."
    assert errors == [], f"Ungültige Lerninhalte gefunden: {errors}"


def test_lesson_and_step_ids_are_unique():
    lessons, _ = load_lessons_with_errors()

    lesson_ids = [lesson["id"] for lesson in lessons]
    assert len(lesson_ids) == len(set(lesson_ids))

    for lesson in lessons:
        step_ids = [step["id"] for step in lesson["steps"]]
        assert len(step_ids) == len(set(step_ids)), lesson["id"]


def test_every_lesson_has_practice_or_summary():
    lessons, _ = load_lessons_with_errors()

    for lesson in lessons:
        types = {step["type"] for step in lesson["steps"]}
        assert "summary" in types, f"{lesson['id']} hat keine Zusammenfassung"
        assert types.intersection({"quiz", "code"}), f"{lesson['id']} hat keine aktive Übung"
