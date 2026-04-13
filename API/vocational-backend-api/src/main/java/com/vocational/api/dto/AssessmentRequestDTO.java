package com.vocational.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentRequestDTO {

	@NotBlank
	private String fullName;

	@NotBlank
	@Email
	private String email;

	@NotNull
	@Valid
	private GradesDTO grades;

	@NotNull
	@Valid
	private QuestionnaireDTO questionnaire;
}
