"""
Carga de artefactos ML y predicción de macro-área.

Orden de columnas idéntico al pipeline de entrenamiento (8 notas + 5 Likert).
Si el estimador es un Pipeline de sklearn (p. ej. escalado + regresión logística),
se usa ``predict`` del pipeline; si es un estimador suelto con ``scaler.joblib``,
se aplica ``scaler.transform`` antes de ``predict`` (Random Forest / HGB no usan scaler).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from app.models.schemas import PredictionRequest

# Orden exacto usado en generate_synthetic_data / train_model (V2)
FEATURE_COLUMN_ORDER: list[str] = [
    "nota_matematica",
    "nota_comunicacion",
    "nota_ciencia_tecnologia",
    "nota_ciencias_sociales",
    "nota_ingles",
    "nota_arte_cultura",
    "nota_educacion_fisica",
    "nota_desarrollo_personal",
    "q1_analitico",
    "q2_empatia",
    "q3_creatividad",
    "q4_lectura_debate",
    "q5_liderazgo_negocios",
]

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
_MODEL_PATH = _MODELS_DIR / "vocational_model.joblib"
_SCALER_PATH = _MODELS_DIR / "scaler.joblib"

_estimator: Any | None = None
_scaler: Any | None = None


def load_artifacts() -> None:
    """
    Carga ``vocational_model.joblib`` y, si existe y aplica, ``scaler.joblib``.
    Debe llamarse una vez al arranque de la aplicación.
    """
    global _estimator, _scaler

    if not _MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"No se encontró el modelo en {_MODEL_PATH}. "
            "Copia vocational_model.joblib desde el pipeline de datos."
        )

    _estimator = joblib.load(_MODEL_PATH)
    _scaler = joblib.load(_SCALER_PATH) if _SCALER_PATH.is_file() else None


def artifacts_loaded() -> bool:
    return _estimator is not None


def request_to_dataframe(req: PredictionRequest) -> pd.DataFrame:
    """Construye un DataFrame de una fila con el orden de features del entrenamiento."""
    n = req.notas.model_dump()
    q = req.cuestionario.model_dump()
    row: dict[str, int] = {**n, **q}
    ordered = [row[col] for col in FEATURE_COLUMN_ORDER]
    return pd.DataFrame([ordered], columns=FEATURE_COLUMN_ORDER)


def predict_macro_area(req: PredictionRequest) -> str:
    """
    Devuelve el nombre de la macro-área predicha.

    - Pipeline (escaler + clasificador): ``estimator.predict(X)``.
    - Clasificador sin Pipeline pero con scaler guardado: ``scaler.transform(X)`` luego ``predict``.
    - Sin scaler (p. ej. Random Forest): ``predict`` sobre features crudos.
    """
    if _estimator is None:
        raise RuntimeError("Los artefactos ML no están cargados. Reinicie el servicio.")

    X = request_to_dataframe(req)

    if isinstance(_estimator, Pipeline):
        y = _estimator.predict(X)
    elif _scaler is not None:
        X_scaled = _scaler.transform(X)
        y = _estimator.predict(X_scaled)
    else:
        y = _estimator.predict(X)

    label = y[0] if isinstance(y, np.ndarray) else y[0]
    return str(label)
