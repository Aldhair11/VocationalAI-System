from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as prediction_router
from app.core.config import get_settings
from app.services import ml_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga `.env` (GEMINI_API_KEY, etc.) y artefactos ML al iniciar."""
    get_settings()
    ml_service.load_artifacts()
    yield


app = FastAPI(
    title="Vocational AI Service",
    description="Microservicio de IA para procesamiento de libretas y predicción vocacional",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router)


@app.get("/")
def read_root():
    return {"mensaje": "El Motor de IA esta en linea y espera ordenes."}


@app.get("/health")
def health_check():
    return {"status": "ok"}
