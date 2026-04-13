package com.vocational.api.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

	@GetMapping(value = "/health", produces = MediaType.TEXT_PLAIN_VALUE)
	public String health() {
		return "El orquestador del Sistema Vocacional está en línea.";
	}
}
