package com.vocational.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocational.api.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

	List<ChatMessage> findByAssessment_IdOrderByCreatedAtAsc(Long assessmentId);
}
