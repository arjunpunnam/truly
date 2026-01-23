package com.ruleengine.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruleengine.dto.CreateProjectRequest;
import com.ruleengine.dto.ExecuteRulesRequest;
import com.ruleengine.dto.ExecuteRulesResponse;
import com.ruleengine.dto.ExecutionHistoryDto;
import com.ruleengine.dto.RuleProjectDto;
import com.ruleengine.drools.DynamicFact;
import com.ruleengine.model.ExecutionHistory;
import com.ruleengine.model.RuleProject;
import com.ruleengine.model.Schema;
import com.ruleengine.repository.ExecutionHistoryRepository;
import com.ruleengine.repository.RuleProjectRepository;
import com.ruleengine.repository.SchemaRepository;
import com.ruleengine.service.RuleService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class RuleProjectService {

    private static final Logger log = LoggerFactory.getLogger(RuleProjectService.class);

    private final RuleProjectRepository projectRepository;
    private final SchemaRepository schemaRepository;
    private final RuleService ruleService;
    private final ExecutionHistoryRepository executionHistoryRepository;
    private final ObjectMapper objectMapper;

    public RuleProjectService(RuleProjectRepository projectRepository, SchemaRepository schemaRepository,
            RuleService ruleService, ExecutionHistoryRepository executionHistoryRepository,
            ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.schemaRepository = schemaRepository;
        this.ruleService = ruleService;
        this.executionHistoryRepository = executionHistoryRepository;
        this.objectMapper = objectMapper;
    }

    public RuleProjectDto createProject(CreateProjectRequest request) {
        return createProject(request, null);
    }

    public RuleProjectDto createProject(CreateProjectRequest request, Long parentProjectId) {
        RuleProject project = new RuleProject();
        project.setName(request.getName());
        project.setDescription(request.getDescription());

        // Set parent project if provided (for templates within projects)
        if (parentProjectId != null) {
            RuleProject parentProject = projectRepository.findById(parentProjectId)
                    .orElseThrow(() -> new EntityNotFoundException("Parent project not found: " + parentProjectId));
            project.setParentProject(parentProject);
        }

        // Handle multiple input schemas (optional)
        if (request.getInputSchemaIds() != null && !request.getInputSchemaIds().isEmpty()) {
            List<Schema> inputSchemas = request.getInputSchemaIds().stream()
                    .map(id -> schemaRepository.findById(id)
                            .orElseThrow(() -> new EntityNotFoundException("Input Schema not found: " + id)))
                    .collect(Collectors.toList());
            project.setInputSchemas(inputSchemas);
        }

        // Handle multiple output schemas (optional)
        if (request.getOutputSchemaIds() != null && !request.getOutputSchemaIds().isEmpty()) {
            List<Schema> outputSchemas = request.getOutputSchemaIds().stream()
                    .map(id -> schemaRepository.findById(id)
                            .orElseThrow(() -> new EntityNotFoundException("Output Schema not found: " + id)))
                    .collect(Collectors.toList());
            project.setOutputSchemas(outputSchemas);
        }

        // Handle allowed output types (for templates)
        if (request.getAllowedOutputTypes() != null && !request.getAllowedOutputTypes().isEmpty()) {
            project.setAllowedOutputTypes(request.getAllowedOutputTypes());
        }

        project = projectRepository.save(project);
        return toDto(project);
    }

    @Transactional(readOnly = true)
    public List<RuleProjectDto> getAllProjects() {
        // Return only top-level projects (no parent)
        return projectRepository.findByParentProjectIsNull().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get templates (RuleProjects) within a project.
     */
    @Transactional(readOnly = true)
    public List<RuleProjectDto> getTemplatesByProject(Long projectId) {
        return projectRepository.findByParentProjectId(projectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RuleProjectDto getProject(Long id) {
        RuleProject project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));
        return toDto(project);
    }

    public void deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new EntityNotFoundException("Project not found: " + id);
        }
        projectRepository.deleteById(id);
    }

    public RuleProjectDto updateProject(Long id, CreateProjectRequest request) {
        RuleProject project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));

        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        project = projectRepository.save(project);
        return toDto(project);
    }

    /**
     * Execute rules for a project with multiple input/output objects.
     */
    public ExecuteRulesResponse executeProject(Long projectId, ExecuteRulesRequest request) {
        RuleProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

        // Create a modified request that includes project rules
        ExecuteRulesRequest projectRequest = new ExecuteRulesRequest();
        projectRequest.setFacts(request.getFacts());
        projectRequest.setDryRun(request.isDryRun());

        // Get rule IDs for this project directly
        List<Long> ruleIds = new java.util.ArrayList<>(ruleService.getRulesByProject(projectId).stream()
                .map(com.ruleengine.dto.RuleDto::getId)
                .collect(Collectors.toList()));

        // Also include rules from child templates (child projects)
        List<RuleProject> templates = projectRepository.findByParentProjectId(projectId);
        for (RuleProject template : templates) {
            List<Long> templateRuleIds = ruleService.getRulesByProject(template.getId()).stream()
                    .map(com.ruleengine.dto.RuleDto::getId)
                    .collect(Collectors.toList());
            ruleIds.addAll(templateRuleIds);
        }

        projectRequest.setRuleIds(ruleIds);

        // Execute using the rule service
        ExecuteRulesResponse response = ruleService.executeRules(projectRequest);

        // Save execution history (unless dry run)
        if (!request.isDryRun()) {
            try {
                saveExecutionHistory(project, request, response);
            } catch (Exception e) {
                log.error("Failed to save execution history", e);
                // Don't fail the execution if history save fails
            }
        }

        return response;
    }

    /**
     * Save execution history to database.
     */
    private void saveExecutionHistory(RuleProject project, ExecuteRulesRequest request, ExecuteRulesResponse response) {
        try {
            ExecutionHistory history = ExecutionHistory.builder()
                    .project(project)
                    .inputFacts(objectMapper.writeValueAsString(request.getFacts()))
                    .outputFacts(objectMapper.writeValueAsString(response.getResultFacts()))
                    .firedRules(objectMapper.writeValueAsString(response.getFiredRules()))
                    .webhookResults(response.getWebhookResults() != null
                            ? objectMapper.writeValueAsString(response.getWebhookResults())
                            : null)
                    .success(response.isSuccess())
                    .dryRun(request.isDryRun())
                    .executionTimeMs(response.getExecutionTimeMs())
                    .errorMessage(response.getErrorMessage())
                    .build();

            executionHistoryRepository.save(history);
            log.debug("Saved execution history for project: {}", project.getName());
        } catch (Exception e) {
            log.error("Failed to serialize execution history", e);
            throw new RuntimeException("Failed to save execution history", e);
        }
    }

    /**
     * Get execution history for a project.
     */
    @Transactional(readOnly = true)
    public List<ExecutionHistoryDto> getExecutionHistory(Long projectId) {
        List<ExecutionHistory> history = executionHistoryRepository.findByProjectIdOrderByExecutedAtDesc(projectId);
        return history.stream()
                .map(this::toHistoryDto)
                .collect(Collectors.toList());
    }

    /**
     * Get execution history for a project with pagination.
     */
    @Transactional(readOnly = true)
    public Page<ExecutionHistoryDto> getExecutionHistory(Long projectId, Pageable pageable) {
        Page<ExecutionHistory> history = executionHistoryRepository.findByProjectIdOrderByExecutedAtDesc(projectId,
                pageable);
        return history.map(this::toHistoryDto);
    }

    /**
     * Get all execution history.
     */
    @Transactional(readOnly = true)
    public List<ExecutionHistoryDto> getAllExecutionHistory() {
        List<ExecutionHistory> history = executionHistoryRepository.findAllByOrderByExecutedAtDesc();
        return history.stream()
                .map(this::toHistoryDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all execution history with pagination.
     */
    @Transactional(readOnly = true)
    public Page<ExecutionHistoryDto> getAllExecutionHistory(Pageable pageable) {
        Page<ExecutionHistory> history = executionHistoryRepository.findAllByOrderByExecutedAtDesc(pageable);
        return history.map(this::toHistoryDto);
    }

    /**
     * Get execution history by ID.
     */
    @Transactional(readOnly = true)
    public ExecutionHistoryDto getExecutionHistoryById(Long id) {
        ExecutionHistory history = executionHistoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Execution history not found: " + id));
        return toHistoryDto(history);
    }

    /**
     * Convert ExecutionHistory entity to DTO.
     */
    private ExecutionHistoryDto toHistoryDto(ExecutionHistory history) {
        try {
            ExecutionHistoryDto.Builder builder = ExecutionHistoryDto.builder()
                    .id(history.getId())
                    .success(history.isSuccess())
                    .dryRun(history.isDryRun())
                    .executionTimeMs(history.getExecutionTimeMs())
                    .errorMessage(history.getErrorMessage())
                    .executedAt(history.getExecutedAt());

            if (history.getProject() != null) {
                builder.projectId(history.getProject().getId())
                        .projectName(history.getProject().getName());
            }

            // Parse JSON strings to objects - default to empty lists if null
            if (history.getInputFacts() != null && !history.getInputFacts().isEmpty()) {
                builder.inputFacts(objectMapper.readValue(history.getInputFacts(),
                        new TypeReference<List<Map<String, Object>>>() {
                        }));
            } else {
                builder.inputFacts(Collections.emptyList());
            }

            if (history.getOutputFacts() != null && !history.getOutputFacts().isEmpty()) {
                builder.outputFacts(objectMapper.readValue(history.getOutputFacts(),
                        new TypeReference<List<Map<String, Object>>>() {
                        }));
            } else {
                builder.outputFacts(Collections.emptyList());
            }

            if (history.getFiredRules() != null && !history.getFiredRules().isEmpty()) {
                builder.firedRules(objectMapper.readValue(history.getFiredRules(),
                        new TypeReference<List<ExecuteRulesResponse.FiredRule>>() {
                        }));
            } else {
                builder.firedRules(Collections.emptyList());
            }

            if (history.getWebhookResults() != null && !history.getWebhookResults().isEmpty()) {
                builder.webhookResults(objectMapper.readValue(history.getWebhookResults(),
                        new TypeReference<List<ExecuteRulesResponse.WebhookResult>>() {
                        }));
            }

            return builder.build();
        } catch (Exception e) {
            log.error("Failed to parse execution history", e);
            throw new RuntimeException("Failed to convert execution history to DTO", e);
        }
    }

    private RuleProjectDto toDto(RuleProject project) {
        // Calculate template count (child projects)
        List<RuleProject> templates = projectRepository.findByParentProjectId(project.getId());
        int templateCount = templates.size();

        // Calculate total rule count: direct rules + rules from all templates
        int directRuleCount = project.getRules() != null ? project.getRules().size() : 0;
        int templateRuleCount = templates.stream()
                .mapToInt(t -> t.getRules() != null ? t.getRules().size() : 0)
                .sum();
        int totalRuleCount = directRuleCount + templateRuleCount;

        // Calculate schema count (schemas directly associated with project)
        int schemaCount = (int) schemaRepository.countByProjectId(project.getId());

        RuleProjectDto.Builder builder = RuleProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .parentProjectId(project.getParentProject() != null ? project.getParentProject().getId() : null)
                .templateCount(templateCount)
                .ruleCount(totalRuleCount)
                .schemaCount(schemaCount)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt());

        // Handle multiple input schemas
        if (project.getInputSchemas() != null && !project.getInputSchemas().isEmpty()) {
            List<RuleProjectDto.SchemaInfo> inputSchemaInfos = project.getInputSchemas().stream()
                    .map(schema -> new RuleProjectDto.SchemaInfo(schema.getId(), schema.getName()))
                    .collect(Collectors.toList());
            builder.inputSchemas(inputSchemaInfos);
        }

        // Handle multiple output schemas
        if (project.getOutputSchemas() != null && !project.getOutputSchemas().isEmpty()) {
            List<RuleProjectDto.SchemaInfo> outputSchemaInfos = project.getOutputSchemas().stream()
                    .map(schema -> new RuleProjectDto.SchemaInfo(schema.getId(), schema.getName()))
                    .collect(Collectors.toList());
            builder.outputSchemas(outputSchemaInfos);
        }

        // Handle allowed output types for templates
        builder.allowedOutputTypes(project.getAllowedOutputTypes());

        // Handle RuleSet-level Drools parameters
        builder.activationGroup(project.getActivationGroup());
        builder.agendaGroup(project.getAgendaGroup());
        builder.autoFocus(project.getAutoFocus());
        builder.lockOnActive(project.getLockOnActive());

        return builder.build();
    }
}
