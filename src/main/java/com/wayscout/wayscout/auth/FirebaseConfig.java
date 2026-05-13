package com.wayscout.wayscout.auth;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    private final String credentialsPath;
    private final String credentialsBase64;

    public FirebaseConfig(
            @Value("${firebase.credentials.path:}") String credentialsPath,
            @Value("${firebase.credentials.base64:}") String credentialsBase64
    ) {
        this.credentialsPath = credentialsPath;
        this.credentialsBase64 = credentialsBase64;
    }

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try (InputStream credentialsStream = resolveCredentialsStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();
            FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            throw new IllegalStateException("Firebase credentials are not configured.", e);
        }
    }

    private InputStream resolveCredentialsStream() throws IOException {
        if (credentialsBase64 != null && !credentialsBase64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(credentialsBase64.trim());
            return new ByteArrayInputStream(decoded);
        }

        if (credentialsPath != null && !credentialsPath.isBlank()) {
            return Files.newInputStream(Path.of(credentialsPath.trim()));
        }

        throw new IOException("Missing Firebase credentials.");
    }
}
