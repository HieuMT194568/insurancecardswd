package com.insurancecard.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.User;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.CustomerDtos.CustomerCreatedResponse;
import com.insurancecard.dto.CustomerDtos.CustomerRequest;
import com.insurancecard.dto.CustomerDtos.CustomerResponse;
import com.insurancecard.dto.CustomerDtos.ProfileResponse;
import com.insurancecard.dto.CustomerDtos.ProfileUpdateRequest;
import com.insurancecard.dto.CustomerDtos.SetPasswordRequest;
import com.insurancecard.dto.CustomerDtos.StaffProfileUpdateRequest;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.CustomerRepository;
import com.insurancecard.repository.PunishmentRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.repository.VehicleRepository;
import com.insurancecard.repository.VerificationTokenRepository;
import com.insurancecard.security.AppUserPrincipal;

@Service
public class CustomerService {

    private static final Pattern CUSTOMER_CODE = Pattern.compile("^KH(\\d{1,9})$", Pattern.CASE_INSENSITIVE);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ContractRepository contractRepository;
    private final PunishmentRepository punishmentRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final MailService mailService;

    public CustomerService(CustomerRepository customerRepository, UserRepository userRepository,
                           VehicleRepository vehicleRepository, ContractRepository contractRepository,
                           PunishmentRepository punishmentRepository, VerificationTokenRepository tokenRepository,
                           PasswordEncoder passwordEncoder, AuthService authService, MailService mailService) {
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.contractRepository = contractRepository;
        this.punishmentRepository = punishmentRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.mailService = mailService;
    }

    // ------------------------------------------------------------------ Hồ sơ cá nhân

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(AppUserPrincipal me) {
        User user = findUser(me.userId());
        Customer customer = me.isCustomer() ? findCustomer(me.customerId()) : null;
        return toProfile(user, customer);
    }

    @Transactional
    public ProfileResponse updateCustomerProfile(AppUserPrincipal me, ProfileUpdateRequest r) {
        Customer customer = findCustomer(me.customerId());
        User user = customer.getUser();
        if (userRepository.existsByPhoneAndIdNot(r.phone(), user.getId())) {
            throw ApiException.duplicate("phone", "Số điện thoại đã được sử dụng");
        }
        user.setFullName(AuthService.normalizeName(r.fullName()));
        user.setPhone(r.phone());
        customer.setDateOfBirth(r.dateOfBirth());
        customer.setGender(r.gender());
        customer.setAddress(r.address());
        return toProfile(user, customer);
    }

    @Transactional
    public ProfileResponse updateStaffProfile(AppUserPrincipal me, StaffProfileUpdateRequest r) {
        User user = findUser(me.userId());
        if (userRepository.existsByPhoneAndIdNot(r.phone(), user.getId())) {
            throw ApiException.duplicate("phone", "Số điện thoại đã được sử dụng");
        }
        user.setFullName(AuthService.normalizeName(r.fullName()));
        user.setPhone(r.phone());
        return toProfile(user, null);
    }

    private ProfileResponse toProfile(User user, Customer customer) {
        return new ProfileResponse(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.getRole().name(), user.getStatus(), user.getCreatedAt(),
                customer == null ? null : DtoMapper.customer(customer, vehicleRepository.countByCustomerId(customer.getId())));
    }

    // ------------------------------------------------------------------ Quản lý khách hàng (nhân viên)

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> search(String q, UserStatus status, Integer page, Integer size) {
        String keyword = Paging.keyword(q);
        Long idFilter = null;
        if (keyword != null) {
            Matcher m = CUSTOMER_CODE.matcher(keyword);
            if (m.matches()) {
                idFilter = Long.valueOf(m.group(1));
                keyword = null;
            }
        }
        return PageResponse.of(customerRepository.search(keyword, idFilter, status, Paging.of(page, size)),
                c -> DtoMapper.customer(c, vehicleRepository.countByCustomerId(c.getId())));
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long id) {
        Customer c = findCustomer(id);
        return DtoMapper.customer(c, vehicleRepository.countByCustomerId(id));
    }

    @Transactional
    public CustomerCreatedResponse create(CustomerRequest r) {
        String email = AuthService.normalizeEmail(r.email());
        checkDuplicates(email, r.phone(), r.idNumber(), null, null);

        String tempPassword = generateTemporaryPassword();
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setFullName(AuthService.normalizeName(r.fullName()));
        user.setPhone(r.phone());
        user.setRole(Role.CUSTOMER);
        // Nhân viên đã đối chiếu giấy tờ trực tiếp -> kích hoạt ngay
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        Customer customer = new Customer();
        customer.setUser(user);
        applyCustomerFields(customer, r);
        customerRepository.save(customer);

        mailService.send(email, "[InsuranceCard] Tài khoản của bạn đã được tạo",
                "Xin chào " + user.getFullName() + ",\n\nNhân viên đã tạo tài khoản cho bạn.\nEmail: " + email
                        + "\nMật khẩu tạm thời: " + tempPassword + "\n\nVui lòng đăng nhập và đổi mật khẩu ngay.");
        return new CustomerCreatedResponse(DtoMapper.customer(customer, 0), tempPassword);
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerRequest r) {
        Customer customer = findCustomer(id);
        User user = customer.getUser();
        String email = AuthService.normalizeEmail(r.email());
        checkDuplicates(email, r.phone(), r.idNumber(), user.getId(), customer.getId());
        user.setEmail(email);
        user.setFullName(AuthService.normalizeName(r.fullName()));
        user.setPhone(r.phone());
        applyCustomerFields(customer, r);
        return DtoMapper.customer(customer, vehicleRepository.countByCustomerId(id));
    }

