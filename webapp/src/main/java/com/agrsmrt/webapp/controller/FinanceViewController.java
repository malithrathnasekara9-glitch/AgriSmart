package com.agrsmrt.webapp.controller;

import com.agrsmrt.webapp.dto.FinancialSummaryDTO;
import com.agrsmrt.webapp.dto.TransactionCreateDTO;
import com.agrsmrt.webapp.dto.TransactionResponseDTO;
import com.agrsmrt.webapp.error.ResourceNotFoundException;
import com.agrsmrt.webapp.repository.FarmerRepository;
import com.agrsmrt.webapp.repository.WebLandPlotRepository;
import com.agrsmrt.webapp.model.LandPlot;
import com.agrsmrt.webapp.model.Farmer;
import com.agrsmrt.webapp.service.FinancialSummaryService;
import com.agrsmrt.webapp.service.TransactionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.agrsmrt.webapp.security.CustomUserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;


import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/finance") // Master Finance Controller
public class FinanceViewController {

    private final TransactionService transactionService;
    private final FinancialSummaryService summaryService;
    private final FarmerRepository farmerRepository;
    private final WebLandPlotRepository plotRepository;

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;


    public FinanceViewController(TransactionService transactionService,
                                 FinancialSummaryService summaryService,
                                 FarmerRepository farmerRepository,
                                 WebLandPlotRepository plotRepository) {
        this.transactionService = transactionService;
        this.summaryService = summaryService;
        this.farmerRepository = farmerRepository;
        this.plotRepository = plotRepository;
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public String baseRedirect() {
        return "redirect:/finance/home";
    }

    @GetMapping("/home")
    public String dashboardEntry(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        Integer managerId = userDetails.getId();

        // System-wide Master Summary
        FinancialSummaryDTO systemSummary = summaryService.getGlobalSummary();
        
        // Plot-by-Plot Breakdown
        List<FinancialSummaryDTO> plotSummaries = summaryService.getPlotSummariesList();
        
        // System-wide Recent Activities
        List<TransactionResponseDTO> all = transactionService.getAllSystemTransactions();
        List<TransactionResponseDTO> recent = all.stream()
                .sorted(Comparator.comparing(TransactionResponseDTO::getTransactionDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .collect(Collectors.toList());

        // Resolve first available plot context for "Log Transaction" and other links
        LandPlot defaultPlot = plotRepository.findAll().stream().findFirst().orElse(null);
        Integer plotId = defaultPlot != null ? defaultPlot.getId() : 1;
        Farmer farmer = defaultPlot != null ? defaultPlot.getFarmer() : farmerRepository.findAll().stream().findFirst().orElse(null);
        Integer farmerId = farmer != null ? farmer.getId() : 1;

        addCommon(model, farmer, managerId, farmerId, plotId);
        model.addAttribute("summary", systemSummary);
        model.addAttribute("plotSummaries", plotSummaries);
        model.addAttribute("recentTransactions", recent);
        return "finance/finance-dashboard";
    }


    @GetMapping("/transactions")
    public String transactions(@AuthenticationPrincipal CustomUserDetails userDetails,
                               @RequestParam(required = false) Integer farmerId,
                               @RequestParam(required = false) Integer plotId,
                               @RequestParam(required = false) String type,
                               Model model) {
        Integer managerId = userDetails.getId();
        
        List<TransactionResponseDTO> all;
        if (plotId != null) {
            all = transactionService.getByPlotId(plotId);
        } else {
            all = transactionService.getAllSystemTransactions();
        }

        if (type != null && !type.isBlank()) {
            all = all.stream()
                    .filter(t -> t.getCategory().equalsIgnoreCase(type))
                    .collect(Collectors.toList());
        }

        BigDecimal inc = all.stream()
                .filter(t -> t.getCategory().equalsIgnoreCase("Income"))
                .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exp = all.stream()
                .filter(t -> t.getCategory().equalsIgnoreCase("Expense"))
                .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Resolve context for sidebar/header
        LandPlot plot = (plotId != null) ? plotRepository.findById(plotId).orElse(null) : null;
        Farmer farmer = (plot != null) ? plot.getFarmer() : (farmerId != null ? farmerRepository.findById(farmerId).orElse(null) : null);
        
        if (farmer == null) farmer = farmerRepository.findAll().stream().findFirst().orElse(null);
        if (plotId == null) plotId = plot != null ? plot.getId() : 1;
        if (farmerId == null) farmerId = farmer != null ? farmer.getId() : 1;

        addCommon(model, farmer, managerId, farmerId, plotId);
        model.addAttribute("transactions", all);
        model.addAttribute("totalIncome", inc);
        model.addAttribute("totalExpense", exp);
        model.addAttribute("type", type);
        return "finance/transactions";
    }

    @GetMapping("/transactions/new")
    public String newTransaction(@AuthenticationPrincipal CustomUserDetails userDetails,
                                 @RequestParam Integer farmerId,
                                 @RequestParam Integer plotId,
                                 Model model) {
        Integer managerId = userDetails.getId();
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found"));

        TransactionCreateDTO dto = new TransactionCreateDTO();
        dto.setManagerId(managerId);
        dto.setPlotId(plotId);
        dto.setCategory("Expense");
        dto.setTransactionDate(LocalDate.now());

        addCommon(model, farmer, managerId, farmerId, plotId);
        model.addAttribute("transaction", dto);
        model.addAttribute("formAction", "/finance/transactions?farmerId=" + farmerId);
        return "finance/transaction-form";
    }

    @PostMapping("/transactions")
    public String createTransaction(@ModelAttribute("transaction") TransactionCreateDTO dto,
                                    @RequestParam Integer farmerId) {
        transactionService.create(dto);
        return "redirect:/finance/transactions?farmerId=" + farmerId
                + "&plotId=" + dto.getPlotId();
    }

    @GetMapping("/reports")
    public String reports(@AuthenticationPrincipal CustomUserDetails userDetails,
                          @RequestParam(required = false) Integer farmerId,
                          @RequestParam(required = false) Integer plotId,
                          Model model) throws com.fasterxml.jackson.core.JsonProcessingException {
        Integer managerId = userDetails.getId();
        
        FinancialSummaryDTO summary;
        List<TransactionResponseDTO> transactions;
        
        if (plotId != null) {
            summary = summaryService.recalculate(null, plotId);
            transactions = transactionService.getByPlotId(plotId);
        } else {
            summary = summaryService.getGlobalSummary();
            transactions = transactionService.getAllSystemTransactions();
        }

        String transactionsJson = objectMapper.copy()
                .findAndRegisterModules()
                .writeValueAsString(transactions);

        // Contextual Fallback
        Farmer farmer = (farmerId != null) ? farmerRepository.findById(farmerId).orElse(null) : null;
        if (farmer == null) farmer = farmerRepository.findAll().stream().findFirst().orElse(null);
        if (farmerId == null) farmerId = farmer != null ? farmer.getId() : 1;
        if (plotId == null) plotId = 1;

        addCommon(model, farmer, managerId, farmerId, plotId);
        model.addAttribute("summary", summary);
        model.addAttribute("transactionsJson", transactionsJson);
        return "finance/reports";
    }


    @GetMapping("/transactions/{id}/edit")
    public String editTransaction(@AuthenticationPrincipal CustomUserDetails userDetails,
                                  @PathVariable Integer id,
                                  @RequestParam Integer farmerId,
                                  @RequestParam Integer plotId,
                                  Model model) {
        Integer managerId = userDetails.getId();
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found"));

        TransactionResponseDTO t = transactionService.getById(id);

        TransactionCreateDTO dto = new TransactionCreateDTO();
        dto.setAmount(t.getAmount());
        dto.setDescription(t.getDescription());
        dto.setCategory(t.getCategory());
        dto.setTransactionDate(t.getTransactionDate());
        dto.setManagerId(t.getManagerId());
        dto.setPlotId(t.getPlotId());
        dto.setPayrollId(t.getPayrollId());
        dto.setItemId(t.getItemId());

        addCommon(model, farmer, managerId, farmerId, plotId);
        model.addAttribute("transaction", dto);
        model.addAttribute("editId", id);
        model.addAttribute("formAction", "/finance/transactions/" + id + "?farmerId=" + farmerId);
        return "finance/transaction-form";
    }

    @PostMapping("/transactions/{id}")
    public String updateTransaction(@PathVariable Integer id,
                                    @ModelAttribute("transaction") TransactionCreateDTO dto,
                                    @RequestParam Integer farmerId) {
        transactionService.update(id, dto);
        return "redirect:/finance/transactions?farmerId=" + farmerId + "&plotId=" + dto.getPlotId();
    }

    @PostMapping("/transactions/{id}/delete")
    public String softDeleteTransaction(@PathVariable Integer id,
                                        @RequestParam Integer farmerId,
                                        @RequestParam Integer plotId) {
        TransactionResponseDTO t = transactionService.getById(id);
        transactionService.softDelete(id);
        return "redirect:/finance/transactions?farmerId=" + farmerId + "&plotId=" + plotId;
    }




    private void addCommon(Model model, Farmer farmer, Integer managerId, Integer farmerId, Integer plotId) {
        String first = (farmer != null && farmer.getFirstName() != null) ? farmer.getFirstName() : "System";
        String last = (farmer != null && farmer.getLastName() != null) ? farmer.getLastName() : "Manager";

        model.addAttribute("farmerName", (first + " " + last).trim());
        model.addAttribute("managerId", managerId);
        model.addAttribute("farmerId", farmerId);
        model.addAttribute("plotId", plotId);
    }
}
