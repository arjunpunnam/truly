package com.ruleengine.dto;

import java.util.List;
import java.util.Map;

/**
 * DTO representing a schema property for the object tree.
 */
public class SchemaPropertyDto {

    private String name;
    private String path;
    private String type;
    private String format;
    private String description;
    private boolean required;
    private List<SchemaPropertyDto> properties;
    private SchemaPropertyDto items;
    private SchemaPropertyDto additionalProperties;
    private List<Object> enumValues;
    private Object defaultValue;
    private Map<String, Object> constraints;

    public SchemaPropertyDto() {
    }

    public SchemaPropertyDto(String name, String path, String type, String format, String description, boolean required,
            List<SchemaPropertyDto> properties, SchemaPropertyDto items, SchemaPropertyDto additionalProperties,
            List<Object> enumValues, Object defaultValue, Map<String, Object> constraints) {
        this.name = name;
        this.path = path;
        this.type = type;
        this.format = format;
        this.description = description;
        this.required = required;
        this.properties = properties;
        this.items = items;
        this.additionalProperties = additionalProperties;
        this.enumValues = enumValues;
        this.defaultValue = defaultValue;
        this.constraints = constraints;
    }

    public static class SchemaPropertyDtoBuilder {
        private String name;
        private String path;
        private String type;
        private String format;
        private String description;
        private boolean required;
        private List<SchemaPropertyDto> properties;
        private SchemaPropertyDto items;
        private SchemaPropertyDto additionalProperties;
        private List<Object> enumValues;
        private Object defaultValue;
        private Map<String, Object> constraints;

        public SchemaPropertyDtoBuilder name(String name) {
            this.name = name;
            return this;
        }

        public SchemaPropertyDtoBuilder path(String path) {
            this.path = path;
            return this;
        }

        public SchemaPropertyDtoBuilder type(String type) {
            this.type = type;
            return this;
        }

        public SchemaPropertyDtoBuilder format(String format) {
            this.format = format;
            return this;
        }

        public SchemaPropertyDtoBuilder description(String description) {
            this.description = description;
            return this;
        }

        public SchemaPropertyDtoBuilder required(boolean required) {
            this.required = required;
            return this;
        }

        public SchemaPropertyDtoBuilder properties(List<SchemaPropertyDto> properties) {
            this.properties = properties;
            return this;
        }

        public SchemaPropertyDtoBuilder items(SchemaPropertyDto items) {
            this.items = items;
            return this;
        }

        public SchemaPropertyDtoBuilder additionalProperties(SchemaPropertyDto additionalProperties) {
            this.additionalProperties = additionalProperties;
            return this;
        }

        public SchemaPropertyDtoBuilder enumValues(List<Object> enumValues) {
            this.enumValues = enumValues;
            return this;
        }

        public SchemaPropertyDtoBuilder defaultValue(Object defaultValue) {
            this.defaultValue = defaultValue;
            return this;
        }

        public SchemaPropertyDtoBuilder constraints(Map<String, Object> constraints) {
            this.constraints = constraints;
            return this;
        }

        public SchemaPropertyDto build() {
            return new SchemaPropertyDto(name, path, type, format, description, required, properties, items,
                    additionalProperties, enumValues, defaultValue, constraints);
        }
    }

    public static SchemaPropertyDtoBuilder builder() {
        return new SchemaPropertyDtoBuilder();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public List<SchemaPropertyDto> getProperties() {
        return properties;
    }

    public void setProperties(List<SchemaPropertyDto> properties) {
        this.properties = properties;
    }

    public SchemaPropertyDto getItems() {
        return items;
    }

    public void setItems(SchemaPropertyDto items) {
        this.items = items;
    }

    public SchemaPropertyDto getAdditionalProperties() {
        return additionalProperties;
    }

    public void setAdditionalProperties(SchemaPropertyDto additionalProperties) {
        this.additionalProperties = additionalProperties;
    }

    public List<Object> getEnumValues() {
        return enumValues;
    }

    public void setEnumValues(List<Object> enumValues) {
        this.enumValues = enumValues;
    }

    public Object getDefaultValue() {
        return defaultValue;
    }

    public void setDefaultValue(Object defaultValue) {
        this.defaultValue = defaultValue;
    }

    public Map<String, Object> getConstraints() {
        return constraints;
    }

    public void setConstraints(Map<String, Object> constraints) {
        this.constraints = constraints;
    }
}
