import ast
import os
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_OUTPUT_CHARS = 12000
SAFE_IMPORT_ROOTS = {
    "collections", "datetime", "functools", "itertools", "json",
    "math", "random", "re", "statistics", "string",
}
BLOCKED_CALLS = {
    "breakpoint", "compile", "delattr", "eval", "exec", "getattr",
    "globals", "help", "locals", "open", "setattr", "vars", "__import__",
}
BLOCKED_NAMES = {
    "__builtins__", "os", "sys", "subprocess", "socket", "shutil",
    "ctypes", "multiprocessing", "resource",
}


class UnsafeCodeError(ValueError):
    pass


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + "\n\n… Ausgabe gekürzt, weil sie zu lang ist."


def _validate_learning_code(code: str) -> None:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Syntaxfehler gehören zum Lernen und sollen vom echten Python-Interpreter
        # mit einer normalen Fehlermeldung zurückgegeben werden.
        return

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root not in SAFE_IMPORT_ROOTS:
                    raise UnsafeCodeError(
                        f"Das Modul „{root}“ ist im PyLab-Codebereich aus Sicherheitsgründen nicht freigegeben."
                    )

        if isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".", 1)[0]
            if not root or root not in SAFE_IMPORT_ROOTS or node.level:
                raise UnsafeCodeError(
                    f"Der Import aus „{node.module or 'relativem Modul'}“ ist im PyLab-Codebereich nicht freigegeben."
                )

        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in BLOCKED_CALLS:
                raise UnsafeCodeError(
                    f"{node.func.id}() ist im PyLab-Codebereich aus Sicherheitsgründen deaktiviert."
                )

        if isinstance(node, ast.Name) and node.id in BLOCKED_NAMES:
            raise UnsafeCodeError(
                f"Der Name „{node.id}“ ist im PyLab-Codebereich nicht freigegeben."
            )

        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise UnsafeCodeError(
                "Direkter Zugriff auf Python-Dunder-Attribute ist im PyLab-Codebereich deaktiviert."
            )


def _linux_limits():
    if os.name != "posix":
        return None

    def apply_limits():
        import resource

        # Lerncode braucht nur sehr kleine Ressourcen. Die harten Grenzen sind
        # absichtlich deutlich oberhalb normaler Übungsaufgaben, aber deutlich
        # unterhalb dessen, was den Server belasten würde.
        resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
        memory = 256 * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        file_size = 1 * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_FSIZE, (file_size, file_size))
        resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
        try:
            resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
        except (ValueError, OSError):
            pass

    return apply_limits


def run_python(code: str, stdin: str = "", timeout: int = 5) -> dict:
    try:
        _validate_learning_code(code)
    except UnsafeCodeError as exc:
        return {
            "stdout": "",
            "stderr": f"PyLab-Sicherheit: {exc}",
            "returncode": -1,
            "timed_out": False,
            "blocked": True,
        }

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
                preexec_fn=_linux_limits(),
                env={"PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"},
            )
            return {
                "stdout": _truncate(result.stdout),
                "stderr": _truncate(result.stderr),
                "returncode": result.returncode,
                "timed_out": False,
                "blocked": False,
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
                "blocked": False,
            }
        except OSError as exc:
            return {
                "stdout": "",
                "stderr": f"Python konnte nicht gestartet werden: {exc}",
                "returncode": -1,
                "timed_out": False,
                "blocked": False,
            }
