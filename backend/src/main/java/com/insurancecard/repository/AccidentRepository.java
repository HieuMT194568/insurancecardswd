package com.insurancecard.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Accident;
import com.insurancecard.domain.enums.AccidentStatus;

public interface AccidentRepository extends JpaRepository<Accident, Long> {

    boolean existsByAccidentCode(String accidentCode);

    long countByStatus(AccidentStatus status);

    List<Accident> findByContractIdOrderByAccidentTimeDesc(Long contractId);

    @EntityGraph(attributePaths = {"contract", "contract.customer", "contract.customer.user", "contract.vehicle"})
    @Query("""
            SELECT a FROM Accident a JOIN a.contract c JOIN c.customer cu JOIN cu.user u JOIN c.vehicle v
            WHERE (:customerId IS NULL OR cu.id = :customerId)
              AND (:contractId IS NULL OR c.id = :contractId)
              AND (:status IS NULL OR a.status = :status)
              AND (:q IS NULL
                   OR LOWER(a.accidentCode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Accident> search(@Param("q") String q,
                          @Param("customerId") Long customerId,
                          @Param("contractId") Long contractId,
                          @Param("status") AccidentStatus status,
                          Pageable pageable);
}
