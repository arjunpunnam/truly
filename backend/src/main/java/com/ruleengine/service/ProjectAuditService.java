package com.ruleengine.service;

import com.ruleengine.dto.ProjectAuditLogDto;
import com.ruleengine.model.ProjectAuditLog;
import com.ruleengine.model.RuleProject;
import com.ruleengine.repository.ProjectAuditLogRepository;
import com.ruleengine.repository.RuleProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing project audit logs.
 */
@Service
@Transactional
public class ProjectAuditService {

    private static final Logger log = LoggerFactory.getLogger(ProjectAuditService.class);

    private final ProjectAuditLogRepository auditRepository;
    private final RuleProjectRepository projectRepository;

    public ProjectAuditService(ProjectAuditLogRepository auditRepository, RuleProjectRepository projectRepository) {
        this.auditRepository = auditRepository;
        this.projectRepository = projectRepository;
    }

    /**
     * Log an audit event for a project.
     */
    public void logAudit(Long projectId, ProjectAuditLog.AuditAction action,
            ProjectAuditLog.AuditEntityType entityType, Long entityId,
            String entityName, String details) {
        logAudit(projectId, action, entityType, entityId, entityName, details, null, null);
    }

    /**
     * Log an audit event with before/after values.
     */
    public void logAudit(Long projectId, ProjectAuditLog.AuditAction action,
            ProjectAuditLog.AuditEntityType entityType, Long entityId,
            String entityName, String details,
            String previousValue, String newValue) {
        try {
            RuleProject project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));

            ProjectAuditLog auditLog = ProjectAuditLog.builder()
                    .project(project)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .entityName(entityName)
                    .details(details)
                    .previousValue(previousValue)
                    .newValue(newValue)
                    .performedBy("system") // Could be extended for user tracking
                    .build();

            auditRepository.save(auditLog);
            log.debug("Logged audit: {} {} {} in project {}", action, entityType, entityName, projectId);
        } catch (Exception e) {
            log.error("Failed to save audit log", e);
            // Don't throw - audit logging should not break main operations
        }
    }

    /**
     * Get audit logs for a project.
     */
    @Transactional(readOnly = true)
    public List<ProjectAuditLogDto> getAuditLogs(Long projectId) {
        return auditRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get audit logs for a project with pagination.
     */
    @Transactional(readOnly = true)
    public Page<ProjectAuditLogDto> getAuditLogs(Long projectId, Pageable pageable) {
        return auditRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable)
                .map(this::toDto);
    }

    /**
     * Get audit logs for a project since a specific time.
     */
    @Transactional(readOnly = true)
    public List<ProjectAuditLogDto> getAuditLogsSince(Long projectId, LocalDateTime since) {
        return auditRepository.findByProjectIdSince(projectId, since).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get audit logs filtered by entity type.
     */
    @Transactional(readOnly = true)
    public List<ProjectAuditLogDto> getAuditLogsByEntityType(Long projectId,
            ProjectAuditLog.AuditEntityType entityType) {
        return auditRepository.findByProjectIdAndEntityType(projectId, entityType).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get total audit log count for a project.
     */
    @Transactional(readOnly = true)
    public long getAuditLogCount(Long projectId) {
        return auditRepository.countByProjectId(projectId);
    }

    private ProjectAuditLogDto toDto(ProjectAuditLog log) {
        return ProjectAuditLogDto.builder()
                .id(log.getId())
                .projectId(log.getProject().getId())
                .projectName(log.getProject().getName())
                .action(log.getAction().name())
                .entityType(log.getEntityType().name())
                .entityId(log.getEntityId())
                .entityName(log.getEntityName())
                .details(log.getDetails())
                .previousValue(log.getPreviousValue())
                .newValue(log.getNewValue())
                .performedBy(log.getPerformedBy())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
