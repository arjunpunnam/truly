package com.ruleengine.repository;

import com.ruleengine.model.RuleProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RuleProjectRepository extends JpaRepository<RuleProject, Long> {

    // Find top-level projects (no parent)
    List<RuleProject> findByParentProjectIsNull();

    // Find templates within a project
    List<RuleProject> findByParentProjectId(Long projectId);

    // Find by parent project (including null for top-level)
    List<RuleProject> findByParentProject(RuleProject parentProject);
}
