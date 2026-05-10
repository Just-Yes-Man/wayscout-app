package com.wayscout.wayscout.localnews;

public record LocalNewsItemResponse(
        String id,
        String title,
        String location,
        String publishedAt,
        String timeAgo,
        String source,
        String url,
        String summary,
        String category,
        String impactLevel
) {
}
