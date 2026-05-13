package com.wayscout.wayscout.reports;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReportResponse(
        UUID id,
        String incidentType,
        String location,
        Double latitude,
        Double longitude,
        String description,
        boolean roadBlocked,
        boolean authoritiesPresent,
        boolean emergencySituation,
        OffsetDateTime createdAt,
        ReportReporterResponse reporter,
        ReportReactionSummaryResponse reactions,
        long commentsCount,
        boolean hasPhoto,
        String photoUrl
) {
}
