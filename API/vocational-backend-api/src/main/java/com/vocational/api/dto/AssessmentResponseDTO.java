package com.vocational.api.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentResponseDTO {

	private Long id;
	private String nombre;
	private String areaRecomendada;
	private String mensajeOrientador;
	private LocalDateTime fecha;
}
