from fastapi import FastAPI, HTTPException
import os
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import init_db, get_total_xp, add_xp, save_progress, get_progress
from .content import load_lessons, get_lesson
from .runner import run_python

app = FastAPI(title="PyLab API", version="0.2.3")

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
    code: str
    stdin: str = ""

class CheckRequest(BaseModel):
    code: str
    expected_output: str
    lesson_id: str
    step_id: str
    xp: int = 40

class ProgressRequest(BaseModel):
    lesson_id: str
    step_index: int
    completed: bool = False

@app.get("/")
def root():
    return {
        "app": "PyLab API",
        "status": "ok",
        "version": "0.2.3",
        "health": "/health",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "ok", "app": "PyLab", "version": "0.2.3"}

@app.get("/lessons")
def lessons():
    return load_lessons()

@app.get("/lessons/{lesson_id}")
def lesson(lesson_id: str):
    item = get_lesson(lesson_id)
    if not item:
        raise HTTPException(status_code=404, detail="Lektion nicht gefunden")
    return item

@app.post("/run")
def run(req: RunRequest):
    return run_python(req.code, req.stdin)

@app.post("/check")
def check(req: CheckRequest):
    result = run_python(req.code)
    actual = result["stdout"].strip()
    expected = req.expected_output.strip()
    passed = not result["stderr"] and actual == expected

    reward = req.xp if passed else 0
    if passed:
        add_xp(reward, f"step:{req.lesson_id}:{req.step_id}")

    return {
        **result,
        "passed": passed,
        "expected": expected,
        "actual": actual,
        "xp_awarded": reward,
    }

@app.post("/progress")
def progress(req: ProgressRequest):
    save_progress(req.lesson_id, req.step_index, req.completed)
    return {"ok": True}

@app.get("/profile")
def profile():
    xp = get_total_xp()
    level = 1
    threshold = 250
    while xp >= threshold and level < 100:
        level += 1
        threshold += 200 + level * 25
    return {
        "xp": xp,
        "level": level,
        "rank": "Python Anfänger" if level <= 10 else "Python Grundlagen",
        "progress": get_progress(),
    }
