package com.wayscout.wayscout.reports;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReportCommentRepository extends JpaRepository<ReportComment, UUID> {
    List<ReportComment> findAllByReportIdOrderByCreatedAtAsc(UUID reportId);

    long countByReportId(UUID reportId);
}
