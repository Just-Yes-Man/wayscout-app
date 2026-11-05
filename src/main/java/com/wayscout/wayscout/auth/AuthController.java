package com.wayscout.wayscout.auth;

import com.google.firebase.auth.FirebaseAuthException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final FirebaseTokenService tokenService;

    public AuthController(FirebaseTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public AuthenticatedUser login(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Se requiere un token Bearer para iniciar sesion."
            );
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Se requiere un token Bearer para iniciar sesion."
            );
        }

        try {
            return tokenService.verify(token);
        } catch (FirebaseAuthException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de inicio de sesion invalido.", e);
        }
    }

    @PostMapping("/login/attempt")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registerLoginAttempt() {
    }
}