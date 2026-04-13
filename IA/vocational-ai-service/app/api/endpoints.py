"""Rutas HTTP del microservicio de IA."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ChatFollowUpRequest,
    ChatFollowUpResponse,
    PredictionRequest,
    PredictionResponse,
)
from app.services import llm_service, ml_service

router = APIRouter(tags=["predicción"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predice la macro-área vocacional",
)
def predict_macro_area(payload: PredictionRequest) -> PredictionResponse:
    if not ml_service.artifacts_loaded():
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible: artefactos ML no cargados.",
        )
    try:
        area = ml_service.predict_macro_area(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error en la predicción: {exc}",
        ) from exc

    notas_dict = payload.notas.model_dump()
    cuestionario_dict = payload.cuestionario.model_dump()

    try:
        mensaje = llm_service.generate_mensaje_orientador(
            notas_dict,
            cuestionario_dict,
            area,
        )
    except llm_service.LLMConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error del orientador (LLM): {exc}",
        ) from exc

    return PredictionResponse(
        macro_area_recomendada=area,
        mensaje_orientador=mensaje,
    )


@router.post(
    "/chat",
    response_model=ChatFollowUpResponse,
    summary="Seguimiento vocacional con memoria de conversación",
)
def chat_follow_up(payload: ChatFollowUpRequest) -> ChatFollowUpResponse:
    try:
        texto = llm_service.generate_chat_followup(payload)
    except llm_service.LLMConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error del orientador (LLM): {exc}",
        ) from exc
    return ChatFollowUpResponse(respuesta_ia=texto)
