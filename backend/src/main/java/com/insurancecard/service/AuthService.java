package com.insurancecard.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.config.AppProperties;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.User;
import com.insurancecard.domain.VerificationToken;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.TokenType;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.AuthDtos.ActionResponse;
import com.insurancecard.dto.AuthDtos.AuthResponse;
import com.insurancecard.dto.AuthDtos.ChangePasswordRequest;
import com.insurancecard.dto.AuthDtos.LoginRequest;
import com.insurancecard.dto.AuthDtos.RegisterRequest;
import com.insurancecard.dto.AuthDtos.ResetPasswordRequest;
import com.insurancecard.repository.CustomerRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.repository.VerificationTokenRepository;
import com.insurancecard.security.JwtService;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final SettingService settingService;
    private final AppProperties props;

    public AuthService(UserRepository userRepository, CustomerRepository customerRepository,
                       VerificationTokenRepository tokenRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, MailService mailService, SettingService settingService,
                       AppProperties props) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.settingService = settingService;
        this.props = props;
    }

    // ------------------------------------------------------------------ Đăng ký

    @Transactional
    public ActionResponse register(RegisterRequest r) {
        if (!r.password().equals(r.confirmPassword())) {
            throw ApiException.validation("confirmPassword", "Mật khẩu nhập lại không khớp");
        }
        String email = normalizeEmail(r.email());
        Map<String, String> duplicates = new LinkedHashMap<>();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            duplicates.put("email", "Email đã được sử dụng");
        }
        if (userRepository.existsByPhone(r.phone())) {
            duplicates.put("phone", "Số điện thoại đã được sử dụng");
        }
        if (customerRepository.existsByIdNumber(r.idNumber())) {
            duplicates.put("idNumber", "Số CCCD đã được đăng ký");
        }
        if (!duplicates.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE", "Thông tin đã tồn tại trong hệ thống", duplicates);
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(r.password()));
        user.setFullName(normalizeName(r.fullName()));
        user.setPhone(r.phone());
        user.setRole(Role.CUSTOMER);
        user.setStatus(UserStatus.PENDING);
        userRepository.save(user);

        Customer customer = new Customer();
        customer.setUser(user);
        customer.setIdNumber(r.idNumber());
        customer.setDateOfBirth(r.dateOfBirth());
        customer.setGender(r.gender());
        customer.setAddress(r.address());
        customerRepository.save(customer);

        String link = issueVerificationLink(user);
        return new ActionResponse(
                "Đăng ký thành công. Vui lòng kiểm tra email " + email + " để kích hoạt tài khoản.",
                mailService.isDemoMode() ? link : null);
    }

    @Transactional
    public ActionResponse verifyEmail(String token) {
        VerificationToken t = tokenRepository.findByTokenAndType(token, TokenType.VERIFY_EMAIL)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN",
                        "Link xác thực không hợp lệ", null));
        User user = t.getUser();
        if (t.getUsedAt() != null) {
            if (user.getStatus() == UserStatus.ACTIVE) {
                return new ActionResponse("Tài khoản đã được kích hoạt trước đó. Bạn có thể đăng nhập.", null);
            }
            throw ApiException.business("TOKEN_USED", "Link xác thực đã được sử dụng");
        }
        if (!t.isUsable(LocalDateTime.now())) {
            throw ApiException.business("TOKEN_EXPIRED",
                    "Link xác thực đã hết hạn. Vui lòng yêu cầu gửi lại link mới.");
        }
        if (user.getStatus() != UserStatus.PENDING) {
            throw ApiException.business("INVALID_STATUS", "Tài khoản không ở trạng thái chờ kích hoạt");
        }
        user.setStatus(UserStatus.ACTIVE);
        t.setUsedAt(LocalDateTime.now());
        return new ActionResponse("Kích hoạt tài khoản thành công. Bạn có thể đăng nhập.", null);
    }

    /** Luôn trả cùng một thông báo để không lộ email nào đã đăng ký. */
    @Transactional
    public ActionResponse resendVerification(String rawEmail) {
        String link = userRepository.findByEmailIgnoreCase(normalizeEmail(rawEmail))
                .filter(u -> u.getStatus() == UserStatus.PENDING)
                .map(this::issueVerificationLink)
                .orElse(null);
        return new ActionResponse(
                "Nếu email đã đăng ký và chưa kích hoạt, link xác thực mới đã được gửi tới hộp thư.",
                mailService.isDemoMode() ? link : null);
    }

    private String issueVerificationLink(User user) {
        int hours = settingService.getInt(SettingService.VERIFY_TOKEN_EXPIRY_HOURS);
        String token = createToken(user, TokenType.VERIFY_EMAIL, Duration.ofHours(hours));
        String link = props.frontendUrl() + "/verify-email?token=" + token;
        mailService.send(user.getEmail(), "[InsuranceCard] Kích hoạt tài khoản",
                "Xin chào " + user.getFullName() + ",\n\nVui lòng bấm vào link sau để kích hoạt tài khoản (hiệu lực "
                        + hours + " giờ):\n" + link + "\n\nNếu bạn không đăng ký, hãy bỏ qua email này.");
        return link;
    }

    // ------------------------------------------------------------------ Đăng nhập

    /** noRollbackFor: vẫn lưu số lần đăng nhập sai khi ném lỗi. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest r) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(r.email()))
                .orElseThrow(AuthService::invalidCredentials);
        LocalDateTime now = LocalDateTime.now();
        if (user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(now)) {
            long minutes = Math.max(1, Duration.between(now, user.getLockoutUntil()).toMinutes() + 1);
            throw new ApiException(HttpStatus.FORBIDDEN, "TEMPORARILY_LOCKED",
                    "Bạn đã đăng nhập sai quá " + props.security().maxFailedLogins()
                            + " lần. Vui lòng thử lại sau " + minutes + " phút.", null);
        }
        if (!passwordEncoder.matches(r.password(), user.getPasswordHash())) {
            int failed = user.getFailedLoginCount() + 1;
            if (failed >= props.security().maxFailedLogins()) {
                user.setFailedLoginCount(0);
                user.setLockoutUntil(now.plusMinutes(props.security().lockoutMinutes()));
            } else {
                user.setFailedLoginCount(failed);
            }
            throw invalidCredentials();
        }
        if (user.getStatus() == UserStatus.PENDING) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                    "Tài khoản chưa được kích hoạt. Vui lòng xác thực email trước khi đăng nhập.", null);
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED",
                    "Tài khoản đã bị khoá. Vui lòng liên hệ nhân viên để được hỗ trợ.", null);
        }
        user.setFailedLoginCount(0);
        user.setLockoutUntil(null);
        return buildAuthResponse(user);
    }

    private static ApiException invalidCredentials() {
        return ApiException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    }

    public AuthResponse buildAuthResponse(User user) {
        Customer customer = user.getRole() == Role.CUSTOMER
                ? customerRepository.findByUserId(user.getId()).orElse(null)
                : null;
        return new AuthResponse(jwtService.generate(user), "Bearer", jwtService.getExpirationSeconds(),
                DtoMapper.userInfo(user, customer));
    }

    // ------------------------------------------------------------------ Quên / đặt lại / đổi mật khẩu

    @Transactional
    public ActionResponse forgotPassword(String rawEmail) {
        String link = userRepository.findByEmailIgnoreCase(normalizeEmail(rawEmail))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(u -> {
                    int minutes = settingService.getInt(SettingService.RESET_TOKEN_EXPIRY_MINUTES);
                    String token = createToken(u, TokenType.RESET_PASSWORD, Duration.ofMinutes(minutes));
                    String url = props.frontendUrl() + "/reset-password?token=" + token;
                    mailService.send(u.getEmail(), "[InsuranceCard] Đặt lại mật khẩu",
                            "Xin chào " + u.getFullName() + ",\n\nBấm vào link sau để đặt lại mật khẩu (hiệu lực "
                                    + minutes + " phút):\n" + url
                                    + "\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.");
                    return url;
                })
                .orElse(null);
        return new ActionResponse(
                "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư.",
                mailService.isDemoMode() ? link : null);
    }

    @Transactional
    public ActionResponse resetPassword(ResetPasswordRequest r) {
        if (!r.newPassword().equals(r.confirmPassword())) {
            throw ApiException.validation("confirmPassword", "Mật khẩu nhập lại không khớp");
        }
        VerificationToken t = tokenRepository.findByTokenAndType(r.token(), TokenType.RESET_PASSWORD)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN",
                        "Link đặt lại mật khẩu không hợp lệ", null));
        if (t.getUsedAt() != null) {
            throw ApiException.business("TOKEN_USED", "Link đặt lại mật khẩu đã được sử dụng");
        }
        if (!t.isUsable(LocalDateTime.now())) {
            throw ApiException.business("TOKEN_EXPIRED", "Link đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu lại");
        }
        User user = t.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.business("ACCOUNT_LOCKED", "Tài khoản không hoạt động, không thể đặt lại mật khẩu");
        }
        applyNewPassword(user, r.newPassword());
        t.setUsedAt(LocalDateTime.now());
        return new ActionResponse("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.", null);
    }

    /** Đổi mật khẩu: các phiên đăng nhập cũ bị vô hiệu, trả về token mới cho phiên hiện tại. */
    @Transactional
    public AuthResponse changePassword(Long userId, ChangePasswordRequest r) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản"));
        if (!passwordEncoder.matches(r.currentPassword(), user.getPasswordHash())) {
            throw ApiException.validation("currentPassword", "Mật khẩu hiện tại không đúng");
        }
        if (!r.newPassword().equals(r.confirmPassword())) {
            throw ApiException.validation("confirmPassword", "Mật khẩu nhập lại không khớp");
        }
        if (r.newPassword().equals(r.currentPassword())) {
            throw ApiException.validation("newPassword", "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        applyNewPassword(user, r.newPassword());
        return buildAuthResponse(user);
    }

    public void applyNewPassword(User user, String rawPassword) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setPasswordChangedAt(LocalDateTime.now().withNano(0));
        user.setFailedLoginCount(0);
        user.setLockoutUntil(null);
    }

    // ------------------------------------------------------------------ Tiện ích

    private String createToken(User user, TokenType type, Duration validity) {
        LocalDateTime now = LocalDateTime.now();
        // Vô hiệu các link cũ cùng loại chưa dùng
        tokenRepository.findByUserIdAndTypeAndUsedAtIsNull(user.getId(), type).forEach(old -> old.setUsedAt(now));
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        VerificationToken t = new VerificationToken();
        t.setUser(user);
        t.setToken(HexFormat.of().formatHex(bytes));
        t.setType(type);
        t.setCreatedAt(now);
        t.setExpiresAt(now.plus(validity));
        tokenRepository.save(t);
        return t.getToken();
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    /** Chuẩn hoá họ tên: gộp khoảng trắng thừa. */
    public static String normalizeName(String name) {
        return name == null ? null : name.trim().replaceAll("\\s+", " ");
    }
}
