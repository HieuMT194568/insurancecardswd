package com.insurancecard.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.InsuranceProduct;
import com.insurancecard.domain.enums.ProductStatus;

public interface InsuranceProductRepository extends JpaRepository<InsuranceProduct, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    List<InsuranceProduct> findByStatusOrderByAnnualPremiumAsc(ProductStatus status);

    @Query("""
            SELECT p FROM InsuranceProduct p
            WHERE (:status IS NULL OR p.status = :status)
              AND (:q IS NULL
                   OR LOWER(p.code) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<InsuranceProduct> search(@Param("q") String q, @Param("status") ProductStatus status, Pageable pageable);
}
