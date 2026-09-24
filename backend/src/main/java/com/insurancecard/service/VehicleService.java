package com.insurancecard.service;

import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.Vehicle;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.VehicleDtos.VehicleRequest;
import com.insurancecard.dto.VehicleDtos.VehicleResponse;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.VehicleRepository;
import com.insurancecard.security.AppUserPrincipal;
import com.insurancecard.security.CurrentUser;
import com.insurancecard.validation.ValidationRules;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final ContractRepository contractRepository;
    private final CustomerService customerService;
    private final CurrentUser currentUser;

    public VehicleService(VehicleRepository vehicleRepository, ContractRepository contractRepository,
                          CustomerService customerService, CurrentUser currentUser) {
        this.vehicleRepository = vehicleRepository;
        this.contractRepository = contractRepository;
        this.customerService = customerService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<VehicleResponse> search(String q, Long customerId, Integer page, Integer size) {
        return PageResponse.of(vehicleRepository.search(Paging.keyword(q), currentUser.scopeCustomerId(customerId),
                Paging.of(page, size)), DtoMapper::vehicle);
    }

    @Transactional(readOnly = true)
    public VehicleResponse get(Long id) {
        return DtoMapper.vehicle(findOwned(id));
    }

    @Transactional
    public VehicleResponse create(VehicleRequest r) {
        AppUserPrincipal me = currentUser.get();
        Long customerId = me.isCustomer() ? me.customerId() : r.customerId();
        if (customerId == null) {
            throw ApiException.validation("customerId", "Vui lòng chọn khách hàng sở hữu xe");
        }
        Customer customer = customerService.findCustomer(customerId);
        if (customer.getUser().getStatus() == UserStatus.LOCKED) {
            throw ApiException.business("CUSTOMER_LOCKED", "Tài khoản khách hàng đang bị khoá");
        }
        Normalized n = normalizeAndValidate(r);
        checkDuplicates(n, null);

        Vehicle v = new Vehicle();
        v.setCustomer(customer);
        apply(v, r, n);
        vehicleRepository.save(v);
        return DtoMapper.vehicle(v);
    }

    @Transactional
    public VehicleResponse update(Long id, VehicleRequest r) {
        Vehicle v = findOwned(id);
        if (currentUser.get().isStaff() && r.customerId() != null && !r.customerId().equals(v.getCustomer().getId())) {
            throw ApiException.businessField("OWNER_CHANGE_NOT_ALLOWED", "customerId",
                    "Không được chuyển chủ sở hữu xe. Hãy tạo xe mới cho khách hàng khác.");
        }
        Normalized n = normalizeAndValidate(r);
        checkDuplicates(n, id);

        // Xe đã có hợp đồng: không được đổi thông tin định danh và dung tích (ảnh hưởng hợp đồng đã ký)
        if (contractRepository.existsByVehicleId(id)) {
            Map<String, String> locked = new LinkedHashMap<>();
            if (!n.chassis().equals(v.getChassisNumber())) {
                locked.put("chassisNumber", "Xe đã có hợp đồng, không được sửa số khung");
            }
            if (!n.engine().equals(v.getEngineNumber())) {
                locked.put("engineNumber", "Xe đã có hợp đồng, không được sửa số máy");
            }
            if (!Objects.equals(r.engineCapacity(), v.getEngineCapacity())) {
                locked.put("engineCapacity", "Xe đã có hợp đồng, không được sửa dung tích xi-lanh");
            }
            if (!locked.isEmpty()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VEHICLE_LOCKED_FIELDS",
                        "Xe đã phát sinh hợp đồng, chỉ được sửa biển số, hãng, dòng xe, màu và năm sản xuất", locked);
            }
        }
        apply(v, r, n);
        return DtoMapper.vehicle(v);
    }

    @Transactional
    public void delete(Long id) {
        Vehicle v = findOwned(id);
        if (contractRepository.existsByVehicleId(id)) {
            throw ApiException.conflict("VEHICLE_HAS_CONTRACTS",
                    "Xe đã có hợp đồng bảo hiểm, không thể xoá");
        }
        vehicleRepository.delete(v);
    }

    /** Lấy xe và kiểm tra quyền sở hữu (khách hàng chỉ thao tác xe của mình). */
    public Vehicle findOwned(Long id) {
        Vehicle v = vehicleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy xe"));
        currentUser.checkOwnership(v.getCustomer().getId());
        return v;
    }

    // ------------------------------------------------------------------ Validate & chuẩn hoá

    private record Normalized(String plate, String chassis, String engine) {}

    private Normalized normalizeAndValidate(VehicleRequest r) {
        String plate = r.licensePlate().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
        String chassis = r.chassisNumber().toUpperCase(Locale.ROOT);
        String engine = r.engineNumber().toUpperCase(Locale.ROOT);
        Map<String, String> errors = new LinkedHashMap<>();
        if (!plate.matches(ValidationRules.LICENSE_PLATE)) {
            errors.put("licensePlate", ValidationRules.LICENSE_PLATE_MSG);
        }
        if (!chassis.matches(ValidationRules.SERIAL)) {
            errors.put("chassisNumber", ValidationRules.CHASSIS_MSG);
        }
        if (!engine.matches(ValidationRules.SERIAL)) {
            errors.put("engineNumber", ValidationRules.ENGINE_MSG);
        }
        if (!errors.containsKey("chassisNumber") && chassis.equals(engine)) {
            errors.put("engineNumber", "Số máy không được trùng số khung");
        }
        int currentYear = Year.now().getValue();
        if (r.manufactureYear() > currentYear) {
            errors.put("manufactureYear", "Năm sản xuất từ " + ValidationRules.MIN_MANUFACTURE_YEAR
                    + " đến " + currentYear);
        }
        if (!errors.isEmpty()) {
            throw ApiException.validation(errors);
        }
        return new Normalized(plate, chassis, engine);
    }

    private void checkDuplicates(Normalized n, Long excludeId) {
        Map<String, String> duplicates = new LinkedHashMap<>();
        boolean plate = excludeId == null ? vehicleRepository.existsByLicensePlate(n.plate())
                : vehicleRepository.existsByLicensePlateAndIdNot(n.plate(), excludeId);
        if (plate) {
            duplicates.put("licensePlate", "Biển số đã được đăng ký cho xe khác");
        }
        boolean chassis = excludeId == null ? vehicleRepository.existsByChassisNumber(n.chassis())
                : vehicleRepository.existsByChassisNumberAndIdNot(n.chassis(), excludeId);
        if (chassis) {
            duplicates.put("chassisNumber", "Số khung đã tồn tại trong hệ thống");
        }
        boolean engine = excludeId == null ? vehicleRepository.existsByEngineNumber(n.engine())
                : vehicleRepository.existsByEngineNumberAndIdNot(n.engine(), excludeId);
        if (engine) {
            duplicates.put("engineNumber", "Số máy đã tồn tại trong hệ thống");
        }
        if (!duplicates.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE", "Thông tin xe đã tồn tại trong hệ thống",
                    duplicates);
        }
    }

    private static void apply(Vehicle v, VehicleRequest r, Normalized n) {
        v.setLicensePlate(n.plate());
        v.setBrand(r.brand());
        v.setModel(r.model());
        v.setColor(r.color());
        v.setEngineCapacity(r.engineCapacity());
        v.setManufactureYear(r.manufactureYear());
        v.setChassisNumber(n.chassis());
        v.setEngineNumber(n.engine());
    }
}
