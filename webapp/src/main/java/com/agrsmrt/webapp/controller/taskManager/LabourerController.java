package com.agrsmrt.webapp.controller.taskManager;

import com.agrsmrt.webapp.service.taskManager.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/labourers")
@RequiredArgsConstructor
public class LabourerController {

    private final TaskService taskService;

    @GetMapping
    public String viewLabourers(Model model) {
        model.addAttribute("labourers", taskService.getLabourersWithTasks());
        return "operations/labourer-tasks";
    }
}
