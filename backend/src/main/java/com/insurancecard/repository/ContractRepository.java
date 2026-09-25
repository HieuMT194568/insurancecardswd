package com.insurancecard.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Contract;
import com.insurancecard.domain.enums.ContractStatus;

public interface ContractRepository extends JpaRepository<Contract, Long> {

    boolean existsByContractNumber(String contractNumber);

    boolean existsByVehicleId(Long vehicleId);

    boolean existsByProductId(Long productId);

    boolean existsByCustomerId(Long customerId);

    long countByStatus(ContractStatus status);

    long countByCustomerIdAndStatus(Long customerId, ContractStatus status);

    Optional<Contract> findFirstByRenewedFromIdAndStatusNot(Long renewedFromId, ContractStatus status);

    List<Contract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);

    List<Contract> findByStatusAndStartDateBefore(ContractStatus status, LocalDate date);

    /** Hợp đồng cùng xe + cùng sản phẩm, đang hiệu lực/chờ thanh toán, có thời gian giao nhau. */
    @Query("""
            SELECT c FROM Contract c
            WHERE c.vehicle.id = :vehicleId AND c.product.id = :productId
              AND c.status IN :statuses
              AND c.startDate <= :endDate AND c.endDate >= :startDate
              AND (:excludeId IS NULL OR c.id <> :excludeId)
            """)
    List<Contract> findOverlapping(@Param("vehicleId") Long vehicleId,
                                   @Param("productId") Long productId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate,
                                   @Param("statuses") Collection<ContractStatus> statuses,
                                   @Param("excludeId") Long excludeId);

    @EntityGraph(attributePaths = {"customer", "customer.user", "vehicle", "product"})
    @Query("""
            SELECT c FROM Contract c JOIN c.customer cu JOIN cu.user u JOIN c.vehicle v
            WHERE (:customerId IS NULL OR cu.id = :customerId)
              AND (:vehicleId IS NULL OR v.id = :vehicleId)
              AND (:status IS NULL OR c.status = :status)
              AND (:q IS NULL
                   OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Contract> search(@Param("q") String q,
                          @Param("customerId") Long customerId,
                          @Param("vehicleId") Long vehicleId,
                          @Param("status") ContractStatus status,
                          Pageable pageable);

    /** Hợp đồng đang hiệu lực sắp hết hạn (để nhắc gia hạn). customerId null = tất cả. */
    @EntityGraph(attributePaths = {"customer", "customer.user", "vehicle", "product"})
    @Query("""
            SELECT c FROM Contract c
            WHERE c.status = com.insurancecard.domain.enums.ContractStatus.ACTIVE
              AND c.endDate BETWEEN :from AND :to
              AND (:customerId IS NULL OR c.customer.id = :customerId)
            ORDER BY c.endDate ASC
            """)
    List<Contract> findExpiring(@Param("customerId") Long customerId,
                                @Param("from") LocalDate from,
                                @Param("to") LocalDate to);
}
