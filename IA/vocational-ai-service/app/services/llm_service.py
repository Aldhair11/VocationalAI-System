"""
Orientación vocacional con Gemini vía LangChain (langchain-google-genai).
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.models.schemas import ChatFollowUpRequest

GEMINI_MODEL = "gemini-2.5-flash"

_MARKDOWN_FORMAT_RULES = """
REGLAS ESTRICTAS DE FORMATO (Markdown):
1. NUNCA respondas con párrafos largos. Usa oraciones cortas y directas.
2. Si vas a comparar opciones (universidades, institutos, precios, carreras), USA SIEMPRE TABLAS de Markdown.
   Ejemplo de estructura de tabla:
   | Institución | Tipo | Mensualidad (S/) | Carreras Destacadas |
   |---|---|---|---|
   | UPC | Privada | 1,500 - 3,500 | Administración, Finanzas |
3. Usa listas con viñetas (-) para enumerar características o consejos.
4. Usa negritas (**texto**) para resaltar palabras clave, nombres de instituciones o montos importantes.
5. Estructura tu respuesta con subtítulos (###) para que sea fácil de escanear visualmente.
"""

SYSTEM_INSTRUCTION = """ERES UN ORIENTADOR VOCACIONAL EXPERTO EXCLUSIVO DEL SISTEMA EDUCATIVO PERUANO. Todas tus recomendaciones de carreras, universidades, institutos y mercado laboral deben estar estrictamente enfocadas en Perú. Si mencionas costos o salarios, usa siempre la moneda local (Soles peruanos, expresados como S/ o PEN).

Eres un orientador vocacional experto en Perú. El modelo estadístico ya ha determinado que el estudiante pertenece a la macro-área: {macro_area}. Basándote en sus {notas_json} y respuestas del {cuestionario_json}, redacta un mensaje empático y motivador (máximo 3 párrafos). Explícale por qué encaja en esta área destacando sus fortalezas, y sugiérele 2 o 3 carreras universitarias específicas dentro de esa macro-área que hagan match con su perfil. Háblale directamente al estudiante en primera persona.""" + _MARKDOWN_FORMAT_RULES

HUMAN_MESSAGE = (
    "Redacta únicamente el mensaje orientador final, sin saludos administrativos "
    "ni mencionar que eres un modelo de lenguaje."
)


class LLMConfigurationError(RuntimeError):
    """Falta GEMINI_API_KEY o configuración inválida para el LLM."""


_llm: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    settings = get_settings()
    if not settings.gemini_api_key:
        raise LLMConfigurationError(
            "GEMINI_API_KEY no está definida. Configúrala en el archivo .env."
        )
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            google_api_key=settings.gemini_api_key,
            temperature=0.7,
        )
    return _llm


def build_orientador_chain():
    """Prompt estructurado + LLM (para tests o reutilización)."""
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_INSTRUCTION),
            ("human", HUMAN_MESSAGE),
        ]
    )
    return prompt | _get_llm()


def generate_mensaje_orientador(
    notas: dict[str, Any],
    cuestionario: dict[str, Any],
    macro_area: str,
) -> str:
    """
    Genera el texto explicativo usando notas y cuestionario serializados en JSON
    y la macro-área predicha por el modelo ML.
    """
    notas_json = json.dumps(notas, ensure_ascii=False, indent=2)
    cuestionario_json = json.dumps(cuestionario, ensure_ascii=False, indent=2)

    chain = build_orientador_chain()
    result = chain.invoke(
        {
            "macro_area": macro_area,
            "notas_json": notas_json,
            "cuestionario_json": cuestionario_json,
        }
    )
    content = result.content
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
            else:
                parts.append(str(block))
        return "\n".join(parts).strip()
    return str(content).strip()


FOLLOWUP_SYSTEM = (
    "Eres un orientador vocacional experto enfocado 100% en el sistema educativo de Perú. "
    "El estudiante fue recomendado para el área: {macro_area}. "
    "Responde a su pregunta de seguimiento basándote en la conversación previa de manera "
    "concisa y empática. Solo recomienda universidades o institutos peruanos "
    "(ej. UNMSM, UNI, PUCP, UPC, Ulima, etc.). "
    "Si hablas de costos, mensualidades o pensiones, hazlo en Soles peruanos (S/)."
    + _MARKDOWN_FORMAT_RULES
)


def _history_item_to_message(role: str, content: str) -> BaseMessage:
    r = role.strip().lower()
    if r in ("user", "human"):
        return HumanMessage(content=content)
    if r in ("ai", "assistant"):
        return AIMessage(content=content)
    # Por defecto trata como turno del estudiante
    return HumanMessage(content=content)


def build_followup_chain():
    """System + historial variable + último mensaje humano."""
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", FOLLOWUP_SYSTEM),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{new_message}"),
        ]
    )
    return prompt | _get_llm()


def generate_chat_followup(request: ChatFollowUpRequest) -> str:
    """
    Seguimiento con memoria: historial previo + nuevo mensaje del estudiante.
    """
    history_messages: list[BaseMessage] = [
        _history_item_to_message(item.role, item.content) for item in request.history
    ]

    chain = build_followup_chain()
    result = chain.invoke(
        {
            "macro_area": request.macro_area,
            "history": history_messages,
            "new_message": request.new_message,
        }
    )
    content = result.content
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
            else:
                parts.append(str(block))
        return "\n".join(parts).strip()
    return str(content).strip()
