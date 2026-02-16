package com.ruleengine.multitenancy;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Routing DataSource that returns the current tenant ID as the lookup key.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantId();
    }
}
