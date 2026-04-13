package com.vocational.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Cuerpo POST /predict del microservicio Python (mismas claves que FastAPI). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonApiRequestDTO {

	private GradesDTO notas;
	private QuestionnaireDTO cuestionario;
}
