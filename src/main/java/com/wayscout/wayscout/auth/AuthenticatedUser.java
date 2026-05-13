package com.wayscout.wayscout.auth;

public record AuthenticatedUser(String uid, String name, String email) {
    public static final String ATTRIBUTE_NAME = "firebaseUser";
}
