package com.vocational.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Elemento de historial enviado al microservicio Python (POST /chat) */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PythonMessageHistoryItemDTO {

	/** "user" o "ai" para el modelo LangChain */
	private String role;

	private String content;
}
