package com.vocational.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Respuesta POST /predict del microservicio Python (snake_case en JSON). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonApiResponseDTO {

	@JsonProperty("macro_area_recomendada")
	private String macroAreaRecomendada;

	@JsonProperty("mensaje_orientador")
	private String mensajeOrientador;
}
