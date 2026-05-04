package com.wayscout.wayscout.traffic;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Set;

@Service
public class TrafficService {

    private static final Set<String> ALLOWED_TRAVEL_MODES = Set.of(
            "car", "bus", "motorcycle", "bicycle", "pedestrian"
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String tomtomApiKey;

    public TrafficService(@Value("${tomtom.api.key:}") String tomtomApiKey, ObjectMapper objectMapper) {
        this.tomtomApiKey = tomtomApiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.tomtom.com/routing/1")
                .build();
    }

    public TrafficRouteResponse getRouteTraffic(
            double originLat,
            double originLon,
            double destinationLat,
            double destinationLon,
            String rawTravelMode
    ) {
        if (tomtomApiKey == null || tomtomApiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "La API key de TomTom no esta configurada.");
        }

        String travelMode = normalizeTravelMode(rawTravelMode);
        String routePath = originLat + "," + originLon + ":" + destinationLat + "," + destinationLon;

        try {
            byte[] responseBytes = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/calculateRoute/{routePath}/json")
                            .queryParam("key", tomtomApiKey)
                            .queryParam("travelMode", travelMode)
                            .queryParam("traffic", "true")
                            .queryParam("instructionsType", "text")
                            .build(routePath))
                    .retrieve()
                    .body(byte[].class);

            String responseBody = responseBytes == null ? null : new String(responseBytes, StandardCharsets.UTF_8);

            if (responseBody == null || responseBody.isBlank()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "TomTom devolvio una respuesta vacia.");
            }

            JsonNode routeSummary = objectMapper.readTree(responseBody)
                    .path("routes")
                    .path(0)
                    .path("summary");

            if (routeSummary.isMissingNode()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "TomTom no devolvio resumen de ruta.");
            }

            int lengthMeters = routeSummary.path("lengthInMeters").asInt();
            int travelTimeSeconds = routeSummary.path("travelTimeInSeconds").asInt();
            int trafficDelaySeconds = routeSummary.path("trafficDelayInSeconds").asInt();
            int travelTimeWithTrafficSeconds = resolveTotalTravelTimeSeconds(
                    routeSummary,
                    travelTimeSeconds,
                    trafficDelaySeconds
            );

            String trafficLevel = classifyTraffic(trafficDelaySeconds, travelTimeSeconds);
            String advisory = buildAdvisory(trafficLevel, trafficDelaySeconds, travelTimeWithTrafficSeconds);

            return new TrafficRouteResponse(
                    travelMode,
                    lengthMeters,
                    travelTimeSeconds,
                    trafficDelaySeconds,
                    travelTimeWithTrafficSeconds,
                    trafficLevel,
                    advisory
            );
        } catch (HttpClientErrorException.BadRequest e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo calcular trafico para esa ruta.", e);
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "TomTom respondio con error.", e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Error al consultar TomTom.", e);
        }
    }

    private String normalizeTravelMode(String rawTravelMode) {
        String candidate = rawTravelMode == null ? "car" : rawTravelMode.trim().toLowerCase();
        return ALLOWED_TRAVEL_MODES.contains(candidate) ? candidate : "car";
    }

    private String classifyTraffic(int delaySeconds, int baseTravelSeconds) {
        if (delaySeconds <= 0 || baseTravelSeconds <= 0) return "low";
        double impact = (double) delaySeconds / (double) baseTravelSeconds;
        if (impact >= 0.35 || delaySeconds >= 1800) return "high";
        if (impact >= 0.15 || delaySeconds >= 600) return "medium";
        return "low";
    }

    private String buildAdvisory(String trafficLevel, int delaySeconds, int travelWithTrafficSeconds) {
        int delayMinutes = Math.max(0, Math.round(delaySeconds / 60f));
        int totalMinutes = Math.max(1, Math.round(travelWithTrafficSeconds / 60f));

        return switch (trafficLevel) {
            case "high" -> "Trafico alto: suma alrededor de " + delayMinutes +
                    " min. El viaje total estimado es de " + totalMinutes +
                    " min. Considera salir antes o elegir una ruta alterna.";
            case "medium" -> "Trafico moderado: suma alrededor de " + delayMinutes +
                    " min. El viaje total estimado es de " + totalMinutes +
                    " min.";
            default -> "Trafico ligero: retraso estimado de " + delayMinutes +
                    " min. El viaje total estimado es de " + totalMinutes +
                    " min.";
        };
    }

    private int resolveTotalTravelTimeSeconds(JsonNode routeSummary, int travelTimeSeconds, int trafficDelaySeconds) {
        int directTotal = routeSummary.path("trafficLengthInSeconds").asInt(0);
        if (directTotal > 0) return directTotal;

        int noTraffic = routeSummary.path("noTrafficTravelTimeInSeconds").asInt(0);
        if (noTraffic > 0 && trafficDelaySeconds >= 0) return noTraffic + trafficDelaySeconds;

        if (travelTimeSeconds > 0 && trafficDelaySeconds >= 0) return travelTimeSeconds + trafficDelaySeconds;
        if (travelTimeSeconds > 0) return travelTimeSeconds;

        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "TomTom no devolvio tiempos de viaje validos.");
    }
}
