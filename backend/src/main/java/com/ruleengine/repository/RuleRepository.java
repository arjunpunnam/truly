package com.ruleengine.repository;

import com.ruleengine.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RuleRepository extends JpaRepository<Rule, Long> {

    List<Rule> findBySchemaId(Long schemaId);

    List<Rule> findBySchemaIdAndEnabled(Long schemaId, boolean enabled);

    List<Rule> findByCategory(String category);

    List<Rule> findByEnabled(boolean enabled);

    @Query("SELECT r FROM Rule r WHERE r.schema.id = :schemaId AND r.enabled = true ORDER BY r.priority DESC")
    List<Rule> findActiveRulesBySchemaOrderByPriority(@Param("schemaId") Long schemaId);

    boolean existsByName(String name);

    List<Rule> findByProjectId(Long projectId);
}
