package com.insurancecard.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Compensation;
import com.insurancecard.domain.enums.ClaimStatus;

public interface CompensationRepository extends JpaRepository<Compensation, Long> {

    boolean existsByClaimCode(String claimCode);

    boolean existsByAccidentId(Long accidentId);

    boolean existsByAccidentIdAndStatusIn(Long accidentId, Collection<ClaimStatus> statuses);

    boolean existsByContractIdAndStatusIn(Long contractId, Collection<ClaimStatus> statuses);

    long countByStatus(ClaimStatus status);

    long countByContractCustomerIdAndStatus(Long customerId, ClaimStatus status);

    List<Compensation> findByAccidentIdAndStatus(Long accidentId, ClaimStatus status);

    @EntityGraph(attributePaths = {"accident"})
    List<Compensation> findByContractIdOrderByIdDesc(Long contractId);

    /** Tổng tiền đã duyệt/đã chi của 1 hợp đồng (bỏ qua yêu cầu excludeId). */
    @Query("""
            SELECT COALESCE(SUM(c.approvedAmount), 0) FROM Compensation c
            WHERE c.contract.id = :contractId AND c.status IN :statuses
              AND (:excludeId IS NULL OR c.id <> :excludeId)
            """)
    BigDecimal sumApproved(@Param("contractId") Long contractId,
                           @Param("statuses") Collection<ClaimStatus> statuses,
                           @Param("excludeId") Long excludeId);

    @EntityGraph(attributePaths = {"accident", "contract", "contract.customer", "contract.customer.user",
            "contract.vehicle"})
    @Query("""
            SELECT cp FROM Compensation cp JOIN cp.contract c JOIN c.customer cu JOIN cu.user u JOIN cp.accident a
            WHERE (:customerId IS NULL OR cu.id = :customerId)
              AND (:status IS NULL OR cp.status = :status)
              AND (:q IS NULL
                   OR LOWER(cp.claimCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(a.accidentCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Compensation> search(@Param("q") String q,
                              @Param("customerId") Long customerId,
                              @Param("status") ClaimStatus status,
                              Pageable pageable);
}
