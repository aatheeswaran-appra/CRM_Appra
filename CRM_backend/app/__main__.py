"""Run with python -m app, or directly from VS Code's Run Python File command."""

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> None:
    import uvicorn
    from pydantic import ValidationError

    from app.config import get_settings

    parser = argparse.ArgumentParser(description="Run Appra CRM's Python API.")
    parser.add_argument(
        "--reload", action="store_true", help="Reload Python source changes during development."
    )
    args = parser.parse_args()
    try:
        settings = get_settings()
    except ValidationError as exc:
        # Avoid printing input_value, which may contain a connection password.
        for error in exc.errors(include_input=False, include_url=False):
            print(
                f"Configuration error: {'.'.join(str(part) for part in error['loc'])}: {error['msg']}"
            )
        raise SystemExit(1) from None
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        if sock.connect_ex(("127.0.0.1", settings.port)) == 0:
            print(
                f"\n[ERROR] Port {settings.port} is already in use by another running process!\n"
                f"To stop the previous instance on Windows PowerShell, run:\n"
                f"  Get-Process -Id (Get-NetTCPConnection -LocalPort {settings.port} -ErrorAction SilentlyContinue).OwningProcess | Stop-Process -Force\n"
                f"Or choose a different port by editing PORT in .env\n",
                file=sys.stderr,
            )
            raise SystemExit(1)

    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host="127.0.0.1",
        port=settings.port,
        reload=args.reload,
    )


def run_as_module() -> int:
    """Direct-file execution lacks the package root and may use the wrong interpreter."""
    project_root = Path(__file__).resolve().parent.parent
    python_path = (
        project_root / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    )
    executable = str(python_path) if python_path.is_file() else sys.executable
    try:
        return subprocess.run(
            [executable, "-m", "app", *sys.argv[1:]],
            cwd=project_root,
            check=False,
        ).returncode
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    if not __package__:
        raise SystemExit(run_as_module())
    main()
