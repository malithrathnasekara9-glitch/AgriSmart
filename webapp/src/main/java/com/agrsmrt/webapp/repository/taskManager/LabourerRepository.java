package com.agrsmrt.webapp.repository.taskManager;

import com.agrsmrt.webapp.model.Labourer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LabourerRepository extends JpaRepository<Labourer, Integer> {
}
