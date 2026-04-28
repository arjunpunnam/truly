package com.ruleengine.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.SchemaDto;
import com.ruleengine.dto.SchemaPropertyDto;
import com.ruleengine.model.Rule;
import com.ruleengine.model.Schema;
import com.ruleengine.model.SchemaSource;
import com.ruleengine.parser.SchemaParserService;
import com.ruleengine.model.RuleProject;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.RuleRepository;
import com.ruleengine.repository.SchemaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SchemaService {

    private static final Logger log = LoggerFactory.getLogger(SchemaService.class);
    private final SchemaRepository schemaRepository;
    private final RuleRepository ruleRepository;
    private final RuleProjectRepository ruleProjectRepository;
    private final SchemaParserService schemaParserService;
    private final ObjectMapper objectMapper;

    public SchemaService(SchemaRepository schemaRepository,
            RuleRepository ruleRepository,
            RuleProjectRepository ruleProjectRepository,
            SchemaParserService schemaParserService,
            ObjectMapper objectMapper) {
        this.schemaRepository = schemaRepository;
        this.ruleRepository = ruleRepository;
        this.ruleProjectRepository = ruleProjectRepository;
        this.schemaParserService = schemaParserService;
        this.objectMapper = objectMapper;
    }

    /**
     * Preview entities available in OpenAPI/Swagger content.
     */
    public List<String> previewOpenApi(String content) {
        try {
            log.info("Previewing OpenAPI content, length: {}", content != null ? content.length() : 0);
            Map<String, SchemaPropertyDto> schemas = schemaParserService.parseOpenApi(content);
            log.info("Parsed schemas map size: {}", schemas.size());
            log.info("Schema keys: {}", schemas.keySet());
            
            // Filter out request/response pattern schemas (e.g., GET_*, POST_*, Request_*, *_200_application_xml)
            List<String> entities = schemas.keySet().stream()
                    .filter(name -> {
                        // Filter out HTTP method prefixes
                        if (name.startsWith("GET_") || name.startsWith("POST_") || 
                            name.startsWith("PUT_") || name.startsWith("DELETE_") || 
                            name.startsWith("PATCH_") || name.startsWith("Request_")) {
                            return false;
                        }
                        // Filter out schemas with status codes (e.g., *_200, *_201)
                        if (name.matches(".*_\\d{3}(_.*)?$")) {
                            return false;
                        }
                        // Filter out media type suffixes (e.g., *_application_xml, *_application_json)
                        if (name.contains("_application_") || name.contains("_text_")) {
                            return false;
                        }
                        return true;
                    })
                    .collect(Collectors.toList());
            
            log.info("Preview returning {} entities after filtering: {}", entities.size(), entities);
            
            // If no entities found, try to parse as JSON Schema
            if (entities.isEmpty()) {
                log.info("No OpenAPI schemas found, trying to parse as JSON Schema");
                try {
                    JsonNode jsonNode = objectMapper.readTree(content);
                    if (jsonNode.has("type") || jsonNode.has("properties") || jsonNode.has("$schema")) {
                        // Looks like a JSON Schema
                        String schemaName = jsonNode.has("title") ? jsonNode.get("title").asText() : "Schema";
                        entities.add(schemaName);
                        log.info("Found JSON Schema: {}", schemaName);
                    } else if (jsonNode.isObject()) {
                        // Plain JSON object - infer schema name
                        entities.add("InferredSchema");
                        log.info("Found plain JSON object, inferred as schema");
                    }
                } catch (Exception e) {
                    log.debug("Not a valid JSON Schema either: {}", e.getMessage());
                }
            }
            
            return entities;
        } catch (Exception e) {
            log.error("Failed to preview OpenAPI: {}", e.getMessage(), e);
            // Try to provide helpful error message
            if (e.getMessage() != null && e.getMessage().contains("Failed to parse")) {
                throw new IllegalArgumentException("Invalid OpenAPI/Swagger format. Please ensure the content is valid OpenAPI 3.0, Swagger 2.0, or JSON Schema. Error: " + e.getMessage());
            }
            throw e;
        }
    }

    /**
     * Import schemas from OpenAPI/Swagger content.
     */
    public List<SchemaDto> importFromOpenApi(String name, String content, List<String> selectedEntities) {
        return importFromOpenApi(name, content, selectedEntities, null, null);
    }

    public List<SchemaDto> importFromOpenApi(String name, String content, List<String> selectedEntities, String group) {
        return importFromOpenApi(name, content, selectedEntities, group, null);
    }

    public List<SchemaDto> importFromOpenApi(String name, String content, List<String> selectedEntities, String group, Long projectId) {
        Map<String, SchemaPropertyDto> schemas = schemaParserService.parseOpenApi(content);

        if (schemas.isEmpty()) {
            throw new IllegalArgumentException("No schemas found in OpenAPI specification");
        }

        List<SchemaDto> result = new ArrayList<>();

        if (selectedEntities != null && !selectedEntities.isEmpty()) {
            System.out.println("Importing " + selectedEntities.size() + " entities: " + selectedEntities);
            for (String entityName : selectedEntities) {
                if (schemas.containsKey(entityName)) {
                    SchemaPropertyDto rootSchema = schemas.get(entityName);
                    SchemaDto saved = saveSchema(entityName, content, rootSchema, SchemaSource.SWAGGER, group, projectId);
                    System.out.println("Saved schema to DB: " + saved.getName() + " (ID: " + saved.getId() + ")");
                    result.add(saved);
                } else {
                    System.out.println("Warning: Entity '" + entityName + "' not found in parsed schemas");
                }
            }
            System.out.println("Total schemas saved: " + result.size());
        } else if (schemas.size() == 1) {
            SchemaPropertyDto rootSchema = schemas.values().iterator().next();
            result.add(
                    saveSchema(name != null ? name : rootSchema.getName(), content, rootSchema, SchemaSource.SWAGGER, group, projectId));
        } else {
            SchemaPropertyDto rootSchema = SchemaPropertyDto.builder()
                    .name(name)
                    .path(name)
                    .type("object")
                    .properties(schemas.values().stream().collect(Collectors.toList()))
                    .build();
            result.add(saveSchema(name, content, rootSchema, SchemaSource.SWAGGER, group, projectId));
        }

        return result;
    }

    private SchemaDto saveSchema(String name, String content, SchemaPropertyDto schemaDefinition, SchemaSource source) {
        return saveSchema(name, content, schemaDefinition, source, null, null);
    }

    private SchemaDto saveSchema(String name, String content, SchemaPropertyDto schemaDefinition, SchemaSource source, String group) {
        return saveSchema(name, content, schemaDefinition, source, group, null);
    }

    private SchemaDto saveSchema(String name, String content, SchemaPropertyDto schemaDefinition, SchemaSource source, String group, Long projectId) {
        try {
            String jsonSchema = objectMapper.writeValueAsString(schemaDefinition);
            
            RuleProject project = null;
            if (projectId != null) {
                project = ruleProjectRepository.findById(projectId)
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
            }

            Schema schema = Schema.builder()
                    .name(name)
                    .version("1.0")
                    .source(source)
                    .jsonSchema(jsonSchema)
                    .originalContent(content)
                    .group(group)
                    .project(project)
                    .build();

            schema = schemaRepository.save(schema);
            return toDto(schema);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize schema: " + name, e);
        }
    }

    /**
     * Import from JSON Schema.
     */
    public SchemaDto importFromJsonSchema(String name, String content) {
        return importFromJsonSchema(name, content, null, null);
    }

    public SchemaDto importFromJsonSchema(String name, String content, String group) {
        return importFromJsonSchema(name, content, group, null);
    }

    public SchemaDto importFromJsonSchema(String name, String content, String group, Long projectId) {
        SchemaPropertyDto parsedSchema = schemaParserService.parseJsonSchema(content, name);

        try {
            String jsonSchema = objectMapper.writeValueAsString(parsedSchema);
            
            RuleProject project = null;
            if (projectId != null) {
                project = ruleProjectRepository.findById(projectId)
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
            }

            Schema schema = Schema.builder()
                    .name(name)
                    .version("1.0")
                    .source(SchemaSource.JSON_SCHEMA)
                    .jsonSchema(jsonSchema)
                    .originalContent(content)
                    .group(group)
                    .project(project)
                    .build();

            schema = schemaRepository.save(schema);
            return toDto(schema);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize schema", e);
        }
    }

    /**
     * Infer schema from a JSON example.
     */
    public SchemaDto inferFromExample(String name, String jsonExample) {
        return inferFromExample(name, jsonExample, null, null);
    }

    public SchemaDto inferFromExample(String name, String jsonExample, String group) {
        return inferFromExample(name, jsonExample, group, null);
    }

    public SchemaDto inferFromExample(String name, String jsonExample, String group, Long projectId) {
        String inferredSchema = schemaParserService.inferJsonSchemaFromExample(jsonExample);
        return importFromJsonSchema(name, inferredSchema, group, projectId);
    }

    /**
     * Create a schema manually.
     */
    public SchemaDto createManual(String name, String description, SchemaPropertyDto schemaDefinition) {
        return createManual(name, description, schemaDefinition, null, null);
    }

    public SchemaDto createManual(String name, String description, SchemaPropertyDto schemaDefinition, String group) {
        return createManual(name, description, schemaDefinition, group, null);
    }

    public SchemaDto createManual(String name, String description, SchemaPropertyDto schemaDefinition, String group, Long projectId) {
        try {
            String jsonSchema = objectMapper.writeValueAsString(schemaDefinition);
            
            RuleProject project = null;
            if (projectId != null) {
                project = ruleProjectRepository.findById(projectId)
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
            }

            Schema schema = Schema.builder()
                    .name(name)
                    .description(description)
                    .version("1.0")
                    .source(SchemaSource.MANUAL)
                    .jsonSchema(jsonSchema)
                    .group(group)
                    .project(project)
                    .build();

            schema = schemaRepository.save(schema);
            return toDto(schema);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize schema", e);
        }
    }

    /**
     * Get all schemas.
     */
    @Transactional(readOnly = true)
    public List<SchemaDto> getAllSchemas() {
        return schemaRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get schemas for a project (project schemas + global schemas).
     */
    @Transactional(readOnly = true)
    public List<SchemaDto> getSchemasByProject(Long projectId) {
        return schemaRepository.findByProjectIdOrProjectIsNull(projectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get only project-scoped schemas.
     */
    @Transactional(readOnly = true)
    public List<SchemaDto> getProjectSchemas(Long projectId) {
        return schemaRepository.findByProjectId(projectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get global schemas (not project-scoped).
     */
    @Transactional(readOnly = true)
    public List<SchemaDto> getGlobalSchemas() {
        return schemaRepository.findByProjectIsNull().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get a schema by ID.
     */
    @Transactional(readOnly = true)
    public SchemaDto getSchema(Long id) {
        Schema schema = schemaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + id));
        return toDto(schema);
    }

    /**
     * Delete a schema.
     */
    public void deleteSchema(Long id) {
        Schema schema = schemaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + id));

        // Check if any rules use this schema
        List<Rule> rules = ruleRepository.findBySchemaId(id);
        if (!rules.isEmpty()) {
            throw new IllegalStateException("Cannot delete schema with existing rules. Delete the rules first.");
        }

        schemaRepository.delete(schema);
    }

    /**
     * Update a schema.
     */
    public SchemaDto updateSchema(Long id, String name, String description, SchemaPropertyDto schemaDefinition) {
        return updateSchema(id, name, description, schemaDefinition, null);
    }

    public SchemaDto updateSchema(Long id, String name, String description, SchemaPropertyDto schemaDefinition, String group) {
        return updateSchema(id, name, description, schemaDefinition, group, null);
    }

    public SchemaDto updateSchema(Long id, String name, String description, SchemaPropertyDto schemaDefinition, String group, Long projectId) {
        Schema schema = schemaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schema not found: " + id));

        try {
            if (name != null) {
                schema.setName(name);
            }
            if (description != null) {
                schema.setDescription(description);
            }
            if (group != null) {
                schema.setGroup(group);
            }
            if (projectId != null) {
                RuleProject project = ruleProjectRepository.findById(projectId)
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
                schema.setProject(project);
            }
            if (schemaDefinition != null) {
                schema.setJsonSchema(objectMapper.writeValueAsString(schemaDefinition));
            }

            schema = schemaRepository.save(schema);
            return toDto(schema);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize schema", e);
        }
    }

    private SchemaDto toDto(Schema schema) {
        SchemaDto dto = SchemaDto.builder()
                .id(schema.getId())
                .name(schema.getName())
                .description(schema.getDescription())
                .group(schema.getGroup())
                .projectId(schema.getProject() != null ? schema.getProject().getId() : null)
                .version(schema.getVersion())
                .source(schema.getSource())
                .jsonSchema(schema.getJsonSchema())
                .createdAt(schema.getCreatedAt())
                .updatedAt(schema.getUpdatedAt())
                .build();

        // Parse properties for UI
        try {
            dto.setProperties(extractProperties(schema.getJsonSchema()));
        } catch (JsonProcessingException e) {
            log.error("Failed to parse schema properties", e);
        }

        return dto;
    }

    private List<SchemaPropertyDto> extractProperties(String jsonSchema) throws JsonProcessingException {
        if (jsonSchema == null || jsonSchema.isBlank()) {
            return Collections.emptyList();
        }

        JsonNode root = objectMapper.readTree(jsonSchema);
        JsonNode propertiesNode = root.get("properties");
        if (propertiesNode == null || propertiesNode.isNull()) {
            return Collections.emptyList();
        }

        if (propertiesNode.isArray()) {
            List<SchemaPropertyDto> properties = objectMapper.convertValue(propertiesNode,
                    new TypeReference<List<SchemaPropertyDto>>() {});
            return properties != null ? properties : Collections.emptyList();
        }

        if (propertiesNode.isObject()) {
            Set<String> required = readRequired(root);
            List<SchemaPropertyDto> properties = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = propertiesNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                properties.add(convertJsonSchemaProperty(field.getKey(), field.getValue(), field.getKey(),
                        required.contains(field.getKey())));
            }
            return properties;
        }

        return Collections.emptyList();
    }

    private SchemaPropertyDto convertJsonSchemaProperty(String name, JsonNode node, String path, boolean required) {
        String type = node.has("type") && node.get("type").isTextual() ? node.get("type").asText() : "object";
        String format = node.has("format") && node.get("format").isTextual() ? node.get("format").asText() : null;
        String description = node.has("description") && node.get("description").isTextual()
                ? node.get("description").asText()
                : null;

        SchemaPropertyDto.SchemaPropertyDtoBuilder builder = SchemaPropertyDto.builder()
                .name(name)
                .path(path)
                .type(type)
                .format(format)
                .description(description)
                .required(required);

        if (node.has("enum") && node.get("enum").isArray()) {
            builder.enumValues(objectMapper.convertValue(node.get("enum"), new TypeReference<List<Object>>() {}));
        }
        if (node.has("default")) {
            builder.defaultValue(objectMapper.convertValue(node.get("default"), Object.class));
        }

        if (node.has("properties") && node.get("properties").isObject()) {
            Set<String> requiredChildren = readRequired(node);
            List<SchemaPropertyDto> children = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> childFields = node.get("properties").fields();
            while (childFields.hasNext()) {
                Map.Entry<String, JsonNode> child = childFields.next();
                String childPath = path + "." + child.getKey();
                children.add(convertJsonSchemaProperty(child.getKey(), child.getValue(), childPath,
                        requiredChildren.contains(child.getKey())));
            }
            builder.properties(children);
        }

        if (node.has("items") && node.get("items").isObject()) {
            builder.items(convertJsonSchemaProperty("items", node.get("items"), path + "[]", false));
        }

        if (node.has("additionalProperties") && node.get("additionalProperties").isObject()) {
            builder.additionalProperties(
                    convertJsonSchemaProperty("additionalProperties", node.get("additionalProperties"),
                            path + ".*", false));
        }

        Map<String, Object> constraints = new LinkedHashMap<>();
        copyConstraint(node, constraints, "minLength");
        copyConstraint(node, constraints, "maxLength");
        copyConstraint(node, constraints, "minimum");
        copyConstraint(node, constraints, "maximum");
        copyConstraint(node, constraints, "exclusiveMinimum");
        copyConstraint(node, constraints, "exclusiveMaximum");
        copyConstraint(node, constraints, "pattern");
        copyConstraint(node, constraints, "minItems");
        copyConstraint(node, constraints, "maxItems");
        if (!constraints.isEmpty()) {
            builder.constraints(constraints);
        }

        return builder.build();
    }

    private Set<String> readRequired(JsonNode node) {
        if (!node.has("required") || !node.get("required").isArray()) {
            return Collections.emptySet();
        }
        Set<String> required = new HashSet<>();
        for (JsonNode item : node.get("required")) {
            if (item.isTextual()) {
                required.add(item.asText());
            }
        }
        return required;
    }

    private void copyConstraint(JsonNode source, Map<String, Object> target, String field) {
        if (source.has(field) && !source.get(field).isNull()) {
            target.put(field, objectMapper.convertValue(source.get(field), Object.class));
        }
    }
}
