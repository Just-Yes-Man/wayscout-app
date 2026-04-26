package com.wayscout.wayscout.weather;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {

    private static final DateTimeFormatter WEATHER_API_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public WeatherService(@Value("${weather.api.key}") String apiKey, ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.weatherapi.com/v1")
                .build();
    }

    public CurrentWeatherResponse getCurrentWeather(String location) {
        JsonNode json = requestForecast(location, 1);

        JsonNode locationNode = json.path("location");
        JsonNode currentNode = json.path("current");

        return new CurrentWeatherResponse(
                locationNode.path("name").asText(),
                locationNode.path("region").asText(),
                locationNode.path("country").asText(),
                currentNode.path("temp_c").asDouble(),
                currentNode.path("feelslike_c").asDouble(),
                currentNode.path("condition").path("text").asText(),
                currentNode.path("humidity").asInt(),
                currentNode.path("wind_kph").asDouble(),
                currentNode.path("last_updated").asText()
        );
    }

    public DailyRemainingForecastResponse getRemainingForecastToday(String location) {
        JsonNode json = requestForecast(location, 1);

        JsonNode locationNode = json.path("location");
        JsonNode forecastHourArray = json.path("forecast")
                .path("forecastday")
                .path(0)
                .path("hour");

        LocalDateTime localTime = LocalDateTime.parse(locationNode.path("localtime").asText(), WEATHER_API_DATE_TIME);

        List<HourlyForecast> remainingHours = new ArrayList<>();
        for (JsonNode hourNode : forecastHourArray) {
            LocalDateTime forecastDateTime = LocalDateTime.parse(hourNode.path("time").asText(), WEATHER_API_DATE_TIME);
            if (forecastDateTime.isAfter(localTime)) {
                remainingHours.add(new HourlyForecast(
                        hourNode.path("time").asText(),
                        hourNode.path("temp_c").asDouble(),
                        hourNode.path("chance_of_rain").asInt(),
                        hourNode.path("condition").path("text").asText()
                ));
            }
        }

        return new DailyRemainingForecastResponse(
                locationNode.path("name").asText(),
                locationNode.path("region").asText(),
                locationNode.path("country").asText(),
                locationNode.path("localtime").asText(),
                remainingHours
        );
    }

    public DailyRemainingForecastResponse getNext24HoursForecast(String location) {
        JsonNode json = requestForecast(location, 2);

        JsonNode locationNode = json.path("location");
        JsonNode forecastDaysArray = json.path("forecast").path("forecastday");

        LocalDateTime localTime = LocalDateTime.parse(locationNode.path("localtime").asText(), WEATHER_API_DATE_TIME);
        LocalDateTime endTime = localTime.plusHours(24);

        List<HourlyForecast> next24Hours = new ArrayList<>();
        for (JsonNode dayNode : forecastDaysArray) {
            JsonNode forecastHourArray = dayNode.path("hour");
            for (JsonNode hourNode : forecastHourArray) {
                LocalDateTime forecastDateTime = LocalDateTime.parse(hourNode.path("time").asText(), WEATHER_API_DATE_TIME);
                if (!forecastDateTime.isBefore(localTime) && forecastDateTime.isBefore(endTime)) {
                    next24Hours.add(new HourlyForecast(
                            hourNode.path("time").asText(),
                            hourNode.path("temp_c").asDouble(),
                            hourNode.path("chance_of_rain").asInt(),
                            hourNode.path("condition").path("text").asText()
                    ));
                }
            }
        }

        return new DailyRemainingForecastResponse(
                locationNode.path("name").asText(),
                locationNode.path("region").asText(),
                locationNode.path("country").asText(),
                locationNode.path("localtime").asText(),
                next24Hours
        );
    }

    private JsonNode requestForecast(String location, int days) {
        try {
            byte[] responseBytes = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/forecast.json")
                            .queryParam("key", apiKey)
                            .queryParam("q", location)
                            .queryParam("days", days)
                            .queryParam("aqi", "no")
                            .queryParam("alerts", "no")
                            .build())
                    .retrieve()
                .body(byte[].class);

            String responseBody = responseBytes == null ? null : new String(responseBytes, StandardCharsets.UTF_8);

            if (responseBody == null || responseBody.isBlank()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "WeatherAPI devolvio una respuesta vacia.");
            }

            return objectMapper.readTree(responseBody);
        } catch (HttpClientErrorException.BadRequest e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pudo obtener el clima para la localidad solicitada.", e);
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "WeatherAPI respondio con error.", e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Error al consultar WeatherAPI.", e);
        }
    }
}
