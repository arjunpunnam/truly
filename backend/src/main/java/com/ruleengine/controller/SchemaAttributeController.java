package com.ruleengine.controller;

import com.ruleengine.dto.*;
import com.ruleengine.service.SchemaAttributeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for schema attribute management.
 * Provides endpoints for CRUD operations on schema attributes with impact
 * analysis.
 */
@RestController
@RequestMapping("/api/schemas/{schemaId}/attributes")
public class SchemaAttributeController {

    private final SchemaAttributeService attributeService;

    public SchemaAttributeController(SchemaAttributeService attributeService) {
        this.attributeService = attributeService;
    }

    /**
     * Get all attributes for a schema.
     */
    @GetMapping
    public ResponseEntity<List<SchemaPropertyDto>> getAttributes(@PathVariable Long schemaId) {
        List<SchemaPropertyDto> attributes = attributeService.getAttributes(schemaId);
        return ResponseEntity.ok(attributes);
    }

    /**
     * Add a new attribute to a schema.
     */
    @PostMapping
    public ResponseEntity<SchemaPropertyDto> addAttribute(
            @PathVariable Long schemaId,
            @RequestBody SchemaPropertyDto attribute) {
        SchemaPropertyDto created = attributeService.addAttribute(schemaId, attribute);
        return ResponseEntity.ok(created);
    }

    /**
     * Update an existing attribute.
     * Note: This only updates the schema, not the rules.
     * Use the impact endpoint first, then apply-changes to propagate.
     */
    @PutMapping("/{attributeName}")
    public ResponseEntity<SchemaPropertyDto> updateAttribute(
            @PathVariable Long schemaId,
            @PathVariable String attributeName,
            @RequestBody SchemaPropertyDto attribute) {
        SchemaPropertyDto updated = attributeService.updateAttribute(schemaId, attributeName, attribute);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete an attribute from a schema.
     * Note: This only updates the schema, not the rules.
     * Use the impact endpoint first, then apply-changes to propagate.
     */
    @DeleteMapping("/{attributeName}")
    public ResponseEntity<Void> deleteAttribute(
            @PathVariable Long schemaId,
            @PathVariable String attributeName) {
        attributeService.deleteAttribute(schemaId, attributeName);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get impact analysis for an attribute change or deletion.
     * Returns a list of affected rules and their usages of this attribute.
     */
    @GetMapping("/{attributeName}/impact")
    public ResponseEntity<AttributeImpactDto> analyzeImpact(
            @PathVariable Long schemaId,
            @PathVariable String attributeName) {
        AttributeImpactDto impact = attributeService.analyzeImpact(schemaId, attributeName);
        return ResponseEntity.ok(impact);
    }

    /**
     * Apply attribute changes and propagate to affected rules.
     * This updates both the schema and all rules that use the attribute.
     */
    @PostMapping("/{attributeName}/apply-changes")
    public ResponseEntity<ApplyAttributeChangeResponse> applyChanges(
            @PathVariable Long schemaId,
            @PathVariable String attributeName,
            @RequestBody ApplyAttributeChangeRequest request) {
        // Ensure the attribute name is set from the path
        if (request.getOldName() == null) {
            request.setOldName(attributeName);
        }

        ApplyAttributeChangeResponse response = attributeService.applyAttributeChange(schemaId, request);
        return ResponseEntity.ok(response);
    }
}
