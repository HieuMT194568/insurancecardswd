package com.insurancecard.dto;

import java.time.LocalDateTime;

import com.insurancecard.validation.ValidationRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class VehicleDtos {

    private VehicleDtos() {}

    /**
     * customerId: bắt buộc khi nhân viên tạo xe cho khách; khách hàng tự tạo thì bỏ qua (lấy từ phiên đăng nhập).
     * Biển số / số khung / số máy được chuẩn hoá về chữ IN HOA trước khi kiểm tra định dạng.
     */
    public record VehicleRequest(
            Long customerId,

            @NotBlank(message = "Vui lòng nhập biển số xe")
            @Size(max = 15, message = "Biển số tối đa 15 ký tự")
            String licensePlate,

            @NotBlank(message = "Vui lòng nhập hãng xe")
            @Size(min = 2, max = 50, message = "Hãng xe từ 2 đến 50 ký tự")
            String brand,

            @NotBlank(message = "Vui lòng nhập dòng xe")
            @Size(min = 1, max = 50, message = "Dòng xe từ 1 đến 50 ký tự")
            String model,

            @NotBlank(message = "Vui lòng nhập màu xe")
            @Size(min = 2, max = 30, message = "Màu xe từ 2 đến 30 ký tự")
            String color,

            @NotNull(message = "Vui lòng nhập dung tích xi-lanh")
            @Min(value = ValidationRules.MIN_ENGINE_CC, message = "Dung tích xi-lanh từ 1 đến 3000 cc")
            @Max(value = ValidationRules.MAX_ENGINE_CC, message = "Dung tích xi-lanh từ 1 đến 3000 cc")
            Integer engineCapacity,

            @NotNull(message = "Vui lòng nhập năm sản xuất")
            @Min(value = ValidationRules.MIN_MANUFACTURE_YEAR, message = "Năm sản xuất từ 1980 đến năm hiện tại")
            Integer manufactureYear,

            @NotBlank(message = "Vui lòng nhập số khung")
            @Size(max = 20, message = "Số khung tối đa 20 ký tự")
            String chassisNumber,

            @NotBlank(message = "Vui lòng nhập số máy")
            @Size(max = 20, message = "Số máy tối đa 20 ký tự")
            String engineNumber) {}

    public record VehicleResponse(
            Long id,
            Long customerId,
            String customerCode,
            String customerName,
            String licensePlate,
            String brand,
            String model,
            String color,
            Integer engineCapacity,
            Integer manufactureYear,
            String chassisNumber,
            String engineNumber,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}
}
