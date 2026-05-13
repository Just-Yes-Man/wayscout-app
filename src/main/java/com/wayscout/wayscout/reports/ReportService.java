package com.wayscout.wayscout.reports;

import com.wayscout.wayscout.auth.AuthenticatedUser;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class ReportService {

    private static final int MAX_LIMIT = 50;
    private static final double DEFAULT_RADIUS_KM = 15.0;

    private final ReportRepository reportRepository;
    private final ReportCommentRepository commentRepository;
    private final ReportReactionRepository reactionRepository;

    public ReportService(
            ReportRepository reportRepository,
            ReportCommentRepository commentRepository,
            ReportReactionRepository reactionRepository
    ) {
        this.reportRepository = reportRepository;
        this.commentRepository = commentRepository;
        this.reactionRepository = reactionRepository;
    }

    public ReportResponse createReport(ReportCreateRequest request, AuthenticatedUser user) {
        Report report = new Report();
        report.setIncidentType(request.getIncidentType().trim());
        report.setLocation(request.getLocation().trim());
        report.setLatitude(request.getLatitude());
        report.setLongitude(request.getLongitude());
        report.setDescription(request.getDescription().trim());
        report.setRoadBlocked(Boolean.TRUE.equals(request.getRoadBlocked()));
        report.setAuthoritiesPresent(Boolean.TRUE.equals(request.getAuthoritiesPresent()));
        report.setEmergencySituation(Boolean.TRUE.equals(request.getEmergencySituation()));
        report.setReporterId(user.uid());
        report.setReporterName(user.name());
        report.setReporterEmail(user.email());

        MultipartFile photo = request.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            try {
                report.setPhoto(photo.getBytes());
                report.setPhotoContentType(photo.getContentType());
                report.setPhotoFileName(photo.getOriginalFilename());
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photo upload.");
            }
        }

        Report saved = reportRepository.save(report);
        return buildReportResponse(saved);
    }

        public List<ReportResponse> getReports(int limit, Double latitude, Double longitude, Double radiusKm) {
        int cappedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        boolean hasCoordinates = latitude != null && longitude != null;
        int fetchLimit = hasCoordinates ? MAX_LIMIT : cappedLimit;
        List<Report> reports = reportRepository
            .findAll(PageRequest.of(0, fetchLimit, Sort.by(Sort.Direction.DESC, "createdAt")))
            .getContent();

        if (!hasCoordinates) {
            return reports.stream()
                .map(this::buildReportResponse)
                .toList();
        }

        double effectiveRadius = radiusKm == null || radiusKm <= 0
            ? DEFAULT_RADIUS_KM
            : radiusKm;

        return reports.stream()
            .filter(report -> report.getLatitude() != null && report.getLongitude() != null)
            .filter(report -> isWithinRadius(latitude, longitude, report.getLatitude(), report.getLongitude(), effectiveRadius))
            .limit(cappedLimit)
            .map(this::buildReportResponse)
            .toList();
        }

    public ReportResponse getReport(UUID reportId) {
        return buildReportResponse(getReportEntity(reportId));
    }

    public List<ReportCommentResponse> getComments(UUID reportId) {
        getReportEntity(reportId);
        return commentRepository.findAllByReportIdOrderByCreatedAtAsc(reportId).stream()
                .map(this::buildCommentResponse)
                .toList();
    }

    public ReportCommentResponse addComment(
            UUID reportId,
            ReportCommentRequest request,
            AuthenticatedUser user
    ) {
        Report report = getReportEntity(reportId);
        ReportComment comment = new ReportComment();
        comment.setReport(report);
        comment.setMessage(request.message().trim());
        comment.setAuthorId(user.uid());
        comment.setAuthorName(user.name());
        comment.setAuthorEmail(user.email());
        ReportComment saved = commentRepository.save(comment);
        return buildCommentResponse(saved);
    }

    public ReportReactionSummaryResponse react(
            UUID reportId,
            ReportReactionRequest request,
            AuthenticatedUser user
    ) {
        Report report = getReportEntity(reportId);
        reactionRepository.findByReportIdAndUserId(reportId, user.uid())
                .ifPresentOrElse(
                        existing -> {
                            if (existing.getType() != request.type()) {
                                existing.setType(request.type());
                                reactionRepository.save(existing);
                            }
                        },
                        () -> {
                            ReportReaction reaction = new ReportReaction();
                            reaction.setReport(report);
                            reaction.setUserId(user.uid());
                            reaction.setType(request.type());
                            reactionRepository.save(reaction);
                        }
                );

        return buildReactionSummary(reportId);
    }

    public ReportUserReactionResponse getUserReaction(UUID reportId, AuthenticatedUser user) {
        getReportEntity(reportId);
        ReactionType type = reactionRepository.findByReportIdAndUserId(reportId, user.uid())
                .map(ReportReaction::getType)
                .orElse(null);
        return new ReportUserReactionResponse(type);
    }

    public Report getReportEntity(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found."));
    }

    public ReportReactionSummaryResponse buildReactionSummary(UUID reportId) {
        long up = reactionRepository.countByReportIdAndType(reportId, ReactionType.UP);
        long down = reactionRepository.countByReportIdAndType(reportId, ReactionType.DOWN);
        return new ReportReactionSummaryResponse(up, down);
    }

    private ReportResponse buildReportResponse(Report report) {
        long commentsCount = commentRepository.countByReportId(report.getId());
        ReportReactionSummaryResponse reactions = buildReactionSummary(report.getId());
        boolean hasPhoto = report.getPhoto() != null && report.getPhoto().length > 0;
        String photoUrl = hasPhoto ? "/api/reports/" + report.getId() + "/photo" : null;

        return new ReportResponse(
                report.getId(),
                report.getIncidentType(),
                report.getLocation(),
                report.getLatitude(),
                report.getLongitude(),
                report.getDescription(),
                report.isRoadBlocked(),
                report.isAuthoritiesPresent(),
                report.isEmergencySituation(),
                report.getCreatedAt(),
                new ReportReporterResponse(report.getReporterId(), report.getReporterName()),
                reactions,
                commentsCount,
                hasPhoto,
                photoUrl
        );
    }

    private ReportCommentResponse buildCommentResponse(ReportComment comment) {
        return new ReportCommentResponse(
                comment.getId(),
                comment.getMessage(),
                comment.getCreatedAt(),
                new ReportReporterResponse(comment.getAuthorId(), comment.getAuthorName())
        );
    }

    private boolean isWithinRadius(
            double originLat,
            double originLon,
            double targetLat,
            double targetLon,
            double radiusKm
    ) {
        return calculateDistanceKm(originLat, originLon, targetLat, targetLon) <= radiusKm;
    }

    private double calculateDistanceKm(
            double originLat,
            double originLon,
            double targetLat,
            double targetLon
    ) {
        double earthRadiusKm = 6371.0;
        double deltaLat = Math.toRadians(targetLat - originLat);
        double deltaLon = Math.toRadians(targetLon - originLon);
        double lat1 = Math.toRadians(originLat);
        double lat2 = Math.toRadians(targetLat);

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
