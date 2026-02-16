package com.ruleengine.multitenancy;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages dynamically created DataSources for different Turso (libSQL)
 * instances.
 */
@Service
public class TenantDatabaseManager {

    private final Map<String, DataSource> dataSources = new ConcurrentHashMap<>();

    /**
     * Retrieves or creates a DataSource for a given tenant.
     * 
     * @param tenantId  The unique identifier for the tenant
     * @param jdbcUrl   The Turso JDBC URL (e.g., jdbc:dbeaver:libsql:https://...)
     * @param authToken The Turso authentication token
     * @return The DataSource for the tenant
     */
    public DataSource getOrCreateDataSource(String tenantId, String jdbcUrl, String authToken) {
        return dataSources.computeIfAbsent(tenantId, id -> {
            String targetUrl = jdbcUrl;

            // If it's a local connection and not the default tenant, use a namespace
            if (jdbcUrl.contains("localhost:8080") && !"default".equals(id)) {
                // Transform http://localhost:8080 -> http://<tenantId>.localhost:8080
                targetUrl = jdbcUrl.replace("localhost:8080", id + ".localhost:8080");
            }

            return createDataSource(targetUrl, authToken);
        });
    }

    private DataSource createDataSource(String jdbcUrl, String authToken) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);

        // Only set password if authToken is provided. For local sqld, it's often empty.
        if (authToken != null && !authToken.isEmpty()) {
            config.setPassword(authToken);
        }

        config.setDriverClassName("com.dbeaver.jdbc.driver.libsql.LibSqlDriver");

        // Optimized for SQLite/libSQL
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setIdleTimeout(600000); // 10 minutes
        config.setMaxLifetime(1800000); // 30 minutes
        config.setConnectionTimeout(30000); // 30 seconds

        // For libSQL/Turso, some traditional JDBC properties might not apply,
        // but we keep the pool robust.
        return new HikariDataSource(config);
    }

    public void removeDataSource(String tenantId) {
        DataSource ds = dataSources.remove(tenantId);
        if (ds instanceof HikariDataSource) {
            ((HikariDataSource) ds).close();
        }
    }
}
