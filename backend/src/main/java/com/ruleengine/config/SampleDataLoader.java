package com.ruleengine.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.model.Rule;
import com.ruleengine.model.RuleProject;
import com.ruleengine.model.Schema;
import com.ruleengine.model.SchemaSource;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import com.ruleengine.drools.JsonToDrlTranspiler;
import com.ruleengine.dto.RuleDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads sample case study projects on application startup if database is empty.
 * This helps new users get familiar with the platform by providing realistic
 * examples.
 */
@Component
public class SampleDataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(SampleDataLoader.class);

    private final RuleProjectRepository projectRepository;
    private final SchemaRepository schemaRepository;
    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;
    private final JsonToDrlTranspiler transpiler;

    public SampleDataLoader(RuleProjectRepository projectRepository,
            SchemaRepository schemaRepository,
            RuleRepository ruleRepository,
            ObjectMapper objectMapper,
            JsonToDrlTranspiler transpiler) {
        this.projectRepository = projectRepository;
        this.schemaRepository = schemaRepository;
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
        this.transpiler = transpiler;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Only load sample data if database is empty
        if (projectRepository.count() > 0) {
            logger.info("Database already contains projects, skipping sample data load");
            return;
        }

        try {
            loadSampleProjects();
        } catch (Exception e) {
            logger.error("Failed to load sample projects: {}", e.getMessage(), e);
        }
    }

    private void loadSampleProjects() throws Exception {
        ClassPathResource resource = new ClassPathResource("case-studies/sample-projects.json");

        if (!resource.exists()) {
            logger.warn("Sample projects file not found at case-studies/sample-projects.json");
            return;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(inputStream);
            JsonNode projectsNode = root.get("projects");

            if (projectsNode == null || !projectsNode.isArray()) {
                logger.warn("No projects array found in sample-projects.json");
                return;
            }

            int projectCount = 0;
            for (JsonNode projectNode : projectsNode) {
                createProject(projectNode);
                projectCount++;
            }

            logger.info("Successfully loaded {} sample projects", projectCount);
        }
    }

    private void createProject(JsonNode projectNode) {
        String name = projectNode.get("name").asText();
        String description = projectNode.has("description") ? projectNode.get("description").asText() : "";

        logger.info("Creating sample project: {}", name);

        // Create project
        RuleProject project = new RuleProject();
        project.setName(name);
        project.setDescription(description);

        // Initialize schema lists
        List<Schema> inputSchemas = new ArrayList<>();
        List<Schema> outputSchemas = new ArrayList<>();

        // Create input schemas
        JsonNode inputSchemasNode = projectNode.get("inputSchemas");
        if (inputSchemasNode != null && inputSchemasNode.isArray()) {
            for (JsonNode schemaNode : inputSchemasNode) {
                Schema schema = createSchema(schemaNode);
                schema = schemaRepository.save(schema);
                inputSchemas.add(schema);
            }
        }

        // Create output schemas
        JsonNode outputSchemasNode = projectNode.get("outputSchemas");
        if (outputSchemasNode != null && outputSchemasNode.isArray()) {
            for (JsonNode schemaNode : outputSchemasNode) {
                Schema schema = createSchema(schemaNode);
                schema = schemaRepository.save(schema);
                outputSchemas.add(schema);
            }
        }

        project.setInputSchemas(inputSchemas);
        project.setOutputSchemas(outputSchemas);
        project = projectRepository.save(project);

        // Create a default template for this project
        // Templates are child RuleProjects that define input/output contracts
        RuleProject template = new RuleProject();
        template.setName(name + " Rules");
        template.setDescription("Default rule template for " + name);
        template.setParentProject(project);
        template.setInputSchemas(inputSchemas);
        template.setOutputSchemas(outputSchemas);
        template = projectRepository.save(template);

        logger.info("  Created template: {}", template.getName());

        // Create rules under the template
        JsonNode rulesNode = projectNode.get("rules");
        if (rulesNode != null && rulesNode.isArray()) {
            int ruleCount = 0;
            for (JsonNode ruleNode : rulesNode) {
                createRule(ruleNode, template, inputSchemas.isEmpty() ? null : inputSchemas.get(0));
                ruleCount++;
            }
            logger.info("  Created {} rules for template {}", ruleCount, template.getName());
        }
    }

    private Schema createSchema(JsonNode schemaNode) {
        Schema schema = new Schema();
        schema.setName(schemaNode.get("name").asText());
        schema.setDescription(schemaNode.has("description") ? schemaNode.get("description").asText() : "");
        schema.setVersion("1.0.0");
        schema.setSource(SchemaSource.MANUAL);
        schema.setGroup(schemaNode.has("group") ? schemaNode.get("group").asText() : "default");

        // Store schema definition as JSON string in jsonSchema field
        JsonNode definitionNode = schemaNode.get("schemaDefinition");
        if (definitionNode != null) {
            try {
                schema.setJsonSchema(objectMapper.writeValueAsString(definitionNode));
            } catch (Exception e) {
                logger.error("Failed to serialize schema definition for {}", schema.getName(), e);
                schema.setJsonSchema("{}");
            }
        } else {
            schema.setJsonSchema("{}");
        }

        return schema;
    }

    private void createRule(JsonNode ruleNode, RuleProject template, Schema schema) {
        if (schema == null) {
            logger.warn("Cannot create rule without a schema");
            return;
        }

        Rule rule = new Rule();
        rule.setName(ruleNode.get("name").asText());
        rule.setDescription(ruleNode.has("description") ? ruleNode.get("description").asText() : "");
        rule.setPriority(ruleNode.has("priority") ? ruleNode.get("priority").asInt() : 100);
        rule.setEnabled(ruleNode.has("isActive") ? ruleNode.get("isActive").asBoolean() : true);
        rule.setProject(template); // Rules belong to the template, not the parent project
        rule.setSchema(schema);

        // Build a rule JSON structure that the frontend expects
        JsonNode conditionsNode = ruleNode.get("conditions");
        JsonNode actionsNode = ruleNode.get("actions");

        try {
            // Transform conditions from sample format {all:[]} or {any:[]}
            // to frontend format {operator:'all'|'any',conditions:[]}
            com.fasterxml.jackson.databind.node.ObjectNode transformedConditions = objectMapper.createObjectNode();
            if (conditionsNode != null) {
                if (conditionsNode.has("all")) {
                    transformedConditions.put("operator", "all");
                    transformedConditions.set("conditions", transformConditionsList(conditionsNode.get("all")));
                } else if (conditionsNode.has("any")) {
                    transformedConditions.put("operator", "any");
                    transformedConditions.set("conditions", transformConditionsList(conditionsNode.get("any")));
                } else {
                    transformedConditions.put("operator", "all");
                    transformedConditions.set("conditions", objectMapper.createArrayNode());
                }
            } else {
                transformedConditions.put("operator", "all");
                transformedConditions.set("conditions", objectMapper.createArrayNode());
            }

            // Transform actions - they're already in array format
            com.fasterxml.jackson.databind.node.ArrayNode transformedActions = objectMapper.createArrayNode();
            if (actionsNode != null && actionsNode.isArray()) {
                for (JsonNode actionNode : actionsNode) {
                    com.fasterxml.jackson.databind.node.ObjectNode action = objectMapper.createObjectNode();
                    String actionType = actionNode.has("type") ? actionNode.get("type").asText() : "MODIFY";
                    // Map sample action types to frontend types
                    if (actionType.equals("SET_VALUE")) {
                        action.put("type", "MODIFY");
                        action.put("targetField", actionNode.has("field") ? actionNode.get("field").asText() : "");
                        action.set("value", actionNode.get("value"));
                    } else if (actionType.equals("ADD_TO_LIST") || actionType.equals("INCREMENT")) {
                        action.put("type", "MODIFY");
                        action.put("targetField", actionNode.has("field") ? actionNode.get("field").asText() : "");
                        action.set("value", actionNode.get("value"));
                    } else {
                        action.put("type", actionType);
                    }
                    transformedActions.add(action);
                }
            }

            // Create a combined rule JSON structure
            String ruleJson = objectMapper.writeValueAsString(
                    objectMapper.createObjectNode()
                            .put("name", rule.getName())
                            .put("description", rule.getDescription())
                            .put("priority", rule.getPriority())
                            .put("schemaId", schema.getId())
                            .put("enabled", rule.isEnabled())
                            .set("conditions", transformedConditions));
            // Add actions to the JSON
            JsonNode combined = objectMapper.readTree(ruleJson);
            ((com.fasterxml.jackson.databind.node.ObjectNode) combined).set("actions", transformedActions);
            ruleJson = objectMapper.writeValueAsString(combined);

            rule.setRuleJson(ruleJson);

            // Generate DRL using the transpiler
            try {
                RuleDefinition definition = objectMapper.readValue(ruleJson, RuleDefinition.class);
                String drl = transpiler.transpile(definition, "com.ruleengine.generated", schema.getName());
                rule.setGeneratedDrl(drl);
                logger.debug("Generated DRL for rule '{}': {}", rule.getName(), drl);
            } catch (Exception drlEx) {
                logger.warn("Failed to generate DRL for rule '{}': {}", rule.getName(), drlEx.getMessage());
                // Continue without DRL - it can be regenerated later
            }
        } catch (Exception e) {
            logger.error("Failed to serialize rule JSON for {}", rule.getName(), e);
            rule.setRuleJson("{}");
        }

        ruleRepository.save(rule);
    }

    /**
     * Transform conditions from sample format to frontend format.
     * Maps: field -> fact, OPERATOR_NAME -> operatorName
     */
    private com.fasterxml.jackson.databind.node.ArrayNode transformConditionsList(JsonNode conditionsList) {
        com.fasterxml.jackson.databind.node.ArrayNode result = objectMapper.createArrayNode();
        if (conditionsList != null && conditionsList.isArray()) {
            for (JsonNode condNode : conditionsList) {
                com.fasterxml.jackson.databind.node.ObjectNode cond = objectMapper.createObjectNode();
                // Map "field" to "fact"
                cond.put("fact", condNode.has("field") ? condNode.get("field").asText() : "");
                // Map operators from UPPER_SNAKE_CASE to camelCase
                String operator = condNode.has("operator") ? condNode.get("operator").asText() : "equals";
                cond.put("operator", mapOperator(operator));
                // Copy value
                if (condNode.has("value")) {
                    cond.set("value", condNode.get("value"));
                }
                result.add(cond);
            }
        }
        return result;
    }

    /**
     * Map backend/sample operators to frontend operators.
     */
    private String mapOperator(String operator) {
        return switch (operator) {
            case "EQUALS" -> "equals";
            case "NOT_EQUALS" -> "notEquals";
            case "GREATER_THAN" -> "greaterThan";
            case "GREATER_THAN_OR_EQUAL" -> "greaterThanOrEquals";
            case "LESS_THAN" -> "lessThan";
            case "LESS_THAN_OR_EQUAL" -> "lessThanOrEquals";
            case "CONTAINS" -> "contains";
            case "NOT_CONTAINS" -> "notContains";
            case "STARTS_WITH" -> "startsWith";
            case "ENDS_WITH" -> "endsWith";
            case "IS_NULL" -> "isNull";
            case "IS_NOT_NULL" -> "isNotNull";
            default -> operator.toLowerCase();
        };
    }
}
