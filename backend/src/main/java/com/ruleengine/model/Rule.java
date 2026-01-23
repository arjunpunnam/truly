package com.ruleengine.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity representing a business rule.
 * Rules are stored as JSON and can be transpiled to DRL for Drools execution.
 */
@Entity
@Table(name = "rules")
public class Rule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id", nullable = false)
    private Schema schema;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private RuleProject project;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String ruleJson;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String generatedDrl;

    @Column(nullable = false)
    private boolean enabled = true;

    private int priority = 0;

    private String category;

    // ===== Rule-level Drools Parameters =====

    // Rule-specific activation group (overrides RuleSet level)
    @Column(name = "activation_group")
    private String activationGroup;

    // Lock-on-active - rule won't re-fire on modifications when in active
    // agenda-group
    @Column(name = "lock_on_active")
    private Boolean lockOnActive;

    // Date when rule becomes effective (ISO format: 2026-01-01)
    @Column(name = "date_effective")
    private String dateEffective;

    // Date when rule expires (ISO format: 2026-12-31)
    @Column(name = "date_expires")
    private String dateExpires;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Rule() {
    }

    public Rule(Long id, String name, String description, Schema schema, RuleProject project, String ruleJson,
            String generatedDrl,
            boolean enabled, int priority, String category, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.schema = schema;
        this.project = project;
        this.ruleJson = ruleJson;
        this.generatedDrl = generatedDrl;
        this.enabled = enabled;
        this.priority = priority;
        this.category = category;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public RuleProject getProject() {
        return project;
    }

    public void setProject(RuleProject project) {
        this.project = project;
    }

    public static class RuleBuilder {
        private Long id;
        private String name;
        private String description;
        private Schema schema;
        private RuleProject project;
        private String ruleJson;
        private String generatedDrl;
        private boolean enabled = true;
        private int priority = 0;
        private String category;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public RuleBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public RuleBuilder name(String name) {
            this.name = name;
            return this;
        }

        public RuleBuilder description(String description) {
            this.description = description;
            return this;
        }

        public RuleBuilder schema(Schema schema) {
            this.schema = schema;
            return this;
        }

        public RuleBuilder project(RuleProject project) {
            this.project = project;
            return this;
        }

        public RuleBuilder ruleJson(String ruleJson) {
            this.ruleJson = ruleJson;
            return this;
        }

        public RuleBuilder generatedDrl(String generatedDrl) {
            this.generatedDrl = generatedDrl;
            return this;
        }

        public RuleBuilder enabled(boolean enabled) {
            this.enabled = enabled;
            return this;
        }

        public RuleBuilder priority(int priority) {
            this.priority = priority;
            return this;
        }

        public RuleBuilder category(String category) {
            this.category = category;
            return this;
        }

        public RuleBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public RuleBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Rule build() {
            return new Rule(id, name, description, schema, project, ruleJson, generatedDrl, enabled, priority, category,
                    createdAt, updatedAt);
        }
    }

    public static RuleBuilder builder() {
        return new RuleBuilder();
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

    public Schema getSchema() {
        return schema;
    }

    public void setSchema(Schema schema) {
        this.schema = schema;
    }

    public String getRuleJson() {
        return ruleJson;
    }

    public void setRuleJson(String ruleJson) {
        this.ruleJson = ruleJson;
    }

    public String getGeneratedDrl() {
        return generatedDrl;
    }

    public void setGeneratedDrl(String generatedDrl) {
        this.generatedDrl = generatedDrl;
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

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
