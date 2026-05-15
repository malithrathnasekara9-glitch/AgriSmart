package com.agrsmrt.webapp.repository;

import com.agrsmrt.webapp.model.FinancialManager;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancialManagerRepository extends JpaRepository<FinancialManager, Integer> {
    java.util.Optional<FinancialManager> findByEmail(String email);
}
