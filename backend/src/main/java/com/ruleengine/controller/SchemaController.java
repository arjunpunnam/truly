package com.ruleengine.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ruleengine.dto.SchemaDto;
import com.ruleengine.dto.SchemaPreviewDto;
import com.ruleengine.dto.SchemaPropertyDto;
import com.ruleengine.service.SchemaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schemas")
public class SchemaController {

    private final SchemaService schemaService;

    public SchemaController(SchemaService schemaService) {
        this.schemaService = schemaService;
    }

    @GetMapping
    public List<SchemaDto> getAllSchemas() {
        return schemaService.getAllSchemas();
    }

    @GetMapping("/{id}")
    public SchemaDto getSchema(@PathVariable Long id) {
        return schemaService.getSchema(id);
    }

    @PostMapping("/import/openapi/preview")
    public ResponseEntity<SchemaPreviewDto> previewOpenApi(@RequestBody Map<String, String> request) {
        if (request == null || !request.containsKey("content")) {
            return ResponseEntity.badRequest().body(new SchemaPreviewDto("Error", List.of()));
        }
        String content = request.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new SchemaPreviewDto("Error", List.of()));
        }
        try {
            List<String> entities = schemaService.previewOpenApi(content);
            System.out.println("Preview endpoint returning " + entities.size() + " entities");
            SchemaPreviewDto response = new SchemaPreviewDto("Preview", entities);
            System.out.println("Response DTO entities count: " + (response.getEntities() != null ? response.getEntities().size() : 0));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("Preview endpoint error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new SchemaPreviewDto("Error: " + e.getMessage(), List.of()));
        }
    }

    @PostMapping(value = "/import/openapi", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<SchemaDto>> importOpenApi(
            @RequestParam String name,
            @RequestParam(required = false) List<String> selectedEntities,
            @RequestPart(required = false) MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            List<SchemaDto> schemas = schemaService.importFromOpenApi(name, content, selectedEntities);
            return ResponseEntity.status(HttpStatus.CREATED).body(schemas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import/openapi/content")
    public ResponseEntity<List<SchemaDto>> importOpenApiContent(@RequestBody Map<String, Object> request) {
        if (request == null) {
            return ResponseEntity.badRequest().build();
        }
        String name = (String) request.get("name");
        String content = (String) request.get("content");
        List<String> selectedEntities = (List<String>) request.get("selectedEntities");
        String group = (String) request.get("group");
        
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Long projectId = request.get("projectId") != null ? 
                Long.valueOf(request.get("projectId").toString()) : null;
            List<SchemaDto> schemas = schemaService.importFromOpenApi(name, content, selectedEntities, group, projectId);
            return ResponseEntity.status(HttpStatus.CREATED).body(schemas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping(value = "/import/json-schema", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SchemaDto> importJsonSchema(
            @RequestParam String name,
            @RequestPart(required = false) MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            SchemaDto schema = schemaService.importFromJsonSchema(name, content);
            return ResponseEntity.status(HttpStatus.CREATED).body(schema);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import/json-schema/content")
    public ResponseEntity<SchemaDto> importJsonSchemaContent(@RequestBody Map<String, String> request) {
        if (request == null) {
            return ResponseEntity.badRequest().build();
        }
        String name = request.get("name");
        String content = request.get("content");
        String group = request.get("group");
        
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Long projectId = request.get("projectId") != null ? 
                Long.valueOf(request.get("projectId").toString()) : null;
            SchemaDto schema = schemaService.importFromJsonSchema(name, content, group, projectId);
            return ResponseEntity.status(HttpStatus.CREATED).body(schema);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import/example")
    public ResponseEntity<SchemaDto> inferFromExample(@RequestBody Map<String, String> request) {
        if (request == null) {
            return ResponseEntity.badRequest().build();
        }
        String name = request.get("name");
        String example = request.get("example");
        String group = request.get("group");
        
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (example == null || example.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        try {
            Long projectId = request.get("projectId") != null ? 
                Long.valueOf(request.get("projectId").toString()) : null;
            SchemaDto schema = schemaService.inferFromExample(name, example, group, projectId);
            return ResponseEntity.status(HttpStatus.CREATED).body(schema);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/manual")
    public ResponseEntity<SchemaDto> createManual(@RequestBody CreateManualSchemaRequest request) {
        SchemaDto schema = schemaService.createManual(
                request.getName(),
                request.getDescription(),
                request.getSchema(),
                request.getGroup(),
                request.getProjectId());
        return ResponseEntity.status(HttpStatus.CREATED).body(schema);
    }

    @PutMapping("/{id}")
    public SchemaDto updateSchema(
            @PathVariable Long id,
            @RequestBody UpdateSchemaRequest request) {
        return schemaService.updateSchema(
                id,
                request.getName(),
                request.getDescription(),
                request.getSchema(),
                request.getGroup(),
                request.getProjectId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchema(@PathVariable Long id) {
        schemaService.deleteSchema(id);
        return ResponseEntity.noContent().build();
    }

    // Request DTOs
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateManualSchemaRequest {
        private String name;
        private String description;
        private String group;
        private Long projectId;
        private SchemaPropertyDto schema;

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

        public SchemaPropertyDto getSchema() {
            return schema;
        }

        public void setSchema(SchemaPropertyDto schema) {
            this.schema = schema;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UpdateSchemaRequest {
        private String name;
        private String description;
        private String group;
        private Long projectId;
        private SchemaPropertyDto schema;

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

        public SchemaPropertyDto getSchema() {
            return schema;
        }

        public void setSchema(SchemaPropertyDto schema) {
            this.schema = schema;
        }
    }
}
