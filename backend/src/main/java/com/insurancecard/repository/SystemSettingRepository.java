package com.insurancecard.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insurancecard.domain.SystemSetting;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {

    List<SystemSetting> findAllByOrderByKeyAsc();
}
