package com.ruleengine.drools;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.ExecuteRulesResponse.WebhookResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Context object passed to rules for executing actions.
 * This is set as a Drools global and used by rule RHS.
 */
@Component
public class ActionContext {

    private static final Logger log = LoggerFactory.getLogger(ActionContext.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Thread-local storage for webhook results (since rules execute synchronously)
    private final ThreadLocal<List<WebhookResult>> webhookResults = ThreadLocal.withInitial(ArrayList::new);
    private final ThreadLocal<List<String>> auditLogs = ThreadLocal.withInitial(ArrayList::new);

    public ActionContext(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Log a message for audit purposes.
     */
    public void log(String message, DynamicFact fact) {
        String logEntry = String.format("[RULE LOG] %s | Fact: %s", message, fact.getFactType());
        log.info(logEntry);
        auditLogs.get().add(logEntry);
    }

    /**
     * Execute a webhook call.
     */
    public void executeWebhook(String url, String method, DynamicFact fact, Map<String, String> headers) {
        try {
            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_JSON);

            if (headers != null) {
                headers.forEach(httpHeaders::set);
            }

            String body = objectMapper.writeValueAsString(fact.getData());
            HttpEntity<String> entity = new HttpEntity<>(body, httpHeaders);

            HttpMethod httpMethod = HttpMethod.valueOf(method.toUpperCase());
            ResponseEntity<String> response = restTemplate.exchange(url, httpMethod, entity, String.class);

            webhookResults.get().add(WebhookResult.builder()
                    .url(url)
                    .statusCode(response.getStatusCode().value())
                    .response(response.getBody())
                    .success(response.getStatusCode().is2xxSuccessful())
                    .build());

            log.info("Webhook executed: {} {} -> {}", method, url, response.getStatusCode());

        } catch (Exception e) {
            log.error("Webhook execution failed: {} {}", method, url, e);
            webhookResults.get().add(WebhookResult.builder()
                    .url(url)
                    .statusCode(0)
                    .response(e.getMessage())
                    .success(false)
                    .build());
        }
    }

    /**
     * Get and clear webhook results for the current thread.
     */
    public List<WebhookResult> getAndClearWebhookResults() {
        List<WebhookResult> results = new ArrayList<>(webhookResults.get());
        webhookResults.get().clear();
        return results;
    }

    /**
     * Get and clear audit logs for the current thread.
     */
    public List<String> getAndClearAuditLogs() {
        List<String> logs = new ArrayList<>(auditLogs.get());
        auditLogs.get().clear();
        return logs;
    }

    /**
     * Clear all thread-local state.
     */
    public void clear() {
        webhookResults.get().clear();
        auditLogs.get().clear();
    }
}
