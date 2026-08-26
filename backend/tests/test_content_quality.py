from app.content import load_lessons


def test_every_lesson_has_consistent_learning_structure():
    lessons = load_lessons()
    assert lessons, "Der Lernpfad darf nicht leer sein"

    for lesson in lessons:
        steps = lesson["steps"]
        assert steps[0]["type"] == "lesson", f"{lesson['id']}: erste Seite sollte eine Erklärung sein"
        assert steps[-1]["type"] == "summary", f"{lesson['id']}: letzte Seite muss eine Zusammenfassung sein"
        assert lesson["estimated_minutes"] >= 10, f"{lesson['id']}: unrealistisch kurze Zeitangabe"


def test_quizzes_are_unambiguous_and_explained():
    for lesson in load_lessons():
        for step in lesson["steps"]:
            if step["type"] != "quiz":
                continue
            options = step["options"]
            normalized = [str(option).strip().casefold() for option in options]
            assert len(normalized) == len(set(normalized)), f"{lesson['id']}:{step['id']}: doppelte Quiz-Option"
            assert str(step.get("explanation", "")).strip(), f"{lesson['id']}:{step['id']}: Quiz braucht eine Erklärung"


def test_code_tasks_are_runnable_and_teachable():
    for lesson in load_lessons():
        for step in lesson["steps"]:
            if step["type"] != "code":
                continue

            starter = step.get("starter_code", "")
            compile(starter, f"{lesson['id']}:{step['id']}", "exec")

            expected = step.get("expected_output")
            assert isinstance(expected, str) and expected.strip(), f"{lesson['id']}:{step['id']}: erwartete Ausgabe fehlt"

            xp = step.get("xp")
            assert isinstance(xp, int) and 1 <= xp <= 200, f"{lesson['id']}:{step['id']}: XP müssen zwischen 1 und 200 liegen"

            hints = step.get("hints", [])
            assert isinstance(hints, list) and len(hints) >= 2, f"{lesson['id']}:{step['id']}: mindestens zwei Hinweise nötig"
            assert all(isinstance(hint, str) and hint.strip() for hint in hints), f"{lesson['id']}:{step['id']}: leere Hinweise gefunden"


def test_summaries_are_useful():
    lessons = load_lessons()
    for index, lesson in enumerate(lessons):
        summary = lesson["steps"][-1]
        assert len(summary.get("items", [])) >= 3, f"{lesson['id']}: Zusammenfassung ist zu knapp"
        if index < len(lessons) - 1:
            assert str(summary.get("next", "")).strip(), f"{lesson['id']}: Ausblick auf das nächste Thema fehlt"
