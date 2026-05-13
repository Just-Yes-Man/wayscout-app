package com.wayscout.wayscout.reports;

import jakarta.validation.constraints.NotNull;

public record ReportReactionRequest(
        @NotNull
        ReactionType type
) {
}
