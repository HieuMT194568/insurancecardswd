package com.insurancecard.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.insurancecard.domain.enums.Role;

/** Người dùng đang đăng nhập (lấy từ JWT + DB). customerId chỉ có với role CUSTOMER. */
public record AppUserPrincipal(Long userId, String email, String fullName, Role role, Long customerId) {

    public Collection<? extends GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    public boolean isStaff() {
        return role == Role.STAFF;
    }

    public boolean isCustomer() {
        return role == Role.CUSTOMER;
    }
}
