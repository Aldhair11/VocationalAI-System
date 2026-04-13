"""
Generación de datos sintéticos para el pipeline vocacional (V2).
Macro-areas (etiqueta Y), 8 notas (0-20) y 5 items Likert (1-5).
Las columnas no listadas explicitamente en Altas/Bajas usan distribucion media
para notas (mean=13, std=2) y para Likert no especificados (mean=3, std=1).
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd

# Raiz del proyecto (scripts/)
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUTPUT_CSV = RAW_DIR / "synthetic_students.csv"

np.random.seed(42)

# Constante de dominio (documento V2) 

GRADE_COLS = [
    "nota_matematica",
    "nota_comunicacion",
    "nota_ciencia_tecnologia",
    "nota_ciencias_sociales",
    "nota_ingles",
    "nota_arte_cultura",
    "nota_educacion_fisica",
    "nota_desarrollo_personal",
]

LIKERT_COLS = [
    "q1_analitico",
    "q2_empatia",
    "q3_creatividad",
    "q4_lectura_debate",
    "q5_liderazgo_negocios",
]

TARGET_COL = "macro_area"

MACRO_AREAS: tuple[str, ...] = (
    "Ingeniería y Tecnología",
    "Ciencias de la Salud",
    "Ciencias Sociales, Letras y Humanidades",
    "Negocios y Administración",
    "Artes, Diseño y Comunicaciones",
)

# Notas no mencionadas en heuristica: Media (documento)
DEFAULT_GRADE_MEAN = 13.0
DEFAULT_GRADE_STD = 2.0

# Ítems Likert no mencionados en heurística (documento solo detallara notas "Media")
DEFAULT_LIKERT_MEAN = 3.0
DEFAULT_LIKERT_STD = 1.0

# Desviaciones auxiliares para Likert en altas/bajas (no fijadas en el documento)
LIKERT_STD_HIGH = 0.45
LIKERT_STD_LOW = 0.75

ROWS_PER_CLASS = 3_000
TOTAL_ROWS = 15_000

# Por macro-area: columna -> (mean, std) solo sobrescribe lo indicado en el documento.
PROFILE_OVERRIDES: dict[str, dict[str, tuple[float, float]]] = {
    "Ingeniería y Tecnología": {
        "nota_matematica": (17.0, 2.0),
        "nota_ciencia_tecnologia": (17.0, 2.0),
        "q1_analitico": (4.5, LIKERT_STD_HIGH),
        "q2_empatia": (2.5, LIKERT_STD_LOW),
    },
    "Ciencias de la Salud": {
        "nota_ciencia_tecnologia": (17.0, 1.5),
        "nota_matematica": (17.0, 1.5),
        "q2_empatia": (4.8, LIKERT_STD_HIGH),
    },
    "Ciencias Sociales, Letras y Humanidades": {
        "nota_comunicacion": (17.0, 2.0),
        "nota_ciencias_sociales": (17.0, 2.0),
        "nota_desarrollo_personal": (17.0, 2.0),
        "q4_lectura_debate": (4.8, LIKERT_STD_HIGH),
        "nota_matematica": (11.0, 2.0),
        "q1_analitico": (2.0, LIKERT_STD_LOW),
    },
    "Negocios y Administración": {
        "nota_matematica": (15.0, 2.0),
        "nota_ciencias_sociales": (15.0, 2.0),
        "nota_ingles": (15.0, 2.0),
        "q5_liderazgo_negocios": (4.5, LIKERT_STD_HIGH),
    },
    "Artes, Diseño y Comunicaciones": {
        "nota_arte_cultura": (17.0, 2.0),
        "nota_comunicacion": (17.0, 2.0),
        "q3_creatividad": (4.8, LIKERT_STD_HIGH),
        "nota_matematica": (12.0, 2.0),
    },
}


def _sample_grades(mean: float, std: float, n: int) -> np.ndarray:
    raw = np.random.normal(mean, std, size=n)
    return np.clip(np.round(raw), 0, 20).astype(np.int64)


def _sample_likert(mean: float, std: float, n: int) -> np.ndarray:
    raw = np.random.normal(mean, std, size=n)
    return np.clip(np.round(raw), 1, 5).astype(np.int64)


def _resolve_params(macro_area: str) -> dict[str, tuple[float, float]]:
    """Devuelve (mean, std) por cada una de las 13 columnas de features."""
    overrides = PROFILE_OVERRIDES[macro_area]
    params: dict[str, tuple[float, float]] = {}

    for col in GRADE_COLS:
        params[col] = overrides.get(col, (DEFAULT_GRADE_MEAN, DEFAULT_GRADE_STD))

    for col in LIKERT_COLS:
        params[col] = overrides.get(col, (DEFAULT_LIKERT_MEAN, DEFAULT_LIKERT_STD))

    return params


def generate_rows_for_macro_area(macro_area: str, n: int) -> pd.DataFrame:
    params = _resolve_params(macro_area)
    data: dict[str, np.ndarray] = {}

    for col in GRADE_COLS:
        m, s = params[col]
        data[col] = _sample_grades(m, s, n)

    for col in LIKERT_COLS:
        m, s = params[col]
        data[col] = _sample_likert(m, s, n)

    data[TARGET_COL] = np.full(n, macro_area, dtype=object)
    return pd.DataFrame(data)


def generate_synthetic_dataset(
    rows_per_class: int = ROWS_PER_CLASS,
) -> pd.DataFrame:
    """
    Genera dataset balanceado: `rows_per_class` filas por cada macro-área.
    Por defecto 15.000 filas (3.000 × 5).
    """
    parts = [generate_rows_for_macro_area(area, rows_per_class) for area in MACRO_AREAS]
    df = pd.concat(parts, ignore_index=True)
    return df.sample(frac=1.0, random_state=42).reset_index(drop=True)


def main() -> None:
    print("Generando datos sinteticos vocacionales (V2)...")
    dataset = generate_synthetic_dataset(rows_per_class=ROWS_PER_CLASS)

    assert len(dataset) == TOTAL_ROWS, "El volumen total debe ser 15.000 filas."
    counts = dataset[TARGET_COL].value_counts()
    assert len(counts) == len(MACRO_AREAS)
    assert (counts == ROWS_PER_CLASS).all(), "Balance perfecto 3.000 por clase."

    os.makedirs(RAW_DIR, exist_ok=True)
    feature_order = GRADE_COLS + LIKERT_COLS + [TARGET_COL]
    dataset[feature_order].to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

    print(f"Éxito: {len(dataset)} registros guardados en {OUTPUT_CSV}")
    print("\nDistribucion por macro-area:")
    print(dataset[TARGET_COL].value_counts().sort_index())
    print("\nMuestra (5 filas):")
    print(dataset.head())


if __name__ == "__main__":
    main()
