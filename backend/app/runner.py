import subprocess
import sys
import tempfile
from pathlib import Path

MAX_OUTPUT_CHARS = 12000


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + "\n\n… Ausgabe gekürzt, weil sie zu lang ist."


def run_python(code: str, stdin: str = "", timeout: int = 5) -> dict:
    with tempfile.TemporaryDirectory(prefix="pylab_web_") as tmp:
        script = Path(tmp) / "main.py"
        script.write_text(code, encoding="utf-8")
        try:
            result = subprocess.run(
                [sys.executable, "-I", str(script)],
                input=stdin,
                capture_output=True,
                text=True,
                errors="replace",
                timeout=timeout,
                cwd=tmp,
            )
            return {
                "stdout": _truncate(result.stdout),
                "stderr": _truncate(result.stderr),
                "returncode": result.returncode,
                "timed_out": False,
            }
        except subprocess.TimeoutExpired as exc:
            partial_stdout = exc.stdout or ""
            partial_stderr = exc.stderr or ""
            if isinstance(partial_stdout, bytes):
                partial_stdout = partial_stdout.decode("utf-8", errors="replace")
            if isinstance(partial_stderr, bytes):
                partial_stderr = partial_stderr.decode("utf-8", errors="replace")
            message = (
                f"Die Ausführung wurde nach {timeout} Sekunden beendet. "
                "Prüfe besonders auf eine Endlosschleife oder eine Eingabe, auf die das Programm noch wartet."
            )
            return {
                "stdout": _truncate(partial_stdout),
                "stderr": _truncate((partial_stderr + "\n" + message).strip()),
                "returncode": -1,
                "timed_out": True,
            }
        except OSError as exc:
            return {
                "stdout": "",
                "stderr": f"Python konnte nicht gestartet werden: {exc}",
                "returncode": -1,
                "timed_out": False,
            }
