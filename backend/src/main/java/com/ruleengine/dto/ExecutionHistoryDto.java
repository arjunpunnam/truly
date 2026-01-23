package com.ruleengine.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class ExecutionHistoryDto {
    private Long id;
    private Long projectId;
    private String projectName;
    private boolean success;
    private boolean dryRun;
    private long executionTimeMs;
    private String errorMessage;
    private LocalDateTime executedAt;

    // Deserialized fields
    private List<Map<String, Object>> inputFacts;
    private List<Map<String, Object>> outputFacts;
    private List<ExecuteRulesResponse.FiredRule> firedRules;
    private List<ExecuteRulesResponse.WebhookResult> webhookResults;

    public ExecutionHistoryDto() {
    }

    public ExecutionHistoryDto(Long id, Long projectId, String projectName, boolean success, boolean dryRun,
            long executionTimeMs, String errorMessage, LocalDateTime executedAt, List<Map<String, Object>> inputFacts,
            List<Map<String, Object>> outputFacts, List<ExecuteRulesResponse.FiredRule> firedRules,
            List<ExecuteRulesResponse.WebhookResult> webhookResults) {
        this.id = id;
        this.projectId = projectId;
        this.projectName = projectName;
        this.success = success;
        this.dryRun = dryRun;
        this.executionTimeMs = executionTimeMs;
        this.errorMessage = errorMessage;
        this.executedAt = executedAt;
        this.inputFacts = inputFacts;
        this.outputFacts = outputFacts;
        this.firedRules = firedRules;
        this.webhookResults = webhookResults;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
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

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(LocalDateTime executedAt) {
        this.executedAt = executedAt;
    }

    public List<Map<String, Object>> getInputFacts() {
        return inputFacts;
    }

    public void setInputFacts(List<Map<String, Object>> inputFacts) {
        this.inputFacts = inputFacts;
    }

    public List<Map<String, Object>> getOutputFacts() {
        return outputFacts;
    }

    public void setOutputFacts(List<Map<String, Object>> outputFacts) {
        this.outputFacts = outputFacts;
    }

    public List<ExecuteRulesResponse.FiredRule> getFiredRules() {
        return firedRules;
    }

    public void setFiredRules(List<ExecuteRulesResponse.FiredRule> firedRules) {
        this.firedRules = firedRules;
    }

    public List<ExecuteRulesResponse.WebhookResult> getWebhookResults() {
        return webhookResults;
    }

    public void setWebhookResults(List<ExecuteRulesResponse.WebhookResult> webhookResults) {
        this.webhookResults = webhookResults;
    }

    public static class Builder {
        private Long id;
        private Long projectId;
        private String projectName;
        private boolean success;
        private boolean dryRun;
        private long executionTimeMs;
        private String errorMessage;
        private LocalDateTime executedAt;
        private List<Map<String, Object>> inputFacts;
        private List<Map<String, Object>> outputFacts;
        private List<ExecuteRulesResponse.FiredRule> firedRules;
        private List<ExecuteRulesResponse.WebhookResult> webhookResults;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder projectId(Long projectId) {
            this.projectId = projectId;
            return this;
        }

        public Builder projectName(String projectName) {
            this.projectName = projectName;
            return this;
        }

        public Builder success(boolean success) {
            this.success = success;
            return this;
        }

        public Builder dryRun(boolean dryRun) {
            this.dryRun = dryRun;
            return this;
        }

        public Builder executionTimeMs(long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }

        public Builder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public Builder executedAt(LocalDateTime executedAt) {
            this.executedAt = executedAt;
            return this;
        }

        public Builder inputFacts(List<Map<String, Object>> inputFacts) {
            this.inputFacts = inputFacts;
            return this;
        }

        public Builder outputFacts(List<Map<String, Object>> outputFacts) {
            this.outputFacts = outputFacts;
            return this;
        }

        public Builder firedRules(List<ExecuteRulesResponse.FiredRule> firedRules) {
            this.firedRules = firedRules;
            return this;
        }

        public Builder webhookResults(List<ExecuteRulesResponse.WebhookResult> webhookResults) {
            this.webhookResults = webhookResults;
            return this;
        }

        public ExecutionHistoryDto build() {
            return new ExecutionHistoryDto(id, projectId, projectName, success, dryRun, executionTimeMs, errorMessage,
                    executedAt, inputFacts, outputFacts, firedRules, webhookResults);
        }
    }
}
