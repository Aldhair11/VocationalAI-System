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
public class Questionnaire {

	@Column(name = "q1_analitico", nullable = false)
	private Integer q1Analitico;

	@Column(name = "q2_empatia", nullable = false)
	private Integer q2Empatia;

	@Column(name = "q3_creatividad", nullable = false)
	private Integer q3Creatividad;

	@Column(name = "q4_lectura_debate", nullable = false)
	private Integer q4LecturaDebate;

	@Column(name = "q5_liderazgo_negocios", nullable = false)
	private Integer q5LiderazgoNegocios;
}
