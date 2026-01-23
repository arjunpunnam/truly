package com.ruleengine.dto;

import java.util.List;

/**
 * DTO representing the impact of a schema attribute change on rules.
 */
public class AttributeImpactDto {

    private String attributeName;
    private String schemaName;
    private Long schemaId;
    private List<AffectedRuleDto> affectedRules;
    private int totalAffectedRules;
    private String riskLevel; // "low", "medium", "high"

    public AttributeImpactDto() {
    }

    public AttributeImpactDto(String attributeName, String schemaName, Long schemaId,
            List<AffectedRuleDto> affectedRules, int totalAffectedRules, String riskLevel) {
        this.attributeName = attributeName;
        this.schemaName = schemaName;
        this.schemaId = schemaId;
        this.affectedRules = affectedRules;
        this.totalAffectedRules = totalAffectedRules;
        this.riskLevel = riskLevel;
    }

    // Static inner class for affected rules
    public static class AffectedRuleDto {
        private Long ruleId;
        private String ruleName;
        private Long projectId;
        private String projectName;
        private List<UsageDto> usages;

        public AffectedRuleDto() {
        }

        public AffectedRuleDto(Long ruleId, String ruleName, Long projectId,
                String projectName, List<UsageDto> usages) {
            this.ruleId = ruleId;
            this.ruleName = ruleName;
            this.projectId = projectId;
            this.projectName = projectName;
            this.usages = usages;
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

        public List<UsageDto> getUsages() {
            return usages;
        }

        public void setUsages(List<UsageDto> usages) {
            this.usages = usages;
        }
    }

    // Static inner class for usage details
    public static class UsageDto {
        private String location; // "condition" or "action"
        private String detail; // Human-readable description

        public UsageDto() {
        }

        public UsageDto(String location, String detail) {
            this.location = location;
            this.detail = detail;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getDetail() {
            return detail;
        }

        public void setDetail(String detail) {
            this.detail = detail;
        }
    }

    // Getters and setters
    public String getAttributeName() {
        return attributeName;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public String getSchemaName() {
        return schemaName;
    }

    public void setSchemaName(String schemaName) {
        this.schemaName = schemaName;
    }

    public Long getSchemaId() {
        return schemaId;
    }

    public void setSchemaId(Long schemaId) {
        this.schemaId = schemaId;
    }

    public List<AffectedRuleDto> getAffectedRules() {
        return affectedRules;
    }

    public void setAffectedRules(List<AffectedRuleDto> affectedRules) {
        this.affectedRules = affectedRules;
    }

    public int getTotalAffectedRules() {
        return totalAffectedRules;
    }

    public void setTotalAffectedRules(int totalAffectedRules) {
        this.totalAffectedRules = totalAffectedRules;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String attributeName;
        private String schemaName;
        private Long schemaId;
        private List<AffectedRuleDto> affectedRules;
        private int totalAffectedRules;
        private String riskLevel;

        public Builder attributeName(String attributeName) {
            this.attributeName = attributeName;
            return this;
        }

        public Builder schemaName(String schemaName) {
            this.schemaName = schemaName;
            return this;
        }

        public Builder schemaId(Long schemaId) {
            this.schemaId = schemaId;
            return this;
        }

        public Builder affectedRules(List<AffectedRuleDto> affectedRules) {
            this.affectedRules = affectedRules;
            return this;
        }

        public Builder totalAffectedRules(int totalAffectedRules) {
            this.totalAffectedRules = totalAffectedRules;
            return this;
        }

        public Builder riskLevel(String riskLevel) {
            this.riskLevel = riskLevel;
            return this;
        }

        public AttributeImpactDto build() {
            return new AttributeImpactDto(attributeName, schemaName, schemaId,
                    affectedRules, totalAffectedRules, riskLevel);
        }
    }
}
