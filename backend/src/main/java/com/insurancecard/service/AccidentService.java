package com.insurancecard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.CodeGenerator;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Accident;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.ClaimStatus;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.dto.AccidentDtos.AccidentRequest;
import com.insurancecard.dto.AccidentDtos.AccidentResolveRequest;
import com.insurancecard.dto.AccidentDtos.AccidentResponse;
import com.insurancecard.repository.AccidentRepository;
import com.insurancecard.repository.CompensationRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.security.AppUserPrincipal;
import com.insurancecard.security.CurrentUser;

@Service
public class AccidentService {

    private static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AccidentRepository accidentRepository;
    private final CompensationRepository compensationRepository;
    private final UserRepository userRepository;
    private final ContractService contractService;
    private final SettingService settingService;
    private final CurrentUser currentUser;

    public AccidentService(AccidentRepository accidentRepository, CompensationRepository compensationRepository,
                           UserRepository userRepository, ContractService contractService,
                           SettingService settingService, CurrentUser currentUser) {
        this.accidentRepository = accidentRepository;
        this.compensationRepository = compensationRepository;
        this.userRepository = userRepository;
        this.contractService = contractService;
        this.settingService = settingService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<AccidentResponse> search(String q, Long customerId, Long contractId, AccidentStatus status,
                                                 Integer page, Integer size) {
        return PageResponse.of(accidentRepository.search(Paging.keyword(q), currentUser.scopeCustomerId(customerId),
                contractId, status, Paging.of(page, size)), DtoMapper::accident);
    }

    @Transactional(readOnly = true)
    public AccidentResponse get(Long id) {
        return DtoMapper.accident(findOwned(id));
    }

    @Transactional
    public AccidentResponse create(AccidentRequest r) {
        return DtoMapper.accident(createEntity(r, "contractId", "accidentTime"));
    }

    /**
     * Tạo bản ghi tai nạn (dùng chung cho khai báo tai nạn và yêu cầu bồi thường kèm khai báo mới).
     * contractField/timeField: tên trường để gắn lỗi lên đúng ô trên form.
     */
    public Accident createEntity(AccidentRequest r, String contractField, String timeField) {
        AppUserPrincipal me = currentUser.get();
        Contract contract = contractService.findOwned(r.contractId());
        validateAgainstContract(contract, r.accidentTime(), contractField, timeField);

        Accident a = new Accident();
        a.setAccidentCode(CodeGenerator.next("TN", accidentRepository::existsByAccidentCode));
        a.setContract(contract);
        apply(a, r);
        a.setStatus(AccidentStatus.REPORTED);
        a.setReportedBy(userRepository.getReferenceById(me.userId()));
        return accidentRepository.save(a);
    }

    @Transactional
    public AccidentResponse update(Long id, AccidentRequest r) {
        Accident a = findOwned(id);
        if (a.getStatus() != AccidentStatus.REPORTED) {
            throw ApiException.business("ACCIDENT_RESOLVED", "Tai nạn đã được xử lý, không thể chỉnh sửa");
        }
        Contract contract = contractService.findOwned(r.contractId());
        if (!contract.getId().equals(a.getContract().getId()) && compensationRepository.existsByAccidentId(id)) {
            throw ApiException.businessField("ACCIDENT_HAS_CLAIM", "contractId",
                    "Tai nạn đã có yêu cầu bồi thường, không được đổi hợp đồng");
        }
        validateAgainstContract(contract, r.accidentTime(), "contractId", "accidentTime");
        a.setContract(contract);
        apply(a, r);
        return DtoMapper.accident(a);
    }

    /** Nhân viên xác minh / bác bỏ tai nạn. Bác bỏ => các yêu cầu bồi thường đang chờ bị từ chối theo. */
    @Transactional
    public AccidentResponse resolve(Long id, AccidentResolveRequest r) {
        Accident a = find(id);
        if (r.status() != AccidentStatus.VERIFIED && r.status() != AccidentStatus.REJECTED) {
            throw ApiException.validation("status", "Kết quả xử lý chỉ được là VERIFIED (xác minh) hoặc REJECTED (bác bỏ)");
        }
        if (a.getStatus() != AccidentStatus.REPORTED) {
            throw ApiException.business("ACCIDENT_RESOLVED", "Tai nạn đã được xử lý trước đó");
        }
        if (r.status() == AccidentStatus.REJECTED && (r.note() == null || r.note().length() < 10)) {
            throw ApiException.validation("note", "Vui lòng nhập lý do bác bỏ (10-500 ký tự)");
        }
        LocalDateTime now = LocalDateTime.now();
        var staff = userRepository.getReferenceById(currentUser.get().userId());
        a.setStatus(r.status());
        a.setResolutionNote(r.note());
        a.setResolvedAt(now);
        a.setResolvedBy(staff);
        if (r.status() == AccidentStatus.REJECTED) {
            compensationRepository.findByAccidentIdAndStatus(id, ClaimStatus.PENDING).forEach(cp -> {
                cp.setStatus(ClaimStatus.REJECTED);
                cp.setResolutionNote("Tai nạn không được xác minh: " + r.note());
                cp.setResolvedAt(now);
                cp.setResolvedBy(staff);
            });
        }
        return DtoMapper.accident(a);
    }

    @Transactional
    public void delete(Long id) {
        Accident a = findOwned(id);
        if (a.getStatus() != AccidentStatus.REPORTED) {
            throw ApiException.business("ACCIDENT_RESOLVED", "Chỉ xoá được tai nạn đang chờ xử lý");
        }
        if (compensationRepository.existsByAccidentId(id)) {
            throw ApiException.conflict("ACCIDENT_HAS_CLAIM", "Tai nạn đã có yêu cầu bồi thường, không thể xoá");
        }
        accidentRepository.delete(a);
    }

    public Accident find(Long id) {
        return accidentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tai nạn"));
    }

    public Accident findOwned(Long id) {
        Accident a = find(id);
        currentUser.checkOwnership(a.getContract().getCustomer().getId());
        return a;
    }

    /** Tai nạn phải thuộc thời hạn hợp đồng (đang hiệu lực/đã hết hạn) và còn trong hạn khai báo. */
    public void validateAgainstContract(Contract c, LocalDateTime accidentTime, String contractField, String timeField) {
        if (c.getStatus() != ContractStatus.ACTIVE && c.getStatus() != ContractStatus.EXPIRED) {
            throw ApiException.businessField("CONTRACT_NOT_EFFECTIVE", contractField,
                    "Chỉ khai báo tai nạn cho hợp đồng đang hiệu lực hoặc đã hết hạn");
        }
        LocalDate date = accidentTime.toLocalDate();
        if (accidentTime.isAfter(LocalDateTime.now())) {
            throw ApiException.validation(timeField, "Thời điểm tai nạn không được ở tương lai");
        }
        if (date.isBefore(c.getStartDate()) || date.isAfter(c.getEndDate())) {
            throw ApiException.businessField("OUT_OF_COVERAGE", timeField,
                    "Thời điểm tai nạn phải nằm trong thời hạn hợp đồng (" + c.getStartDate().format(VN_DATE)
                            + " - " + c.getEndDate().format(VN_DATE) + ")");
        }
        int deadline = settingService.getInt(SettingService.CLAIM_DEADLINE_DAYS);
        if (date.plusDays(deadline).isBefore(LocalDate.now())) {
            throw ApiException.businessField("REPORT_DEADLINE_PASSED", timeField,
                    "Đã quá thời hạn khai báo " + deadline + " ngày kể từ ngày xảy ra tai nạn");
        }
    }

    private static void apply(Accident a, AccidentRequest r) {
        a.setAccidentTime(r.accidentTime().withNano(0));
        a.setLocation(r.location());
        a.setDescription(r.description());
        a.setDamageType(r.damageType());
        a.setEstimatedDamage(r.estimatedDamage());
        a.setPoliceReportNumber(r.policeReportNumber());
    }
}
