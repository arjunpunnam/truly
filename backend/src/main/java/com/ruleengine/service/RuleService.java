package com.ruleengine.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.*;
import com.ruleengine.drools.DroolsService;
import com.ruleengine.drools.DynamicFact;
import com.ruleengine.drools.JsonToDrlTranspiler;
import com.ruleengine.model.Rule;
import com.ruleengine.model.RuleAuditLog;
import com.ruleengine.model.RuleProject;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.RuleAuditLogRepository;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.JsonNode;

@Service
@Transactional
public class RuleService {

    private static final Logger log = LoggerFactory.getLogger(RuleService.class);
    private final RuleRepository ruleRepository;
    private final SchemaRepository schemaRepository;
    private final RuleProjectRepository projectRepository;
    private final RuleAuditLogRepository auditLogRepository;
    private final JsonToDrlTranspiler transpiler;
    private final DroolsService droolsService;
    private final ObjectMapper objectMapper;

    public RuleService(RuleRepository ruleRepository,
            SchemaRepository schemaRepository,
            RuleProjectRepository projectRepository,
            RuleAuditLogRepository auditLogRepository,
            JsonToDrlTranspiler transpiler,
            DroolsService droolsService,
            ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.schemaRepository = schemaRepository;
        this.projectRepository = projectRepository;
        this.auditLogRepository = auditLogRepository;
        this.transpiler = transpiler;
        this.droolsService = droolsService;
        this.objectMapper = objectMapper;
    }

