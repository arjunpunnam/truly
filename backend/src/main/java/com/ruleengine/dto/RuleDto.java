package com.ruleengine.dto;

import java.time.LocalDateTime;

/**
 * DTO for rule responses.
 */
public class RuleDto {

    private Long id;
    private String name;
    private String description;
    private Long schemaId;
    private String schemaName;
    private Long projectId;
    private boolean enabled;
    private int priority;
    private String category;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private RuleDefinition definition;
    private String generatedDrl;

    // Rule-level Drools parameters
    private String activationGroup;
    private Boolean lockOnActive;
    private String dateEffective;
    private String dateExpires;

    public RuleDto() {
    }

    public RuleDto(Long id, String name, String description, Long schemaId, String schemaName, Long projectId,
            boolean enabled,
            int priority, String category, LocalDateTime createdAt, LocalDateTime updatedAt, RuleDefinition definition,
            String generatedDrl) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.schemaId = schemaId;
        this.schemaName = schemaName;
        this.projectId = projectId;
        this.enabled = enabled;
        this.priority = priority;
        this.category = category;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.definition = definition;
        this.generatedDrl = generatedDrl;
    }

    public static class RuleDtoBuilder {
        private Long id;
        private String name;
        private String description;
        private Long schemaId;
        private String schemaName;
        private Long projectId;
        private boolean enabled;
        private int priority;
        private String category;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private RuleDefinition definition;
        private String generatedDrl;

        public RuleDtoBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public RuleDtoBuilder name(String name) {
            this.name = name;
            return this;
        }

        public RuleDtoBuilder description(String description) {
            this.description = description;
            return this;
        }

        public RuleDtoBuilder schemaId(Long schemaId) {
            this.schemaId = schemaId;
            return this;
        }

        public RuleDtoBuilder schemaName(String schemaName) {
            this.schemaName = schemaName;
            return this;
        }

        public RuleDtoBuilder projectId(Long projectId) {
            this.projectId = projectId;
            return this;
        }

        public RuleDtoBuilder enabled(boolean enabled) {
            this.enabled = enabled;
            return this;
        }

        public RuleDtoBuilder priority(int priority) {
            this.priority = priority;
            return this;
        }

        public RuleDtoBuilder category(String category) {
            this.category = category;
            return this;
        }

        public RuleDtoBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public RuleDtoBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public RuleDtoBuilder definition(RuleDefinition definition) {
            this.definition = definition;
            return this;
        }

        public RuleDtoBuilder generatedDrl(String generatedDrl) {
            this.generatedDrl = generatedDrl;
            return this;
        }

        public RuleDto build() {
            return new RuleDto(id, name, description, schemaId, schemaName, projectId, enabled, priority, category,
                    createdAt,
                    updatedAt, definition, generatedDrl);
        }
    }

    public static RuleDtoBuilder builder() {
        return new RuleDtoBuilder();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getSchemaId() {
        return schemaId;
    }

    public void setSchemaId(Long schemaId) {
        this.schemaId = schemaId;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public RuleDefinition getDefinition() {
        return definition;
    }

    public void setDefinition(RuleDefinition definition) {
        this.definition = definition;
    }

    public String getGeneratedDrl() {
        return generatedDrl;
    }

    public void setGeneratedDrl(String generatedDrl) {
        this.generatedDrl = generatedDrl;
    }

    public String getActivationGroup() {
        return activationGroup;
    }

    public void setActivationGroup(String activationGroup) {
        this.activationGroup = activationGroup;
    }

    public Boolean getLockOnActive() {
        return lockOnActive;
    }

    public void setLockOnActive(Boolean lockOnActive) {
        this.lockOnActive = lockOnActive;
    }

    public String getDateEffective() {
        return dateEffective;
    }

    public void setDateEffective(String dateEffective) {
        this.dateEffective = dateEffective;
    }

    public String getDateExpires() {
        return dateExpires;
    }

    public void setDateExpires(String dateExpires) {
        this.dateExpires = dateExpires;
    }
}
