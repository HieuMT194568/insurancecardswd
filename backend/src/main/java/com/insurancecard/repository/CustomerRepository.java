package com.insurancecard.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.Customer;
import com.insurancecard.domain.enums.UserStatus;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByUserId(Long userId);

    boolean existsByIdNumber(String idNumber);

    boolean existsByIdNumberAndIdNot(String idNumber, Long id);

    @Query("""
            SELECT c FROM Customer c JOIN c.user u
            WHERE (:customerId IS NULL OR c.id = :customerId)
              AND (:status IS NULL OR u.status = :status)
              AND (:q IS NULL
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR u.phone LIKE CONCAT('%', :q, '%')
                   OR c.idNumber LIKE CONCAT('%', :q, '%'))
            """)
    Page<Customer> search(@Param("q") String q,
                          @Param("customerId") Long customerId,
                          @Param("status") UserStatus status,
                          Pageable pageable);
}
