package com.insurancecard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.CodeGenerator;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.Punishment;
import com.insurancecard.domain.User;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.dto.ContractDtos.PayRequest;
import com.insurancecard.dto.PunishmentDtos.PunishmentRequest;
import com.insurancecard.dto.PunishmentDtos.PunishmentResponse;
import com.insurancecard.dto.PunishmentDtos.WaiveRequest;
import com.insurancecard.repository.PunishmentRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.security.AppUserPrincipal;
import com.insurancecard.security.CurrentUser;

@Service
public class PunishmentService {

    private final PunishmentRepository punishmentRepository;
    private final UserRepository userRepository;
    private final CustomerService customerService;
    private final ContractService contractService;
    private final PaymentService paymentService;
    private final SettingService settingService;
    private final CurrentUser currentUser;

    public PunishmentService(PunishmentRepository punishmentRepository, UserRepository userRepository,
                             CustomerService customerService, ContractService contractService,
                             PaymentService paymentService, SettingService settingService, CurrentUser currentUser) {
        this.punishmentRepository = punishmentRepository;
        this.userRepository = userRepository;
        this.customerService = customerService;
        this.contractService = contractService;
        this.paymentService = paymentService;
        this.settingService = settingService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<PunishmentResponse> search(String q, Long customerId, PunishmentStatus status,
                                                   Integer page, Integer size) {
        return PageResponse.of(punishmentRepository.search(Paging.keyword(q), currentUser.scopeCustomerId(customerId),
                status, Paging.of(page, size)), DtoMapper::punishment);
    }

    @Transactional(readOnly = true)
    public PunishmentResponse get(Long id) {
        return DtoMapper.punishment(findOwned(id));
    }

    @Transactional
    public PunishmentResponse create(PunishmentRequest r) {
        Customer customer = customerService.findCustomer(r.customerId());
        Punishment p = new Punishment();
        p.setPunishmentCode(CodeGenerator.next("VP", punishmentRepository::existsByPunishmentCode));
        p.setCustomer(customer);
        apply(p, r, customer);
        p.setStatus(PunishmentStatus.UNPAID);
        p.setCreatedBy(userRepository.getReferenceById(currentUser.get().userId()));
        punishmentRepository.save(p);
        return DtoMapper.punishment(p);
    }

    @Transactional
    public PunishmentResponse update(Long id, PunishmentRequest r) {
        Punishment p = find(id);
        requireUnpaid(p);
        if (!p.getCustomer().getId().equals(r.customerId())) {
            throw ApiException.businessField("CUSTOMER_CHANGE_NOT_ALLOWED", "customerId",
                    "Không được đổi khách hàng của biên bản phạt. Hãy xoá và lập biên bản mới.");
        }
        apply(p, r, p.getCustomer());
        return DtoMapper.punishment(p);
    }

    /** Chỉ xoá được biên bản chưa nộp (lập nhầm). */
    @Transactional
    public void delete(Long id) {
        Punishment p = find(id);
        requireUnpaid(p);
        punishmentRepository.delete(p);
    }

    @Transactional
    public PunishmentResponse pay(Long id, PayRequest r) {
        AppUserPrincipal me = currentUser.get();
        Punishment p = findOwned(id);
        requireUnpaid(p);
        if (me.isCustomer() && r.method() == PaymentMethod.CASH) {
            throw ApiException.businessField("CASH_NOT_ALLOWED", "method",
                    "Thanh toán tiền mặt chỉ thực hiện tại quầy giao dịch");
        }
        User processor = userRepository.getReferenceById(me.userId());
        p.setStatus(PunishmentStatus.PAID);
        p.setResolvedAt(LocalDateTime.now());
        p.setResolvedBy(processor);
        paymentService.createPaid(p.getCustomer(), p.getContract(), p, null, PaymentType.PENALTY, p.getAmount(),
                r.method(), "Nộp phạt " + p.getPunishmentCode(), processor);
        return DtoMapper.punishment(p);
    }

    @Transactional
    public PunishmentResponse waive(Long id, WaiveRequest r) {
        Punishment p = find(id);
        requireUnpaid(p);
        p.setStatus(PunishmentStatus.WAIVED);
        p.setResolutionNote(r.note());
        p.setResolvedAt(LocalDateTime.now());
        p.setResolvedBy(userRepository.getReferenceById(currentUser.get().userId()));
        return DtoMapper.punishment(p);
    }

    private void apply(Punishment p, PunishmentRequest r, Customer customer) {
        Contract contract = null;
        if (r.contractId() != null) {
            contract = contractService.find(r.contractId());
            if (!contract.getCustomer().getId().equals(customer.getId())) {
                throw ApiException.businessField("CONTRACT_NOT_OWNED", "contractId",
                        "Hợp đồng không thuộc khách hàng đã chọn");
            }
        }
        LocalDate dueDate = r.dueDate() != null ? r.dueDate()
                : r.violationDate().plusDays(settingService.getInt(SettingService.PENALTY_DUE_DAYS));
        if (dueDate.isBefore(r.violationDate())) {
            throw ApiException.validation("dueDate", "Hạn nộp phạt không được trước ngày vi phạm");
        }
        if (dueDate.isBefore(LocalDate.now())) {
            throw ApiException.validation("dueDate", "Hạn nộp phạt không được trước ngày hôm nay");
        }
        p.setContract(contract);
        p.setViolationType(r.violationType());
        p.setDescription(r.description());
        p.setViolationDate(r.violationDate());
        p.setAmount(r.amount());
        p.setDueDate(dueDate);
    }

    private static void requireUnpaid(Punishment p) {
        if (p.getStatus() != PunishmentStatus.UNPAID) {
            throw ApiException.business("PUNISHMENT_RESOLVED", "Biên bản phạt đã được nộp hoặc đã miễn, không thể thao tác");
        }
    }

    private Punishment find(Long id) {
        return punishmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy biên bản phạt"));
    }

    private Punishment findOwned(Long id) {
        Punishment p = find(id);
        currentUser.checkOwnership(p.getCustomer().getId());
        return p;
    }
}
