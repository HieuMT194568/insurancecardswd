package com.insurancecard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.CodeGenerator;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.InsuranceProduct;
import com.insurancecard.domain.Payment;
import com.insurancecard.domain.User;
import com.insurancecard.domain.Vehicle;
import com.insurancecard.domain.enums.ClaimStatus;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.domain.enums.PaymentStatus;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.domain.enums.ProductStatus;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.ContractDtos.CancelRequest;
import com.insurancecard.dto.ContractDtos.ContractCreateRequest;
import com.insurancecard.dto.ContractDtos.ContractDetailResponse;
import com.insurancecard.dto.ContractDtos.ContractResponse;
import com.insurancecard.dto.ContractDtos.ContractUpdateRequest;
import com.insurancecard.dto.ContractDtos.PayRequest;
import com.insurancecard.dto.ContractDtos.RenewRequest;
import com.insurancecard.repository.AccidentRepository;
import com.insurancecard.repository.CompensationRepository;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.PaymentRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.repository.VehicleRepository;
import com.insurancecard.security.AppUserPrincipal;
import com.insurancecard.security.CurrentUser;

@Service
public class ContractService {

    /** Trạng thái "đang chiếm chỗ" để kiểm tra trùng thời gian bảo hiểm. */
    private static final EnumSet<ContractStatus> OCCUPYING = EnumSet.of(ContractStatus.PENDING_PAYMENT,
            ContractStatus.ACTIVE);
    private static final EnumSet<ClaimStatus> OPEN_CLAIMS = EnumSet.of(ClaimStatus.PENDING, ClaimStatus.APPROVED);
    private static final EnumSet<ClaimStatus> PAYOUT_CLAIMS = EnumSet.of(ClaimStatus.APPROVED, ClaimStatus.PAID);

    private final ContractRepository contractRepository;
    private final VehicleRepository vehicleRepository;
    private final PaymentRepository paymentRepository;
    private final AccidentRepository accidentRepository;
    private final CompensationRepository compensationRepository;
    private final UserRepository userRepository;
    private final CustomerService customerService;
    private final ProductService productService;
    private final PaymentService paymentService;
    private final SettingService settingService;
    private final CurrentUser currentUser;

    public ContractService(ContractRepository contractRepository, VehicleRepository vehicleRepository,
                           PaymentRepository paymentRepository, AccidentRepository accidentRepository,
                           CompensationRepository compensationRepository, UserRepository userRepository,
                           CustomerService customerService, ProductService productService,
                           PaymentService paymentService, SettingService settingService, CurrentUser currentUser) {
        this.contractRepository = contractRepository;
        this.vehicleRepository = vehicleRepository;
        this.paymentRepository = paymentRepository;
        this.accidentRepository = accidentRepository;
        this.compensationRepository = compensationRepository;
        this.userRepository = userRepository;
        this.customerService = customerService;
        this.productService = productService;
        this.paymentService = paymentService;
        this.settingService = settingService;
        this.currentUser = currentUser;
    }

    // ------------------------------------------------------------------ Xem

    @Transactional(readOnly = true)
    public PageResponse<ContractResponse> search(String q, Long customerId, Long vehicleId, ContractStatus status,
                                                 Integer page, Integer size) {
        return PageResponse.of(contractRepository.search(Paging.keyword(q), currentUser.scopeCustomerId(customerId),
                vehicleId, status, Paging.of(page, size)), DtoMapper::contract);
    }

    @Transactional(readOnly = true)
    public ContractDetailResponse getDetail(Long id) {
        return buildDetail(findOwned(id));
    }

