package com.ruleengine.parser;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.SchemaPropertyDto;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.MapSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.parser.core.models.ParseOptions;
import io.swagger.v3.parser.core.models.SwaggerParseResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

/**
 * Service for parsing OpenAPI/Swagger and JSON Schema files into a unified
 * format.
 */
@Service
public class SchemaParserService {

    private static final Logger log = LoggerFactory.getLogger(SchemaParserService.class);
    private final ObjectMapper objectMapper;

    public SchemaParserService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Parse an OpenAPI/Swagger specification and extract all schema definitions.
     */
    public Map<String, SchemaPropertyDto> parseOpenApi(String content) {
        ParseOptions options = new ParseOptions();
        options.setResolve(true);
        options.setResolveFully(true);

        String actualContent = content.trim();
        if (actualContent.startsWith("http://") || actualContent.startsWith("https://")) {
            log.info("Fetching OpenAPI from URL: {}", actualContent);
            try {
                actualContent = fetchUrlContent(actualContent).trim();
            } catch (Exception e) {
                log.error("Failed to fetch OpenAPI from URL", e);
                throw new IllegalArgumentException("Failed to fetch OpenAPI from URL: " + e.getMessage());
            }
        }

        log.info("Parsing OpenAPI content (first 100 chars): {}",
                actualContent.length() > 100 ? actualContent.substring(0, 100) : actualContent);

        // Use OpenAPIParser which handles both Swagger 2.0 and OpenAPI 3.0
        SwaggerParseResult result = new io.swagger.parser.OpenAPIParser().readContents(actualContent, null, options);

        if (result.getMessages() != null && !result.getMessages().isEmpty()) {
            log.warn("OpenAPI parse messages: {}", result.getMessages());
        }

        OpenAPI openAPI = result.getOpenAPI();
        if (openAPI == null) {
            String messages = result.getMessages() != null ? String.join(", ", result.getMessages()) : "Unknown error";
            throw new IllegalArgumentException("Failed to parse OpenAPI specification: " + messages);
        }

        Map<String, SchemaPropertyDto> schemas = new HashMap<>();

        // Parse schemas from components (OpenAPI 3.0)
        if (openAPI.getComponents() != null && openAPI.getComponents().getSchemas() != null) {
            log.info("Found {} schemas in components", openAPI.getComponents().getSchemas().size());
            openAPI.getComponents().getSchemas().forEach((name, schema) -> {
                try {
                    schemas.put(name, convertOpenApiSchema(name, schema, name, new HashSet<>()));
                    log.debug("Converted schema: {}", name);
                } catch (Exception e) {
                    log.warn("Failed to convert schema {}: {}", name, e.getMessage());
                }
            });
        } else {
            log.warn("No components.schemas found in OpenAPI specification");
        }

        // Also infer schemas from request/response bodies
        if (openAPI.getPaths() != null) {
            log.info("Found {} paths", openAPI.getPaths().size());
            openAPI.getPaths().forEach((path, pathItem) -> {
                // Request bodies
                if (pathItem.getPost() != null && pathItem.getPost().getRequestBody() != null) {
                    extractSchemaFromContent(pathItem.getPost().getRequestBody().getContent(),
                            "Request_" + sanitizeName(path), schemas);
                }
                if (pathItem.getPut() != null && pathItem.getPut().getRequestBody() != null) {
                    extractSchemaFromContent(pathItem.getPut().getRequestBody().getContent(),
                            "Request_" + sanitizeName(path), schemas);
                }
                if (pathItem.getPatch() != null && pathItem.getPatch().getRequestBody() != null) {
                    extractSchemaFromContent(pathItem.getPatch().getRequestBody().getContent(),
                            "Request_" + sanitizeName(path), schemas);
                }
                
                // Response schemas
                extractResponseSchemas(pathItem.getGet(), "GET_" + sanitizeName(path), schemas);
                extractResponseSchemas(pathItem.getPost(), "POST_" + sanitizeName(path), schemas);
                extractResponseSchemas(pathItem.getPut(), "PUT_" + sanitizeName(path), schemas);
                extractResponseSchemas(pathItem.getPatch(), "PATCH_" + sanitizeName(path), schemas);
                extractResponseSchemas(pathItem.getDelete(), "DELETE_" + sanitizeName(path), schemas);
            });
        } else {
            log.warn("No paths found in OpenAPI specification");
        }

        log.info("Total schemas extracted: {}", schemas.size());
        if (schemas.isEmpty()) {
            log.warn("No schemas found. OpenAPI version: {}, Has components: {}, Has paths: {}", 
                    openAPI.getOpenapi(), 
                    openAPI.getComponents() != null,
                    openAPI.getPaths() != null);
        }

        return schemas;
    }

