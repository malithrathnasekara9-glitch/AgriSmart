package com.agrsmrt.webapp.repository;

import com.agrsmrt.webapp.model.FinancialSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialSummaryRepository extends JpaRepository<FinancialSummary, Integer> {
    List<FinancialSummary> findByManagerId(Integer managerId);
    List<FinancialSummary> findByPlotId(Integer plotId);
    Optional<FinancialSummary> findByManagerIdAndPlotId(Integer managerId, Integer plotId);
}
