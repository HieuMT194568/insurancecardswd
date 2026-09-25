package com.insurancecard.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Punishment;
import com.insurancecard.domain.enums.PunishmentStatus;

public interface PunishmentRepository extends JpaRepository<Punishment, Long> {

    boolean existsByPunishmentCode(String punishmentCode);

    boolean existsByCustomerId(Long customerId);

    long countByStatus(PunishmentStatus status);

    long countByCustomerIdAndStatus(Long customerId, PunishmentStatus status);

    @EntityGraph(attributePaths = {"customer", "customer.user", "contract"})
    @Query("""
            SELECT p FROM Punishment p JOIN p.customer cu JOIN cu.user u LEFT JOIN p.contract c
            WHERE (:customerId IS NULL OR cu.id = :customerId)
              AND (:status IS NULL OR p.status = :status)
              AND (:q IS NULL
                   OR LOWER(p.punishmentCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Punishment> search(@Param("q") String q,
                            @Param("customerId") Long customerId,
                            @Param("status") PunishmentStatus status,
                            Pageable pageable);
}