    /**
     * Parse a standard JSON Schema document.
     */
    public SchemaPropertyDto parseJsonSchema(String content, String schemaName) {
        try {
            JsonNode root = objectMapper.readTree(content);
            return convertJsonSchemaNode(schemaName, root, schemaName, new HashSet<>());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse JSON Schema: " + e.getMessage(), e);
        }
    }

    /**
     * Convert a JSON object example to a JSON Schema.
     */
    public String inferJsonSchemaFromExample(String jsonExample) {
        try {
            JsonNode example = objectMapper.readTree(jsonExample);
            JsonNode schema = inferSchema(example);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(schema);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to parse JSON example: " + e.getMessage(), e);
        }
    }

    private JsonNode inferSchema(JsonNode node) {
        ObjectMapper mapper = new ObjectMapper();

        if (node.isObject()) {
            var schema = mapper.createObjectNode();
            schema.put("type", "object");
            var properties = mapper.createObjectNode();
            var required = mapper.createArrayNode();

            node.fields().forEachRemaining(field -> {
                properties.set(field.getKey(), inferSchema(field.getValue()));
                required.add(field.getKey());
            });

            schema.set("properties", properties);
            schema.set("required", required);
            return schema;
        } else if (node.isArray()) {
            var schema = mapper.createObjectNode();
            schema.put("type", "array");
            if (node.size() > 0) {
                schema.set("items", inferSchema(node.get(0)));
            } else {
                var items = mapper.createObjectNode();
                items.put("type", "object");
                schema.set("items", items);
            }
            return schema;
        } else if (node.isTextual()) {
            var schema = mapper.createObjectNode();
            schema.put("type", "string");
            return schema;
        } else if (node.isNumber()) {
            var schema = mapper.createObjectNode();
            schema.put("type", node.isIntegralNumber() ? "integer" : "number");
            return schema;
        } else if (node.isBoolean()) {
            var schema = mapper.createObjectNode();
            schema.put("type", "boolean");
            return schema;
        } else if (node.isNull()) {
            var schema = mapper.createObjectNode();
            schema.put("type", "null");
            return schema;
        }

        return mapper.createObjectNode().put("type", "object");
    }

    private SchemaPropertyDto convertOpenApiSchema(String name, Schema<?> schema, String path, Set<String> visited) {
        if (schema == null) {
            return null;
        }

        // Handle circular references
        String ref = schema.get$ref();
        if (ref != null) {
            String refName = ref.substring(ref.lastIndexOf('/') + 1);
            if (visited.contains(refName)) {
                return SchemaPropertyDto.builder()
                        .name(name)
                        .path(path)
                        .type("object")
                        .description("Circular reference to " + refName)
                        .build();
            }
        }

        SchemaPropertyDto.SchemaPropertyDtoBuilder builder = SchemaPropertyDto.builder()
                .name(name)
                .path(path)
                .description(schema.getDescription());

        String type = schema.getType();

        if (schema instanceof ArraySchema arraySchema) {
            builder.type("array");
            if (arraySchema.getItems() != null) {
                builder.items(convertOpenApiSchema("items", arraySchema.getItems(),
                        path + "[]", new HashSet<>(visited)));
            }
        } else if (schema instanceof MapSchema ||
                (schema.getAdditionalProperties() != null && schema.getAdditionalProperties() instanceof Schema)) {
            builder.type("object");
            Schema<?> additionalProps = (Schema<?>) schema.getAdditionalProperties();
            builder.additionalProperties(convertOpenApiSchema("additionalProperties",
                    additionalProps, path + "[*]", new HashSet<>(visited)));
        } else if ("object".equals(type) || schema.getProperties() != null) {
            builder.type("object");
            Set<String> newVisited = new HashSet<>(visited);
            newVisited.add(name);

            if (schema.getProperties() != null) {
                List<SchemaPropertyDto> properties = schema.getProperties().entrySet().stream()
                        .map(e -> convertOpenApiSchema(e.getKey(), e.getValue(),
                                path + "." + e.getKey(), newVisited))
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                builder.properties(properties);
            }

            if (schema.getRequired() != null) {
                // Mark required fields
                builder.required(schema.getRequired().contains(name));
            }
        } else {
            builder.type(type != null ? type : "string");
            builder.format(schema.getFormat());
        }

        if (schema.getEnum() != null) {
            builder.enumValues(new ArrayList<>(schema.getEnum()));
        }

        if (schema.getDefault() != null) {
            builder.defaultValue(schema.getDefault());
        }

        // Add constraints
        Map<String, Object> constraints = new HashMap<>();
        if (schema.getMinimum() != null)
            constraints.put("minimum", schema.getMinimum());
        if (schema.getMaximum() != null)
            constraints.put("maximum", schema.getMaximum());
        if (schema.getMinLength() != null)
            constraints.put("minLength", schema.getMinLength());
        if (schema.getMaxLength() != null)
            constraints.put("maxLength", schema.getMaxLength());
        if (schema.getPattern() != null)
            constraints.put("pattern", schema.getPattern());
        if (!constraints.isEmpty()) {
            builder.constraints(constraints);
        }

        return builder.build();
    }

