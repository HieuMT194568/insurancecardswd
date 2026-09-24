package com.insurancecard.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    boolean existsByLicensePlate(String licensePlate);

    boolean existsByLicensePlateAndIdNot(String licensePlate, Long id);

    boolean existsByChassisNumber(String chassisNumber);

    boolean existsByChassisNumberAndIdNot(String chassisNumber, Long id);

    boolean existsByEngineNumber(String engineNumber);

    boolean existsByEngineNumberAndIdNot(String engineNumber, Long id);

    long countByCustomerId(Long customerId);

    List<Vehicle> findByCustomerId(Long customerId);

    @EntityGraph(attributePaths = {"customer", "customer.user"})
    @Query("""
            SELECT v FROM Vehicle v JOIN v.customer c JOIN c.user u
            WHERE (:customerId IS NULL OR c.id = :customerId)
              AND (:q IS NULL
                   OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(v.brand) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(v.model) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Vehicle> search(@Param("q") String q, @Param("customerId") Long customerId, Pageable pageable);
}
