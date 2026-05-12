package com.vocational.api.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

	@GetMapping(value = "/", produces = MediaType.TEXT_PLAIN_VALUE)
	public String root() {
		return "Java API esta en linea";
	}

	@GetMapping(value = "/api/v1/health", produces = MediaType.TEXT_PLAIN_VALUE)
	public String health() {
		return "El orquestador del Sistema Vocacional está en línea.";
	}
}
