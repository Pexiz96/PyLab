import subprocess
import sys
import tempfile
from pathlib import Path

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
                timeout=timeout,
                cwd=tmp,
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "timed_out": False,
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Die Ausführung wurde nach 5 Sekunden beendet. Möglicherweise enthält dein Code eine Endlosschleife.",
                "returncode": -1,
                "timed_out": True,
            }
