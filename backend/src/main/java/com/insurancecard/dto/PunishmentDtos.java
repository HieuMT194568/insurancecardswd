package com.insurancecard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.domain.enums.ViolationType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

public final class PunishmentDtos {

    private PunishmentDtos() {}

    /** dueDate để trống -> hệ thống tự tính = ngày vi phạm + PENALTY_DUE_DAYS. */
    public record PunishmentRequest(
            @NotNull(message = "Vui lòng chọn khách hàng")
            Long customerId,

            Long contractId,

            @NotNull(message = "Vui lòng chọn loại vi phạm")
            ViolationType violationType,

            @NotBlank(message = "Vui lòng nhập nội dung vi phạm")
            @Size(min = 10, max = 500, message = "Nội dung vi phạm từ 10 đến 500 ký tự")
            String description,

            @NotNull(message = "Vui lòng nhập ngày vi phạm")
            @PastOrPresent(message = "Ngày vi phạm không được ở tương lai")
            LocalDate violationDate,

            @NotNull(message = "Vui lòng nhập số tiền phạt")
            @DecimalMin(value = "10000", message = "Số tiền phạt từ 10.000 đến 100.000.000 VND")
            @DecimalMax(value = "100000000", message = "Số tiền phạt từ 10.000 đến 100.000.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Số tiền phạt phải là số nguyên (VND)")
            BigDecimal amount,

            LocalDate dueDate) {}

    public record WaiveRequest(
            @NotBlank(message = "Vui lòng nhập lý do miễn phạt")
            @Size(min = 10, max = 500, message = "Lý do miễn phạt từ 10 đến 500 ký tự")
            String note) {}

    public record PunishmentResponse(
            Long id,
            String punishmentCode,
            Long customerId,
            String customerCode,
            String customerName,
            Long contractId,
            String contractNumber,
            ViolationType violationType,
            String description,
            LocalDate violationDate,
            BigDecimal amount,
            LocalDate dueDate,
            boolean overdue,
            PunishmentStatus status,
            String resolutionNote,
            LocalDateTime resolvedAt,
            LocalDateTime createdAt) {}
}
