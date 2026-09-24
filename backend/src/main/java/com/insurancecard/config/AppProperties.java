package com.insurancecard.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Cors cors,
        String frontendUrl,
        Mail mail,
        Security security,
        Seed seed) {

    public record Jwt(String secret, long expirationMinutes) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Mail(boolean enabled, String from) {}

    public record Security(int maxFailedLogins, int lockoutMinutes) {}

    public record Seed(boolean enabled) {}
}
