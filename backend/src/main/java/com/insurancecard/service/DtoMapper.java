package com.insurancecard.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import com.insurancecard.domain.Accident;
import com.insurancecard.domain.Compensation;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.InsuranceProduct;
import com.insurancecard.domain.Payment;
import com.insurancecard.domain.Punishment;
import com.insurancecard.domain.User;
import com.insurancecard.domain.Vehicle;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.dto.AccidentDtos.AccidentResponse;
import com.insurancecard.dto.AuthDtos.UserInfo;
import com.insurancecard.dto.CompensationDtos.CompensationResponse;
import com.insurancecard.dto.ContractDtos.ContractResponse;
import com.insurancecard.dto.CustomerDtos.CustomerResponse;
import com.insurancecard.dto.PaymentDtos.PaymentResponse;
import com.insurancecard.dto.ProductDtos.ProductResponse;
import com.insurancecard.dto.PunishmentDtos.PunishmentResponse;
import com.insurancecard.dto.VehicleDtos.VehicleResponse;

/** Chuyển entity -> DTO trả về cho client (không bao giờ trả passwordHash). */
public final class DtoMapper {

    private DtoMapper() {}

    public static UserInfo userInfo(User u, Customer c) {
        return new UserInfo(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getRole(), u.getStatus(),
                c == null ? null : c.getId(), c == null ? null : c.getCustomerCode());
    }

    public static CustomerResponse customer(Customer c, long vehicleCount) {
        User u = c.getUser();
        return new CustomerResponse(c.getId(), c.getCustomerCode(), u.getId(), u.getFullName(), u.getEmail(),
                u.getPhone(), c.getIdNumber(), c.getDateOfBirth(), c.getGender(), c.getAddress(), u.getStatus(),
                vehicleCount, c.getCreatedAt(), c.getUpdatedAt());
    }

    public static VehicleResponse vehicle(Vehicle v) {
        Customer c = v.getCustomer();
        return new VehicleResponse(v.getId(), c.getId(), c.getCustomerCode(), c.getUser().getFullName(),
                v.getLicensePlate(), v.getBrand(), v.getModel(), v.getColor(), v.getEngineCapacity(),
                v.getManufactureYear(), v.getChassisNumber(), v.getEngineNumber(), v.getCreatedAt(), v.getUpdatedAt());
    }

    public static ProductResponse product(InsuranceProduct p) {
        return new ProductResponse(p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getMinEngineCapacity(),
                p.getMaxEngineCapacity(), p.getAnnualPremium(), p.getMaxCompensation(), p.getStatus(),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    public static ContractResponse contract(Contract c) {
        Customer cu = c.getCustomer();
        Vehicle v = c.getVehicle();
        InsuranceProduct p = c.getProduct();
        Long daysUntilExpiry = c.getStatus() == ContractStatus.ACTIVE
                ? ChronoUnit.DAYS.between(LocalDate.now(), c.getEndDate())
                : null;
        return new ContractResponse(c.getId(), c.getContractNumber(), c.getStatus(),
                cu.getId(), cu.getCustomerCode(), cu.getUser().getFullName(), cu.getUser().getPhone(),
                v.getId(), v.getLicensePlate(), v.getBrand() + " " + v.getModel(), v.getEngineCapacity(),
                p.getId(), p.getCode(), p.getName(),
                c.getStartDate(), c.getEndDate(), c.getTermYears(), c.getPremiumAmount(), c.getMaxCompensation(),
                c.getRenewedFrom() == null ? null : c.getRenewedFrom().getId(),
                c.getCancelReason(), c.getCancelledAt(), c.getNote(), c.getCreatedAt(), daysUntilExpiry);
    }

    public static PaymentResponse payment(Payment p) {
        return new PaymentResponse(p.getId(), p.getPaymentCode(), p.getType(), p.getAmount(), p.getMethod(),
                p.getStatus(), p.getPaidAt(), p.getNote(),
                p.getCustomer().getId(), p.getCustomer().getUser().getFullName(),
                p.getContract() == null ? null : p.getContract().getId(),
                p.getContract() == null ? null : p.getContract().getContractNumber(),
                p.getPunishment() == null ? null : p.getPunishment().getId(),
                p.getPunishment() == null ? null : p.getPunishment().getPunishmentCode(),
                p.getCompensation() == null ? null : p.getCompensation().getId(),
                p.getCompensation() == null ? null : p.getCompensation().getClaimCode(),
                p.getCreatedAt());
    }

    public static AccidentResponse accident(Accident a) {
        Contract c = a.getContract();
        return new AccidentResponse(a.getId(), a.getAccidentCode(), c.getId(), c.getContractNumber(),
                c.getCustomer().getId(), c.getCustomer().getUser().getFullName(), c.getVehicle().getLicensePlate(),
                a.getAccidentTime(), a.getLocation(), a.getDescription(), a.getDamageType(), a.getEstimatedDamage(),
                a.getPoliceReportNumber(), a.getStatus(), a.getResolutionNote(), a.getResolvedAt(),
                a.getResolvedBy() == null ? null : a.getResolvedBy().getFullName(),
                a.getReportedBy().getFullName(), a.getCreatedAt());
    }

    public static CompensationResponse compensation(Compensation cp) {
        Contract c = cp.getContract();
        Accident a = cp.getAccident();
        return new CompensationResponse(cp.getId(), cp.getClaimCode(), a.getId(), a.getAccidentCode(),
                a.getAccidentTime(), a.getStatus(), a.getEstimatedDamage(), c.getId(), c.getContractNumber(),
                c.getCustomer().getId(), c.getCustomer().getUser().getFullName(), c.getVehicle().getLicensePlate(),
                cp.getRequestedAmount(), cp.getApprovedAmount(), cp.getDescription(), cp.getStatus(),
                cp.getResolutionNote(), cp.getResolvedAt(),
                cp.getResolvedBy() == null ? null : cp.getResolvedBy().getFullName(),
                cp.getPaidAt(), cp.getCreatedAt());
    }

    public static PunishmentResponse punishment(Punishment p) {
        Customer cu = p.getCustomer();
        boolean overdue = p.getStatus() == PunishmentStatus.UNPAID && p.getDueDate().isBefore(LocalDate.now());
        return new PunishmentResponse(p.getId(), p.getPunishmentCode(), cu.getId(), cu.getCustomerCode(),
                cu.getUser().getFullName(),
                p.getContract() == null ? null : p.getContract().getId(),
                p.getContract() == null ? null : p.getContract().getContractNumber(),
                p.getViolationType(), p.getDescription(), p.getViolationDate(), p.getAmount(), p.getDueDate(),
                overdue, p.getStatus(), p.getResolutionNote(), p.getResolvedAt(), p.getCreatedAt());
    }
}
