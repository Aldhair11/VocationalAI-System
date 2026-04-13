package com.vocational.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocational.api.entity.StudentAssessment;

public interface StudentAssessmentRepository extends JpaRepository<StudentAssessment, Long> {

	List<StudentAssessment> findByEmail(String email);
}
