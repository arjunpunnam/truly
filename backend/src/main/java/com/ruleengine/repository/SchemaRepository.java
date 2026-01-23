package com.ruleengine.repository;

import com.ruleengine.model.Schema;
import com.ruleengine.model.SchemaSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchemaRepository extends JpaRepository<Schema, Long> {

    Optional<Schema> findByName(String name);

    List<Schema> findBySource(SchemaSource source);

    List<Schema> findByNameContainingIgnoreCase(String name);

    boolean existsByName(String name);

    // Project-scoped queries
    List<Schema> findByProjectId(Long projectId);

    long countByProjectId(Long projectId);

    List<Schema> findByProjectIsNull(); // Global schemas

    List<Schema> findByProjectIdOrProjectIsNull(Long projectId); // Project schemas + global schemas
}
