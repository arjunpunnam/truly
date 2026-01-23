package com.ruleengine.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity representing an object schema that rules can be authored against.
 * Schemas can be imported from Swagger/OpenAPI, JSON Schema, or manually
 * defined.
 */
@Entity
@Table(name = "schemas")
public class Schema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "\"group\"")
    private String group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private RuleProject project;

    @Column(nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SchemaSource source;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String jsonSchema;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String originalContent;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Schema() {
    }

    public Schema(Long id, String name, String description, String version, SchemaSource source, String jsonSchema,
            String originalContent, LocalDateTime createdAt, LocalDateTime updatedAt, String group,
            RuleProject project) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.version = version;
        this.source = source;
        this.jsonSchema = jsonSchema;
        this.originalContent = originalContent;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.group = group;
        this.project = project;
    }

    public static class SchemaBuilder {
        private Long id;
        private String name;
        private String description;
        private String group;
        private RuleProject project;
        private String version;
        private SchemaSource source;
        private String jsonSchema;
        private String originalContent;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public SchemaBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public SchemaBuilder name(String name) {
            this.name = name;
            return this;
        }

        public SchemaBuilder description(String description) {
            this.description = description;
            return this;
        }

        public SchemaBuilder group(String group) {
            this.group = group;
            return this;
        }

        public SchemaBuilder project(RuleProject project) {
            this.project = project;
            return this;
        }

        public SchemaBuilder version(String version) {
            this.version = version;
            return this;
        }

        public SchemaBuilder source(SchemaSource source) {
            this.source = source;
            return this;
        }

        public SchemaBuilder jsonSchema(String jsonSchema) {
            this.jsonSchema = jsonSchema;
            return this;
        }

        public SchemaBuilder originalContent(String originalContent) {
            this.originalContent = originalContent;
            return this;
        }

        public SchemaBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public SchemaBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Schema build() {
            return new Schema(id, name, description, version, source, jsonSchema, originalContent, createdAt,
                    updatedAt, group, project);
        }
    }

    public static SchemaBuilder builder() {
        return new SchemaBuilder();
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

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public SchemaSource getSource() {
        return source;
    }

    public void setSource(SchemaSource source) {
        this.source = source;
    }

    public String getJsonSchema() {
        return jsonSchema;
    }

    public void setJsonSchema(String jsonSchema) {
        this.jsonSchema = jsonSchema;
    }

    public String getOriginalContent() {
        return originalContent;
    }

    public void setOriginalContent(String originalContent) {
        this.originalContent = originalContent;
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

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public RuleProject getProject() {
        return project;
    }

    public void setProject(RuleProject project) {
        this.project = project;
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
