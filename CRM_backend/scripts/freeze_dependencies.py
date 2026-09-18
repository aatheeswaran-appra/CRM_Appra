"""Save the exact tested development environment without local filesystem paths."""

import subprocess
import sys
from pathlib import Path

result = subprocess.run(
    [sys.executable, "-m", "pip", "freeze", "--exclude-editable"],
    check=True,
    capture_output=True,
    text=True,
)
output = Path(__file__).resolve().parent.parent / "requirements.lock.txt"
output.write_text(
    "# Exact tested Python environment, including development tools.\n# Install with: python -m pip install -r requirements.lock.txt\n"
    + result.stdout
    + "\n-e .[dev]\n",
    encoding="utf-8",
)
print("Wrote requirements.lock.txt")
