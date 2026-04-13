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
public class GradesDTO {

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_matematica")
	@JsonAlias({ "notaMatematica" })
	private Integer notaMatematica;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_comunicacion")
	@JsonAlias({ "notaComunicacion" })
	private Integer notaComunicacion;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_ciencia_tecnologia")
	@JsonAlias({ "notaCienciaTecnologia" })
	private Integer notaCienciaTecnologia;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_ciencias_sociales")
	@JsonAlias({ "notaCienciasSociales" })
	private Integer notaCienciasSociales;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_ingles")
	@JsonAlias({ "notaIngles" })
	private Integer notaIngles;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_arte_cultura")
	@JsonAlias({ "notaArteCultura" })
	private Integer notaArteCultura;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_educacion_fisica")
	@JsonAlias({ "notaEducacionFisica" })
	private Integer notaEducacionFisica;

	@NotNull
	@Min(0)
	@Max(20)
	@JsonProperty("nota_desarrollo_personal")
	@JsonAlias({ "notaDesarrolloPersonal" })
	private Integer notaDesarrolloPersonal;
}
