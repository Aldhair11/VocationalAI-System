package com.vocational.api.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vocational.api.dto.AssessmentRequestDTO;
import com.vocational.api.dto.AssessmentResponseDTO;
import com.vocational.api.dto.ChatRequestDTO;
import com.vocational.api.dto.ChatResponseDTO;
import com.vocational.api.service.AssessmentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

	private final AssessmentService assessmentService;

	@PostMapping
	public ResponseEntity<AssessmentResponseDTO> createAssessment(
			@Valid @RequestBody AssessmentRequestDTO requestDTO) {
		AssessmentResponseDTO body = assessmentService.processAssessment(requestDTO);
		return ResponseEntity.status(HttpStatus.CREATED).body(body);
	}

	@PostMapping("/{assessmentId}/chat")
	public ResponseEntity<ChatResponseDTO> chat(
			@PathVariable Long assessmentId,
			@Valid @RequestBody ChatRequestDTO requestDTO) {
		ChatResponseDTO body = assessmentService.processChat(assessmentId, requestDTO);
		return ResponseEntity.ok(body);
	}

	@GetMapping("/email/{email}")
	public ResponseEntity<List<AssessmentResponseDTO>> getAssessmentsByEmail(@PathVariable String email) {
		return ResponseEntity.ok(assessmentService.findAssessmentsByEmail(email));
	}
}
