"""Esquemas Pydantic para el contrato de entrada/salida de predicción vocacional (V2)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class NotasInput(BaseModel):
    """Notas (0-20), orden alineado al entrenamiento."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    nota_matematica: int = Field(ge=0, le=20)
    nota_comunicacion: int = Field(ge=0, le=20)
    nota_ciencia_tecnologia: int = Field(ge=0, le=20)
    nota_ciencias_sociales: int = Field(ge=0, le=20)
    nota_ingles: int = Field(ge=0, le=20)
    nota_arte_cultura: int = Field(ge=0, le=20)
    nota_educacion_fisica: int = Field(ge=0, le=20)
    nota_desarrollo_personal: int = Field(ge=0, le=20)


class CuestionarioInput(BaseModel):
    """Ítems Likert (1-5)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    q1_analitico: int = Field(ge=1, le=5)
    q2_empatia: int = Field(ge=1, le=5)
    q3_creatividad: int = Field(ge=1, le=5)
    q4_lectura_debate: int = Field(ge=1, le=5)
    q5_liderazgo_negocios: int = Field(ge=1, le=5)


class PredictionRequest(BaseModel):
    """Payload POST /predict."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    notas: NotasInput
    cuestionario: CuestionarioInput


class PredictionResponse(BaseModel):
    """Respuesta POST /predict (ML + orientación con Gemini)."""

    model_config = ConfigDict(frozen=True)

    macro_area_recomendada: str
    mensaje_orientador: str


class MessageHistoryItem(BaseModel):
    """Un turno previo de la conversación (roles: user | ai)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    role: str
    content: str


class ChatFollowUpRequest(BaseModel):
    """Payload POST /chat — seguimiento con memoria."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    macro_area: str
    history: list[MessageHistoryItem]
    new_message: str


class ChatFollowUpResponse(BaseModel):
    """Respuesta POST /chat."""

    model_config = ConfigDict(frozen=True)

    respuesta_ia: str
