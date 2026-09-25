package com.insurancecard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.ClaimStatus;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.DashboardDtos.CustomerDashboard;
import com.insurancecard.dto.DashboardDtos.StaffDashboard;
import com.insurancecard.repository.AccidentRepository;
import com.insurancecard.repository.CompensationRepository;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.PaymentRepository;
import com.insurancecard.repository.PunishmentRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.repository.VehicleRepository;

@Service
public class DashboardService {

    private final ContractRepository contractRepository;
    private final VehicleRepository vehicleRepository;
    private final CompensationRepository compensationRepository;
    private final PunishmentRepository punishmentRepository;
    private final AccidentRepository accidentRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final SettingService settingService;

    public DashboardService(ContractRepository contractRepository, VehicleRepository vehicleRepository,
                            CompensationRepository compensationRepository, PunishmentRepository punishmentRepository,
                            AccidentRepository accidentRepository, PaymentRepository paymentRepository,
                            UserRepository userRepository, SettingService settingService) {
        this.contractRepository = contractRepository;
        this.vehicleRepository = vehicleRepository;
        this.compensationRepository = compensationRepository;
        this.punishmentRepository = punishmentRepository;
        this.accidentRepository = accidentRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.settingService = settingService;
    }

    @Transactional(readOnly = true)
    public CustomerDashboard forCustomer(Long customerId) {
        int window = settingService.getInt(SettingService.RENEWAL_WINDOW_DAYS);
        LocalDate today = LocalDate.now();
        return new CustomerDashboard(
                vehicleRepository.countByCustomerId(customerId),
                contractRepository.countByCustomerIdAndStatus(customerId, ContractStatus.ACTIVE),
                contractRepository.countByCustomerIdAndStatus(customerId, ContractStatus.PENDING_PAYMENT),
                compensationRepository.countByContractCustomerIdAndStatus(customerId, ClaimStatus.PENDING),
                punishmentRepository.countByCustomerIdAndStatus(customerId, PunishmentStatus.UNPAID),
                window,
                contractRepository.findExpiring(customerId, today, today.plusDays(window)).stream()
                        .map(DtoMapper::contract).toList());
    }

    @Transactional(readOnly = true)
    public StaffDashboard forStaff() {
        int window = settingService.getInt(SettingService.RENEWAL_WINDOW_DAYS);
        LocalDate today = LocalDate.now();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime nextMonth = monthStart.plusMonths(1);
        return new StaffDashboard(
                userRepository.countByRoleAndStatus(Role.CUSTOMER, UserStatus.ACTIVE),
                contractRepository.countByStatus(ContractStatus.ACTIVE),
                contractRepository.countByStatus(ContractStatus.PENDING_PAYMENT),
                accidentRepository.countByStatus(AccidentStatus.REPORTED),
                compensationRepository.countByStatus(ClaimStatus.PENDING),
                compensationRepository.countByStatus(ClaimStatus.APPROVED),
                punishmentRepository.countByStatus(PunishmentStatus.UNPAID),
                paymentRepository.sumPaid(PaymentType.PREMIUM, monthStart, nextMonth),
                paymentRepository.sumPaid(PaymentType.COMPENSATION, monthStart, nextMonth),
                window,
                contractRepository.findExpiring(null, today, today.plusDays(window)).stream()
                        .limit(10).map(DtoMapper::contract).toList());
    }
}
