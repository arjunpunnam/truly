package com.ruleengine.dto;

import java.util.List;
import java.util.Map;

/**
 * Request DTO for executing rules.
 */
public class ExecuteRulesRequest {

    private Long schemaId;
    private List<Long> ruleIds;
    private List<Map<String, Object>> facts;
    private boolean dryRun;

    public ExecuteRulesRequest() {
    }

    public ExecuteRulesRequest(Long schemaId, List<Long> ruleIds, List<Map<String, Object>> facts, boolean dryRun) {
        this.schemaId = schemaId;
        this.ruleIds = ruleIds;
        this.facts = facts;
        this.dryRun = dryRun;
    }

    public static class ExecuteRulesRequestBuilder {
        private Long schemaId;
        private List<Long> ruleIds;
        private List<Map<String, Object>> facts;
        private boolean dryRun;

        public ExecuteRulesRequestBuilder schemaId(Long schemaId) {
            this.schemaId = schemaId;
            return this;
        }

        public ExecuteRulesRequestBuilder ruleIds(List<Long> ruleIds) {
            this.ruleIds = ruleIds;
            return this;
        }

        public ExecuteRulesRequestBuilder facts(List<Map<String, Object>> facts) {
            this.facts = facts;
            return this;
        }

        public ExecuteRulesRequestBuilder dryRun(boolean dryRun) {
            this.dryRun = dryRun;
            return this;
        }

        public ExecuteRulesRequest build() {
            return new ExecuteRulesRequest(schemaId, ruleIds, facts, dryRun);
        }
    }

    public static ExecuteRulesRequestBuilder builder() {
        return new ExecuteRulesRequestBuilder();
    }

    public Long getSchemaId() {
        return schemaId;
    }

    public void setSchemaId(Long schemaId) {
        this.schemaId = schemaId;
    }

    public List<Long> getRuleIds() {
        return ruleIds;
    }

    public void setRuleIds(List<Long> ruleIds) {
        this.ruleIds = ruleIds;
    }

    public List<Map<String, Object>> getFacts() {
        return facts;
    }

    public void setFacts(List<Map<String, Object>> facts) {
        this.facts = facts;
    }

    public boolean isDryRun() {
        return dryRun;
    }

    public void setDryRun(boolean dryRun) {
        this.dryRun = dryRun;
    }
}
