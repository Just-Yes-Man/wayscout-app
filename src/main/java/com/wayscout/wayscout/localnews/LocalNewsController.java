package com.wayscout.wayscout.localnews;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/local-news")
public class LocalNewsController {

    private final LocalNewsService localNewsService;

    public LocalNewsController(LocalNewsService localNewsService) {
        this.localNewsService = localNewsService;
    }

    @GetMapping
    public List<LocalNewsItemResponse> getLocalNews(
            @RequestParam String location,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return localNewsService.getRelevantLocalNews(location, limit);
    }
}
