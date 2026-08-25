import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LESSONS_DIR = BASE_DIR / "content" / "lessons"

def load_lessons():
    lessons = []
    for path in sorted(LESSONS_DIR.glob("*.json")):
        lessons.append(json.loads(path.read_text(encoding="utf-8")))
    return lessons

def get_lesson(lesson_id: str):
    for lesson in load_lessons():
        if lesson["id"] == lesson_id:
            return lesson
    return None
