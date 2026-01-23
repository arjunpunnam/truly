package com.ruleengine.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "execution_history")
public class ExecutionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private RuleProject project;

    @Column(columnDefinition = "TEXT")
    private String inputFacts;

    @Column(columnDefinition = "TEXT")
    private String outputFacts;

    @Column(columnDefinition = "TEXT")
    private String firedRules;

    @Column(columnDefinition = "TEXT")
    private String webhookResults;

    private boolean success;

    private boolean dryRun;

    private long executionTimeMs;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime executedAt;

    public ExecutionHistory() {
    }

    public ExecutionHistory(Long id, RuleProject project, String inputFacts, String outputFacts, String firedRules,
            String webhookResults, boolean success, boolean dryRun, long executionTimeMs, String errorMessage,
            LocalDateTime executedAt) {
        this.id = id;
        this.project = project;
        this.inputFacts = inputFacts;
        this.outputFacts = outputFacts;
        this.firedRules = firedRules;
        this.webhookResults = webhookResults;
        this.success = success;
        this.dryRun = dryRun;
        this.executionTimeMs = executionTimeMs;
        this.errorMessage = errorMessage;
        this.executedAt = executedAt;
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

    public RuleProject getProject() {
        return project;
    }

    public void setProject(RuleProject project) {
        this.project = project;
    }

    public String getInputFacts() {
        return inputFacts;
    }

    public void setInputFacts(String inputFacts) {
        this.inputFacts = inputFacts;
    }

    public String getOutputFacts() {
        return outputFacts;
    }

    public void setOutputFacts(String outputFacts) {
        this.outputFacts = outputFacts;
    }

    public String getFiredRules() {
        return firedRules;
    }

    public void setFiredRules(String firedRules) {
        this.firedRules = firedRules;
    }

    public String getWebhookResults() {
        return webhookResults;
    }

    public void setWebhookResults(String webhookResults) {
        this.webhookResults = webhookResults;
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

    public static class Builder {
        private Long id;
        private RuleProject project;
        private String inputFacts;
        private String outputFacts;
        private String firedRules;
        private String webhookResults;
        private boolean success;
        private boolean dryRun;
        private long executionTimeMs;
        private String errorMessage;
        private LocalDateTime executedAt;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder project(RuleProject project) {
            this.project = project;
            return this;
        }

        public Builder inputFacts(String inputFacts) {
            this.inputFacts = inputFacts;
            return this;
        }

        public Builder outputFacts(String outputFacts) {
            this.outputFacts = outputFacts;
            return this;
        }

        public Builder firedRules(String firedRules) {
            this.firedRules = firedRules;
            return this;
        }

        public Builder webhookResults(String webhookResults) {
            this.webhookResults = webhookResults;
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

        public ExecutionHistory build() {
            return new ExecutionHistory(id, project, inputFacts, outputFacts, firedRules, webhookResults, success,
                    dryRun, executionTimeMs, errorMessage, executedAt);
        }
    }
}
