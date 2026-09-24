package com.insurancecard.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insurancecard.domain.User;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    long countByRoleAndStatus(Role role, UserStatus status);
}
