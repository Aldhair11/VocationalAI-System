package com.vocational.api.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
		HttpStatus resolved = HttpStatus.resolve(ex.getStatusCode().value());
		String fallback = resolved != null ? resolved.name() : "HTTP_ERROR";
		String reason = ex.getReason() != null ? ex.getReason() : fallback;
		return ResponseEntity.status(ex.getStatusCode())
				.body(Map.of("error", String.valueOf(ex.getStatusCode().value()), "message", reason));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
		return ResponseEntity
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(Map.of(
						"error", "INTERNAL_ERROR",
						"message", ex.getMessage() != null ? ex.getMessage() : "Error interno"));
	}
}
