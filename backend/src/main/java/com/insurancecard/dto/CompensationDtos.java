package com.insurancecard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.ClaimStatus;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.dto.AccidentDtos.AccidentRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class CompensationDtos {

    private CompensationDtos() {}

    /**
     * Yêu cầu bồi thường: chọn 1 trong 2 - accidentId (tai nạn đã khai báo)
     * hoặc accident (khai báo tai nạn mới cùng lúc).
     */
    public record ClaimRequest(
            Long accidentId,

            @Valid
            AccidentRequest accident,

            @NotNull(message = "Vui lòng nhập số tiền yêu cầu bồi thường")
            @DecimalMin(value = "10000", message = "Số tiền yêu cầu tối thiểu 10.000 VND")
            @DecimalMax(value = "10000000000", message = "Số tiền yêu cầu tối đa 10.000.000.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Số tiền phải là số nguyên (VND)")
            BigDecimal requestedAmount,

            @NotBlank(message = "Vui lòng nhập nội dung yêu cầu")
            @Size(min = 20, max = 1000, message = "Nội dung yêu cầu từ 20 đến 1000 ký tự")
            String description) {}

    public record ApproveRequest(
            @NotNull(message = "Vui lòng nhập số tiền duyệt chi")
            @DecimalMin(value = "10000", message = "Số tiền duyệt tối thiểu 10.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Số tiền phải là số nguyên (VND)")
            BigDecimal approvedAmount,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note) {}

    public record RejectRequest(
            @NotBlank(message = "Vui lòng nhập lý do từ chối")
            @Size(min = 10, max = 500, message = "Lý do từ chối từ 10 đến 500 ký tự")
            String note) {}

    public record PayoutRequest(
            @NotNull(message = "Vui lòng chọn phương thức chi trả")
            PaymentMethod method) {}

    public record CompensationResponse(
            Long id,
            String claimCode,
            Long accidentId,
            String accidentCode,
            LocalDateTime accidentTime,
            AccidentStatus accidentStatus,
            BigDecimal estimatedDamage,
            Long contractId,
            String contractNumber,
            Long customerId,
            String customerName,
            String licensePlate,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            String description,
            ClaimStatus status,
            String resolutionNote,
            LocalDateTime resolvedAt,
            String resolvedByName,
            LocalDateTime paidAt,
            LocalDateTime createdAt) {}
}
