package com.agrsmrt.webapp.dto.taskManager;

import lombok.Data;
import java.util.List;

@Data
public class LabourerTasksDto {
    private Integer labourerId;
    private String nic;
    private String roleType;
    private List<TaskDto> assignedTasks;
    private int taskCount;
}
