package com.wayscout.wayscout.weather;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/current")
    public CurrentWeatherResponse getCurrentWeather(@RequestParam String location) {
        return weatherService.getCurrentWeather(location);
    }

    @GetMapping("/today")
    public DailyRemainingForecastResponse getRemainingForecastToday(@RequestParam String location) {
        return weatherService.getRemainingForecastToday(location);
    }

    @GetMapping("/next24h")
    public DailyRemainingForecastResponse getNext24HoursForecast(@RequestParam String location) {
        return weatherService.getNext24HoursForecast(location);
    }
}
