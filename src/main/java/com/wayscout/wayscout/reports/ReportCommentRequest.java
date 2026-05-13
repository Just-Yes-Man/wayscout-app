package com.wayscout.wayscout.reports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportCommentRequest(
        @NotBlank
        @Size(min = 3, max = 600)
        String message
) {
}
