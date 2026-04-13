package com.vocational.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Grades {

	@Column(name = "nota_matematica", nullable = false)
	private Integer notaMatematica;

	@Column(name = "nota_comunicacion", nullable = false)
	private Integer notaComunicacion;

	@Column(name = "nota_ciencia_tecnologia", nullable = false)
	private Integer notaCienciaTecnologia;

	@Column(name = "nota_ciencias_sociales", nullable = false)
	private Integer notaCienciasSociales;

	@Column(name = "nota_ingles", nullable = false)
	private Integer notaIngles;

	@Column(name = "nota_arte_cultura", nullable = false)
	private Integer notaArteCultura;

	@Column(name = "nota_educacion_fisica", nullable = false)
	private Integer notaEducacionFisica;

	@Column(name = "nota_desarrollo_personal", nullable = false)
	private Integer notaDesarrolloPersonal;
}