    /** Khoá / mở khoá / kích hoạt thủ công. Không cho đặt về PENDING. */
    @Transactional
    public CustomerResponse updateStatus(Long id, UserStatus status) {
        if (status == UserStatus.PENDING) {
            throw ApiException.validation("status", "Chỉ được chuyển sang ACTIVE (hoạt động) hoặc LOCKED (khoá)");
        }
        Customer customer = findCustomer(id);
        User user = customer.getUser();
        if (user.getStatus() == status) {
            throw ApiException.business("SAME_STATUS", "Tài khoản đã ở trạng thái này");
        }
        user.setStatus(status);
        if (status == UserStatus.ACTIVE) {
            user.setFailedLoginCount(0);
            user.setLockoutUntil(null);
        }
        return DtoMapper.customer(customer, vehicleRepository.countByCustomerId(id));
    }

    /** Nhân viên đặt lại mật khẩu cho khách hàng (khách quên mật khẩu, liên hệ trực tiếp). */
    @Transactional
    public void setPassword(Long id, SetPasswordRequest r) {
        if (!r.newPassword().equals(r.confirmPassword())) {
            throw ApiException.validation("confirmPassword", "Mật khẩu nhập lại không khớp");
        }
        Customer customer = findCustomer(id);
        authService.applyNewPassword(customer.getUser(), r.newPassword());
    }

    /** Chỉ xoá được khách hàng chưa phát sinh hợp đồng/phạt; ngược lại phải khoá tài khoản. */
    @Transactional
    public void delete(Long id) {
        Customer customer = findCustomer(id);
        if (contractRepository.existsByCustomerId(id)) {
            throw ApiException.conflict("CUSTOMER_HAS_CONTRACTS",
                    "Khách hàng đã có hợp đồng, không thể xoá. Hãy khoá tài khoản nếu cần ngừng sử dụng.");
        }
        if (punishmentRepository.existsByCustomerId(id)) {
            throw ApiException.conflict("CUSTOMER_HAS_PUNISHMENTS",
                    "Khách hàng đã có biên bản phạt, không thể xoá. Hãy khoá tài khoản nếu cần ngừng sử dụng.");
        }
        User user = customer.getUser();
        vehicleRepository.deleteAll(vehicleRepository.findByCustomerId(id));
        tokenRepository.deleteByUserId(user.getId());
        customerRepository.delete(customer);
        userRepository.delete(user);
    }

    // ------------------------------------------------------------------ Tiện ích

    private void checkDuplicates(String email, String phone, String idNumber, Long userId, Long customerId) {
        Map<String, String> duplicates = new LinkedHashMap<>();
        boolean emailTaken = userId == null ? userRepository.existsByEmailIgnoreCase(email)
                : userRepository.existsByEmailIgnoreCaseAndIdNot(email, userId);
        if (emailTaken) {
            duplicates.put("email", "Email đã được sử dụng");
        }
        boolean phoneTaken = userId == null ? userRepository.existsByPhone(phone)
                : userRepository.existsByPhoneAndIdNot(phone, userId);
        if (phoneTaken) {
            duplicates.put("phone", "Số điện thoại đã được sử dụng");
        }
        boolean idTaken = customerId == null ? customerRepository.existsByIdNumber(idNumber)
                : customerRepository.existsByIdNumberAndIdNot(idNumber, customerId);
        if (idTaken) {
            duplicates.put("idNumber", "Số CCCD đã được đăng ký");
        }
        if (!duplicates.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE", "Thông tin đã tồn tại trong hệ thống", duplicates);
        }
    }

    private static void applyCustomerFields(Customer customer, CustomerRequest r) {
        customer.setIdNumber(r.idNumber());
        customer.setDateOfBirth(r.dateOfBirth());
        customer.setGender(r.gender());
        customer.setAddress(r.address());
    }

    public Customer findCustomer(Long id) {
        return customerRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy khách hàng"));
    }

    private User findUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản"));
    }

    /** Mật khẩu tạm 10 ký tự, luôn thoả quy tắc mật khẩu (hoa, thường, số, ký tự đặc biệt). */
    static String generateTemporaryPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "@#$%&*!";
        String all = upper + lower + digits;
        List<Character> chars = new ArrayList<>();
        chars.add(upper.charAt(RANDOM.nextInt(upper.length())));
        chars.add(lower.charAt(RANDOM.nextInt(lower.length())));
        chars.add(digits.charAt(RANDOM.nextInt(digits.length())));
        chars.add(special.charAt(RANDOM.nextInt(special.length())));
        for (int i = 0; i < 6; i++) {
            chars.add(all.charAt(RANDOM.nextInt(all.length())));
        }
        Collections.shuffle(chars, RANDOM);
        StringBuilder sb = new StringBuilder();
        chars.forEach(sb::append);
        return sb.toString();
    }
}
