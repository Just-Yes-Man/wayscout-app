package com.wayscout.wayscout.localnews;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class LocalNewsService {

    private static final int MAX_LIMIT = 12;
    private static final DateTimeFormatter RFC_1123 = DateTimeFormatter.RFC_1123_DATE_TIME;
    private static final Pattern TAG_PATTERN = Pattern.compile("<[^>]+>");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");
    private static final Set<String> TRAFFIC_KEYWORDS = Set.of(
            "paro", "paros", "huelga", "huelgas", "bloqueo", "bloqueos",
            "narcobloqueo", "narcobloqueos", "marcha", "marchas",
            "manifestacion", "manifestaciones", "protesta", "protestas", "planton"
    );
    private static final Set<String> SECURITY_KEYWORDS = Set.of(
            "crimen", "crimenes", "delito", "delitos", "asalto", "asaltos",
            "robo", "robos", "homicidio", "homicidios", "balacera",
            "violencia", "detenido", "detenidos", "asesinato", "secuestro",
            "incendio", "quema", "ataque", "desaparecido", "desaparecidos"
    );
    private final RestClient restClient;

    public LocalNewsService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://news.google.com")
                .defaultHeader("User-Agent", "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
                .defaultHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .defaultHeader("Accept-Language", "es-MX,es;q=0.9,en;q=0.8")
                .defaultHeader("Accept-Encoding", "identity")
                .build();
    }

    public List<LocalNewsItemResponse> getRelevantLocalNews(String location, int limit) {
        String normalizedLocation = normalizeLocation(location);
        int normalizedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
        LocationScope locationScope = buildLocationScope(normalizedLocation);
        String query = buildQuery(locationScope);

        try {
            String responseBody = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/rss/search")
                            .queryParam("q", query)
                            .queryParam("hl", "es-419")
                            .queryParam("gl", "MX")
                            .queryParam("ceid", "MX:es-419")
                            .build())
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Google News devolvio una respuesta vacia.");
            }

            return parseNews(responseBody, normalizedLocation, locationScope, normalizedLimit);
        } catch (HttpClientErrorException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Google News respondio con error.", e);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Error al consultar noticias locales.", e);
        }
    }

    private String buildQuery(LocationScope locationScope) {
        String locationQuery = locationScope.queryTerms().stream()
                .reduce((left, right) -> left + " " + right)
                .orElse("");

        return locationQuery;
    }

    private List<LocalNewsItemResponse> parseNews(
            String rss,
            String location,
            LocationScope locationScope,
            int limit
    ) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        Document document = factory.newDocumentBuilder().parse(new InputSource(new StringReader(rss)));
        NodeList items = document.getElementsByTagName("item");
        List<LocalNewsItemResponse> relevantNews = new ArrayList<>();

        for (int i = 0; i < items.getLength() && relevantNews.size() < limit; i++) {
            Element item = (Element) items.item(i);
            String title = textContent(item, "title");
            String summary = cleanSummary(textContent(item, "description"));
            String searchableText = normalizeText(title + " " + summary);
            String category = classifyCategory(searchableText);

            if (category == null || !isGeographicallyRelevant(searchableText, locationScope)) {
                continue;
            }

            String url = textContent(item, "link");
            String source = sourceName(item);
            OffsetDateTime publishedAt = parsePublishedDate(textContent(item, "pubDate"));

            relevantNews.add(new LocalNewsItemResponse(
                    stableId(title, url),
                    title,
                    location,
                    publishedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                    formatTimeAgo(publishedAt),
                    source,
                    url,
                    summary,
                    category,
                    classifyImpact(searchableText, category)
            ));
        }

        return relevantNews;
    }

    private LocationScope buildLocationScope(String location) {
        List<String> originalParts = new ArrayList<>();
        LinkedHashSet<String> normalizedParts = new LinkedHashSet<>();
        String[] parts = location.split(",");

        for (String rawPart : parts) {
            String originalPart = normalizeSpacing(rawPart);
            String normalizedPart = normalizeText(originalPart);
            if (normalizedPart.length() >= 4 && !isGenericLocationTerm(normalizedPart)) {
                originalParts.add(originalPart);
                normalizedParts.add(normalizedPart);
            }
        }

        if (normalizedParts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La localidad no tiene suficientes datos para consultar noticias.");
        }

        String primaryTerm = normalizedParts.iterator().next();
        List<String> contextTerms = normalizedParts.stream()
                .filter(term -> !term.equals(primaryTerm))
                .toList();

        List<String> queryTerms = new ArrayList<>();
        queryTerms.add("\"" + originalParts.get(0) + "\"");
        originalParts.stream()
                .skip(1)
                .limit(2)
                .forEach(queryTerms::add);

        return new LocationScope(primaryTerm, contextTerms, queryTerms);
    }

    private boolean isGenericLocationTerm(String term) {
        return term.equals("mexico")
                || term.equals("municipio")
                || term.equals("ciudad")
                || term.equals("estado")
                || term.equals("localidad");
    }

    private boolean isGeographicallyRelevant(String text, LocationScope locationScope) {
        return text.contains(locationScope.primaryTerm());
    }

    private String classifyCategory(String text) {
        if (containsAny(text, TRAFFIC_KEYWORDS)) {
            return "traffic";
        }
        if (containsAny(text, SECURITY_KEYWORDS)) {
            return "security";
        }
        return null;
    }

    private String classifyImpact(String text, String category) {
        if (text.contains("bloqueo") || text.contains("huelga") || text.contains("homicidio")
                || text.contains("balacera") || text.contains("secuestro")) {
            return "high";
        }
        if ("traffic".equals(category) || text.contains("asalto") || text.contains("robo")) {
            return "medium";
        }
        return "low";
    }

    private boolean containsAny(String text, Set<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }

    private String textContent(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagName(tagName);
        if (nodes.getLength() == 0 || nodes.item(0) == null) {
            return "";
        }
        return nodes.item(0).getTextContent().trim();
    }

    private String sourceName(Element item) {
        NodeList sources = item.getElementsByTagName("source");
        if (sources.getLength() == 0 || sources.item(0) == null) {
            return "Google News";
        }
        return sources.item(0).getTextContent().trim();
    }

    private OffsetDateTime parsePublishedDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            return OffsetDateTime.now(ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(rawDate, RFC_1123);
    }

    private String formatTimeAgo(OffsetDateTime publishedAt) {
        Duration age = Duration.between(publishedAt, OffsetDateTime.now(ZoneOffset.UTC));
        if (age.isNegative()) {
            return "Ahora";
        }
        long minutes = age.toMinutes();
        if (minutes < 60) {
            return "Hace " + Math.max(1, minutes) + " min";
        }
        long hours = age.toHours();
        if (hours < 24) {
            return "Hace " + hours + " h";
        }
        return "Hace " + age.toDays() + " dias";
    }

    private String cleanSummary(String rawSummary) {
        String withoutTags = TAG_PATTERN.matcher(rawSummary == null ? "" : rawSummary).replaceAll(" ");
        return normalizeSpacing(withoutTags
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'"));
    }

    private String normalizeLocation(String location) {
        String normalized = normalizeSpacing(location);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La localidad es obligatoria para consultar noticias.");
        }
        return normalized;
    }

    private String normalizeText(String text) {
        String lower = text == null ? "" : text.toLowerCase(Locale.ROOT);
        return lower
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replace("ü", "u");
    }

    private String normalizeSpacing(String text) {
        return WHITESPACE_PATTERN.matcher(text == null ? "" : text.trim()).replaceAll(" ");
    }

    private String stableId(String title, String url) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest((title + "|" + url).getBytes(StandardCharsets.UTF_8));
        return "news-" + HexFormat.of().formatHex(hash).substring(0, 16);
    }

    private record LocationScope(
            String primaryTerm,
            List<String> contextTerms,
            List<String> queryTerms
    ) {
    }
}
