package com.ruleengine.multitenancy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Main configuration for Multi-Tenancy support.
 */
@Configuration
public class MultiTenancyConfig implements WebMvcConfigurer {

    @Autowired
    private TenantInterceptor tenantInterceptor;

    @Autowired
    private TenantDatabaseManager tenantDatabaseManager;

    @Value("${spring.datasource.url}")
    private String defaultJdbcUrl;

    @Value("${spring.datasource.password:}")
    private String defaultAuthToken;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor);
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        TenantRoutingDataSource routingDataSource = new TenantRoutingDataSource();

        // Configure default/fallback data source
        DataSource defaultDataSource = tenantDatabaseManager.getOrCreateDataSource(
                "default", defaultJdbcUrl, defaultAuthToken);

        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put("default", defaultDataSource);

        // Note: In a real SaaS application, you would dynamically discover tenants.
        // For now, we seed it with the default and handle others via the overriden
        // determineTargetDataSource if needed, or by pre-registering them.

        routingDataSource.setDefaultTargetDataSource(defaultDataSource);
        routingDataSource.setTargetDataSources(targetDataSources);

        // This ensures the routing data source is initialized correctly
        routingDataSource.afterPropertiesSet();

        return routingDataSource;
    }
}