    private ContractDetailResponse buildDetail(Contract c) {
        AppUserPrincipal me = currentUser.get();
        BigDecimal used = compensationRepository.sumApproved(c.getId(), PAYOUT_CLAIMS, null);
        Optional<Contract> renewal = contractRepository.findFirstByRenewedFromIdAndStatusNot(c.getId(),
                ContractStatus.CANCELLED);
        String renewBlocked = renewalBlockReason(c);
        boolean canCancel = c.getStatus() == ContractStatus.PENDING_PAYMENT
                || (c.getStatus() == ContractStatus.ACTIVE
                && !compensationRepository.existsByContractIdAndStatusIn(c.getId(), OPEN_CLAIMS));
        return new ContractDetailResponse(
                DtoMapper.contract(c),
                c.getRenewedFrom() == null ? null : c.getRenewedFrom().getContractNumber(),
                renewal.map(Contract::getId).orElse(null),
                renewal.map(Contract::getContractNumber).orElse(null),
                used,
                c.getMaxCompensation().subtract(used).max(BigDecimal.ZERO),
                computeRefund(c),
                c.getStatus() == ContractStatus.PENDING_PAYMENT && !c.getStartDate().isBefore(LocalDate.now()),
                renewBlocked == null,
                renewBlocked,
                canCancel,
                me.isStaff() && (c.getStatus() == ContractStatus.PENDING_PAYMENT
                        || c.getStatus() == ContractStatus.ACTIVE),
                paymentRepository.findByContractIdOrderByIdDesc(c.getId()).stream().map(DtoMapper::payment).toList(),
                accidentRepository.findByContractIdOrderByAccidentTimeDesc(c.getId()).stream()
                        .map(DtoMapper::accident).toList(),
                compensationRepository.findByContractIdOrderByIdDesc(c.getId()).stream()
                        .map(DtoMapper::compensation).toList());
    }

    // ------------------------------------------------------------------ Tạo mới

    @Transactional
    public ContractDetailResponse create(ContractCreateRequest r) {
        AppUserPrincipal me = currentUser.get();
        Long customerId = me.isCustomer() ? me.customerId() : r.customerId();
        if (customerId == null) {
            throw ApiException.validation("customerId", "Vui lòng chọn khách hàng");
        }
        Customer customer = customerService.findCustomer(customerId);
        requireActiveCustomer(customer);
        Vehicle vehicle = findVehicleOf(customer, r.vehicleId());
        InsuranceProduct product = findSellableProduct(r.productId(), vehicle);
        validateStartDate(r.startDate());
        LocalDate endDate = endDateOf(r.startDate(), r.termYears());
        checkOverlap(vehicle, product, r.startDate(), endDate, null);

        Contract c = new Contract();
        c.setContractNumber(CodeGenerator.next("HD", contractRepository::existsByContractNumber));
        c.setCustomer(customer);
        c.setVehicle(vehicle);
        c.setProduct(product);
        c.setStartDate(r.startDate());
        c.setEndDate(endDate);
        c.setTermYears(r.termYears());
        c.setPremiumAmount(product.getAnnualPremium().multiply(BigDecimal.valueOf(r.termYears())));
        c.setMaxCompensation(product.getMaxCompensation());
        c.setStatus(ContractStatus.PENDING_PAYMENT);
        c.setNote(r.note());
        c.setCreatedBy(userRepository.getReferenceById(me.userId()));
        contractRepository.save(c);

        paymentService.createPending(customer, c, PaymentType.PREMIUM, c.getPremiumAmount(),
                "Phí bảo hiểm hợp đồng " + c.getContractNumber());
        return buildDetail(c);
    }

    // ------------------------------------------------------------------ Cập nhật (nhân viên)

    @Transactional
    public ContractDetailResponse update(Long id, ContractUpdateRequest r) {
        Contract c = find(id);
        switch (c.getStatus()) {
            case ACTIVE -> {
                boolean coreChanged = !Objects.equals(r.vehicleId(), c.getVehicle().getId())
                        || !Objects.equals(r.productId(), c.getProduct().getId())
                        || !Objects.equals(r.startDate(), c.getStartDate())
                        || !Objects.equals(r.termYears(), c.getTermYears());
                if (coreChanged) {
                    throw ApiException.business("CONTRACT_ACTIVE",
                            "Hợp đồng đã có hiệu lực: chỉ được sửa ghi chú. Muốn đổi xe/gói/thời hạn hãy huỷ và tạo hợp đồng mới.");
                }
                c.setNote(r.note());
            }
            case PENDING_PAYMENT -> {
                Vehicle vehicle = findVehicleOf(c.getCustomer(), r.vehicleId());
                InsuranceProduct product = findSellableProduct(r.productId(), vehicle);
                validateStartDate(r.startDate());
                LocalDate endDate = endDateOf(r.startDate(), r.termYears());
                checkOverlap(vehicle, product, r.startDate(), endDate, c.getId());
                c.setVehicle(vehicle);
                c.setProduct(product);
                c.setStartDate(r.startDate());
                c.setEndDate(endDate);
                c.setTermYears(r.termYears());
                c.setPremiumAmount(product.getAnnualPremium().multiply(BigDecimal.valueOf(r.termYears())));
                c.setMaxCompensation(product.getMaxCompensation());
                c.setNote(r.note());
                paymentRepository.findFirstByContractIdAndTypeAndStatus(c.getId(), PaymentType.PREMIUM,
                        PaymentStatus.PENDING).ifPresent(p -> p.setAmount(c.getPremiumAmount()));
            }
            default -> throw ApiException.business("CONTRACT_NOT_EDITABLE",
                    "Hợp đồng đã hết hạn hoặc đã huỷ, không thể chỉnh sửa");
        }
        return buildDetail(c);
    }

