package com.ruleengine.dto;

import com.ruleengine.model.SchemaSource;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for schema responses.
 */
public class SchemaDto {

    private Long id;
    private String name;
    private String description;
    private String group;
    private Long projectId;
    private String version;
    private SchemaSource source;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SchemaPropertyDto> properties;
    private String jsonSchema;

    public SchemaDto() {
    }

    public SchemaDto(Long id, String name, String description, String group, Long projectId, String version, SchemaSource source,
            LocalDateTime createdAt, LocalDateTime updatedAt, List<SchemaPropertyDto> properties, String jsonSchema) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.group = group;
        this.projectId = projectId;
        this.version = version;
        this.source = source;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.properties = properties;
        this.jsonSchema = jsonSchema;
    }

    public static class SchemaDtoBuilder {
        private Long id;
        private String name;
        private String description;
        private String group;
        private Long projectId;
        private String version;
        private SchemaSource source;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<SchemaPropertyDto> properties;
        private String jsonSchema;

        public SchemaDtoBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public SchemaDtoBuilder name(String name) {
            this.name = name;
            return this;
        }

        public SchemaDtoBuilder description(String description) {
            this.description = description;
            return this;
        }

        public SchemaDtoBuilder group(String group) {
            this.group = group;
            return this;
        }

        public SchemaDtoBuilder projectId(Long projectId) {
            this.projectId = projectId;
            return this;
        }

        public SchemaDtoBuilder version(String version) {
            this.version = version;
            return this;
        }

        public SchemaDtoBuilder source(SchemaSource source) {
            this.source = source;
            return this;
        }

        public SchemaDtoBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public SchemaDtoBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public SchemaDtoBuilder properties(List<SchemaPropertyDto> properties) {
            this.properties = properties;
            return this;
        }

        public SchemaDtoBuilder jsonSchema(String jsonSchema) {
            this.jsonSchema = jsonSchema;
            return this;
        }

        public SchemaDto build() {
            return new SchemaDto(id, name, description, group, projectId, version, source, createdAt, updatedAt, properties, jsonSchema);
        }
    }

    public static SchemaDtoBuilder builder() {
        return new SchemaDtoBuilder();
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

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
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

    public List<SchemaPropertyDto> getProperties() {
        return properties;
    }

    public void setProperties(List<SchemaPropertyDto> properties) {
        this.properties = properties;
    }

    public String getJsonSchema() {
        return jsonSchema;
    }

    public void setJsonSchema(String jsonSchema) {
        this.jsonSchema = jsonSchema;
    }
}
