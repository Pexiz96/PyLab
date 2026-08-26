from fastapi import FastAPI, HTTPException
import os
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

VERSION = "0.5.0"
app = FastAPI(title="PyLab API", version=VERSION)

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
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


class RunRequest(BaseModel):
    code: str = Field(min_length=1, max_length=12000)
    stdin: str = Field(default="", max_length=4000)


class CheckRequest(BaseModel):
    code: str = Field(min_length=1, max_length=12000)
    expected_output: str = Field(max_length=4000)
    lesson_id: str = Field(min_length=1, max_length=100)
    step_id: str = Field(min_length=1, max_length=120)
    xp: int = Field(default=40, ge=0, le=200)


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


def rank_for(level: int, average_mastery: int, completed: int) -> str:
    if completed >= 18 and average_mastery >= 80:
        return "Python Basics Master"
    if average_mastery >= 70 or level >= 16:
        return "Python Fortgeschritten"
    if average_mastery >= 40 or level >= 8:
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
    require_lesson(req.lesson_id)
    result = run_python(req.code)
    actual = result["stdout"].strip()
    expected = req.expected_output.strip()
    passed = not result["stderr"] and actual == expected
    reward = req.xp if passed else 0
    if passed:
        add_xp(reward, f"step:{req.lesson_id}:{req.step_id}")
    mastery = record_mastery_attempt(req.lesson_id, passed)
    return {
        **result,
        "passed": passed,
        "expected": expected,
        "actual": actual,
        "xp_awarded": reward,
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

    progress_items = get_progress()
    mastery_items = get_mastery()
    due_items = get_due_reviews()
    completed = sum(1 for item in progress_items if item["completed"])
    average_mastery = (
        round(sum(item["score"] for item in mastery_items) / len(mastery_items))
        if mastery_items else 0
    )
    mastery_stats = {
        "secure": sum(1 for item in mastery_items if item["score"] >= 90),
        "good": sum(1 for item in mastery_items if 70 <= item["score"] < 90),
        "building": sum(1 for item in mastery_items if 40 <= item["score"] < 70),
        "weak": sum(1 for item in mastery_items if item["score"] < 40),
    }

    return {
        "xp": xp,
        "level": level,
        "rank": rank_for(level, average_mastery, completed),
        "progress": progress_items,
        "completed_lessons": completed,
        "mastery": mastery_items,
        "mastery_stats": mastery_stats,
        "average_mastery": average_mastery,
        "due_reviews": due_items,
    }
