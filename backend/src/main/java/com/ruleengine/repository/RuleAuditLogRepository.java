package com.ruleengine.repository;

import com.ruleengine.model.RuleAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RuleAuditLogRepository extends JpaRepository<RuleAuditLog, Long> {

    List<RuleAuditLog> findByRuleId(Long ruleId);

    Page<RuleAuditLog> findByRuleIdOrderByExecutedAtDesc(Long ruleId, Pageable pageable);

    List<RuleAuditLog> findByExecutedAtBetween(LocalDateTime start, LocalDateTime end);

    List<RuleAuditLog> findByFired(boolean fired);
}