    // ------------------------------------------------------------------ Thanh toán

    @Transactional
    public ContractDetailResponse pay(Long id, PayRequest r) {
        AppUserPrincipal me = currentUser.get();
        Contract c = findOwned(id);
        if (c.getStatus() != ContractStatus.PENDING_PAYMENT) {
            throw ApiException.business("CONTRACT_NOT_PAYABLE", "Hợp đồng không ở trạng thái chờ thanh toán");
        }
        if (c.getStartDate().isBefore(LocalDate.now())) {
            throw ApiException.business("PAYMENT_OVERDUE",
                    "Đã quá ngày bắt đầu hiệu lực nên không thể thanh toán. Vui lòng tạo hợp đồng mới.");
        }
        if (me.isCustomer() && r.method() == PaymentMethod.CASH) {
            throw ApiException.businessField("CASH_NOT_ALLOWED", "method",
                    "Thanh toán tiền mặt chỉ thực hiện tại quầy giao dịch");
        }
        User processor = userRepository.getReferenceById(me.userId());
        Payment payment = paymentRepository.findFirstByContractIdAndTypeAndStatus(c.getId(), PaymentType.PREMIUM,
                        PaymentStatus.PENDING)
                .orElseGet(() -> paymentService.createPending(c.getCustomer(), c, PaymentType.PREMIUM,
                        c.getPremiumAmount(), "Phí bảo hiểm hợp đồng " + c.getContractNumber()));
        paymentService.markPaid(payment, r.method(), processor);
        c.setStatus(ContractStatus.ACTIVE);
        return buildDetail(c);
    }

    // ------------------------------------------------------------------ Gia hạn

    @Transactional
    public ContractDetailResponse renew(Long id, RenewRequest r) {
        AppUserPrincipal me = currentUser.get();
        Contract old = findOwned(id);
        String blocked = renewalBlockReason(old);
        if (blocked != null) {
            throw ApiException.business("CONTRACT_NOT_RENEWABLE", blocked);
        }
        LocalDate start = old.getStatus() == ContractStatus.ACTIVE ? old.getEndDate().plusDays(1) : LocalDate.now();
        LocalDate end = endDateOf(start, r.termYears());
        checkOverlap(old.getVehicle(), old.getProduct(), start, end, null);

        InsuranceProduct product = old.getProduct();
        Contract c = new Contract();
        c.setContractNumber(CodeGenerator.next("HD", contractRepository::existsByContractNumber));
        c.setCustomer(old.getCustomer());
        c.setVehicle(old.getVehicle());
        c.setProduct(product);
        c.setStartDate(start);
        c.setEndDate(end);
        c.setTermYears(r.termYears());
        c.setPremiumAmount(product.getAnnualPremium().multiply(BigDecimal.valueOf(r.termYears())));
        c.setMaxCompensation(product.getMaxCompensation());
        c.setStatus(ContractStatus.PENDING_PAYMENT);
        c.setRenewedFrom(old);
        c.setNote("Gia hạn từ hợp đồng " + old.getContractNumber());
        c.setCreatedBy(userRepository.getReferenceById(me.userId()));
        contractRepository.save(c);
        paymentService.createPending(c.getCustomer(), c, PaymentType.PREMIUM, c.getPremiumAmount(),
                "Phí gia hạn hợp đồng " + old.getContractNumber() + " -> " + c.getContractNumber());
        return buildDetail(c);
    }

