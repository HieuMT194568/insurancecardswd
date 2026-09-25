package com.insurancecard.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.domain.SystemSetting;
import com.insurancecard.dto.SettingDtos.SettingResponse;
import com.insurancecard.repository.SystemSettingRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.security.CurrentUser;

@Service
public class SettingService {

    public static final String RENEWAL_WINDOW_DAYS = "RENEWAL_WINDOW_DAYS";
    public static final String MAX_START_DATE_ADVANCE_DAYS = "MAX_START_DATE_ADVANCE_DAYS";
    public static final String CLAIM_DEADLINE_DAYS = "CLAIM_DEADLINE_DAYS";
    public static final String CANCEL_REFUND_PERCENT = "CANCEL_REFUND_PERCENT";
    public static final String PENALTY_DUE_DAYS = "PENALTY_DUE_DAYS";
    public static final String VERIFY_TOKEN_EXPIRY_HOURS = "VERIFY_TOKEN_EXPIRY_HOURS";
    public static final String RESET_TOKEN_EXPIRY_MINUTES = "RESET_TOKEN_EXPIRY_MINUTES";

    private final SystemSettingRepository repository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public SettingService(SystemSettingRepository repository, UserRepository userRepository, CurrentUser currentUser) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public int getInt(String key) {
        return repository.findById(key)
                .map(SystemSetting::getValue)
                .orElseThrow(() -> new IllegalStateException("Thiếu cấu hình hệ thống: " + key));
    }

    @Transactional(readOnly = true)
    public List<SettingResponse> list() {
        return repository.findAllByOrderByKeyAsc().stream().map(SettingService::toResponse).toList();
    }

    @Transactional
    public SettingResponse update(String key, Integer value) {
        SystemSetting setting = repository.findById(key)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy cấu hình " + key));
        if (value == null) {
            throw ApiException.validation("value", "Vui lòng nhập giá trị");
        }
        if (value < setting.getMinValue() || value > setting.getMaxValue()) {
            throw ApiException.validation("value",
                    "Giá trị phải từ " + setting.getMinValue() + " đến " + setting.getMaxValue());
        }
        setting.setValue(value);
        setting.setUpdatedAt(LocalDateTime.now());
        setting.setUpdatedBy(userRepository.getReferenceById(currentUser.get().userId()));
        return toResponse(setting);
    }

    private static SettingResponse toResponse(SystemSetting s) {
        return new SettingResponse(s.getKey(), s.getValue(), s.getMinValue(), s.getMaxValue(), s.getUnit(),
                s.getDescription(), s.getUpdatedAt());
    }
}
