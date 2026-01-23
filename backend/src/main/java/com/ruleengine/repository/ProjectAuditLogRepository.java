package com.ruleengine.repository;

import com.ruleengine.model.ProjectAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProjectAuditLogRepository extends JpaRepository<ProjectAuditLog, Long> {

    List<ProjectAuditLog> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    Page<ProjectAuditLog> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    @Query("SELECT p FROM ProjectAuditLog p WHERE p.project.id = :projectId AND p.createdAt >= :since ORDER BY p.createdAt DESC")
    List<ProjectAuditLog> findByProjectIdSince(@Param("projectId") Long projectId, @Param("since") LocalDateTime since);

    @Query("SELECT p FROM ProjectAuditLog p WHERE p.project.id = :projectId AND p.entityType = :entityType ORDER BY p.createdAt DESC")
    List<ProjectAuditLog> findByProjectIdAndEntityType(
            @Param("projectId") Long projectId,
            @Param("entityType") ProjectAuditLog.AuditEntityType entityType);

    @Query("SELECT COUNT(p) FROM ProjectAuditLog p WHERE p.project.id = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);
}
