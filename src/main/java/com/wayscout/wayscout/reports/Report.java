package com.wayscout.wayscout.reports;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private String incidentType;

    @Column(nullable = false)
    private String location;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false)
    private boolean roadBlocked;

    @Column(nullable = false)
    private boolean authoritiesPresent;

    @Column(nullable = false)
    private boolean emergencySituation;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private String reporterId;

    @Column(nullable = false)
    private String reporterName;

    private String reporterEmail;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    private byte[] photo;

    private String photoContentType;

    private String photoFileName;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        }
    }

    public UUID getId() {
        return id;
    }

    public String getIncidentType() {
        return incidentType;
    }

    public void setIncidentType(String incidentType) {
        this.incidentType = incidentType;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isRoadBlocked() {
        return roadBlocked;
    }

    public void setRoadBlocked(boolean roadBlocked) {
        this.roadBlocked = roadBlocked;
    }

    public boolean isAuthoritiesPresent() {
        return authoritiesPresent;
    }

    public void setAuthoritiesPresent(boolean authoritiesPresent) {
        this.authoritiesPresent = authoritiesPresent;
    }

    public boolean isEmergencySituation() {
        return emergencySituation;
    }

    public void setEmergencySituation(boolean emergencySituation) {
        this.emergencySituation = emergencySituation;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getReporterId() {
        return reporterId;
    }

    public void setReporterId(String reporterId) {
        this.reporterId = reporterId;
    }

    public String getReporterName() {
        return reporterName;
    }

    public void setReporterName(String reporterName) {
        this.reporterName = reporterName;
    }

    public String getReporterEmail() {
        return reporterEmail;
    }

    public void setReporterEmail(String reporterEmail) {
        this.reporterEmail = reporterEmail;
    }

    public byte[] getPhoto() {
        return photo;
    }

    public void setPhoto(byte[] photo) {
        this.photo = photo;
    }

    public String getPhotoContentType() {
        return photoContentType;
    }

    public void setPhotoContentType(String photoContentType) {
        this.photoContentType = photoContentType;
    }

    public String getPhotoFileName() {
        return photoFileName;
    }

    public void setPhotoFileName(String photoFileName) {
        this.photoFileName = photoFileName;
    }
}
