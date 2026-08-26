from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .database import (
    init_db,
    get_total_xp,
    add_xp,
    save_progress,
    get_progress,
    record_mastery_attempt,
    get_mastery,
    get_mastery_for_lesson,
    get_due_reviews,
)
from .content import load_lessons, get_lesson, content_status
from .runner import run_python

VERSION = "0.6.0"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="PyLab API", version=VERSION, lifespan=lifespan)

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://impartial-smile-production-3ee9.up.railway.app",
]

configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("PYLAB_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
allowed_origins = sorted(set(DEFAULT_ORIGINS + configured_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class RunRequest(BaseModel):
    code: str = Field(min_length=1, max_length=12000)
    stdin: str = Field(default="", max_length=4000)


class CheckRequest(BaseModel):
    code: str = Field(min_length=1, max_length=12000)
    lesson_id: str = Field(min_length=1, max_length=100)
    step_id: str = Field(min_length=1, max_length=120)
    stdin: str = Field(default="", max_length=4000)
    expected_output: str | None = Field(default=None, max_length=4000)
    xp: int | None = Field(default=None, ge=0, le=50)


class ProgressRequest(BaseModel):
    lesson_id: str = Field(min_length=1, max_length=100)
    step_index: int = Field(ge=0, le=1000)
    completed: bool = False


class MasteryAttemptRequest(BaseModel):
    lesson_id: str = Field(min_length=1, max_length=100)
    passed: bool


def require_lesson(lesson_id: str):
    item = get_lesson(lesson_id)
    if not item:
        raise HTTPException(status_code=404, detail="Lektion nicht gefunden")
    return item


def find_step(lesson: dict, step_id: str):
    return next((step for step in lesson.get("steps", []) if step.get("id") == step_id), None)


def rank_for(level: int, average_mastery: int, completed: int) -> str:
    if completed >= 18 and average_mastery >= 80:
        return "Python Basics Master"
    if completed >= 12 and average_mastery >= 65:
        return "Python Fortgeschritten"
    if completed >= 5 or average_mastery >= 35 or level >= 8:
        return "Python Grundlagen"
    return "Python Anfänger"


@app.get("/")
def root():
    return {
        "app": "PyLab API",
        "status": "ok",
        "version": VERSION,
        "health": "/health",
        "content_status": "/content-status",
        "mastery": "/mastery",
        "reviews": "/reviews/due",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "app": "PyLab", "version": VERSION}


@app.get("/content-status")
def lesson_content_status():
    return content_status()


@app.get("/lessons")
def lessons():
    return load_lessons()


@app.get("/lessons/{lesson_id}")
def lesson(lesson_id: str):
    return require_lesson(lesson_id)


@app.post("/run")
def run(req: RunRequest):
    return run_python(req.code, req.stdin)


@app.post("/check")
def check(req: CheckRequest):
    lesson_item = require_lesson(req.lesson_id)
    content_step = find_step(lesson_item, req.step_id)

    if content_step is not None:
        if content_step.get("type") != "code":
            raise HTTPException(status_code=422, detail="Dieser Schritt ist keine Code-Aufgabe")
        expected = str(content_step.get("expected_output", "")).strip()
        reward = int(content_step.get("xp", 40))
        reward_reason = f"step:{req.lesson_id}:{req.step_id}"
    else:
        # Freie Trainingsaufgaben leben derzeit im Frontend. Sie dürfen nur eine
        # kleine, feste Belohnung vergeben und benötigen eine erwartete Ausgabe.
        if not req.step_id.startswith("practice-") or req.expected_output is None:
            raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden")
        expected = req.expected_output.strip()
        reward = min(req.xp or 25, 25)
        reward_reason = f"practice:{req.lesson_id}:{req.step_id}"

    result = run_python(req.code, req.stdin)
    actual = result["stdout"].strip()
    passed = not result["stderr"] and actual == expected

    if passed:
        add_xp(reward, reward_reason)
    mastery = record_mastery_attempt(req.lesson_id, passed)

    return {
        **result,
        "passed": passed,
        "expected": expected,
        "actual": actual,
        "xp_awarded": reward if passed else 0,
        "mastery": mastery,
    }


@app.post("/mastery/attempt")
def mastery_attempt(req: MasteryAttemptRequest):
    require_lesson(req.lesson_id)
    return record_mastery_attempt(req.lesson_id, req.passed)


@app.post("/progress")
def progress(req: ProgressRequest):
    item = require_lesson(req.lesson_id)
    if req.step_index >= len(item["steps"]):
        raise HTTPException(status_code=422, detail="Ungültiger Lektionsschritt")
    save_progress(req.lesson_id, req.step_index, req.completed)
    return {"ok": True}


@app.get("/mastery")
def mastery():
    return get_mastery()


@app.get("/mastery/{lesson_id}")
def mastery_for_lesson(lesson_id: str):
    require_lesson(lesson_id)
    return get_mastery_for_lesson(lesson_id)


@app.get("/reviews/due")
def due_reviews():
    return get_due_reviews()


@app.get("/profile")
def profile():
    xp = get_total_xp()
    level = 1
    threshold = 250
    while xp >= threshold and level < 100:
        level += 1
        threshold += 200 + level * 25

    all_lessons = load_lessons()
    lesson_count = len(all_lessons)
    progress_items = get_progress()
    mastery_items = get_mastery()
    due_items = get_due_reviews()
    completed = sum(1 for item in progress_items if item["completed"])

    mastery_sum = sum(item["score"] for item in mastery_items)
    overall_mastery = round(mastery_sum / lesson_count) if lesson_count else 0
    attempted_average = round(mastery_sum / len(mastery_items)) if mastery_items else 0

    mastery_stats = {
        "secure": sum(1 for item in mastery_items if item["score"] >= 90),
        "good": sum(1 for item in mastery_items if 70 <= item["score"] < 90),
        "building": sum(1 for item in mastery_items if 40 <= item["score"] < 70),
        "weak": sum(1 for item in mastery_items if item["score"] < 40),
        "unrated": max(0, lesson_count - len(mastery_items)),
    }

    return {
        "xp": xp,
        "level": level,
        "rank": rank_for(level, overall_mastery, completed),
        "progress": progress_items,
        "completed_lessons": completed,
        "lesson_count": lesson_count,
        "mastery": mastery_items,
        "mastery_stats": mastery_stats,
        "average_mastery": overall_mastery,
        "attempted_mastery_average": attempted_average,
        "due_reviews": due_items,
    }
