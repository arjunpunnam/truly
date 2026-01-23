package com.ruleengine.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ruleengine.dto.*;
import com.ruleengine.dto.AttributeImpactDto.AffectedRuleDto;
import com.ruleengine.dto.AttributeImpactDto.UsageDto;
import com.ruleengine.drools.DroolsService;
import com.ruleengine.drools.JsonToDrlTranspiler;
import com.ruleengine.model.Rule;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing schema attributes with impact analysis and rule
 * propagation.
 */
@Service
public class SchemaAttributeService {

    private static final Logger log = LoggerFactory.getLogger(SchemaAttributeService.class);

    private final SchemaRepository schemaRepository;
    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;
    private final JsonToDrlTranspiler transpiler;
    private final DroolsService droolsService;

    public SchemaAttributeService(SchemaRepository schemaRepository,
            RuleRepository ruleRepository,
            ObjectMapper objectMapper,
            JsonToDrlTranspiler transpiler,
            DroolsService droolsService) {
        this.schemaRepository = schemaRepository;
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
        this.transpiler = transpiler;
        this.droolsService = droolsService;
    }

    /**
     * Get all attributes for a schema.
     */
    public List<SchemaPropertyDto> getAttributes(Long schemaId) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        try {
            JsonNode schemaNode = objectMapper.readTree(schema.getJsonSchema());
            JsonNode propertiesNode = schemaNode.get("properties");

            if (propertiesNode == null || !propertiesNode.isObject()) {
                return Collections.emptyList();
            }

            List<SchemaPropertyDto> attributes = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = propertiesNode.fields();

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                SchemaPropertyDto prop = parseProperty(entry.getKey(), entry.getValue());
                attributes.add(prop);
            }

