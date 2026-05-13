package com.wayscout.wayscout.reports;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReportCommentResponse(
        UUID id,
        String message,
        OffsetDateTime createdAt,
        ReportReporterResponse author
) {
}
