package com.wayscout.wayscout.traffic;

public record TrafficRouteResponse(
        String travelMode,
        int routeLengthMeters,
        int travelTimeSeconds,
        int trafficDelaySeconds,
        int travelTimeWithTrafficSeconds,
        String trafficLevel,
        String advisory
) {
}