    private SchemaPropertyDto convertJsonSchemaNode(String name, JsonNode node, String path, Set<String> visited) {
        if (node == null) {
            return null;
        }

        SchemaPropertyDto.SchemaPropertyDtoBuilder builder = SchemaPropertyDto.builder()
                .name(name)
                .path(path);

        if (node.has("description")) {
            builder.description(node.get("description").asText());
        }

        String type = node.has("type") ? node.get("type").asText() : "object";
        builder.type(type);

        switch (type) {
            case "object":
                Set<String> newVisited = new HashSet<>(visited);
                newVisited.add(name);

                if (node.has("properties")) {
                    List<SchemaPropertyDto> properties = new ArrayList<>();
                    node.get("properties").fields().forEachRemaining(field -> {
                        properties.add(convertJsonSchemaNode(field.getKey(), field.getValue(),
                                path + "." + field.getKey(), newVisited));
                    });
                    builder.properties(properties);
                }

                if (node.has("additionalProperties") && node.get("additionalProperties").isObject()) {
                    builder.additionalProperties(convertJsonSchemaNode("additionalProperties",
                            node.get("additionalProperties"), path + "[*]", newVisited));
                }
                break;

            case "array":
                if (node.has("items")) {
                    builder.items(convertJsonSchemaNode("items", node.get("items"),
                            path + "[]", visited));
                }
                break;

            default:
                if (node.has("format")) {
                    builder.format(node.get("format").asText());
                }
        }

        if (node.has("enum")) {
            List<Object> enumValues = new ArrayList<>();
            node.get("enum").forEach(v -> {
                if (v.isTextual())
                    enumValues.add(v.asText());
                else if (v.isNumber())
                    enumValues.add(v.numberValue());
                else if (v.isBoolean())
                    enumValues.add(v.booleanValue());
            });
            builder.enumValues(enumValues);
        }

        if (node.has("default")) {
            JsonNode defaultNode = node.get("default");
            if (defaultNode.isTextual())
                builder.defaultValue(defaultNode.asText());
            else if (defaultNode.isNumber())
                builder.defaultValue(defaultNode.numberValue());
            else if (defaultNode.isBoolean())
                builder.defaultValue(defaultNode.booleanValue());
        }

        return builder.build();
    }

    private void extractSchemaFromContent(io.swagger.v3.oas.models.media.Content content,
            String baseName, Map<String, SchemaPropertyDto> schemas) {
        if (content == null)
            return;

        content.forEach((mediaType, mediaTypeObject) -> {
            if (mediaTypeObject.getSchema() != null) {
                String name = baseName;
                if (schemas.containsKey(name)) {
                    name = baseName + "_" + mediaType.replace("/", "_");
                }
                try {
                    schemas.put(name, convertOpenApiSchema(name, mediaTypeObject.getSchema(), name, new HashSet<>()));
                    log.debug("Extracted schema from content: {}", name);
                } catch (Exception e) {
                    log.warn("Failed to extract schema from content {}: {}", name, e.getMessage());
                }
            }
        });
    }

    private void extractResponseSchemas(io.swagger.v3.oas.models.Operation operation,
            String baseName, Map<String, SchemaPropertyDto> schemas) {
        if (operation == null || operation.getResponses() == null)
            return;

        operation.getResponses().forEach((statusCode, response) -> {
            if (response.getContent() != null) {
                extractSchemaFromContent(response.getContent(), baseName + "_" + statusCode, schemas);
            }
        });
    }

    private String fetchUrlContent(String urlString) throws Exception {
        URL url = URI.create(urlString).toURL();
        try (Scanner scanner = new Scanner(url.openStream(), StandardCharsets.UTF_8)) {
            scanner.useDelimiter("\\A");
            return scanner.hasNext() ? scanner.next() : "";
        }
    }

    private String sanitizeName(String path) {
        return path.replaceAll("[^a-zA-Z0-9]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
    }
}