    /** @return null nếu được gia hạn, ngược lại là lý do không được gia hạn. */
    private String renewalBlockReason(Contract c) {
        switch (c.getStatus()) {
            case PENDING_PAYMENT:
                return "Hợp đồng chưa được thanh toán";
            case CANCELLED:
                return "Hợp đồng đã huỷ, vui lòng tạo hợp đồng mới";
            default:
                break;
        }
        Optional<Contract> renewal = contractRepository.findFirstByRenewedFromIdAndStatusNot(c.getId(),
                ContractStatus.CANCELLED);
        if (renewal.isPresent()) {
            return "Hợp đồng đã được gia hạn bằng hợp đồng " + renewal.get().getContractNumber();
        }
        if (c.getStatus() == ContractStatus.ACTIVE) {
            int window = settingService.getInt(SettingService.RENEWAL_WINDOW_DAYS);
            long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate());
            if (daysLeft > window) {
                return "Chỉ được gia hạn trong vòng " + window + " ngày trước ngày hết hạn (còn " + daysLeft + " ngày)";
            }
        }
        if (c.getCustomer().getUser().getStatus() != UserStatus.ACTIVE) {
            return "Tài khoản khách hàng không ở trạng thái hoạt động";
        }
        if (c.getProduct().getStatus() != ProductStatus.ACTIVE) {
            return "Gói bảo hiểm đã ngừng kinh doanh, vui lòng tạo hợp đồng mới với gói khác";
        }
        if (!c.getProduct().supportsEngineCapacity(c.getVehicle().getEngineCapacity())) {
            return "Xe không còn phù hợp với gói bảo hiểm này";
        }
        return null;
    }

    // ------------------------------------------------------------------ Huỷ

    @Transactional
    public ContractDetailResponse cancel(Long id, CancelRequest r) {
        AppUserPrincipal me = currentUser.get();
        Contract c = findOwned(id);
        switch (c.getStatus()) {
            case PENDING_PAYMENT -> paymentRepository.findFirstByContractIdAndTypeAndStatus(c.getId(),
                    PaymentType.PREMIUM, PaymentStatus.PENDING).ifPresent(p -> p.setStatus(PaymentStatus.CANCELLED));
            case ACTIVE -> {
                if (compensationRepository.existsByContractIdAndStatusIn(c.getId(), OPEN_CLAIMS)) {
                    throw ApiException.business("CONTRACT_HAS_OPEN_CLAIMS",
                            "Hợp đồng đang có yêu cầu bồi thường chưa xử lý xong, chưa thể huỷ");
                }
                BigDecimal refund = computeRefund(c);
                if (refund.signum() > 0) {
                    int percent = settingService.getInt(SettingService.CANCEL_REFUND_PERCENT);
                    paymentService.createPaid(c.getCustomer(), c, null, null, PaymentType.REFUND, refund,
                            PaymentMethod.BANK_TRANSFER,
                            "Hoàn " + percent + "% phí cho thời gian còn lại của hợp đồng " + c.getContractNumber(),
                            userRepository.getReferenceById(me.userId()));
                }
            }
            default -> throw ApiException.business("CONTRACT_NOT_CANCELLABLE",
                    "Chỉ huỷ được hợp đồng đang chờ thanh toán hoặc đang hiệu lực");
        }
        c.setStatus(ContractStatus.CANCELLED);
        c.setCancelReason(r.reason());
        c.setCancelledAt(LocalDateTime.now());
        return buildDetail(c);
    }

    /**
     * Hoàn phí khi huỷ hợp đồng đang hiệu lực = phí × (số ngày còn lại / tổng số ngày) × CANCEL_REFUND_PERCENT%,
     * làm tròn xuống bội số 1.000 VND. Không hoàn nếu hợp đồng đã phát sinh bồi thường.
     */
    public BigDecimal computeRefund(Contract c) {
        if (c.getStatus() != ContractStatus.ACTIVE
                || compensationRepository.existsByContractIdAndStatusIn(c.getId(), PAYOUT_CLAIMS)) {
            return BigDecimal.ZERO;
        }
        LocalDate today = LocalDate.now();
        LocalDate from = today.isAfter(c.getStartDate()) ? today : c.getStartDate();
        long remaining = ChronoUnit.DAYS.between(from, c.getEndDate()) + 1;
        long total = ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()) + 1;
        if (remaining <= 0 || total <= 0) {
            return BigDecimal.ZERO;
        }
        int percent = settingService.getInt(SettingService.CANCEL_REFUND_PERCENT);
        BigDecimal refund = c.getPremiumAmount()
                .multiply(BigDecimal.valueOf(remaining))
                .multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(total * 100), 0, RoundingMode.DOWN);
        return refund.divide(BigDecimal.valueOf(1000), 0, RoundingMode.DOWN).multiply(BigDecimal.valueOf(1000));
    }

    // ------------------------------------------------------------------ Tự động cập nhật trạng thái

    /** Hết hạn hợp đồng quá endDate; huỷ hợp đồng chờ thanh toán đã qua ngày bắt đầu. */
    @Transactional
    public int refreshStatuses() {
        LocalDate today = LocalDate.now();
        List<Contract> expired = contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, today);
        expired.forEach(c -> c.setStatus(ContractStatus.EXPIRED));
        List<Contract> unpaid = contractRepository.findByStatusAndStartDateBefore(ContractStatus.PENDING_PAYMENT, today);
        for (Contract c : unpaid) {
            c.setStatus(ContractStatus.CANCELLED);
            c.setCancelReason("Tự động huỷ do chưa thanh toán trước ngày bắt đầu hiệu lực");
            c.setCancelledAt(LocalDateTime.now());
            paymentRepository.findFirstByContractIdAndTypeAndStatus(c.getId(), PaymentType.PREMIUM,
                    PaymentStatus.PENDING).ifPresent(p -> p.setStatus(PaymentStatus.CANCELLED));
        }
        return expired.size() + unpaid.size();
    }

    // ------------------------------------------------------------------ Tiện ích

    public Contract find(Long id) {
        return contractRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy hợp đồng"));
    }

    public Contract findOwned(Long id) {
        Contract c = find(id);
        currentUser.checkOwnership(c.getCustomer().getId());
        return c;
    }

    private static void requireActiveCustomer(Customer customer) {
        if (customer.getUser().getStatus() != UserStatus.ACTIVE) {
            throw ApiException.business("CUSTOMER_NOT_ACTIVE", "Tài khoản khách hàng không ở trạng thái hoạt động");
        }
    }

    private Vehicle findVehicleOf(Customer customer, Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> ApiException.businessField("VEHICLE_NOT_FOUND", "vehicleId", "Không tìm thấy xe"));
        if (!vehicle.getCustomer().getId().equals(customer.getId())) {
            throw ApiException.businessField("VEHICLE_NOT_OWNED", "vehicleId", "Xe không thuộc sở hữu của khách hàng");
        }
        return vehicle;
    }

    private InsuranceProduct findSellableProduct(Long productId, Vehicle vehicle) {
        InsuranceProduct product = productService.find(productId);
        if (product.getStatus() != ProductStatus.ACTIVE) {
            throw ApiException.businessField("PRODUCT_INACTIVE", "productId", "Gói bảo hiểm đã ngừng kinh doanh");
        }
        if (!product.supportsEngineCapacity(vehicle.getEngineCapacity())) {
            throw ApiException.businessField("PRODUCT_NOT_APPLICABLE", "productId",
                    "Gói \"" + product.getName() + "\" chỉ áp dụng cho xe từ " + product.getMinEngineCapacity()
                            + " đến " + product.getMaxEngineCapacity() + " cc (xe đã chọn: "
                            + vehicle.getEngineCapacity() + " cc)");
        }
        return product;
    }

    private void validateStartDate(LocalDate startDate) {
        LocalDate today = LocalDate.now();
        int maxAdvance = settingService.getInt(SettingService.MAX_START_DATE_ADVANCE_DAYS);
        if (startDate.isBefore(today)) {
            throw ApiException.validation("startDate", "Ngày bắt đầu không được trước ngày hôm nay");
        }
        if (startDate.isAfter(today.plusDays(maxAdvance))) {
            throw ApiException.validation("startDate",
                    "Ngày bắt đầu tối đa sau hôm nay " + maxAdvance + " ngày");
        }
    }

    /** Ngày hết hạn = ngày bắt đầu + N năm - 1 ngày (VD: 01/01/2026 + 1 năm -> 31/12/2026). */
    private static LocalDate endDateOf(LocalDate start, int termYears) {
        return start.plusYears(termYears).minusDays(1);
    }

    private void checkOverlap(Vehicle vehicle, InsuranceProduct product, LocalDate start, LocalDate end,
                              Long excludeId) {
        List<Contract> overlaps = contractRepository.findOverlapping(vehicle.getId(), product.getId(), start, end,
                OCCUPYING, excludeId);
        if (!overlaps.isEmpty()) {
            Contract o = overlaps.get(0);
            DateTimeFormatter vn = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            throw ApiException.conflict("CONTRACT_OVERLAP",
                    "Xe " + vehicle.getLicensePlate() + " đã có hợp đồng " + o.getContractNumber()
                            + " cùng gói bảo hiểm trong khoảng " + o.getStartDate().format(vn) + " - "
                            + o.getEndDate().format(vn));
        }
    }
}
