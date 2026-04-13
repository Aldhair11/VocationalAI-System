"""Carga de variables de entorno (python-dotenv) y configuración centralizada."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# Raiz del proyecto (app/)
_ROOT = Path(__file__).resolve().parent.parent.parent


@lru_cache(maxsize=1)
def get_settings() -> "Settings":
    """
    Carga `.env` desde la raíz del proyecto y desde el cwd, y lee GEMINI_API_KEY.
    """
    load_dotenv(_ROOT / ".env")
    load_dotenv()
    return Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
    )


@dataclass(frozen=True)
class Settings:
    """Variables de entorno relevantes para el servicio."""

    gemini_api_key: str
