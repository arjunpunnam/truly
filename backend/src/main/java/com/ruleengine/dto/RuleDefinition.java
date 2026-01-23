package com.ruleengine.dto;

import java.util.List;
import java.util.Map;

/**
 * DTO representing the JSON structure of a rule.
 * This is the format used by the frontend to author rules.
 */
public class RuleDefinition {

    private String name;
    private String description;
    private Long schemaId;
    private Long projectId;
    private int priority;
    private boolean enabled;
    private String category;
    private ConditionGroup conditions;
    private List<RuleAction> actions;

    // Advanced Drools options
    private String activationGroup;
    private Boolean lockOnActive;
    private String dateEffective;
    private String dateExpires;

    public RuleDefinition() {
    }

    public RuleDefinition(String name, String description, Long schemaId, Long projectId, int priority, boolean enabled,
            String category, ConditionGroup conditions, List<RuleAction> actions) {
        this.name = name;
        this.description = description;
        this.schemaId = schemaId;
        this.projectId = projectId;
        this.priority = priority;
        this.enabled = enabled;
        this.category = category;
        this.conditions = conditions;
        this.actions = actions;
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

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public ConditionGroup getConditions() {
        return conditions;
    }

    public void setConditions(ConditionGroup conditions) {
        this.conditions = conditions;
    }

    public List<RuleAction> getActions() {
        return actions;
    }

    public void setActions(List<RuleAction> actions) {
        this.actions = actions;
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

    public static class ConditionGroup {
        private String operator;
        private List<Condition> conditions;

        public ConditionGroup() {
        }

        public ConditionGroup(String operator, List<Condition> conditions) {
            this.operator = operator;
            this.conditions = conditions;
        }

        public String getOperator() {
            return operator;
        }

        public void setOperator(String operator) {
            this.operator = operator;
        }

        public List<Condition> getConditions() {
            return conditions;
        }

        public void setConditions(List<Condition> conditions) {
            this.conditions = conditions;
        }
    }

    public static class Condition {
        private String fact;
        private String operator;
        private Object value;
        private boolean valueIsField;
        private ConditionGroup nested;

        public Condition() {
        }

        public Condition(String fact, String operator, Object value, boolean valueIsField, ConditionGroup nested) {
            this.fact = fact;
            this.operator = operator;
            this.value = value;
            this.valueIsField = valueIsField;
            this.nested = nested;
        }

        public String getFact() {
            return fact;
        }

        public void setFact(String fact) {
            this.fact = fact;
        }

        public String getOperator() {
            return operator;
        }

        public void setOperator(String operator) {
            this.operator = operator;
        }

        public Object getValue() {
            return value;
        }

        public void setValue(Object value) {
            this.value = value;
        }

        public boolean isValueIsField() {
            return valueIsField;
        }

        public void setValueIsField(boolean valueIsField) {
            this.valueIsField = valueIsField;
        }

        public ConditionGroup getNested() {
            return nested;
        }

        public void setNested(ConditionGroup nested) {
            this.nested = nested;
        }
    }

    public static class RuleAction {
        private String type;
        private String targetField;
        private Object value;
        private String factType;
        private Map<String, Object> factData;
        private String logMessage;
        private String webhookUrl;
        private String webhookMethod;
        private Map<String, String> webhookHeaders;
        private String webhookBodyTemplate;

        public RuleAction() {
        }

        public RuleAction(String type, String targetField, Object value, String factType, Map<String, Object> factData,
                String logMessage, String webhookUrl, String webhookMethod, Map<String, String> webhookHeaders,
                String webhookBodyTemplate) {
            this.type = type;
            this.targetField = targetField;
            this.value = value;
            this.factType = factType;
            this.factData = factData;
            this.logMessage = logMessage;
            this.webhookUrl = webhookUrl;
            this.webhookMethod = webhookMethod;
            this.webhookHeaders = webhookHeaders;
            this.webhookBodyTemplate = webhookBodyTemplate;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getTargetField() {
            return targetField;
        }

        public void setTargetField(String targetField) {
            this.targetField = targetField;
        }

        public Object getValue() {
            return value;
        }

        public void setValue(Object value) {
            this.value = value;
        }

        public String getFactType() {
            return factType;
        }

        public void setFactType(String factType) {
            this.factType = factType;
        }

        public Map<String, Object> getFactData() {
            return factData;
        }

        public void setFactData(Map<String, Object> factData) {
            this.factData = factData;
        }

        public String getLogMessage() {
            return logMessage;
        }

        public void setLogMessage(String logMessage) {
            this.logMessage = logMessage;
        }

        public String getWebhookUrl() {
            return webhookUrl;
        }

        public void setWebhookUrl(String webhookUrl) {
            this.webhookUrl = webhookUrl;
        }

        public String getWebhookMethod() {
            return webhookMethod;
        }

        public void setWebhookMethod(String webhookMethod) {
            this.webhookMethod = webhookMethod;
        }

        public Map<String, String> getWebhookHeaders() {
            return webhookHeaders;
        }

        public void setWebhookHeaders(Map<String, String> webhookHeaders) {
            this.webhookHeaders = webhookHeaders;
        }

        public String getWebhookBodyTemplate() {
            return webhookBodyTemplate;
        }

        public void setWebhookBodyTemplate(String webhookBodyTemplate) {
            this.webhookBodyTemplate = webhookBodyTemplate;
        }
    }
}
