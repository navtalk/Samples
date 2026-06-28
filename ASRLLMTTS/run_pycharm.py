"""PyCharm entry: load .env then start the voice-call proxy with default host/port."""

from __future__ import annotations

import os
from pathlib import Path

from stepfun_voice_proxy import main


ROOT_DIR = Path(__file__).resolve().parent
ENV_PATH = ROOT_DIR / ".env"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


if __name__ == "__main__":
    load_env_file(ENV_PATH)
    os.environ.setdefault("HOST", "127.0.0.1")
    os.environ.setdefault("PORT", "9876")
    raise SystemExit(main([]))
