package com.ruleengine.controller;

import com.ruleengine.dto.ProjectAuditLogDto;
import com.ruleengine.service.ProjectAuditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for project audit logs.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/audit")
public class ProjectAuditController {

    private final ProjectAuditService auditService;

    public ProjectAuditController(ProjectAuditService auditService) {
        this.auditService = auditService;
    }

    /**
     * Get all audit logs for a project.
     */
    @GetMapping
    public ResponseEntity<List<ProjectAuditLogDto>> getAuditLogs(@PathVariable Long projectId) {
        return ResponseEntity.ok(auditService.getAuditLogs(projectId));
    }

    /**
     * Get paginated audit logs for a project.
     */
    @GetMapping("/paged")
    public ResponseEntity<Page<ProjectAuditLogDto>> getAuditLogsPaged(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(auditService.getAuditLogs(projectId, pageRequest));
    }

    /**
     * Get audit log count for a project.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> getAuditLogCount(@PathVariable Long projectId) {
        return ResponseEntity.ok(auditService.getAuditLogCount(projectId));
    }
}
