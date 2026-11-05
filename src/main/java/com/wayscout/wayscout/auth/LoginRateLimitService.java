package com.wayscout.wayscout.auth;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class LoginRateLimitService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private final Map<String, AttemptWindow> attemptsByIp = new HashMap<>();

    public synchronized boolean allowAttempt(String ipAddress) {
        Instant now = Instant.now();
        AttemptWindow current = attemptsByIp.get(ipAddress);

        if (current == null || current.startedAt().plus(WINDOW).isBefore(now)) {
            attemptsByIp.put(ipAddress, new AttemptWindow(now, 1));
            return true;
        }

        if (current.attempts() >= MAX_ATTEMPTS) {
            return false;
        }

        attemptsByIp.put(ipAddress, new AttemptWindow(current.startedAt(), current.attempts() + 1));
        return true;
    }

    private record AttemptWindow(Instant startedAt, int attempts) {
    }
}