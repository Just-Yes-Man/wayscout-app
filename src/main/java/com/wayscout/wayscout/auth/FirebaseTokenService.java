package com.wayscout.wayscout.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Service;

@Service
public class FirebaseTokenService {

    public AuthenticatedUser verify(String token) throws FirebaseAuthException {
        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
        String name = decodedToken.getName();

        if (name == null || name.isBlank()) {
            name = decodedToken.getEmail();
        }

        if (name == null || name.isBlank()) {
            name = "Usuario";
        }

        return new AuthenticatedUser(
                decodedToken.getUid(),
                name,
                decodedToken.getEmail()
        );
    }
}
