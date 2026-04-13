package com.vocational.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionnaireDTO {

	@NotNull
	@Min(1)
	@Max(5)
	@JsonProperty("q1_analitico")
	@JsonAlias({ "q1Analitico" })
	private Integer q1Analitico;

	@NotNull
	@Min(1)
	@Max(5)
	@JsonProperty("q2_empatia")
	@JsonAlias({ "q2Empatia" })
	private Integer q2Empatia;

	@NotNull
	@Min(1)
	@Max(5)
	@JsonProperty("q3_creatividad")
	@JsonAlias({ "q3Creatividad" })
	private Integer q3Creatividad;

	@NotNull
	@Min(1)
	@Max(5)
	@JsonProperty("q4_lectura_debate")
	@JsonAlias({ "q4LecturaDebate" })
	private Integer q4LecturaDebate;

	@NotNull
	@Min(1)
	@Max(5)
	@JsonProperty("q5_liderazgo_negocios")
	@JsonAlias({ "q5LiderazgoNegocios" })
	private Integer q5LiderazgoNegocios;
}
