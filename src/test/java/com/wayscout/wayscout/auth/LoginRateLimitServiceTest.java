package com.wayscout.wayscout.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginRateLimitServiceTest {

    @Test
    void allowsFiveAttemptsAndRejectsTheSixthForTheSameIp() {
        LoginRateLimitService service = new LoginRateLimitService();

        for (int attempt = 1; attempt <= 5; attempt++) {
            assertTrue(service.allowAttempt("203.0.113.10"));
        }

        assertFalse(service.allowAttempt("203.0.113.10"));
        assertTrue(service.allowAttempt("203.0.113.11"));
    }
}