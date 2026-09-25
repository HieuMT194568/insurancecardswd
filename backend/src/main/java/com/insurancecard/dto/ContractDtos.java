package com.insurancecard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.dto.AccidentDtos.AccidentResponse;
import com.insurancecard.dto.CompensationDtos.CompensationResponse;
import com.insurancecard.dto.PaymentDtos.PaymentResponse;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ContractDtos {

    private ContractDtos() {}

    /** customerId bắt buộc khi nhân viên tạo; khách hàng tự tạo thì lấy từ phiên đăng nhập. */
    public record ContractCreateRequest(
            Long customerId,

            @NotNull(message = "Vui lòng chọn xe")
            Long vehicleId,

            @NotNull(message = "Vui lòng chọn gói bảo hiểm")
            Long productId,

            @NotNull(message = "Vui lòng chọn ngày bắt đầu hiệu lực")
            LocalDate startDate,

            @NotNull(message = "Vui lòng chọn thời hạn")
            @Min(value = 1, message = "Thời hạn từ 1 đến 3 năm")
            @Max(value = 3, message = "Thời hạn từ 1 đến 3 năm")
            Integer termYears,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note) {}

    public record ContractUpdateRequest(
            @NotNull(message = "Vui lòng chọn xe")
            Long vehicleId,

            @NotNull(message = "Vui lòng chọn gói bảo hiểm")
            Long productId,

            @NotNull(message = "Vui lòng chọn ngày bắt đầu hiệu lực")
            LocalDate startDate,

            @NotNull(message = "Vui lòng chọn thời hạn")
            @Min(value = 1, message = "Thời hạn từ 1 đến 3 năm")
            @Max(value = 3, message = "Thời hạn từ 1 đến 3 năm")
            Integer termYears,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note) {}

    public record RenewRequest(
            @NotNull(message = "Vui lòng chọn thời hạn gia hạn")
            @Min(value = 1, message = "Thời hạn từ 1 đến 3 năm")
            @Max(value = 3, message = "Thời hạn từ 1 đến 3 năm")
            Integer termYears) {}

    public record CancelRequest(
            @NotBlank(message = "Vui lòng nhập lý do huỷ")
            @Size(min = 10, max = 500, message = "Lý do huỷ từ 10 đến 500 ký tự")
            String reason) {}

    public record PayRequest(
            @NotNull(message = "Vui lòng chọn phương thức thanh toán")
            PaymentMethod method) {}

    public record ContractResponse(
            Long id,
            String contractNumber,
            ContractStatus status,
            Long customerId,
            String customerCode,
            String customerName,
            String customerPhone,
            Long vehicleId,
            String licensePlate,
            String vehicleName,
            Integer engineCapacity,
            Long productId,
            String productCode,
            String productName,
            LocalDate startDate,
            LocalDate endDate,
            Integer termYears,
            BigDecimal premiumAmount,
            BigDecimal maxCompensation,
            Long renewedFromId,
            String cancelReason,
            LocalDateTime cancelledAt,
            String note,
            LocalDateTime createdAt,
            Long daysUntilExpiry) {}

    /** Chi tiết hợp đồng + các thao tác được phép (để frontend bật/tắt nút). */
    public record ContractDetailResponse(
            ContractResponse contract,
            String renewedFromNumber,
            Long renewedById,
            String renewedByNumber,
            BigDecimal usedCompensation,
            BigDecimal remainingCompensation,
            BigDecimal estimatedRefund,
            boolean canPay,
            boolean canRenew,
            String renewBlockedReason,
            boolean canCancel,
            boolean canEdit,
            List<PaymentResponse> payments,
            List<AccidentResponse> accidents,
            List<CompensationResponse> compensations) {}
}
