package com.wayscout.wayscout.reports;

import com.wayscout.wayscout.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReportResponse createReport(
            @Valid @ModelAttribute ReportCreateRequest request,
            @RequestAttribute(AuthenticatedUser.ATTRIBUTE_NAME) AuthenticatedUser user
    ) {
        return reportService.createReport(request, user);
    }

    @GetMapping
    public List<ReportResponse> getReports(
            @RequestParam(defaultValue = "30") int limit,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radiusKm
    ) {
        return reportService.getReports(limit, latitude, longitude, radiusKm);
    }

    @GetMapping("/{reportId}")
    public ReportResponse getReport(@PathVariable UUID reportId) {
        return reportService.getReport(reportId);
    }

    @GetMapping("/{reportId}/photo")
    public ResponseEntity<byte[]> getReportPhoto(@PathVariable UUID reportId) {
        Report report = reportService.getReportEntity(reportId);
        if (report.getPhoto() == null || report.getPhoto().length == 0) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (report.getPhotoContentType() != null && !report.getPhotoContentType().isBlank()) {
            mediaType = MediaType.parseMediaType(report.getPhotoContentType());
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(report.getPhoto());
    }

    @GetMapping("/{reportId}/comments")
    public List<ReportCommentResponse> getComments(@PathVariable UUID reportId) {
        return reportService.getComments(reportId);
    }

    @PostMapping("/{reportId}/comments")
    public ReportCommentResponse addComment(
            @PathVariable UUID reportId,
            @Valid @RequestBody ReportCommentRequest request,
            @RequestAttribute(AuthenticatedUser.ATTRIBUTE_NAME) AuthenticatedUser user
    ) {
        return reportService.addComment(reportId, request, user);
    }

    @PostMapping("/{reportId}/reactions")
    public ReportReactionSummaryResponse react(
            @PathVariable UUID reportId,
            @Valid @RequestBody ReportReactionRequest request,
            @RequestAttribute(AuthenticatedUser.ATTRIBUTE_NAME) AuthenticatedUser user
    ) {
        return reportService.react(reportId, request, user);
    }

    @GetMapping("/{reportId}/reactions/me")
    public ReportUserReactionResponse getUserReaction(
            @PathVariable UUID reportId,
            @RequestAttribute(AuthenticatedUser.ATTRIBUTE_NAME) AuthenticatedUser user
    ) {
        return reportService.getUserReaction(reportId, user);
    }
}
