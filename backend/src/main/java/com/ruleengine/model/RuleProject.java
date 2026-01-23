package com.ruleengine.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rule_projects")
public class RuleProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Parent project (self-referential for project hierarchy)
    // When null, this is a top-level project
    // When set, this is a template within a project
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private RuleProject parentProject;

    // Support for multiple input schemas
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "project_input_schemas", joinColumns = @JoinColumn(name = "project_id"), inverseJoinColumns = @JoinColumn(name = "schema_id"))
    private List<Schema> inputSchemas = new ArrayList<>();

    // Support for multiple output schemas
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "project_output_schemas", joinColumns = @JoinColumn(name = "project_id"), inverseJoinColumns = @JoinColumn(name = "schema_id"))
    private List<Schema> outputSchemas = new ArrayList<>();

    // Allowed output action types for templates (comma-separated:
    // MODIFY,INSERT,LOG,WEBHOOK)
    // If null or empty, all action types are allowed
    @Column(name = "allowed_output_types")
    private String allowedOutputTypes;

    // ===== RuleSet-level Drools Parameters =====

    // Activation group - only one rule in this group can fire (highest salience
    // wins)
    // Applied to all rules in this RuleSet/template
    @Column(name = "activation_group")
    private String activationGroup;

    // Agenda group - rules are grouped, need explicit focus to fire
    @Column(name = "agenda_group")
    private String agendaGroup;

    // Auto-focus - automatically focus the agenda-group when a rule matches
    @Column(name = "auto_focus")
    private Boolean autoFocus;

    // Lock-on-active - when in an active agenda-group, rules won't re-fire on
    // modifications
    @Column(name = "lock_on_active")
    private Boolean lockOnActive;

    // We can define the relationship to rules here, or just keep it loose via
    // project_id on Rule
    // Keeping it bidirectional is useful for cascading deletes or easier retrieval
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = false)
    private List<Rule> rules = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public RuleProject() {
    }

    public RuleProject(String name, String description, List<Schema> inputSchemas, List<Schema> outputSchemas) {
        this.name = name;
        this.description = description;
        this.inputSchemas = inputSchemas != null ? inputSchemas : new ArrayList<>();
        this.outputSchemas = outputSchemas != null ? outputSchemas : new ArrayList<>();
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

    public List<Schema> getInputSchemas() {
        return inputSchemas;
    }

    public void setInputSchemas(List<Schema> inputSchemas) {
        this.inputSchemas = inputSchemas;
    }

    public List<Schema> getOutputSchemas() {
        return outputSchemas;
    }

    public void setOutputSchemas(List<Schema> outputSchemas) {
        this.outputSchemas = outputSchemas;
    }

    public List<Rule> getRules() {
        return rules;
    }

    public void setRules(List<Rule> rules) {
        this.rules = rules;
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

    public RuleProject getParentProject() {
        return parentProject;
    }

    public void setParentProject(RuleProject parentProject) {
        this.parentProject = parentProject;
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
}
