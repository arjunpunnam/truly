package com.ruleengine.model;

/**
 * Enum representing how a schema was imported/created.
 */
public enum SchemaSource {
    SWAGGER,      // Imported from OpenAPI/Swagger file
    JSON_SCHEMA,  // Imported from JSON Schema
    MANUAL        // Manually created in UI
}
