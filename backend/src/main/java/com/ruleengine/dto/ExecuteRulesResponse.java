package com.ruleengine.dto;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for rule execution results.
 */
public class ExecuteRulesResponse {

    private boolean success;
    private List<Map<String, Object>> resultFacts;
    private List<FiredRule> firedRules;
    private long executionTimeMs;
    private String errorMessage;
    private List<WebhookResult> webhookResults;

    public ExecuteRulesResponse() {
    }

    public ExecuteRulesResponse(boolean success, List<Map<String, Object>> resultFacts, List<FiredRule> firedRules,
            long executionTimeMs, String errorMessage, List<WebhookResult> webhookResults) {
        this.success = success;
        this.resultFacts = resultFacts;
        this.firedRules = firedRules;
        this.executionTimeMs = executionTimeMs;
        this.errorMessage = errorMessage;
        this.webhookResults = webhookResults;
    }

    public static class ExecuteRulesResponseBuilder {
        private boolean success;
        private List<Map<String, Object>> resultFacts;
        private List<FiredRule> firedRules;
        private long executionTimeMs;
        private String errorMessage;
        private List<WebhookResult> webhookResults;

        public ExecuteRulesResponseBuilder success(boolean success) {
            this.success = success;
            return this;
        }

        public ExecuteRulesResponseBuilder resultFacts(List<Map<String, Object>> resultFacts) {
            this.resultFacts = resultFacts;
            return this;
        }

        public ExecuteRulesResponseBuilder firedRules(List<FiredRule> firedRules) {
            this.firedRules = firedRules;
            return this;
        }

        public ExecuteRulesResponseBuilder executionTimeMs(long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }

        public ExecuteRulesResponseBuilder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public ExecuteRulesResponseBuilder webhookResults(List<WebhookResult> webhookResults) {
            this.webhookResults = webhookResults;
            return this;
        }

        public ExecuteRulesResponse build() {
            return new ExecuteRulesResponse(success, resultFacts, firedRules, executionTimeMs, errorMessage,
                    webhookResults);
        }
    }

    public static ExecuteRulesResponseBuilder builder() {
        return new ExecuteRulesResponseBuilder();
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public List<Map<String, Object>> getResultFacts() {
        return resultFacts;
    }

    public void setResultFacts(List<Map<String, Object>> resultFacts) {
        this.resultFacts = resultFacts;
    }

    public List<FiredRule> getFiredRules() {
        return firedRules;
    }

    public void setFiredRules(List<FiredRule> firedRules) {
        this.firedRules = firedRules;
    }

    public long getExecutionTimeMs() {
        return executionTimeMs;
    }

    public void setExecutionTimeMs(long executionTimeMs) {
        this.executionTimeMs = executionTimeMs;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public List<WebhookResult> getWebhookResults() {
        return webhookResults;
    }

    public void setWebhookResults(List<WebhookResult> webhookResults) {
        this.webhookResults = webhookResults;
    }

    public static class FiredRule {
        private Long ruleId;
        private String ruleName;
        private int fireCount;

        public FiredRule() {
        }

        public FiredRule(Long ruleId, String ruleName, int fireCount) {
            this.ruleId = ruleId;
            this.ruleName = ruleName;
            this.fireCount = fireCount;
        }

        public static class FiredRuleBuilder {
            private Long ruleId;
            private String ruleName;
            private int fireCount;

            public FiredRuleBuilder ruleId(Long ruleId) {
                this.ruleId = ruleId;
                return this;
            }

            public FiredRuleBuilder ruleName(String ruleName) {
                this.ruleName = ruleName;
                return this;
            }

            public FiredRuleBuilder fireCount(int fireCount) {
                this.fireCount = fireCount;
                return this;
            }

            public FiredRule build() {
                return new FiredRule(ruleId, ruleName, fireCount);
            }
        }

        public static FiredRuleBuilder builder() {
            return new FiredRuleBuilder();
        }

        public Long getRuleId() {
            return ruleId;
        }

        public void setRuleId(Long ruleId) {
            this.ruleId = ruleId;
        }

        public String getRuleName() {
            return ruleName;
        }

        public void setRuleName(String ruleName) {
            this.ruleName = ruleName;
        }

        public int getFireCount() {
            return fireCount;
        }

        public void setFireCount(int fireCount) {
            this.fireCount = fireCount;
        }
    }

    public static class WebhookResult {
        private String url;
        private int statusCode;
        private String response;
        private boolean success;

        public WebhookResult() {
        }

        public WebhookResult(String url, int statusCode, String response, boolean success) {
            this.url = url;
            this.statusCode = statusCode;
            this.response = response;
            this.success = success;
        }

        public static class WebhookResultBuilder {
            private String url;
            private int statusCode;
            private String response;
            private boolean success;

            public WebhookResultBuilder url(String url) {
                this.url = url;
                return this;
            }

            public WebhookResultBuilder statusCode(int statusCode) {
                this.statusCode = statusCode;
                return this;
            }

            public WebhookResultBuilder response(String response) {
                this.response = response;
                return this;
            }

            public WebhookResultBuilder success(boolean success) {
                this.success = success;
                return this;
            }

            public WebhookResult build() {
                return new WebhookResult(url, statusCode, response, success);
            }
        }

        public static WebhookResultBuilder builder() {
            return new WebhookResultBuilder();
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public int getStatusCode() {
            return statusCode;
        }

        public void setStatusCode(int statusCode) {
            this.statusCode = statusCode;
        }

        public String getResponse() {
            return response;
        }

        public void setResponse(String response) {
            this.response = response;
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }
    }
}
