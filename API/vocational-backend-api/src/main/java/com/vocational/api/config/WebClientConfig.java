package com.vocational.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

	/** Cliente HTTP reactivo hacia el microservicio de IA (Python) */
	@Bean
	public WebClient webClient(WebClient.Builder builder) {
		return builder.build();
	}
}
