"""Paquete de modelos: esquemas Pydantic y artefactos ML (.joblib) en este directorio."""

from app.models.schemas import (
    CuestionarioInput,
    NotasInput,
    PredictionRequest,
    PredictionResponse,
)

__all__ = [
    "CuestionarioInput",
    "NotasInput",
    "PredictionRequest",
    "PredictionResponse",
]
