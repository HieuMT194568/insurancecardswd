package com.insurancecard.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insurancecard.dto.SettingDtos.SettingResponse;
import com.insurancecard.dto.SettingDtos.SettingUpdateRequest;
import com.insurancecard.service.SettingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings")
@PreAuthorize("hasRole('STAFF')")
public class SettingController {

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public List<SettingResponse> list() {
        return settingService.list();
    }

    @PutMapping("/{key}")
    public SettingResponse update(@PathVariable String key, @Valid @RequestBody SettingUpdateRequest request) {
        return settingService.update(key, request.value());
    }
}
