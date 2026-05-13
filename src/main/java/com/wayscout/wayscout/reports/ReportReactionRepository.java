package com.wayscout.wayscout.reports;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReportReactionRepository extends JpaRepository<ReportReaction, UUID> {
    Optional<ReportReaction> findByReportIdAndUserId(UUID reportId, String userId);

    long countByReportIdAndType(UUID reportId, ReactionType type);
}
