package com.ruleengine.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity for storing rule execution audit logs.
 */
@Entity
@Table(name = "rule_audit_logs")
public class RuleAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private Rule rule;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String inputFacts;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String outputFacts;

    private boolean fired;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private Long executionTimeMs;

    @Column(nullable = false, updatable = false)
    private LocalDateTime executedAt;

    public RuleAuditLog() {
    }

    public RuleAuditLog(Long id, Rule rule, String inputFacts, String outputFacts, boolean fired, String errorMessage,
            Long executionTimeMs, LocalDateTime executedAt) {
        this.id = id;
        this.rule = rule;
        this.inputFacts = inputFacts;
        this.outputFacts = outputFacts;
        this.fired = fired;
        this.errorMessage = errorMessage;
        this.executionTimeMs = executionTimeMs;
        this.executedAt = executedAt;
    }

    public static class RuleAuditLogBuilder {
        private Long id;
        private Rule rule;
        private String inputFacts;
        private String outputFacts;
        private boolean fired;
        private String errorMessage;
        private Long executionTimeMs;
        private LocalDateTime executedAt;

        public RuleAuditLogBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public RuleAuditLogBuilder rule(Rule rule) {
            this.rule = rule;
            return this;
        }

        public RuleAuditLogBuilder inputFacts(String inputFacts) {
            this.inputFacts = inputFacts;
            return this;
        }

        public RuleAuditLogBuilder outputFacts(String outputFacts) {
            this.outputFacts = outputFacts;
            return this;
        }

        public RuleAuditLogBuilder fired(boolean fired) {
            this.fired = fired;
            return this;
        }

        public RuleAuditLogBuilder errorMessage(String errorMessage) {
            this.errorMessage = errorMessage;
            return this;
        }

        public RuleAuditLogBuilder executionTimeMs(Long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }

        public RuleAuditLogBuilder executedAt(LocalDateTime executedAt) {
            this.executedAt = executedAt;
            return this;
        }

        public RuleAuditLog build() {
            return new RuleAuditLog(id, rule, inputFacts, outputFacts, fired, errorMessage, executionTimeMs,
                    executedAt);
        }
    }

    public static RuleAuditLogBuilder builder() {
        return new RuleAuditLogBuilder();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Rule getRule() {
        return rule;
    }

    public void setRule(Rule rule) {
        this.rule = rule;
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

    public boolean isFired() {
        return fired;
    }

    public void setFired(boolean fired) {
        this.fired = fired;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Long getExecutionTimeMs() {
        return executionTimeMs;
    }

    public void setExecutionTimeMs(Long executionTimeMs) {
        this.executionTimeMs = executionTimeMs;
    }

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(LocalDateTime executedAt) {
        this.executedAt = executedAt;
    }

    @PrePersist
    protected void onCreate() {
        executedAt = LocalDateTime.now();
    }
}
