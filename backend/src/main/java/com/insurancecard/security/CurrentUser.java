package com.insurancecard.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.insurancecard.common.ApiException;

@Component
public class CurrentUser {

    public AppUserPrincipal get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw ApiException.unauthorized("UNAUTHORIZED", "Bạn chưa đăng nhập");
        }
        return principal;
    }

    /**
     * Phạm vi dữ liệu được xem: khách hàng chỉ thấy dữ liệu của mình (trả về customerId của họ);
     * nhân viên thấy tất cả (trả về bộ lọc customerId do client gửi, có thể null).
     */
    public Long scopeCustomerId(Long requestedCustomerId) {
        AppUserPrincipal me = get();
        return me.isCustomer() ? me.customerId() : requestedCustomerId;
    }

    /** Khách hàng chỉ được thao tác trên dữ liệu của chính mình. */
    public void checkOwnership(Long ownerCustomerId) {
        AppUserPrincipal me = get();
        if (me.isCustomer() && !me.customerId().equals(ownerCustomerId)) {
            // Trả 404 thay vì 403 để không lộ sự tồn tại của dữ liệu người khác
            throw ApiException.notFound("Không tìm thấy dữ liệu");
        }
    }
}
