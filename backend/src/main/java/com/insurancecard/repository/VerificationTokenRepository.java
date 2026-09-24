package com.insurancecard.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.insurancecard.domain.VerificationToken;
import com.insurancecard.domain.enums.TokenType;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByTokenAndType(String token, TokenType type);

    List<VerificationToken> findByUserIdAndTypeAndUsedAtIsNull(Long userId, TokenType type);

    @Modifying
    @Query("DELETE FROM VerificationToken t WHERE t.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
