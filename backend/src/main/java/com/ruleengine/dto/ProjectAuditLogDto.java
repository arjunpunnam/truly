package com.ruleengine.dto;

import java.time.LocalDateTime;

/**
 * DTO for project audit log entries.
 */
public class ProjectAuditLogDto {

    private Long id;
    private Long projectId;
    private String projectName;
    private String action;
    private String entityType;
    private Long entityId;
    private String entityName;
    private String details;
    private String previousValue;
    private String newValue;
    private String performedBy;
    private LocalDateTime createdAt;

    public ProjectAuditLogDto() {
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
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
        private final ProjectAuditLogDto dto = new ProjectAuditLogDto();

        public Builder id(Long id) {
            dto.id = id;
            return this;
        }

        public Builder projectId(Long projectId) {
            dto.projectId = projectId;
            return this;
        }

        public Builder projectName(String projectName) {
            dto.projectName = projectName;
            return this;
        }

        public Builder action(String action) {
            dto.action = action;
            return this;
        }

        public Builder entityType(String entityType) {
            dto.entityType = entityType;
            return this;
        }

        public Builder entityId(Long entityId) {
            dto.entityId = entityId;
            return this;
        }

        public Builder entityName(String entityName) {
            dto.entityName = entityName;
            return this;
        }

        public Builder details(String details) {
            dto.details = details;
            return this;
        }

        public Builder previousValue(String previousValue) {
            dto.previousValue = previousValue;
            return this;
        }

        public Builder newValue(String newValue) {
            dto.newValue = newValue;
            return this;
        }

        public Builder performedBy(String performedBy) {
            dto.performedBy = performedBy;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            dto.createdAt = createdAt;
            return this;
        }

        public ProjectAuditLogDto build() {
            return dto;
        }
    }
}
