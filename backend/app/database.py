import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "pylab.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS progress (
    lesson_id TEXT PRIMARY KEY,
    step_index INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mastery (
    lesson_id TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    successes INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    last_result INTEGER,
    last_practiced_at TEXT,
    next_review_at TEXT
);
"""


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with connect() as con:
        con.executescript(SCHEMA)


def get_total_xp() -> int:
    with connect() as con:
        row = con.execute(
            "SELECT COALESCE(SUM(amount), 0) AS xp FROM xp_events"
        ).fetchone()
        return int(row["xp"])


def add_xp(amount: int, reason: str):
    with connect() as con:
        exists = con.execute(
            "SELECT 1 FROM xp_events WHERE reason = ? LIMIT 1",
            (reason,),
        ).fetchone()
        if not exists:
            con.execute(
                "INSERT INTO xp_events(amount, reason) VALUES (?, ?)",
                (amount, reason),
            )


def save_progress(lesson_id: str, step_index: int, completed: bool):
    with connect() as con:
        con.execute(
            """
            INSERT INTO progress(lesson_id, step_index, completed, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(lesson_id) DO UPDATE SET
                step_index = excluded.step_index,
                completed = excluded.completed,
                updated_at = CURRENT_TIMESTAMP
            """,
            (lesson_id, step_index, int(completed)),
        )


def get_progress():
    with connect() as con:
        rows = con.execute("SELECT * FROM progress ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]


def _review_interval_days(score: int, streak: int) -> int:
    if score < 40:
        return 1
    if score < 60:
        return 2
    if score < 75:
        return 4
    if score < 90:
        return 7
    return min(30, 14 + max(0, streak - 3) * 3)


def record_mastery_attempt(lesson_id: str, passed: bool):
    now = datetime.now(timezone.utc)

    with connect() as con:
        row = con.execute(
            "SELECT * FROM mastery WHERE lesson_id = ?",
            (lesson_id,),
        ).fetchone()

        attempts = int(row["attempts"]) if row else 0
        successes = int(row["successes"]) if row else 0
        streak = int(row["streak"]) if row else 0
        old_score = int(row["score"]) if row else 0

        attempts += 1
        if passed:
            successes += 1
            streak += 1
            gain = 18 if attempts <= 3 else 10
            score = min(100, old_score + gain)
        else:
            streak = 0
            score = max(0, old_score - 12)

        interval = _review_interval_days(score, streak)
        next_review = now + timedelta(days=interval)

        con.execute(
            """
            INSERT INTO mastery(
                lesson_id, attempts, successes, score, streak,
                last_result, last_practiced_at, next_review_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(lesson_id) DO UPDATE SET
                attempts = excluded.attempts,
                successes = excluded.successes,
                score = excluded.score,
                streak = excluded.streak,
                last_result = excluded.last_result,
                last_practiced_at = excluded.last_practiced_at,
                next_review_at = excluded.next_review_at
            """,
            (
                lesson_id,
                attempts,
                successes,
                score,
                streak,
                int(passed),
                now.isoformat(),
                next_review.isoformat(),
            ),
        )

    return get_mastery_for_lesson(lesson_id)


def get_mastery_for_lesson(lesson_id: str):
    with connect() as con:
        row = con.execute(
            "SELECT * FROM mastery WHERE lesson_id = ?",
            (lesson_id,),
        ).fetchone()
        return dict(row) if row else {
            "lesson_id": lesson_id,
            "attempts": 0,
            "successes": 0,
            "score": 0,
            "streak": 0,
            "last_result": None,
            "last_practiced_at": None,
            "next_review_at": None,
        }


def get_mastery():
    with connect() as con:
        rows = con.execute(
            "SELECT * FROM mastery ORDER BY score ASC, lesson_id ASC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_due_reviews():
    now = datetime.now(timezone.utc).isoformat()
    with connect() as con:
        rows = con.execute(
            """
            SELECT * FROM mastery
            WHERE next_review_at IS NOT NULL AND next_review_at <= ?
            ORDER BY score ASC, next_review_at ASC
            """,
            (now,),
        ).fetchall()
        return [dict(r) for r in rows]
