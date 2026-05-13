package com.wayscout.wayscout.reports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public class ReportCreateRequest {

    @NotBlank
    private String incidentType;

    @NotBlank
    private String location;

    private Double latitude;

    private Double longitude;

    @NotBlank
    @Size(min = 20, max = 2000)
    private String description;

    private MultipartFile photo;

    private Boolean roadBlocked;

    private Boolean authoritiesPresent;

    private Boolean emergencySituation;

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

    public MultipartFile getPhoto() {
        return photo;
    }

    public void setPhoto(MultipartFile photo) {
        this.photo = photo;
    }

    public Boolean getRoadBlocked() {
        return roadBlocked;
    }

    public void setRoadBlocked(Boolean roadBlocked) {
        this.roadBlocked = roadBlocked;
    }

    public Boolean getAuthoritiesPresent() {
        return authoritiesPresent;
    }

    public void setAuthoritiesPresent(Boolean authoritiesPresent) {
        this.authoritiesPresent = authoritiesPresent;
    }

    public Boolean getEmergencySituation() {
        return emergencySituation;
    }

    public void setEmergencySituation(Boolean emergencySituation) {
        this.emergencySituation = emergencySituation;
    }
}
