package com.insurancecard.domain;

import java.math.BigDecimal;

import com.insurancecard.domain.enums.ProductStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "insurance_products")
public class InsuranceProduct extends BaseEntity {

    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "min_engine_capacity", nullable = false)
    private Integer minEngineCapacity;

    @Column(name = "max_engine_capacity", nullable = false)
    private Integer maxEngineCapacity;

    @Column(name = "annual_premium", nullable = false, precision = 15, scale = 0)
    private BigDecimal annualPremium;

    @Column(name = "max_compensation", nullable = false, precision = 15, scale = 0)
    private BigDecimal maxCompensation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status;

    public boolean supportsEngineCapacity(int cc) {
        return cc >= minEngineCapacity && cc <= maxEngineCapacity;
    }
}
