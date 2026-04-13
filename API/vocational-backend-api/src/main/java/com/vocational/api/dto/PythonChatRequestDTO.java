package com.vocational.api.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Cuerpo POST /chat del microservicio Python. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PythonChatRequestDTO {

	@JsonProperty("macro_area")
	private String macroArea;

	private List<PythonMessageHistoryItemDTO> history;

	@JsonProperty("new_message")
	private String newMessage;
}
