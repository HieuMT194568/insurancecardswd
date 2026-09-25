package com.insurancecard.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;

public final class SettingDtos {

    private SettingDtos() {}

    public record SettingUpdateRequest(
            @NotNull(message = "Vui lòng nhập giá trị")
            Integer value) {}

    public record SettingResponse(
            String key,
            Integer value,
            Integer minValue,
            Integer maxValue,
            String unit,
            String description,
            LocalDateTime updatedAt) {}
}
