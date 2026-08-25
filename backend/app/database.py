import sqlite3
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
"""

def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
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
            (reason,)
        ).fetchone()
        if not exists:
            con.execute(
                "INSERT INTO xp_events(amount, reason) VALUES (?, ?)",
                (amount, reason)
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
            (lesson_id, step_index, int(completed))
        )

def get_progress():
    with connect() as con:
        rows = con.execute("SELECT * FROM progress").fetchall()
        return [dict(r) for r in rows]
