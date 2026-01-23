package com.ruleengine.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.RuleDefinition;
import com.ruleengine.dto.RuleDefinition.Condition;
import com.ruleengine.dto.RuleDefinition.ConditionGroup;
import com.ruleengine.model.Rule;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleRepository;

import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Service to generate sample payloads that satisfy rule conditions.
 * Used for the "Match This Rule" testing feature.
 */
@Service
public class RuleMatchPayloadGenerator {

    private static final Logger log = LoggerFactory.getLogger(RuleMatchPayloadGenerator.class);

    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    public RuleMatchPayloadGenerator(RuleRepository ruleRepository,
            ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Generate a sample payload that would satisfy the given rule's conditions.
     * 
     * @param ruleId The rule ID
     * @return A map representing the sample payload
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateMatchingPayload(Long ruleId) {
        Rule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + ruleId));

        Map<String, Object> payload = new HashMap<>();

        // Get the schema to understand field types
        Schema schema = rule.getSchema();
        Map<String, String> fieldTypes = parseSchemaFieldTypes(schema);

        // Parse the rule's conditions
        if (rule.getRuleJson() != null) {
            try {
                RuleDefinition definition = objectMapper.readValue(rule.getRuleJson(), RuleDefinition.class);
                if (definition.getConditions() != null) {
                    processConditionGroup(definition.getConditions(), payload, fieldTypes);
                }
            } catch (JsonProcessingException e) {
                log.error("Failed to parse rule definition for rule {}", ruleId, e);
            }
        }