    /**
     * Create a new rule.
     */
    public RuleDto createRule(RuleDefinition definition) {
        Schema schema = schemaRepository.findById(definition.getSchemaId())
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + definition.getSchemaId()));

        RuleProject project = null;
        if (definition.getProjectId() != null) {
            project = projectRepository.findById(definition.getProjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + definition.getProjectId()));

            // Validate schema matches project input
            // Validate schema matches project input.
            // Using first schema for now, logic may need expansion for multi-schema if
            // rules can target specific schemas
            boolean match = project.getInputSchemas().stream()
                    .anyMatch(s -> s.getId().equals(schema.getId()));
            if (!match) {
                throw new IllegalArgumentException("Rule schema must match project input schema");
            }
        }

        try {
            // Validate condition values match schema property types
            validateConditionValues(definition.getConditions(), schema);

            String ruleJson = objectMapper.writeValueAsString(definition);

            // Transpile to DRL
            String drl = transpiler.transpile(definition, "com.ruleengine.generated", schema.getName());

            // Validate DRL
            List<String> errors = droolsService.validateDrl(drl);
            boolean hasErrors = errors.stream().anyMatch(e -> e.startsWith("ERROR"));
            if (hasErrors) {
                throw new RuntimeException("Invalid rule DRL:\n" + String.join("\n", errors));
            }

            Rule rule = Rule.builder()
                    .name(definition.getName())
                    .description(definition.getDescription())
                    .schema(schema)
                    .project(project)
                    .ruleJson(ruleJson)
                    .generatedDrl(drl)
                    .enabled(definition.isEnabled())
                    .priority(definition.getPriority())
                    .category(definition.getCategory())
                    .build();

            rule = ruleRepository.save(rule);
            droolsService.invalidateCache(schema.getId());

            return toDto(rule);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize rule", e);
        }
    }

    /**
     * Update an existing rule.
     */
    public RuleDto updateRule(Long id, RuleDefinition definition) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));

        Schema schema = rule.getSchema();

        // Validate condition values match schema property types
        validateConditionValues(definition.getConditions(), schema);
        if (definition.getSchemaId() != null && !definition.getSchemaId().equals(schema.getId())) {
            schema = schemaRepository.findById(definition.getSchemaId())
                    .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + definition.getSchemaId()));
            rule.setSchema(schema);
        }

        try {
            String ruleJson = objectMapper.writeValueAsString(definition);
            String drl = transpiler.transpile(definition, "com.ruleengine.generated", schema.getName());

            // Validate DRL
            List<String> errors = droolsService.validateDrl(drl);
            boolean hasErrors = errors.stream().anyMatch(e -> e.startsWith("ERROR"));
            if (hasErrors) {
                throw new RuntimeException("Invalid rule DRL:\n" + String.join("\n", errors));
            }

            rule.setName(definition.getName());
            rule.setDescription(definition.getDescription());
            rule.setRuleJson(ruleJson);
            rule.setGeneratedDrl(drl);
            rule.setEnabled(definition.isEnabled());
            rule.setPriority(definition.getPriority());
            rule.setCategory(definition.getCategory());

            rule = ruleRepository.save(rule);
            droolsService.invalidateCache(schema.getId());

            return toDto(rule);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize rule", e);
        }
    }

    /**
     * Get all rules.
     */
    @Transactional(readOnly = true)
    public List<RuleDto> getAllRules() {
        return ruleRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get rules by schema.
     */
    @Transactional(readOnly = true)
    public List<RuleDto> getRulesBySchema(Long schemaId) {
        return ruleRepository.findBySchemaId(schemaId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get rules by project.
     */
    @Transactional(readOnly = true)
    public List<RuleDto> getRulesByProject(Long projectId) {
        return ruleRepository.findByProjectId(projectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get a rule by ID.
     */
    @Transactional(readOnly = true)
    public RuleDto getRule(Long id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        return toDto(rule);
    }

    /**
     * Delete a rule.
     */
    public void deleteRule(Long id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));

        Long schemaId = rule.getSchema().getId();
        ruleRepository.delete(rule);
        droolsService.invalidateCache(schemaId);
    }

    /**
     * Toggle rule enabled status.
     */
    public RuleDto toggleRule(Long id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));

        rule.setEnabled(!rule.isEnabled());
        rule = ruleRepository.save(rule);
        droolsService.invalidateCache(rule.getSchema().getId());

        return toDto(rule);
    }

    /**
     * Execute rules against facts.
     */
    public ExecuteRulesResponse executeRules(ExecuteRulesRequest request) {
        List<Rule> rules;

        if (request.getRuleIds() != null && !request.getRuleIds().isEmpty()) {
            rules = ruleRepository.findAllById(request.getRuleIds());
        } else if (request.getSchemaId() != null) {
            rules = ruleRepository.findActiveRulesBySchemaOrderByPriority(request.getSchemaId());
        } else {
            throw new IllegalArgumentException("Either schemaId or ruleIds must be provided");
        }

        if (rules.isEmpty()) {
            return ExecuteRulesResponse.builder()
                    .success(true)
                    .resultFacts(request.getFacts())
                    .firedRules(List.of())
                    .executionTimeMs(0)
                    .build();
        }

        // Convert input facts to DynamicFacts
        String factType = rules.get(0).getSchema().getName();
        List<DynamicFact> dynamicFacts = request.getFacts().stream()
                .map(factData -> new DynamicFact(factType, factData))
                .collect(Collectors.toList());

        // Execute rules
        ExecuteRulesResponse response = droolsService.executeRules(rules, dynamicFacts);

        // Audit logging (unless dry run)
        if (!request.isDryRun() && response.isSuccess()) {
            try {
                for (Rule rule : rules) {
                    boolean fired = response.getFiredRules().stream()
                            .anyMatch(fr -> rule.getId().equals(fr.getRuleId()));

                    if (fired) {
                        RuleAuditLog auditLog = RuleAuditLog.builder()
                                .rule(rule)
                                .inputFacts(objectMapper.writeValueAsString(request.getFacts()))
                                .outputFacts(objectMapper.writeValueAsString(response.getResultFacts()))
                                .fired(true)
                                .executionTimeMs(response.getExecutionTimeMs())
                                .build();
                        auditLogRepository.save(auditLog);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to save audit log", e);
            }
        }

        return response;
    }

    /**
     * Get generated DRL for a rule (for debugging).
     */
    @Transactional(readOnly = true)
    public String getGeneratedDrl(Long id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        return rule.getGeneratedDrl();
    }

    /**
     * Regenerate DRL for an existing rule without modifying the rule definition.
     */
    public RuleDto regenerateDrl(Long id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));

        try {
            // Parse the existing rule definition
            RuleDefinition definition = objectMapper.readValue(rule.getRuleJson(), RuleDefinition.class);

            // Regenerate DRL using current transpiler logic
            String drl = transpiler.transpile(definition, "com.ruleengine.generated", rule.getSchema().getName());

            // Validate DRL
            List<String> errors = droolsService.validateDrl(drl);
            boolean hasErrors = errors.stream().anyMatch(e -> e.startsWith("ERROR"));
            if (hasErrors) {
                throw new RuntimeException("Invalid rule DRL after regeneration:\n" + String.join("\n", errors));
            }

            // Update only the DRL, keep everything else the same
            rule.setGeneratedDrl(drl);
            rule = ruleRepository.save(rule);

            // Invalidate cache
            droolsService.invalidateCache(rule.getSchema().getId());

            return toDto(rule);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse rule definition", e);
        }
    }

    private RuleDto toDto(Rule rule) {
        RuleDto.RuleDtoBuilder builder = RuleDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .schemaId(rule.getSchema().getId())
                .schemaName(rule.getSchema().getName())
                .enabled(rule.isEnabled())
                .priority(rule.getPriority())
                .category(rule.getCategory())
                .generatedDrl(rule.getGeneratedDrl())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt());

        if (rule.getProject() != null) {
            builder.projectId(rule.getProject().getId());
        }

        RuleDto dto = builder.build();

        // Set advanced Drools parameters
        dto.setActivationGroup(rule.getActivationGroup());
        dto.setLockOnActive(rule.getLockOnActive());
        dto.setDateEffective(rule.getDateEffective());
        dto.setDateExpires(rule.getDateExpires());

        try {
            RuleDefinition definition = objectMapper.readValue(rule.getRuleJson(), RuleDefinition.class);
            dto.setDefinition(definition);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse rule definition", e);
        }

        return dto;
    }

    /**
     * Validate that condition values match the expected data types from the schema.
     */
    private void validateConditionValues(RuleDefinition.ConditionGroup conditions, Schema schema) {
        if (conditions == null || conditions.getConditions() == null) {
            return;
        }

        // Parse schema properties from jsonSchema
        Map<String, JsonNode> propertyMap = parseSchemaProperties(schema.getJsonSchema());

        for (RuleDefinition.Condition condition : conditions.getConditions()) {
            if (condition.getNested() != null) {
                // Recursively validate nested conditions
                validateConditionGroup(condition.getNested(), propertyMap);
            } else {
                validateCondition(condition, propertyMap);
            }
        }
    }

    private void validateConditionGroup(RuleDefinition.ConditionGroup group, Map<String, JsonNode> propertyMap) {
        if (group == null || group.getConditions() == null) {
            return;
        }
        for (RuleDefinition.Condition condition : group.getConditions()) {
            if (condition.getNested() != null) {
                validateConditionGroup(condition.getNested(), propertyMap);
            } else {
                validateCondition(condition, propertyMap);
            }
        }
    }

    private void validateCondition(RuleDefinition.Condition condition, Map<String, JsonNode> propertyMap) {
        if (condition.getFact() == null || condition.getValue() == null) {
            return;
        }

        // Skip validation for null checks
        if ("isNull".equals(condition.getOperator()) || "isNotNull".equals(condition.getOperator())) {
            return;
        }

        // Skip if value is a field reference
        if (condition.isValueIsField()) {
            return;
        }

        // Find property in schema
        String factPath = condition.getFact();
        // Remove fact type prefix if present
        if (factPath.contains(".") && factPath.split("\\.").length > 1) {
            String[] parts = factPath.split("\\.");
            if (parts.length > 1) {
                factPath = factPath.substring(parts[0].length() + 1);
            }
        }

        JsonNode property = findPropertyByPath(propertyMap, factPath);
        if (property == null) {
            // Property not found in schema - skip validation
            return;
        }

        String expectedType = property.has("type") ? property.get("type").asText() : "string";
        String format = property.has("format") ? property.get("format").asText() : null;
        Object value = condition.getValue();

        // Validate value type
        String error = validateValueType(value, expectedType, format, factPath);
        if (error != null) {
            throw new IllegalArgumentException(error);
        }
    }

    private String validateValueType(Object value, String expectedType, String format, String fieldPath) {
        if (value == null) {
            return null; // Null is allowed
        }

        switch (expectedType) {
            case "integer":
                if (!(value instanceof Integer || value instanceof Long ||
                        (value instanceof Number && ((Number) value).doubleValue() == ((Number) value).intValue()))) {
                    return String.format("Field '%s' expects integer type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                break;
            case "number":
                if (!(value instanceof Number)) {
                    return String.format("Field '%s' expects number type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                break;
            case "boolean":
                if (!(value instanceof Boolean)) {
                    return String.format("Field '%s' expects boolean type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                break;
            case "string":
                if (!(value instanceof String)) {
                    return String.format("Field '%s' expects string type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                // Validate date format if specified
                if ("date".equals(format) || "date-time".equals(format)) {
                    try {
                        // Try to parse as date
                        if (value instanceof String) {
                            String dateStr = (String) value;
                            if ("date-time".equals(format)) {
                                java.time.format.DateTimeFormatter.ISO_DATE_TIME.parse(dateStr);
                            } else {
                                java.time.format.DateTimeFormatter.ISO_DATE.parse(dateStr);
                            }
                        }
                    } catch (Exception e) {
                        return String.format("Field '%s' expects %s format, but got invalid value: %s", fieldPath,
                                format, value);
                    }
                }
                break;
            case "array":
                if (!(value instanceof List)) {
                    return String.format("Field '%s' expects array type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                break;
            case "object":
                if (!(value instanceof Map)) {
                    return String.format("Field '%s' expects object type, but got %s", fieldPath,
                            value.getClass().getSimpleName());
                }
                break;
        }

        return null; // Validation passed
    }

    private Map<String, JsonNode> parseSchemaProperties(String jsonSchema) {
        try {
            if (jsonSchema == null || jsonSchema.isEmpty()) {
                return Map.of();
            }
            JsonNode root = objectMapper.readTree(jsonSchema);
            Map<String, JsonNode> properties = new java.util.HashMap<>();
            if (root.has("properties")) {
                root.get("properties").fields().forEachRemaining(entry -> {
                    properties.put(entry.getKey(), entry.getValue());
                });
            }
            return properties;
        } catch (Exception e) {
            log.warn("Failed to parse schema properties for validation", e);
            return Map.of();
        }
    }

    private JsonNode findPropertyByPath(Map<String, JsonNode> propertyMap, String path) {
        if (path == null || path.isEmpty()) {
            return null;
        }

        String[] parts = path.split("\\.");
        JsonNode current = propertyMap.get(parts[0]);

        if (current == null) {
            return null;
        }

        for (int i = 1; i < parts.length; i++) {
            if (current.has("properties") && current.get("properties").has(parts[i])) {
                current = current.get("properties").get(parts[i]);
            } else {
                return null;
            }
        }

        return current;
    }
}
