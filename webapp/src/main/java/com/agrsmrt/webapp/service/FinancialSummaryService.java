package com.agrsmrt.webapp.service;

import com.agrsmrt.webapp.dto.FinancialSummaryDTO;
import com.agrsmrt.webapp.error.ResourceNotFoundException;
import com.agrsmrt.webapp.model.FinancialSummary;
import com.agrsmrt.webapp.model.Transaction;
import com.agrsmrt.webapp.repository.FinancialManagerRepository;
import com.agrsmrt.webapp.repository.FinancialSummaryRepository;
import com.agrsmrt.webapp.repository.WebLandPlotRepository;
import com.agrsmrt.webapp.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FinancialSummaryService {

    private final FinancialSummaryRepository summaryRepository;
    private final TransactionRepository transactionRepository;
    private final FinancialManagerRepository managerRepository;
    private final WebLandPlotRepository plotRepository;

    public FinancialSummaryService(FinancialSummaryRepository summaryRepository,
                                   TransactionRepository transactionRepository,
                                   FinancialManagerRepository managerRepository,
                                   WebLandPlotRepository plotRepository) {
        this.summaryRepository = summaryRepository;
        this.transactionRepository = transactionRepository;
        this.managerRepository = managerRepository;
        this.plotRepository = plotRepository;
    }

    public FinancialSummaryDTO getByManagerId(Integer managerId) {
        List<FinancialSummary> summaries = summaryRepository.findByManagerId(managerId);
        if (summaries.isEmpty()) throw new ResourceNotFoundException("Summary not found");
        return toDTO(summaries.get(0));
    }

    public FinancialSummaryDTO getByPlotId(Integer plotId) {
        List<FinancialSummary> summaries = summaryRepository.findByPlotId(plotId);
        if (summaries.isEmpty()) throw new ResourceNotFoundException("Summary not found");
        return toDTO(summaries.get(0));
    }

    /**
     * Calculates an aggregated summary across the entire system (all plots).
     */
    public FinancialSummaryDTO getGlobalSummary() {
        List<Transaction> transactions = transactionRepository.findAll().stream()
                .filter(t -> t.getIsDeleted() == null || !t.getIsDeleted())
                .toList();

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;

        for (Transaction t : transactions) {
            if (t.getAmount() == null) continue;
            if ("Income".equalsIgnoreCase(t.getCategory())) {
                income = income.add(t.getAmount());
            } else if ("Expense".equalsIgnoreCase(t.getCategory())) {
                expense = expense.add(t.getAmount());
            }
        }

        FinancialSummaryDTO dto = new FinancialSummaryDTO();
        dto.setTotalIncome(income);
        dto.setTotalExpense(expense);
        return dto;
    }

    /**
     * Returns a list of summaries for every LandPlot in the system.
     */
    public List<FinancialSummaryDTO> getPlotSummariesList() {
        return plotRepository.findAll().stream()
                .map(plot -> toDTO(recalculateInternal(null, plot.getId())))
                .collect(Collectors.toList());
    }

    public FinancialSummaryDTO recalculate(Integer managerId, Integer plotId) {
        return toDTO(recalculateInternal(managerId, plotId));
    }

    private FinancialSummary recalculateInternal(Integer managerId, Integer plotId) {
        List<Transaction> transactions;
        if (managerId != null) {
            transactions = transactionRepository.findByManagerIdAndPlotIdAndIsDeletedFalse(managerId, plotId);
        } else {
            transactions = transactionRepository.findByPlotIdAndIsDeletedFalse(plotId);
        }

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;

        for (Transaction t : transactions) {
            if (t.getAmount() == null) continue;
            if ("Income".equalsIgnoreCase(t.getCategory())) {
                income = income.add(t.getAmount());
            } else if ("Expense".equalsIgnoreCase(t.getCategory())) {
                expense = expense.add(t.getAmount());
            }
        }

        List<FinancialSummary> summaries = summaryRepository.findByPlotId(plotId);
        FinancialSummary summary;
        
        if (!summaries.isEmpty()) {
            summary = summaries.get(0);
        } else {
            summary = new FinancialSummary();
            summary.setPlot(plotRepository.findById(plotId)
                    .orElseThrow(() -> new ResourceNotFoundException("Plot not found")));
        }

        summary.setTotalIncome(income);
        summary.setTotalExpense(expense);

        return summaryRepository.save(summary);
    }

    private FinancialSummaryDTO toDTO(FinancialSummary summary) {
        FinancialSummaryDTO dto = new FinancialSummaryDTO();
        dto.setId(summary.getId());
        dto.setTotalIncome(summary.getTotalIncome() == null ? BigDecimal.ZERO : summary.getTotalIncome());
        dto.setTotalExpense(summary.getTotalExpense() == null ? BigDecimal.ZERO : summary.getTotalExpense());
        dto.setManagerId(summary.getManager() != null ? summary.getManager().getId() : null);
        dto.setPlotId(summary.getPlot() != null ? summary.getPlot().getId() : null);
        
        if (summary.getPlot() != null) {
            dto.setPlotName(summary.getPlot().getName());
            if (summary.getPlot().getFarmer() != null) {
                dto.setFarmerName(summary.getPlot().getFarmer().getFirstName() + " " + summary.getPlot().getFarmer().getLastName());
            }
        }
        
        return dto;
    }
}
