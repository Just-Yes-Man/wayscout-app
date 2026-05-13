package com.wayscout.wayscout.auth;

import com.google.firebase.auth.FirebaseAuthException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class FirebaseAuthInterceptor implements HandlerInterceptor {

    private final FirebaseTokenService tokenService;

    public FirebaseAuthInterceptor(FirebaseTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if (isPublicRequest(request)) {
            return true;
        }

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing authentication token.");
            return false;
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Missing authentication token.");
            return false;
        }

        try {
            AuthenticatedUser user = tokenService.verify(token);
            request.setAttribute(AuthenticatedUser.ATTRIBUTE_NAME, user);
            return true;
        } catch (FirebaseAuthException e) {
            response.sendError(HttpStatus.UNAUTHORIZED.value(), "Invalid authentication token.");
            return false;
        }
    }

    private boolean isPublicRequest(HttpServletRequest request) {
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        if ("GET".equalsIgnoreCase(method)) {
            String path = request.getRequestURI();
            return !path.matches(".*/api/reports/[^/]+/reactions/me$");
        }
        return false;
    }
}
