package com.ruleengine.dto;

import java.time.LocalDateTime;
import java.util.List;

public class RuleProjectDto {
    private Long id;
    private String name;
    private String description;

    // Multiple input/output schemas support
    private List<SchemaInfo> inputSchemas;
    private List<SchemaInfo> outputSchemas;

    private Long parentProjectId;
    private String allowedOutputTypes;
    private int ruleCount;
    private int templateCount;
    private int schemaCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // RuleSet-level Drools parameters
    private String activationGroup;
    private String agendaGroup;
    private Boolean autoFocus;
    private Boolean lockOnActive;

    public static class SchemaInfo {
        private Long id;
        private String name;

        public SchemaInfo() {
        }

        public SchemaInfo(Long id, String name) {
            this.id = id;
            this.name = name;
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
    }

    public RuleProjectDto() {
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

    public int getRuleCount() {
        return ruleCount;
    }

    public void setRuleCount(int ruleCount) {
        this.ruleCount = ruleCount;
    }

    public int getTemplateCount() {
        return templateCount;
    }

    public void setTemplateCount(int templateCount) {
        this.templateCount = templateCount;
    }

    public int getSchemaCount() {
        return schemaCount;
    }

    public void setSchemaCount(int schemaCount) {
        this.schemaCount = schemaCount;
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

    public List<SchemaInfo> getInputSchemas() {
        return inputSchemas;
    }

    public void setInputSchemas(List<SchemaInfo> inputSchemas) {
        this.inputSchemas = inputSchemas;
    }

    public List<SchemaInfo> getOutputSchemas() {
        return outputSchemas;
    }

    public void setOutputSchemas(List<SchemaInfo> outputSchemas) {
        this.outputSchemas = outputSchemas;
    }

    public Long getParentProjectId() {
        return parentProjectId;
    }

    public void setParentProjectId(Long parentProjectId) {
        this.parentProjectId = parentProjectId;
    }

    public String getAllowedOutputTypes() {
        return allowedOutputTypes;
    }

    public void setAllowedOutputTypes(String allowedOutputTypes) {
        this.allowedOutputTypes = allowedOutputTypes;
    }

    public String getActivationGroup() {
        return activationGroup;
    }

    public void setActivationGroup(String activationGroup) {
        this.activationGroup = activationGroup;
    }

    public String getAgendaGroup() {
        return agendaGroup;
    }

    public void setAgendaGroup(String agendaGroup) {
        this.agendaGroup = agendaGroup;
    }

    public Boolean getAutoFocus() {
        return autoFocus;
    }

    public void setAutoFocus(Boolean autoFocus) {
        this.autoFocus = autoFocus;
    }

    public Boolean getLockOnActive() {
        return lockOnActive;
    }

    public void setLockOnActive(Boolean lockOnActive) {
        this.lockOnActive = lockOnActive;
    }

    public static class Builder {
        private RuleProjectDto dto = new RuleProjectDto();

        public Builder id(Long id) {
            dto.id = id;
            return this;
        }

        public Builder name(String name) {
            dto.name = name;
            return this;
        }

        public Builder description(String description) {
            dto.description = description;
            return this;
        }

        public Builder ruleCount(int ruleCount) {
            dto.ruleCount = ruleCount;
            return this;
        }

        public Builder templateCount(int templateCount) {
            dto.templateCount = templateCount;
            return this;
        }

        public Builder schemaCount(int schemaCount) {
            dto.schemaCount = schemaCount;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            dto.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            dto.updatedAt = updatedAt;
            return this;
        }

        public Builder inputSchemas(List<SchemaInfo> inputSchemas) {
            dto.inputSchemas = inputSchemas;
            return this;
        }

        public Builder outputSchemas(List<SchemaInfo> outputSchemas) {
            dto.outputSchemas = outputSchemas;
            return this;
        }

        public Builder parentProjectId(Long parentProjectId) {
            dto.parentProjectId = parentProjectId;
            return this;
        }

        public Builder allowedOutputTypes(String allowedOutputTypes) {
            dto.allowedOutputTypes = allowedOutputTypes;
            return this;
        }

        public Builder activationGroup(String activationGroup) {
            dto.activationGroup = activationGroup;
            return this;
        }

        public Builder agendaGroup(String agendaGroup) {
            dto.agendaGroup = agendaGroup;
            return this;
        }

        public Builder autoFocus(Boolean autoFocus) {
            dto.autoFocus = autoFocus;
            return this;
        }

        public Builder lockOnActive(Boolean lockOnActive) {
            dto.lockOnActive = lockOnActive;
            return this;
        }

        public RuleProjectDto build() {
            return dto;
        }
    }
}
