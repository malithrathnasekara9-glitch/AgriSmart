package com.agrsmrt.webapp.controller;

import com.agrsmrt.webapp.dto.FinancialSummaryDTO;
import com.agrsmrt.webapp.service.FinancialSummaryService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/financial-summaries")
public class FinancialSummaryController { // API Controller

    private final FinancialSummaryService service;

    public FinancialSummaryController(FinancialSummaryService service) {
        this.service = service;
    }

    @GetMapping("/manager/{managerId}")
    public FinancialSummaryDTO getByManager(@PathVariable Integer managerId) {
        return service.getByManagerId(managerId);
    }

    @GetMapping("/plot/{plotId}")
    public FinancialSummaryDTO getByPlot(@PathVariable Integer plotId) {
        return service.getByPlotId(plotId);
    }

    @PostMapping("/recalculate")
    public FinancialSummaryDTO recalculate(@RequestParam Integer managerId,
                                           @RequestParam Integer plotId) {
        return service.recalculate(managerId, plotId);
    }
}
