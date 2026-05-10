package com.agrsmrt.webapp.repository.taskManager;

import com.agrsmrt.webapp.model.LabourManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LabourManagerRepository extends JpaRepository<LabourManager, Integer> {
    Optional<LabourManager> findByEmail(String email);
}
