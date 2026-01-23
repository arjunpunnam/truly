package com.ruleengine.repository;

import com.ruleengine.model.ExecutionHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionHistoryRepository extends JpaRepository<ExecutionHistory, Long> {

    List<ExecutionHistory> findByProjectIdOrderByExecutedAtDesc(Long projectId);

    Page<ExecutionHistory> findByProjectIdOrderByExecutedAtDesc(Long projectId, Pageable pageable);

    List<ExecutionHistory> findAllByOrderByExecutedAtDesc();

    Page<ExecutionHistory> findAllByOrderByExecutedAtDesc(Pageable pageable);
}
