package com.wayscout.wayscout.traffic;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/traffic")
public class TrafficController {

    private final TrafficService trafficService;

    public TrafficController(TrafficService trafficService) {
        this.trafficService = trafficService;
    }

    @GetMapping("/route")
    public TrafficRouteResponse getRouteTraffic(
            @RequestParam double originLat,
            @RequestParam double originLon,
            @RequestParam double destinationLat,
            @RequestParam double destinationLon,
            @RequestParam(defaultValue = "car") String travelMode
    ) {
        return trafficService.getRouteTraffic(
                originLat,
                originLon,
                destinationLat,
                destinationLon,
                travelMode
        );
    }
}
