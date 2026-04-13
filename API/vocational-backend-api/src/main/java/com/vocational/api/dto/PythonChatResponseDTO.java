package com.vocational.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Respuesta POST /chat del microservicio Python. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonChatResponseDTO {

	@JsonProperty("respuesta_ia")
	private String respuestaIa;
}
