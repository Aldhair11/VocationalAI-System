"""Tests de resiliencia para reintentos transitorios en llamadas a Gemini."""

from __future__ import annotations

import json
import logging
from unittest.mock import MagicMock, patch

import pytest
from google.genai.errors import ClientError

from app.services.llm_service import _invoke_gemini


def _rate_limit_error() -> ClientError:
    """Simula RESOURCE_EXHAUSTED / HTTP 429 de la API de Gemini."""
    return ClientError(
        429,
        {
            "error": {
                "code": 429,
                "message": "You exceeded your current quota.",
                "status": "RESOURCE_EXHAUSTED",
            }
        },
    )


def _bad_request_error() -> ClientError:
    """Simula HTTP 400 (error no transitorio)."""
    return ClientError(
        400,
        {
            "error": {
                "code": 400,
                "message": "Invalid request.",
                "status": "INVALID_ARGUMENT",
            }
        },
    )


def _success_response() -> MagicMock:
    """Respuesta exitosa simulada (HTTP 200) con contenido JSON válido."""
    response = MagicMock()
    response.content = json.dumps(
        {"mensaje_orientador": "Tu perfil encaja muy bien en Ciencias de la Salud."},
        ensure_ascii=False,
    )
    return response


@patch("time.sleep", return_value=None)
def test_invoke_gemini_retries_three_times_then_succeeds(mock_sleep: MagicMock) -> None:
    """
    Ante 3 fallos 429 consecutivos, _invoke_gemini reintenta y responde en el 4.º intento.
    """
    chain = MagicMock()
    chain.invoke.side_effect = [
        _rate_limit_error(),
        _rate_limit_error(),
        _rate_limit_error(),
        _success_response(),
    ]
    payload = {"macro_area": "Salud", "notas_json": "{}", "cuestionario_json": "{}"}

    result = _invoke_gemini(chain, payload)

    assert chain.invoke.call_count == 4
    assert result.content == json.dumps(
        {"mensaje_orientador": "Tu perfil encaja muy bien en Ciencias de la Salud."},
        ensure_ascii=False,
    )
    chain.invoke.assert_called_with(payload)
    assert mock_sleep.call_count == 3


@patch("time.sleep", return_value=None)
def test_invoke_gemini_does_not_retry_on_bad_request(mock_sleep: MagicMock) -> None:
    """Un error 400 no debe reintentarse; falla en el primer intento."""
    chain = MagicMock()
    chain.invoke.side_effect = _bad_request_error()
    payload = {"macro_area": "Salud", "new_message": "Hola"}

    with pytest.raises(ClientError) as exc_info:
        _invoke_gemini(chain, payload)

    assert exc_info.value.code == 400
    assert chain.invoke.call_count == 1
    mock_sleep.assert_not_called()


@patch("time.sleep", return_value=None)
def test_invoke_gemini_logs_retry_before_fourth_attempt(
    mock_sleep: MagicMock,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Verifica que before_sleep_log emite WARNING antes de cada reintento."""
    caplog.set_level(logging.WARNING, logger="app.services.llm_service")

    chain = MagicMock()
    chain.invoke.side_effect = [
        _rate_limit_error(),
        _rate_limit_error(),
        _rate_limit_error(),
        _success_response(),
    ]

    _invoke_gemini(chain, {"macro_area": "Salud"})

    retry_logs = [
        record
        for record in caplog.records
        if record.levelname == "WARNING" and "Retrying" in record.message
    ]
    assert len(retry_logs) == 3
