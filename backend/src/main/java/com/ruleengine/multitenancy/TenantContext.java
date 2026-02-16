package com.ruleengine.multitenancy;

/**
 * Thread-local context for holding the current tenant identifier.
 */
public class TenantContext {
    private static final ThreadLocal<String> currentTenant = new InheritableThreadLocal<>();

    public static void setTenantId(String tenantId) {
        currentTenant.set(tenantId);
    }

    public static String getTenantId() {
        return currentTenant.get();
    }

    public static void clear() {
        currentTenant.remove();
    }
}