        return payload;
    }

    /**
     * Parse schema to extract field types.
     */
    private Map<String, String> parseSchemaFieldTypes(Schema schema) {
        Map<String, String> fieldTypes = new HashMap<>();
        if (schema == null || schema.getJsonSchema() == null) {
            return fieldTypes;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> schemaJson = objectMapper.readValue(schema.getJsonSchema(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> properties = (Map<String, Object>) schemaJson.get("properties");

            if (properties != null) {
                for (Map.Entry<String, Object> entry : properties.entrySet()) {
                    String fieldName = entry.getKey();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> fieldDef = (Map<String, Object>) entry.getValue();
                    String type = (String) fieldDef.get("type");
                    fieldTypes.put(fieldName, type != null ? type : "string");

                    // Handle nested properties
                    @SuppressWarnings("unchecked")
                    Map<String, Object> nestedProps = (Map<String, Object>) fieldDef.get("properties");
                    if (nestedProps != null) {
                        for (Map.Entry<String, Object> nestedEntry : nestedProps.entrySet()) {
                            String nestedPath = fieldName + "." + nestedEntry.getKey();
                            @SuppressWarnings("unchecked")
                            Map<String, Object> nestedFieldDef = (Map<String, Object>) nestedEntry.getValue();
                            String nestedType = (String) nestedFieldDef.get("type");
                            fieldTypes.put(nestedPath, nestedType != null ? nestedType : "string");
                        }
                    }
                }
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse schema: {}", e.getMessage());
        }

        return fieldTypes;
    }

    /**
     * Process a condition group and add matching values to the payload.
     */
    private void processConditionGroup(ConditionGroup group, Map<String, Object> payload,
            Map<String, String> fieldTypes) {
        if (group == null || group.getConditions() == null) {
            return;
        }

        for (Condition condition : group.getConditions()) {
            if (condition.getNested() != null) {
                // Recursively process nested condition groups
                processConditionGroup(condition.getNested(), payload, fieldTypes);
            } else if (condition.getFact() != null && condition.getOperator() != null) {
                // Generate a value that satisfies this condition
                Object matchingValue = generateMatchingValue(condition, fieldTypes);
                if (matchingValue != null) {
                    setNestedValue(payload, condition.getFact(), matchingValue);
                }
            }
        }
    }

    /**
     * Generate a value that would satisfy the given condition.
     */
    private Object generateMatchingValue(Condition condition, Map<String, String> fieldTypes) {
        String operator = condition.getOperator();
        Object conditionValue = condition.getValue();
        String fact = condition.getFact();

        // Sanitize the fact path (remove type prefix if present)
        String fieldPath = sanitizePath(fact);
        String fieldType = fieldTypes.getOrDefault(fieldPath, "string");

        switch (operator) {
            case "equals":
                // Use the exact value from the condition
                return conditionValue;

            case "notEquals":
                // Generate a different value
                return generateDifferentValue(conditionValue, fieldType);

            case "greaterThan":
                // Generate a value greater than the condition value
                if (conditionValue instanceof Number) {
                    return ((Number) conditionValue).doubleValue() + 1;
                }
                return conditionValue;

            case "greaterThanOrEquals":
                // Use the exact value or slightly more
                return conditionValue;

            case "lessThan":
                // Generate a value less than the condition value
                if (conditionValue instanceof Number) {
                    return ((Number) conditionValue).doubleValue() - 1;
                }
                return conditionValue;

            case "lessThanOrEquals":
                // Use the exact value
                return conditionValue;

            case "contains":
                // If checking if field contains value, use the value as the field content
                return conditionValue;

            case "startsWith":
                // Return a string that starts with the value
                return conditionValue + "_test";

            case "endsWith":
                // Return a string that ends with the value
                return "test_" + conditionValue;

            case "matches":
                // Return the pattern itself as a base (user may need to adjust)
                return String.valueOf(conditionValue).replaceAll("[.*+?^${}()|\\[\\]\\\\]", "");

            case "isNull":
                return null;

            case "isNotNull":
                // Generate a default value based on type
                return generateDefaultValue(fieldType);

            case "memberOf":
                // Return the first element of the collection if it's a collection
                if (conditionValue instanceof java.util.Collection) {
                    var iterator = ((java.util.Collection<?>) conditionValue).iterator();
                    if (iterator.hasNext()) {
                        return iterator.next();
                    }
                }
                return conditionValue;

            default:
                // For unknown operators, try to use the condition value
                return conditionValue;
        }
    }

    /**
     * Generate a value different from the given value.
     */
    private Object generateDifferentValue(Object value, String fieldType) {
        if (value == null) {
            return generateDefaultValue(fieldType);
        }

        if (value instanceof Number) {
            return ((Number) value).doubleValue() + 100;
        } else if (value instanceof Boolean) {
            return !((Boolean) value);
        } else if (value instanceof String) {
            return value + "_different";
        }

        return "different_value";
    }

    /**
     * Generate a default value based on field type.
     */
    private Object generateDefaultValue(String fieldType) {
        if (fieldType == null) {
            return "sample_value";
        }

        switch (fieldType.toLowerCase()) {
            case "integer":
            case "number":
                return 100;
            case "boolean":
                return true;
            case "array":
                return new Object[0];
            case "object":
                return new HashMap<>();
            case "string":
            default:
                return "sample_value";
        }
    }

    /**
     * Set a value at a nested path in the payload.
     * E.g., "customer.address.city" -> payload.customer.address.city = value
     */
    @SuppressWarnings("unchecked")
    private void setNestedValue(Map<String, Object> payload, String path, Object value) {
        // Remove type prefix if present (e.g., "Order.status" -> "status")
        String sanitizedPath = sanitizePath(path);

        String[] parts = sanitizedPath.split("\\.");
        Map<String, Object> current = payload;

        for (int i = 0; i < parts.length - 1; i++) {
            String part = parts[i];
            if (!current.containsKey(part)) {
                current.put(part, new HashMap<String, Object>());
            }
            Object next = current.get(part);
            if (next instanceof Map) {
                current = (Map<String, Object>) next;
            } else {
                // Path conflict, can't set nested value
                return;
            }
        }

        current.put(parts[parts.length - 1], value);
    }

    /**
     * Sanitize path by removing type prefix.
     */
    private String sanitizePath(String path) {
        if (path == null || path.isEmpty()) {
            return path;
        }

        String[] parts = path.split("\\.");
        if (parts.length > 1 && parts[0] != null && !parts[0].isEmpty() &&
                Character.isUpperCase(parts[0].charAt(0))) {
            // Remove the type prefix
            return path.substring(parts[0].length() + 1);
        }

        return path;
    }
}
