package com.ruleengine.controller;

import com.ruleengine.dto.CreateProjectRequest;
import com.ruleengine.dto.ExecutionHistoryDto;
import com.ruleengine.dto.RuleDto;
import com.ruleengine.dto.RuleProjectDto;
import com.ruleengine.dto.SchemaDto;
import com.ruleengine.service.RuleProjectService;
import com.ruleengine.service.RuleService;
import com.ruleengine.service.SchemaService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class RuleProjectController {

    private final RuleProjectService projectService;
    private final RuleService ruleService;
    private final SchemaService schemaService;

    public RuleProjectController(RuleProjectService projectService, RuleService ruleService,
            SchemaService schemaService) {
        this.projectService = projectService;
        this.ruleService = ruleService;
        this.schemaService = schemaService;
    }

    @PostMapping
    public ResponseEntity<RuleProjectDto> createProject(@Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectService.createProject(request));
    }

    @GetMapping
    public ResponseEntity<List<RuleProjectDto>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RuleProjectDto> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @GetMapping("/{id}/rules")
    public ResponseEntity<List<RuleDto>> getProjectRules(@PathVariable Long id) {
        return ResponseEntity.ok(ruleService.getRulesByProject(id));
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<com.ruleengine.dto.ExecuteRulesResponse> executeProject(
            @PathVariable Long id,
            @RequestBody com.ruleengine.dto.ExecuteRulesRequest request) {
        return ResponseEntity.ok(projectService.executeProject(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/executions")
    public ResponseEntity<List<ExecutionHistoryDto>> getProjectExecutionHistory(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getExecutionHistory(id));
    }

    @GetMapping("/{id}/executions/paged")
    public ResponseEntity<Page<ExecutionHistoryDto>> getProjectExecutionHistoryPaged(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(projectService.getExecutionHistory(id, pageable));
    }

    @GetMapping("/executions")
    public ResponseEntity<List<ExecutionHistoryDto>> getAllExecutionHistory() {
        return ResponseEntity.ok(projectService.getAllExecutionHistory());
    }

    @GetMapping("/executions/paged")
    public ResponseEntity<Page<ExecutionHistoryDto>> getAllExecutionHistoryPaged(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(projectService.getAllExecutionHistory(pageable));
    }

    @GetMapping("/executions/{executionId}")
    public ResponseEntity<ExecutionHistoryDto> getExecutionHistoryById(@PathVariable Long executionId) {
        return ResponseEntity.ok(projectService.getExecutionHistoryById(executionId));
    }

    // Project-scoped schema endpoints
    @GetMapping("/{projectId}/schemas")
    public ResponseEntity<List<SchemaDto>> getProjectSchemas(@PathVariable Long projectId) {
        return ResponseEntity.ok(schemaService.getSchemasByProject(projectId));
    }

    // Project-scoped template endpoints
    @GetMapping("/{projectId}/templates")
    public ResponseEntity<List<RuleProjectDto>> getProjectTemplates(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getTemplatesByProject(projectId));
    }

    @PostMapping("/{projectId}/templates")
    public ResponseEntity<RuleProjectDto> createTemplate(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectService.createProject(request, projectId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RuleProjectDto> updateProject(
            @PathVariable Long id,
            @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }
}
