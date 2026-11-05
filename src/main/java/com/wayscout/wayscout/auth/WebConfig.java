package com.wayscout.wayscout.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FirebaseAuthInterceptor firebaseAuthInterceptor;
    private final LoginRateLimitInterceptor loginRateLimitInterceptor;

    public WebConfig(
            FirebaseAuthInterceptor firebaseAuthInterceptor,
            LoginRateLimitInterceptor loginRateLimitInterceptor
    ) {
        this.firebaseAuthInterceptor = firebaseAuthInterceptor;
        this.loginRateLimitInterceptor = loginRateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(firebaseAuthInterceptor)
                .addPathPatterns("/api/reports/**");
        registry.addInterceptor(loginRateLimitInterceptor)
            .addPathPatterns("/api/auth/login/attempt");
    }
}
