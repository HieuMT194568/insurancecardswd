package com.insurancecard.security;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.insurancecard.domain.User;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.repository.CustomerRepository;
import com.insurancecard.repository.UserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Đọc "Authorization: Bearer &lt;jwt&gt;". Token chỉ được chấp nhận khi:
 * chữ ký + hạn dùng hợp lệ, tài khoản còn tồn tại và ACTIVE, và token được cấp
 * sau lần đổi mật khẩu gần nhất (đổi mật khẩu => các phiên cũ bị vô hiệu).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository,
                                   CustomerRepository customerRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            Claims claims = jwtService.parse(header.substring(7));
            if (claims != null) {
                authenticate(claims);
            }
        }
        chain.doFilter(request, response);
    }

    private void authenticate(Claims claims) {
        Long userId;
        try {
            userId = Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return;
        }
        if (user.getPasswordChangedAt() != null && claims.getIssuedAt() != null) {
            Instant changed = user.getPasswordChangedAt().atZone(ZoneId.systemDefault()).toInstant();
            // JWT lưu iat theo giây -> so sánh ở mức giây
            if (claims.getIssuedAt().toInstant().getEpochSecond() < changed.getEpochSecond()) {
                return;
            }
        }
        Long customerId = user.getRole() == Role.CUSTOMER
                ? customerRepository.findByUserId(user.getId()).map(c -> c.getId()).orElse(null)
                : null;
        AppUserPrincipal principal = new AppUserPrincipal(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), customerId);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
