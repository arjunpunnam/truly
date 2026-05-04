package com.ruleengine.drools;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.ExecuteRulesResponse.WebhookResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Context object passed to rules for executing actions.
 * This is set as a Drools global and used by rule RHS.
 */
@Component
public class ActionContext {

    private static final Logger log = LoggerFactory.getLogger(ActionContext.class);
    private static final int MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;
    private static final Set<HttpMethod> ALLOWED_WEBHOOK_METHODS = Set.of(
            HttpMethod.GET,
            HttpMethod.POST,
            HttpMethod.PUT,
            HttpMethod.PATCH,
            HttpMethod.DELETE);
    private static final Set<String> BLOCKED_WEBHOOK_HEADERS = Set.of(
            "authorization",
            "proxy-authorization",
            "cookie",
            "set-cookie",
            "host",
            "connection",
            "keep-alive",
            "content-length",
            "transfer-encoding",
            "te",
            "trailer",
            "upgrade",
            "via",
            "forwarded",
            "proxy-authenticate",
            "x-forwarded-for",
            "x-forwarded-host",
            "x-forwarded-proto",
            "x-real-ip");
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
            URI webhookUri = validateWebhookUrl(url);
            HttpMethod httpMethod = validateWebhookMethod(method);
            HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_JSON);

            if (headers != null) {
                headers.forEach((name, value) -> {
                    if (isAllowedWebhookHeader(name, value)) {
                        httpHeaders.set(name.trim(), value);
                    } else {
                        log.warn("Blocked caller-supplied webhook header: {}", name);
                    }
                });
            }

            String body = objectMapper.writeValueAsString(fact.getData());

            ResponseEntity<String> response = restTemplate.execute(
                    webhookUri,
                    httpMethod,
                    request -> {
                        request.getHeaders().putAll(httpHeaders);
                        request.getBody().write(body.getBytes(StandardCharsets.UTF_8));
                    },
                    clientResponse -> ResponseEntity
                            .status(clientResponse.getStatusCode())
                            .headers(clientResponse.getHeaders())
                            .body(readLimitedResponse(clientResponse.getBody())));

            webhookResults.get().add(WebhookResult.builder()
                    .url(webhookUri.toString())
                    .statusCode(response.getStatusCode().value())
                    .response(response.getBody())
                    .success(response.getStatusCode().is2xxSuccessful())
                    .build());

            log.info("Webhook executed: {} {} -> {}", httpMethod, webhookUri, response.getStatusCode());

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

    private URI validateWebhookUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Webhook URL is required");
        }

        URI uri = URI.create(url.trim()).normalize();
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Webhook URL must use http or https");
        }
        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Webhook URL must not include user info");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Webhook URL host is required");
        }
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if ("localhost".equals(normalizedHost) || normalizedHost.endsWith(".localhost")) {
            throw new IllegalArgumentException("Webhook URL host is not allowed");
        }

        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (Exception e) {
            throw new IllegalArgumentException("Webhook URL host could not be resolved", e);
        }

        boolean hasBlockedAddress = Arrays.stream(addresses).anyMatch(this::isBlockedWebhookAddress);
        if (hasBlockedAddress) {
            throw new IllegalArgumentException("Webhook URL resolves to a blocked network address");
        }

        return uri;
    }

    private HttpMethod validateWebhookMethod(String method) {
        String normalizedMethod = method == null || method.isBlank() ? "POST" : method.trim().toUpperCase(Locale.ROOT);
        HttpMethod httpMethod;
        try {
            httpMethod = HttpMethod.valueOf(normalizedMethod);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported webhook HTTP method: " + normalizedMethod, e);
        }
        if (!ALLOWED_WEBHOOK_METHODS.contains(httpMethod)) {
            throw new IllegalArgumentException("Unsupported webhook HTTP method: " + normalizedMethod);
        }
        return httpMethod;
    }

    private boolean isAllowedWebhookHeader(String name, String value) {
        if (name == null || name.isBlank()) {
            return false;
        }
        if (value == null || value.contains("\r") || value.contains("\n")) {
            return false;
        }

        String normalizedName = name.trim().toLowerCase(Locale.ROOT);
        return !BLOCKED_WEBHOOK_HEADERS.contains(normalizedName)
                && !normalizedName.startsWith("proxy-")
                && !normalizedName.startsWith(":")
                && normalizedName.chars().allMatch(this::isHeaderTokenChar);
    }

    private boolean isHeaderTokenChar(int character) {
        return (character >= 'a' && character <= 'z')
                || (character >= '0' && character <= '9')
                || character == '!'
                || character == '#'
                || character == '$'
                || character == '%'
                || character == '&'
                || character == '\''
                || character == '*'
                || character == '+'
                || character == '-'
                || character == '.'
                || character == '^'
                || character == '_'
                || character == '`'
                || character == '|'
                || character == '~';
    }

    private boolean isBlockedWebhookAddress(InetAddress address) {
        return address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()
                || isCarrierGradeNatAddress(address)
                || isUniqueLocalAddress(address);
    }

    private boolean isCarrierGradeNatAddress(InetAddress address) {
        if (!(address instanceof Inet4Address)) {
            return false;
        }

        byte[] bytes = address.getAddress();
        int first = Byte.toUnsignedInt(bytes[0]);
        int second = Byte.toUnsignedInt(bytes[1]);
        return first == 100 && second >= 64 && second <= 127;
    }

    private boolean isUniqueLocalAddress(InetAddress address) {
        if (!(address instanceof Inet6Address)) {
            return false;
        }

        int first = Byte.toUnsignedInt(address.getAddress()[0]);
        return (first & 0xfe) == 0xfc;
    }

    private String readLimitedResponse(InputStream inputStream) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int total = 0;
        int read;
        while ((read = inputStream.read(buffer)) != -1) {
            total += read;
            if (total > MAX_WEBHOOK_RESPONSE_BYTES) {
                throw new IOException("Webhook response exceeded maximum size");
            }
            output.write(buffer, 0, read);
        }
        return output.toString(StandardCharsets.UTF_8);
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
