# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path


def file_size(path: Path) -> int:
    return path.stat().st_size if path.is_file() else 0


def needs_split(path: Path, threshold_bytes: int) -> bool:
    return file_size(path) > threshold_bytes
