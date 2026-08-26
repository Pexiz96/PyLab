import json
import subprocess
import sys
import tempfile
from pathlib import Path

TRACE_WRAPPER = r'''
import contextlib
import io
import json
import sys

TRACE_FILE = sys.argv[1]
CODE_FILE = sys.argv[2]
MAX_STEPS = 250
steps = []
last_line = None


def safe_value(value):
    try:
        text = repr(value)
    except Exception:
        text = f"<{type(value).__name__}>"
    if len(text) > 160:
        text = text[:157] + "..."
    return {"type": type(value).__name__, "value": text}


def snapshot(frame, event):
    global last_line
    if frame.f_code.co_filename != "<pylab>":
        return
    if len(steps) >= MAX_STEPS:
        raise RuntimeError("Zu viele Ausführungsschritte für den Visualizer.")
    locals_snapshot = {
        key: safe_value(value)
        for key, value in frame.f_locals.items()
        if not key.startswith("__")
    }
    steps.append({
        "event": event,
        "line": frame.f_lineno,
        "locals": locals_snapshot,
    })
    last_line = frame.f_lineno


def tracer(frame, event, arg):
    if frame.f_code.co_filename == "<pylab>" and event in {"line", "return"}:
        snapshot(frame, event)
    return tracer

code = open(CODE_FILE, "r", encoding="utf-8").read()
stdout = io.StringIO()
error = None

try:
    compiled = compile(code, "<pylab>", "exec")
    namespace = {"__name__": "__main__"}
    with contextlib.redirect_stdout(stdout):
        sys.settrace(tracer)
        try:
            exec(compiled, namespace, namespace)
        finally:
            sys.settrace(None)
except Exception as exc:
    error = f"{type(exc).__name__}: {exc}"

payload = {
    "steps": steps,
    "stdout": stdout.getvalue(),
    "error": error,
    "truncated": len(steps) >= MAX_STEPS,
}
with open(TRACE_FILE, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False)
'''


def visualize_python(code: str, timeout: int = 5) -> dict:
    with tempfile.TemporaryDirectory(prefix="pylab_visual_") as tmp:
        tmp_path = Path(tmp)
        wrapper = tmp_path / "trace_wrapper.py"
        user_code = tmp_path / "user_code.py"
        trace_file = tmp_path / "trace.json"
        wrapper.write_text(TRACE_WRAPPER, encoding="utf-8")
        user_code.write_text(code, encoding="utf-8")

        try:
            result = subprocess.run(
                [sys.executable, "-I", str(wrapper), str(trace_file), str(user_code)],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=tmp,
            )
        except subprocess.TimeoutExpired:
            return {
                "steps": [],
                "stdout": "",
                "error": "Die Visualisierung wurde nach 5 Sekunden beendet. Möglicherweise enthält der Code eine Endlosschleife.",
                "timed_out": True,
                "truncated": False,
            }

        if trace_file.exists():
            try:
                payload = json.loads(trace_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                payload = {"steps": [], "stdout": "", "error": "Die Trace-Daten konnten nicht gelesen werden.", "truncated": False}
        else:
            payload = {
                "steps": [],
                "stdout": "",
                "error": result.stderr.strip() or "Die Visualisierung konnte nicht erstellt werden.",
                "truncated": False,
            }

        payload["timed_out"] = False
        payload["returncode"] = result.returncode
        return payload
