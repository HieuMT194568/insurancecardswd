package com.insurancecard.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Payment;
import com.insurancecard.domain.enums.PaymentStatus;
import com.insurancecard.domain.enums.PaymentType;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    boolean existsByPaymentCode(String paymentCode);

    Optional<Payment> findFirstByContractIdAndTypeAndStatus(Long contractId, PaymentType type, PaymentStatus status);

    @EntityGraph(attributePaths = {"customer", "customer.user", "contract", "punishment", "compensation"})
    List<Payment> findByContractIdOrderByIdDesc(Long contractId);

    @EntityGraph(attributePaths = {"customer", "customer.user", "contract", "punishment", "compensation"})
    @Query("""
            SELECT p FROM Payment p JOIN p.customer cu JOIN cu.user u LEFT JOIN p.contract c
            WHERE (:customerId IS NULL OR cu.id = :customerId)
              AND (:type IS NULL OR p.type = :type)
              AND (:status IS NULL OR p.status = :status)
              AND (:q IS NULL
                   OR LOWER(p.paymentCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Payment> search(@Param("q") String q,
                         @Param("customerId") Long customerId,
                         @Param("type") PaymentType type,
                         @Param("status") PaymentStatus status,
                         Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
            WHERE p.type = :type AND p.status = com.insurancecard.domain.enums.PaymentStatus.PAID
              AND p.paidAt >= :from AND p.paidAt < :to
            """)
    BigDecimal sumPaid(@Param("type") PaymentType type,
                       @Param("from") LocalDateTime from,
                       @Param("to") LocalDateTime to);
}
