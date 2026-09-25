package com.insurancecard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.DamageType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

public final class AccidentDtos {

    private AccidentDtos() {}

    public record AccidentRequest(
            @NotNull(message = "Vui lòng chọn hợp đồng")
            Long contractId,

            @NotNull(message = "Vui lòng nhập thời điểm xảy ra tai nạn")
            @PastOrPresent(message = "Thời điểm tai nạn không được ở tương lai")
            LocalDateTime accidentTime,

            @NotBlank(message = "Vui lòng nhập địa điểm")
            @Size(min = 5, max = 255, message = "Địa điểm từ 5 đến 255 ký tự")
            String location,

            @NotBlank(message = "Vui lòng mô tả diễn biến tai nạn")
            @Size(min = 20, max = 1000, message = "Mô tả từ 20 đến 1000 ký tự")
            String description,

            @NotNull(message = "Vui lòng chọn loại thiệt hại")
            DamageType damageType,

            @NotNull(message = "Vui lòng nhập thiệt hại ước tính")
            @DecimalMin(value = "0", message = "Thiệt hại ước tính từ 0 đến 10.000.000.000 VND")
            @DecimalMax(value = "10000000000", message = "Thiệt hại ước tính từ 0 đến 10.000.000.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Thiệt hại ước tính phải là số nguyên (VND)")
            BigDecimal estimatedDamage,

            @Size(max = 50, message = "Số biên bản công an tối đa 50 ký tự")
            String policeReportNumber) {}

    /** status: VERIFIED (xác minh) hoặc REJECTED (bác bỏ - bắt buộc ghi chú). */
    public record AccidentResolveRequest(
            @NotNull(message = "Vui lòng chọn kết quả xử lý")
            AccidentStatus status,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note) {}

    public record AccidentResponse(
            Long id,
            String accidentCode,
            Long contractId,
            String contractNumber,
            Long customerId,
            String customerName,
            String licensePlate,
            LocalDateTime accidentTime,
            String location,
            String description,
            DamageType damageType,
            BigDecimal estimatedDamage,
            String policeReportNumber,
            AccidentStatus status,
            String resolutionNote,
            LocalDateTime resolvedAt,
            String resolvedByName,
            String reportedByName,
            LocalDateTime createdAt) {}
}
