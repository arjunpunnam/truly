package com.ruleengine.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity for tracking audit events within a project.
 * Records changes to rules, schemas, templates, and other project resources.
 */
@Entity
@Table(name = "project_audit_logs", indexes = {
        @Index(name = "idx_audit_project", columnList = "project_id"),
        @Index(name = "idx_audit_timestamp", columnList = "createdAt")
})
public class ProjectAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private RuleProject project;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AuditAction action;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AuditEntityType entityType;

    @Column
    private Long entityId;

    @Column
    private String entityName;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(columnDefinition = "TEXT")
    private String previousValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column
    private String performedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum AuditAction {
        CREATE, UPDATE, DELETE, ENABLE, DISABLE, EXECUTE, IMPORT, EXPORT
    }

    public enum AuditEntityType {
        PROJECT, TEMPLATE, RULE, SCHEMA, ATTRIBUTE
    }

    // Constructors
    public ProjectAuditLog() {
    }

    public static Builder builder() {
        return new Builder();
    }

    // Getters and Setters
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

    public AuditAction getAction() {
        return action;
    }

    public void setAction(AuditAction action) {
        this.action = action;
    }

    public AuditEntityType getEntityType() {
        return entityType;
    }

    public void setEntityType(AuditEntityType entityType) {
        this.entityType = entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getEntityName() {
        return entityName;
    }

    public void setEntityName(String entityName) {
        this.entityName = entityName;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getPreviousValue() {
        return previousValue;
    }

    public void setPreviousValue(String previousValue) {
        this.previousValue = previousValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Builder
    public static class Builder {
        private final ProjectAuditLog log = new ProjectAuditLog();

        public Builder project(RuleProject project) {
            log.project = project;
            return this;
        }

        public Builder action(AuditAction action) {
            log.action = action;
            return this;
        }

        public Builder entityType(AuditEntityType entityType) {
            log.entityType = entityType;
            return this;
        }

        public Builder entityId(Long entityId) {
            log.entityId = entityId;
            return this;
        }

        public Builder entityName(String entityName) {
            log.entityName = entityName;
            return this;
        }

        public Builder details(String details) {
            log.details = details;
            return this;
        }

        public Builder previousValue(String previousValue) {
            log.previousValue = previousValue;
            return this;
        }

        public Builder newValue(String newValue) {
            log.newValue = newValue;
            return this;
        }

        public Builder performedBy(String performedBy) {
            log.performedBy = performedBy;
            return this;
        }

        public ProjectAuditLog build() {
            return log;
        }
    }
}
