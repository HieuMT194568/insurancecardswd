package com.insurancecard.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.DamageType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "accidents")
public class Accident extends BaseEntity {

    @Column(name = "accident_code", nullable = false, length = 20)
    private String accidentCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Column(name = "accident_time", nullable = false)
    private LocalDateTime accidentTime;

    @Column(nullable = false, length = 255)
    private String location;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "damage_type", nullable = false, length = 20)
    private DamageType damageType;

    @Column(name = "estimated_damage", nullable = false, precision = 15, scale = 0)
    private BigDecimal estimatedDamage;

    @Column(name = "police_report_number", length = 50)
    private String policeReportNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccidentStatus status;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by", nullable = false)
    private User reportedBy;
}
