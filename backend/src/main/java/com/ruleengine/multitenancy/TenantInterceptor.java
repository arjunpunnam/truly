package com.ruleengine.multitenancy;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor that resolves the tenant from the request headers and sets it in
 * the TenantContext.
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader(TENANT_HEADER);

        // In a real SaaS app, you might validate the tenantId here
        // or extract it from a JWT token.
        if (tenantId != null && !tenantId.isEmpty()) {
            TenantContext.setTenantId(tenantId);
        } else {
            // Default to 'default' or throw error if multi-tenancy is enforced
            TenantContext.setTenantId("default");
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
            Exception ex) {
        TenantContext.clear();
    }
}
