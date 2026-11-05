package com.wayscout.wayscout.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

@Component
public class LoginRateLimitInterceptor implements HandlerInterceptor {

    private final LoginRateLimitService rateLimitService;

    public LoginRateLimitInterceptor(LoginRateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String ipAddress = request.getRemoteAddr();
        if (rateLimitService.allowAttempt(ipAddress)) {
            return true;
        }

        String body = "{\"error\":\"too_many_login_attempts\","
                + "\"message\":\"Se excedio el limite de 5 intentos de inicio de sesion por minuto para esta IP.\"}";
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", "60");
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(body);
        return false;
    }
}