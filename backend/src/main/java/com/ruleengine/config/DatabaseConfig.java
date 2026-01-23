package com.ruleengine.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import jakarta.annotation.PostConstruct;
import java.io.File;

/**
 * Ensures the database directory exists before the application starts.
 * This runs early in the Spring Boot startup process to ensure the directory
 * exists before Hibernate tries to connect to the database.
 */
@Configuration
@Order(1) // Run early, before datasource initialization
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @PostConstruct
    public void ensureDatabaseDirectory() {
        String userHome = System.getProperty("user.home");
        File dbDir = new File(userHome, ".ruleengine/data");
        
        if (!dbDir.exists()) {
            boolean created = dbDir.mkdirs();
            if (created) {
                log.info("Created database directory: {}", dbDir.getAbsolutePath());
            } else {
                log.error("Failed to create database directory: {}. Please create it manually.", dbDir.getAbsolutePath());
                throw new RuntimeException("Failed to create database directory: " + dbDir.getAbsolutePath());
            }
        } else {
            log.info("Database directory exists: {}", dbDir.getAbsolutePath());
        }
        
        // Log the database file location
        String activeProfile = System.getProperty("spring.profiles.active", 
            System.getenv().getOrDefault("SPRING_PROFILES_ACTIVE", "sqlite"));
        if ("sqlite".equals(activeProfile)) {
            File dbFile = new File(dbDir, "ruleengine.db");
            log.info("SQLite database will be at: {}", dbFile.getAbsolutePath());
        }
    }
}

