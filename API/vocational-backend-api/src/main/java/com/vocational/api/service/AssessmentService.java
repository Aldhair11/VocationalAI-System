package com.vocational.api.service;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import com.vocational.api.dto.AssessmentRequestDTO;
import com.vocational.api.dto.AssessmentResponseDTO;
import com.vocational.api.dto.ChatRequestDTO;
import com.vocational.api.dto.ChatResponseDTO;
import com.vocational.api.dto.PythonApiRequestDTO;
import com.vocational.api.dto.PythonApiResponseDTO;
import com.vocational.api.dto.PythonChatRequestDTO;
import com.vocational.api.dto.PythonChatResponseDTO;
import com.vocational.api.dto.PythonMessageHistoryItemDTO;
import com.vocational.api.entity.ChatMessage;
import com.vocational.api.entity.Grades;
import com.vocational.api.entity.MessageRole;
import com.vocational.api.entity.Questionnaire;
import com.vocational.api.entity.StudentAssessment;
import com.vocational.api.repository.ChatMessageRepository;
import com.vocational.api.repository.StudentAssessmentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssessmentService {

	private final StudentAssessmentRepository studentAssessmentRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final WebClient webClient;

	@Value("${vocational.python-api.url}")
	private String pythonApiBaseUrl;

	@Transactional
	public AssessmentResponseDTO processAssessment(AssessmentRequestDTO requestDTO) {
		PythonApiRequestDTO pythonRequest = PythonApiRequestDTO.builder()
				.notas(requestDTO.getGrades())
				.cuestionario(requestDTO.getQuestionnaire())
				.build();

		PythonApiResponseDTO pythonResponse = callPythonPredict(pythonRequest);

		StudentAssessment entity = StudentAssessment.builder()
				.fullName(requestDTO.getFullName())
				.email(requestDTO.getEmail())
				.grades(toGradesEntity(requestDTO.getGrades()))
				.questionnaire(toQuestionnaireEntity(requestDTO.getQuestionnaire()))
				.recommendedMacroArea(pythonResponse.getMacroAreaRecomendada())
				.orientadorMessage(pythonResponse.getMensajeOrientador())
				.build();

		StudentAssessment saved = studentAssessmentRepository.save(entity);
		String orientador = pythonResponse.getMensajeOrientador() != null
				? pythonResponse.getMensajeOrientador()
				: "";
		chatMessageRepository.save(ChatMessage.builder()
				.assessment(saved)
				.role(MessageRole.AI)
				.content(orientador)
				.build());
		return toResponse(saved);
	}

	@Transactional
	public ChatResponseDTO processChat(Long assessmentId, ChatRequestDTO requestDTO) {
		StudentAssessment assessment = studentAssessmentRepository.findById(assessmentId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evaluación no encontrada."));
		String userText = requestDTO.getMessage().trim();
		if (userText.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El mensaje no puede estar vacío.");
		}

		chatMessageRepository.save(ChatMessage.builder()
				.assessment(assessment)
				.role(MessageRole.USER)
				.content(userText)
				.build());

		List<ChatMessage> all = chatMessageRepository.findByAssessment_IdOrderByCreatedAtAsc(assessmentId);
		if (all.size() < 2) {
			throw new ResponseStatusException(
					HttpStatus.INTERNAL_SERVER_ERROR,
					"Estado de chat inconsistente: se esperaba historial previo.");
		}
		List<ChatMessage> prior = all.subList(0, all.size() - 1);
		String newMessage = all.get(all.size() - 1).getContent();

		List<PythonMessageHistoryItemDTO> history = prior.stream()
				.map(m -> PythonMessageHistoryItemDTO.builder()
						.role(m.getRole() == MessageRole.USER ? "user" : "ai")
						.content(m.getContent())
						.build())
				.toList();

		PythonChatRequestDTO pyReq = PythonChatRequestDTO.builder()
				.macroArea(assessment.getRecommendedMacroArea())
				.history(history)
				.newMessage(newMessage)
				.build();

		PythonChatResponseDTO pyRes = callPythonChat(pyReq);
		String aiText = pyRes.getRespuestaIa() != null ? pyRes.getRespuestaIa() : "";

		chatMessageRepository.save(ChatMessage.builder()
				.assessment(assessment)
				.role(MessageRole.AI)
				.content(aiText)
				.build());

		return ChatResponseDTO.builder().mensaje(aiText).build();
	}

	@Transactional(readOnly = true)
	public List<AssessmentResponseDTO> findAssessmentsByEmail(String email) {
		return studentAssessmentRepository.findByEmail(email).stream()
				.map(this::toResponse)
				.toList();
	}

	private PythonApiResponseDTO callPythonPredict(PythonApiRequestDTO body) {
		String base = normalizeBaseUrl(pythonApiBaseUrl);
		URI uri = URI.create(base + "/predict");
		try {
			PythonApiResponseDTO response = webClient.post()
					.uri(uri)
					.contentType(MediaType.APPLICATION_JSON)
					.bodyValue(body)
					.retrieve()
					.bodyToMono(PythonApiResponseDTO.class)
					.block(Duration.ofSeconds(120));
			if (response == null) {
				throw new ResponseStatusException(
						HttpStatus.BAD_GATEWAY,
						"Respuesta vacía del microservicio de IA.");
			}
			return response;
		} catch (WebClientResponseException e) {
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"El microservicio de IA respondió con error HTTP " + e.getStatusCode().value()
							+ (e.getResponseBodyAsString() != null && !e.getResponseBodyAsString().isBlank()
									? ": " + truncate(e.getResponseBodyAsString(), 500)
									: ""),
					e);
		} catch (WebClientRequestException e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"No se pudo conectar al microservicio de IA. Comprueba que esté en ejecución en "
							+ base,
					e);
		} catch (IllegalStateException e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"Tiempo de espera agotado o error al invocar el microservicio de IA.",
					e);
		}
	}

	private PythonChatResponseDTO callPythonChat(PythonChatRequestDTO body) {
		String base = normalizeBaseUrl(pythonApiBaseUrl);
		URI uri = URI.create(base + "/chat");
		try {
			PythonChatResponseDTO response = webClient.post()
					.uri(uri)
					.contentType(MediaType.APPLICATION_JSON)
					.bodyValue(body)
					.retrieve()
					.bodyToMono(PythonChatResponseDTO.class)
					.block(Duration.ofSeconds(120));
			if (response == null) {
				throw new ResponseStatusException(
						HttpStatus.BAD_GATEWAY,
						"Respuesta vacía del microservicio de IA (chat).");
			}
			return response;
		} catch (WebClientResponseException e) {
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"El microservicio de IA respondió con error HTTP " + e.getStatusCode().value()
							+ (e.getResponseBodyAsString() != null && !e.getResponseBodyAsString().isBlank()
									? ": " + truncate(e.getResponseBodyAsString(), 500)
									: ""),
					e);
		} catch (WebClientRequestException e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"No se pudo conectar al microservicio de IA. Comprueba que esté en ejecución en "
							+ base,
					e);
		} catch (IllegalStateException e) {
			throw new ResponseStatusException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"Tiempo de espera agotado o error al invocar el microservicio de IA (chat).",
					e);
		}
	}

	private static String normalizeBaseUrl(String url) {
		if (url == null || url.isBlank()) {
			return "http://127.0.0.1:8000";
		}
		return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
	}

	private static String truncate(String s, int max) {
		if (s.length() <= max) {
			return s;
		}
		return s.substring(0, max) + "...";
	}

	private static Grades toGradesEntity(com.vocational.api.dto.GradesDTO dto) {
		Grades g = new Grades();
		g.setNotaMatematica(dto.getNotaMatematica());
		g.setNotaComunicacion(dto.getNotaComunicacion());
		g.setNotaCienciaTecnologia(dto.getNotaCienciaTecnologia());
		g.setNotaCienciasSociales(dto.getNotaCienciasSociales());
		g.setNotaIngles(dto.getNotaIngles());
		g.setNotaArteCultura(dto.getNotaArteCultura());
		g.setNotaEducacionFisica(dto.getNotaEducacionFisica());
		g.setNotaDesarrolloPersonal(dto.getNotaDesarrolloPersonal());
		return g;
	}

	private static Questionnaire toQuestionnaireEntity(com.vocational.api.dto.QuestionnaireDTO dto) {
		Questionnaire q = new Questionnaire();
		q.setQ1Analitico(dto.getQ1Analitico());
		q.setQ2Empatia(dto.getQ2Empatia());
		q.setQ3Creatividad(dto.getQ3Creatividad());
		q.setQ4LecturaDebate(dto.getQ4LecturaDebate());
		q.setQ5LiderazgoNegocios(dto.getQ5LiderazgoNegocios());
		return q;
	}

	private AssessmentResponseDTO toResponse(StudentAssessment entity) {
		return AssessmentResponseDTO.builder()
				.id(entity.getId())
				.nombre(entity.getFullName())
				.areaRecomendada(entity.getRecommendedMacroArea())
				.mensajeOrientador(entity.getOrientadorMessage())
				.fecha(entity.getCreatedAt())
				.build();
	}
}