            return attributes;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse schema JSON for schema {}", schemaId, e);
            return Collections.emptyList();
        }
    }

    /**
     * Add a new attribute to a schema.
     */
    @Transactional
    public SchemaPropertyDto addAttribute(Long schemaId, SchemaPropertyDto attribute) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        try {
            ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schema.getJsonSchema());
            ObjectNode propertiesNode = (ObjectNode) schemaNode.get("properties");

            if (propertiesNode == null) {
                propertiesNode = objectMapper.createObjectNode();
                schemaNode.set("properties", propertiesNode);
            }

            // Check if attribute already exists
            if (propertiesNode.has(attribute.getName())) {
                throw new IllegalArgumentException("Attribute already exists: " + attribute.getName());
            }

            // Create the property node
            ObjectNode propNode = objectMapper.createObjectNode();
            propNode.put("type", mapToJsonSchemaType(attribute.getType()));

            if (attribute.getDescription() != null) {
                propNode.put("description", attribute.getDescription());
            }
            if (attribute.getFormat() != null) {
                propNode.put("format", attribute.getFormat());
            }
            if (attribute.getDefaultValue() != null) {
                propNode.putPOJO("default", attribute.getDefaultValue());
            }
            if (attribute.getEnumValues() != null && !attribute.getEnumValues().isEmpty()) {
                ArrayNode enumArray = objectMapper.createArrayNode();
                for (Object val : attribute.getEnumValues()) {
                    enumArray.addPOJO(val);
                }
                propNode.set("enum", enumArray);
            }

            propertiesNode.set(attribute.getName(), propNode);

            // Update required array if needed
            if (attribute.isRequired()) {
                ArrayNode requiredArray = schemaNode.has("required")
                        ? (ArrayNode) schemaNode.get("required")
                        : objectMapper.createArrayNode();
                requiredArray.add(attribute.getName());
                schemaNode.set("required", requiredArray);
            }

            schema.setJsonSchema(objectMapper.writeValueAsString(schemaNode));
            schemaRepository.save(schema);

            log.info("Added attribute '{}' to schema {}", attribute.getName(), schemaId);

            return attribute;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to update schema JSON", e);
        }
    }

    /**
     * Update an existing attribute in a schema.
     * This does NOT propagate changes to rules - call applyAttributeChange for
     * that.
     */
    @Transactional
    public SchemaPropertyDto updateAttribute(Long schemaId, String attributeName, SchemaPropertyDto updatedAttribute) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        try {
            ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schema.getJsonSchema());
            ObjectNode propertiesNode = (ObjectNode) schemaNode.get("properties");

            if (propertiesNode == null || !propertiesNode.has(attributeName)) {
                throw new EntityNotFoundException("Attribute not found: " + attributeName);
            }

            // Remove old attribute
            propertiesNode.remove(attributeName);

            // Add with new name/values
            String newName = updatedAttribute.getName() != null ? updatedAttribute.getName() : attributeName;

            ObjectNode propNode = objectMapper.createObjectNode();
            propNode.put("type", mapToJsonSchemaType(updatedAttribute.getType()));

            if (updatedAttribute.getDescription() != null) {
                propNode.put("description", updatedAttribute.getDescription());
            }
            if (updatedAttribute.getFormat() != null) {
                propNode.put("format", updatedAttribute.getFormat());
            }
            if (updatedAttribute.getDefaultValue() != null) {
                propNode.putPOJO("default", updatedAttribute.getDefaultValue());
            }
            if (updatedAttribute.getEnumValues() != null && !updatedAttribute.getEnumValues().isEmpty()) {
                ArrayNode enumArray = objectMapper.createArrayNode();
                for (Object val : updatedAttribute.getEnumValues()) {
                    enumArray.addPOJO(val);
                }
                propNode.set("enum", enumArray);
            }

            propertiesNode.set(newName, propNode);

            // Update required array
            if (schemaNode.has("required")) {
                ArrayNode requiredArray = (ArrayNode) schemaNode.get("required");
                ArrayNode newRequiredArray = objectMapper.createArrayNode();

                for (JsonNode req : requiredArray) {
                    if (!req.asText().equals(attributeName)) {
                        newRequiredArray.add(req);
                    }
                }

                if (updatedAttribute.isRequired()) {
                    newRequiredArray.add(newName);
                }

                schemaNode.set("required", newRequiredArray);
            } else if (updatedAttribute.isRequired()) {
                ArrayNode requiredArray = objectMapper.createArrayNode();
                requiredArray.add(newName);
                schemaNode.set("required", requiredArray);
            }

            schema.setJsonSchema(objectMapper.writeValueAsString(schemaNode));
            schemaRepository.save(schema);

            log.info("Updated attribute '{}' in schema {}", attributeName, schemaId);

            return updatedAttribute;
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to update schema JSON", e);
        }
    }

    /**
     * Delete an attribute from a schema.
     * This does NOT propagate changes to rules - call applyAttributeChange for
     * that.
     */
    @Transactional
    public void deleteAttribute(Long schemaId, String attributeName) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        try {
            ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schema.getJsonSchema());
            ObjectNode propertiesNode = (ObjectNode) schemaNode.get("properties");

            if (propertiesNode == null || !propertiesNode.has(attributeName)) {
                throw new EntityNotFoundException("Attribute not found: " + attributeName);
            }

            propertiesNode.remove(attributeName);

            // Update required array
            if (schemaNode.has("required")) {
                ArrayNode requiredArray = (ArrayNode) schemaNode.get("required");
                ArrayNode newRequiredArray = objectMapper.createArrayNode();

                for (JsonNode req : requiredArray) {
                    if (!req.asText().equals(attributeName)) {
                        newRequiredArray.add(req);
                    }
                }

                schemaNode.set("required", newRequiredArray);
            }

            schema.setJsonSchema(objectMapper.writeValueAsString(schemaNode));
            schemaRepository.save(schema);

            log.info("Deleted attribute '{}' from schema {}", attributeName, schemaId);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to update schema JSON", e);
        }
    }

    /**
     * Analyze the impact of changing or deleting an attribute.
     */
    @Transactional(readOnly = true)
    public AttributeImpactDto analyzeImpact(Long schemaId, String attributeName) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        List<Rule> rules = ruleRepository.findBySchemaId(schemaId);
        List<AffectedRuleDto> affectedRules = new ArrayList<>();

        for (Rule rule : rules) {
            List<UsageDto> usages = findAttributeUsages(rule, attributeName);

            if (!usages.isEmpty()) {
                String projectName = rule.getProject() != null ? rule.getProject().getName() : "Unknown";
                Long projectId = rule.getProject() != null ? rule.getProject().getId() : null;

                affectedRules.add(new AffectedRuleDto(
                        rule.getId(),
                        rule.getName(),
                        projectId,
                        projectName,
                        usages));
            }
        }

        // Determine risk level based on number of affected rules
        String riskLevel;
        if (affectedRules.isEmpty()) {
            riskLevel = "none";
        } else if (affectedRules.size() <= 2) {
            riskLevel = "low";
        } else if (affectedRules.size() <= 5) {
            riskLevel = "medium";
        } else {
            riskLevel = "high";
        }

        return AttributeImpactDto.builder()
                .attributeName(attributeName)
                .schemaName(schema.getName())
                .schemaId(schemaId)
                .affectedRules(affectedRules)
                .totalAffectedRules(affectedRules.size())
                .riskLevel(riskLevel)
                .build();
    }

    /**
     * Apply attribute changes and propagate to affected rules.
     */
    @Transactional
    public ApplyAttributeChangeResponse applyAttributeChange(Long schemaId, ApplyAttributeChangeRequest request) {
        Schema schema = schemaRepository.findById(schemaId)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + schemaId));

        if (!request.isConfirmPropagation()) {
            return ApplyAttributeChangeResponse.failure("Propagation not confirmed",
                    List.of("User must confirm propagation"));
        }

        List<Rule> rules = ruleRepository.findBySchemaId(schemaId);
        List<Long> updatedRuleIds = new ArrayList<>();
        List<Long> failedRuleIds = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        String changeType = request.getChangeType();
        String oldName = request.getOldName();
        String newName = request.getNewName();

        // Update the schema first
        try {
            switch (changeType) {
                case "rename":
                    renameAttributeInSchema(schema, oldName, newName);
                    break;
                case "delete":
                    deleteAttributeFromSchema(schema, oldName);
                    break;
                case "retype":
                    // Type change is handled by updateAttribute - just propagate to rules
                    break;
            }
        } catch (Exception e) {
            return ApplyAttributeChangeResponse.failure("Failed to update schema: " + e.getMessage(),
                    List.of(e.getMessage()));
        }

        // Propagate changes to rules
        for (Rule rule : rules) {
            try {
                boolean ruleModified = false;

                switch (changeType) {
                    case "rename":
                        ruleModified = renameAttributeInRule(rule, oldName, newName);
                        break;
                    case "delete":
                        ruleModified = removeAttributeFromRule(rule, oldName);
                        break;
                    case "retype":
                        // For type changes, we just regenerate DRL
                        ruleModified = hasAttributeUsage(rule, oldName);
                        break;
                }

                if (ruleModified) {
                    // Regenerate DRL
                    regenerateDrl(rule, schema);
                    ruleRepository.save(rule);
                    updatedRuleIds.add(rule.getId());
                }
            } catch (Exception e) {
                log.error("Failed to update rule {}: {}", rule.getId(), e.getMessage());
                failedRuleIds.add(rule.getId());
                errors.add("Rule " + rule.getId() + " (" + rule.getName() + "): " + e.getMessage());
            }
        }

        // Invalidate Drools cache
        droolsService.invalidateCache(schemaId);

        if (failedRuleIds.isEmpty()) {
            String message = updatedRuleIds.isEmpty()
                    ? "No rules required updates"
                    : "Successfully updated " + updatedRuleIds.size() + " rule(s)";
            return ApplyAttributeChangeResponse.success(message, updatedRuleIds);
        } else {
            return ApplyAttributeChangeResponse.partial(
                    "Partially completed: " + updatedRuleIds.size() + " updated, " + failedRuleIds.size() + " failed",
                    updatedRuleIds, failedRuleIds, errors);
        }
    }

    // ==================== Private Helper Methods ====================

    private SchemaPropertyDto parseProperty(String name, JsonNode propNode) {
        SchemaPropertyDto.SchemaPropertyDtoBuilder builder = SchemaPropertyDto.builder()
                .name(name)
                .path(name);

        if (propNode.has("type")) {
            builder.type(propNode.get("type").asText());
        }
        if (propNode.has("format")) {
            builder.format(propNode.get("format").asText());
        }
        if (propNode.has("description")) {
            builder.description(propNode.get("description").asText());
        }
        if (propNode.has("default")) {
            builder.defaultValue(objectMapper.convertValue(propNode.get("default"), Object.class));
        }
        if (propNode.has("enum")) {
            List<Object> enumValues = new ArrayList<>();
            for (JsonNode val : propNode.get("enum")) {
                enumValues.add(objectMapper.convertValue(val, Object.class));
            }
            builder.enumValues(enumValues);
        }

        return builder.build();
    }

    private String mapToJsonSchemaType(String type) {
        if (type == null)
            return "string";

        switch (type.toLowerCase()) {
            case "integer":
            case "int":
                return "integer";
            case "number":
            case "double":
            case "float":
            case "decimal":
                return "number";
            case "boolean":
            case "bool":
                return "boolean";
            case "array":
                return "array";
            case "object":
                return "object";
            default:
                return "string";
        }
    }

    private List<UsageDto> findAttributeUsages(Rule rule, String attributeName) {
        List<UsageDto> usages = new ArrayList<>();

        try {
            if (rule.getRuleJson() == null || rule.getRuleJson().isEmpty()) {
                return usages;
            }

            JsonNode ruleNode = objectMapper.readTree(rule.getRuleJson());

            // Check conditions
            JsonNode conditionsNode = ruleNode.get("conditions");
            if (conditionsNode != null) {
                findAttributeInConditions(conditionsNode, attributeName, usages);
            }

            // Check actions
            JsonNode actionsNode = ruleNode.get("actions");
            if (actionsNode != null && actionsNode.isArray()) {
                for (JsonNode action : actionsNode) {
                    if (action.has("targetField")) {
                        String targetField = action.get("targetField").asText();
                        if (targetField.equals(attributeName) || targetField.startsWith(attributeName + ".")) {
                            String actionType = action.has("type") ? action.get("type").asText() : "MODIFY";
                            usages.add(new UsageDto("action", actionType + " " + targetField));
                        }
                    }
                }
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse rule JSON for rule {}", rule.getId());
        }

        return usages;
    }

    private void findAttributeInConditions(JsonNode conditionsNode, String attributeName, List<UsageDto> usages) {
        if (conditionsNode.has("conditions") && conditionsNode.get("conditions").isArray()) {
            for (JsonNode condition : conditionsNode.get("conditions")) {
                if (condition.has("fact")) {
                    String fact = condition.get("fact").asText();
                    if (fact.equals(attributeName) || fact.startsWith(attributeName + ".")) {
                        String operator = condition.has("operator") ? condition.get("operator").asText() : "equals";
                        Object value = condition.has("value") ? condition.get("value") : "";
                        usages.add(new UsageDto("condition", fact + " " + operator + " " + value));
                    }
                }

                // Check nested conditions
                if (condition.has("nested")) {
                    findAttributeInConditions(condition.get("nested"), attributeName, usages);
                }
            }
        }
    }

    private boolean hasAttributeUsage(Rule rule, String attributeName) {
        return !findAttributeUsages(rule, attributeName).isEmpty();
    }

    private void renameAttributeInSchema(Schema schema, String oldName, String newName) throws JsonProcessingException {
        ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schema.getJsonSchema());
        ObjectNode propertiesNode = (ObjectNode) schemaNode.get("properties");

        if (propertiesNode != null && propertiesNode.has(oldName)) {
            JsonNode propValue = propertiesNode.get(oldName);
            propertiesNode.remove(oldName);
            propertiesNode.set(newName, propValue);

            // Update required array
            if (schemaNode.has("required")) {
                ArrayNode requiredArray = (ArrayNode) schemaNode.get("required");
                ArrayNode newRequiredArray = objectMapper.createArrayNode();

                for (JsonNode req : requiredArray) {
                    if (req.asText().equals(oldName)) {
                        newRequiredArray.add(newName);
                    } else {
                        newRequiredArray.add(req);
                    }
                }

                schemaNode.set("required", newRequiredArray);
            }

            schema.setJsonSchema(objectMapper.writeValueAsString(schemaNode));
            schemaRepository.save(schema);
        }
    }

    private void deleteAttributeFromSchema(Schema schema, String attrName) throws JsonProcessingException {
        ObjectNode schemaNode = (ObjectNode) objectMapper.readTree(schema.getJsonSchema());
        ObjectNode propertiesNode = (ObjectNode) schemaNode.get("properties");

        if (propertiesNode != null && propertiesNode.has(attrName)) {
            propertiesNode.remove(attrName);

            // Update required array
            if (schemaNode.has("required")) {
                ArrayNode requiredArray = (ArrayNode) schemaNode.get("required");
                ArrayNode newRequiredArray = objectMapper.createArrayNode();

                for (JsonNode req : requiredArray) {
                    if (!req.asText().equals(attrName)) {
                        newRequiredArray.add(req);
                    }
                }

                schemaNode.set("required", newRequiredArray);
            }

            schema.setJsonSchema(objectMapper.writeValueAsString(schemaNode));
            schemaRepository.save(schema);
        }
    }

    private boolean renameAttributeInRule(Rule rule, String oldName, String newName) throws JsonProcessingException {
        if (rule.getRuleJson() == null || rule.getRuleJson().isEmpty()) {
            return false;
        }

        ObjectNode ruleNode = (ObjectNode) objectMapper.readTree(rule.getRuleJson());
        boolean modified = false;

        // Update conditions
        if (ruleNode.has("conditions")) {
            modified |= renameInConditions((ObjectNode) ruleNode.get("conditions"), oldName, newName);
        }

        // Update actions
        if (ruleNode.has("actions") && ruleNode.get("actions").isArray()) {
            ArrayNode actions = (ArrayNode) ruleNode.get("actions");
            for (int i = 0; i < actions.size(); i++) {
                ObjectNode action = (ObjectNode) actions.get(i);
                if (action.has("targetField")) {
                    String targetField = action.get("targetField").asText();
                    if (targetField.equals(oldName)) {
                        action.put("targetField", newName);
                        modified = true;
                    } else if (targetField.startsWith(oldName + ".")) {
                        action.put("targetField", newName + targetField.substring(oldName.length()));
                        modified = true;
                    }
                }
            }
        }

        if (modified) {
            rule.setRuleJson(objectMapper.writeValueAsString(ruleNode));
        }

        return modified;
    }

    private boolean renameInConditions(ObjectNode conditionsNode, String oldName, String newName) {
        boolean modified = false;

        if (conditionsNode.has("conditions") && conditionsNode.get("conditions").isArray()) {
            ArrayNode conditions = (ArrayNode) conditionsNode.get("conditions");

            for (int i = 0; i < conditions.size(); i++) {
                ObjectNode condition = (ObjectNode) conditions.get(i);

                if (condition.has("fact")) {
                    String fact = condition.get("fact").asText();
                    if (fact.equals(oldName)) {
                        condition.put("fact", newName);
                        modified = true;
                    } else if (fact.startsWith(oldName + ".")) {
                        condition.put("fact", newName + fact.substring(oldName.length()));
                        modified = true;
                    }
                }

                // Handle nested conditions
                if (condition.has("nested")) {
                    modified |= renameInConditions((ObjectNode) condition.get("nested"), oldName, newName);
                }
            }
        }

        return modified;
    }

    private boolean removeAttributeFromRule(Rule rule, String attrName) throws JsonProcessingException {
        if (rule.getRuleJson() == null || rule.getRuleJson().isEmpty()) {
            return false;
        }

        ObjectNode ruleNode = (ObjectNode) objectMapper.readTree(rule.getRuleJson());
        boolean modified = false;

        // Remove from conditions
        if (ruleNode.has("conditions")) {
            modified |= removeFromConditions((ObjectNode) ruleNode.get("conditions"), attrName);
        }

        // Remove from actions
        if (ruleNode.has("actions") && ruleNode.get("actions").isArray()) {
            ArrayNode actions = (ArrayNode) ruleNode.get("actions");
            ArrayNode newActions = objectMapper.createArrayNode();

            for (JsonNode action : actions) {
                ObjectNode actionObj = (ObjectNode) action;
                if (actionObj.has("targetField")) {
                    String targetField = actionObj.get("targetField").asText();
                    if (targetField.equals(attrName) || targetField.startsWith(attrName + ".")) {
                        modified = true;
                        continue; // Skip this action
                    }
                }
                newActions.add(action);
            }

            if (modified) {
                ruleNode.set("actions", newActions);
            }
        }

        if (modified) {
            rule.setRuleJson(objectMapper.writeValueAsString(ruleNode));
        }

        return modified;
    }

    private boolean removeFromConditions(ObjectNode conditionsNode, String attrName) {
        boolean modified = false;

        if (conditionsNode.has("conditions") && conditionsNode.get("conditions").isArray()) {
            ArrayNode conditions = (ArrayNode) conditionsNode.get("conditions");
            ArrayNode newConditions = objectMapper.createArrayNode();

            for (JsonNode condition : conditions) {
                ObjectNode condObj = (ObjectNode) condition;

                if (condObj.has("fact")) {
                    String fact = condObj.get("fact").asText();
                    if (fact.equals(attrName) || fact.startsWith(attrName + ".")) {
                        modified = true;
                        continue; // Skip this condition
                    }
                }

                // Handle nested conditions
                if (condObj.has("nested")) {
                    modified |= removeFromConditions((ObjectNode) condObj.get("nested"), attrName);
                }

                newConditions.add(condition);
            }

            if (modified) {
                conditionsNode.set("conditions", newConditions);
            }
        }

        return modified;
    }

    private void regenerateDrl(Rule rule, Schema schema) throws JsonProcessingException {
        RuleDefinition definition = objectMapper.readValue(rule.getRuleJson(), RuleDefinition.class);
        String drl = transpiler.transpile(definition, "com.ruleengine.generated", schema.getName());

        // Validate DRL
        List<String> errors = droolsService.validateDrl(drl);
        boolean hasErrors = errors.stream().anyMatch(e -> e.startsWith("ERROR"));

        if (hasErrors) {
            throw new RuntimeException("Invalid DRL after propagation: " + String.join("\n", errors));
        }

        rule.setGeneratedDrl(drl);
    }
}
