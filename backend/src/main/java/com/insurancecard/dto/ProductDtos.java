package com.insurancecard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.ProductStatus;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ProductDtos {

    private ProductDtos() {}

    public record ProductRequest(
            @NotBlank(message = "Vui lòng nhập mã sản phẩm")
            @Size(max = 20, message = "Mã sản phẩm tối đa 20 ký tự")
            String code,

            @NotBlank(message = "Vui lòng nhập tên sản phẩm")
            @Size(min = 3, max = 100, message = "Tên sản phẩm từ 3 đến 100 ký tự")
            String name,

            @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
            String description,

            @NotNull(message = "Vui lòng nhập dung tích tối thiểu")
            @Min(value = 1, message = "Dung tích tối thiểu từ 1 đến 3000 cc")
            @Max(value = 3000, message = "Dung tích tối thiểu từ 1 đến 3000 cc")
            Integer minEngineCapacity,

            @NotNull(message = "Vui lòng nhập dung tích tối đa")
            @Min(value = 1, message = "Dung tích tối đa từ 1 đến 3000 cc")
            @Max(value = 3000, message = "Dung tích tối đa từ 1 đến 3000 cc")
            Integer maxEngineCapacity,

            @NotNull(message = "Vui lòng nhập phí bảo hiểm/năm")
            @DecimalMin(value = "1000", message = "Phí bảo hiểm từ 1.000 đến 100.000.000 VND")
            @DecimalMax(value = "100000000", message = "Phí bảo hiểm từ 1.000 đến 100.000.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Phí bảo hiểm phải là số nguyên (VND)")
            BigDecimal annualPremium,

            @NotNull(message = "Vui lòng nhập mức bồi thường tối đa")
            @DecimalMin(value = "1000000", message = "Mức bồi thường tối đa từ 1.000.000 đến 10.000.000.000 VND")
            @DecimalMax(value = "10000000000", message = "Mức bồi thường tối đa từ 1.000.000 đến 10.000.000.000 VND")
            @Digits(integer = 15, fraction = 0, message = "Mức bồi thường phải là số nguyên (VND)")
            BigDecimal maxCompensation,

            @NotNull(message = "Vui lòng chọn trạng thái")
            ProductStatus status) {}

    public record ProductResponse(
            Long id,
            String code,
            String name,
            String description,
            Integer minEngineCapacity,
            Integer maxEngineCapacity,
            BigDecimal annualPremium,
            BigDecimal maxCompensation,
            ProductStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}
}
