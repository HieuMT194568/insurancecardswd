package com.insurancecard.dto;

import java.math.BigDecimal;
import java.util.List;

import com.insurancecard.dto.ContractDtos.ContractResponse;

public final class DashboardDtos {

    private DashboardDtos() {}

    public record CustomerDashboard(
            long vehicleCount,
            long activeContracts,
            long pendingPaymentContracts,
            long pendingClaims,
            long unpaidPunishments,
            int renewalWindowDays,
            List<ContractResponse> expiringSoon) {}

    public record StaffDashboard(
            long activeCustomers,
            long activeContracts,
            long pendingPaymentContracts,
            long reportedAccidents,
            long pendingClaims,
            long approvedClaims,
            long unpaidPunishments,
            BigDecimal premiumRevenueThisMonth,
            BigDecimal compensationPaidThisMonth,
            int renewalWindowDays,
            List<ContractResponse> expiringSoon) {}
}
