package com.insurancecard.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.CodeGenerator;
import com.insurancecard.domain.Accident;
import com.insurancecard.domain.Compensation;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.InsuranceProduct;
import com.insurancecard.domain.Payment;
import com.insurancecard.domain.Punishment;
import com.insurancecard.domain.User;
import com.insurancecard.domain.Vehicle;
import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.domain.enums.ClaimStatus;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.domain.enums.DamageType;
import com.insurancecard.domain.enums.Gender;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.domain.enums.PaymentStatus;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.domain.enums.ProductStatus;
import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.domain.enums.ViolationType;
import com.insurancecard.repository.AccidentRepository;
import com.insurancecard.repository.CompensationRepository;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.CustomerRepository;
import com.insurancecard.repository.InsuranceProductRepository;
import com.insurancecard.repository.PaymentRepository;
import com.insurancecard.repository.PunishmentRepository;
import com.insurancecard.repository.UserRepository;
import com.insurancecard.repository.VehicleRepository;

/**
 * Tạo dữ liệu demo khi DB còn trống (app.seed.enabled=true).
 * Tài khoản: staff@insurancecard.vn / Staff@123, customer@insurancecard.vn / Customer@123
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AppProperties props;
    private final PasswordEncoder encoder;
    private final UserRepository users;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final InsuranceProductRepository products;
    private final ContractRepository contracts;
    private final PaymentRepository payments;
    private final AccidentRepository accidents;
    private final CompensationRepository compensations;
    private final PunishmentRepository punishments;

    public DataSeeder(AppProperties props, PasswordEncoder encoder, UserRepository users,
                      CustomerRepository customers, VehicleRepository vehicles, InsuranceProductRepository products,
                      ContractRepository contracts, PaymentRepository payments, AccidentRepository accidents,
                      CompensationRepository compensations, PunishmentRepository punishments) {
        this.props = props;
        this.encoder = encoder;
        this.users = users;
        this.customers = customers;
        this.vehicles = vehicles;
        this.products = products;
        this.contracts = contracts;
        this.payments = payments;
        this.accidents = accidents;
        this.compensations = compensations;
        this.punishments = punishments;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!props.seed().enabled() || users.count() > 0) {
            return;
        }
        log.info("Database trống -> tạo dữ liệu demo");
        LocalDate today = LocalDate.now();

        User staff = user("staff@insurancecard.vn", "Staff@123", "Nguyễn Văn Nhân", "0901234567", Role.STAFF,
                UserStatus.ACTIVE);
        user("staff2@insurancecard.vn", "Staff@123", "Lê Thị Hoa", "0901234568", Role.STAFF, UserStatus.ACTIVE);

        Customer minh = customer(user("customer@insurancecard.vn", "Customer@123", "Trần Minh Khang", "0912345678",
                Role.CUSTOMER, UserStatus.ACTIVE), "079090001234", LocalDate.of(1990, 5, 15), Gender.MALE,
                "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh");
        Customer lan = customer(user("lan.nguyen@gmail.com", "Customer@123", "Nguyễn Thị Lan", "0987654321",
                Role.CUSTOMER, UserStatus.ACTIVE), "001095004567", LocalDate.of(1995, 8, 20), Gender.FEMALE,
                "45 Kim Mã, Quận Ba Đình, Hà Nội");
        customer(user("pending.user@gmail.com", "Customer@123", "Phạm Quốc Bảo", "0356789012", Role.CUSTOMER,
                UserStatus.PENDING), "048099007890", LocalDate.of(1999, 1, 2), Gender.MALE,
                "12 Lê Duẩn, Quận Hải Châu, Đà Nẵng");
        customer(user("locked.user@gmail.com", "Customer@123", "Võ Thanh Tùng", "0778899001", Role.CUSTOMER,
                UserStatus.LOCKED), "092088001122", LocalDate.of(1988, 11, 30), Gender.MALE,
                "88 Trần Hưng Đạo, Ninh Kiều, Cần Thơ");

        InsuranceProduct tnds50 = product("TNDS-50", "TNDS bắt buộc xe máy đến 50cc",
                "Bảo hiểm trách nhiệm dân sự bắt buộc của chủ xe mô tô 2 bánh dung tích đến 50cc.",
                1, 50, 55_000, 150_000_000, ProductStatus.ACTIVE);
        InsuranceProduct tnds50p = product("TNDS-50P", "TNDS bắt buộc xe máy trên 50cc",
                "Bảo hiểm trách nhiệm dân sự bắt buộc của chủ xe mô tô 2 bánh dung tích trên 50cc.",
                51, 3000, 60_000, 150_000_000, ProductStatus.ACTIVE);
        product("COMBO-TN", "TNDS + Tai nạn người ngồi trên xe",
                "Trách nhiệm dân sự bắt buộc kèm bảo hiểm tai nạn cho người lái và người ngồi sau.",
                1, 3000, 120_000, 200_000_000, ProductStatus.ACTIVE);
        InsuranceProduct vcx = product("VCX-100", "Bảo hiểm vật chất xe máy",
                "Bồi thường thiệt hại vật chất xe do va chạm, cháy nổ, thiên tai, mất cắp toàn bộ xe.",
                100, 3000, 800_000, 50_000_000, ProductStatus.ACTIVE);
        product("TN-OLD", "Gói tai nạn cơ bản (ngừng bán)", "Gói cũ, không còn bán cho hợp đồng mới.",
                1, 3000, 30_000, 20_000_000, ProductStatus.INACTIVE);

        Vehicle vision = vehicle(minh, "59-X1 123.45", "Honda", "Vision", "Đỏ", 110, 2021, "RLHJF1234567",
                "JF81E1234567");
        Vehicle exciter = vehicle(minh, "59-Y2 678.90", "Yamaha", "Exciter 155", "Xanh GP", 155, 2022,
                "RLCUG0610NY1234", "G3P9E0123456");
        Vehicle cub = vehicle(minh, "59-AA 111.22", "Honda", "Cub 50", "Xanh dương", 50, 2019, "RLHCA5012345",
                "CA50E0098765");
        Vehicle sh = vehicle(lan, "29-B1 456.78", "Honda", "SH 125i", "Trắng", 125, 2023, "RLHJF6789012",
                "KF41E7654321");

        // Đang hiệu lực, sắp hết hạn (trong cửa sổ gia hạn)
        contract(minh, vision, tnds50p, today.minusDays(350), 1, ContractStatus.ACTIVE, staff, PaymentMethod.CASH);
        // Hợp đồng cũ đã hết hạn của cùng xe
        contract(minh, vision, tnds50p, today.minusDays(715), 1, ContractStatus.EXPIRED, staff,
                PaymentMethod.BANK_TRANSFER);
        // Vật chất xe, có tai nạn + bồi thường
        Contract vcxContract = contract(minh, exciter, vcx, today.minusDays(60), 2, ContractStatus.ACTIVE, staff,
                PaymentMethod.CARD);
        // Chờ thanh toán
        contract(minh, cub, tnds50, today.plusDays(5), 1, ContractStatus.PENDING_PAYMENT, staff, null);
        Contract lanContract = contract(lan, sh, tnds50p, today.minusDays(10), 1, ContractStatus.ACTIVE, staff,
                PaymentMethod.E_WALLET);

        Accident a1 = accident(vcxContract, today.minusDays(40).atTime(8, 30), "Ngã tư Hàng Xanh, Quận Bình Thạnh",
                "Va chạm với ô tô khi dừng đèn đỏ, xe bị bể dàn áo và gãy tay phanh.", DamageType.PROPERTY,
                3_500_000, "BB-0123/2026", AccidentStatus.VERIFIED, staff);
        Compensation c1 = claim(a1, 3_500_000, 3_000_000L, ClaimStatus.PAID, staff,
                "Đề nghị bồi thường chi phí sửa chữa dàn áo và tay phanh theo hoá đơn của đại lý Yamaha.");
        payment(minh, vcxContract, null, c1, PaymentType.COMPENSATION, 3_000_000, PaymentMethod.BANK_TRANSFER,
                PaymentStatus.PAID, "Chi trả bồi thường " + c1.getClaimCode(), staff);

        Accident a2 = accident(vcxContract, today.minusDays(3).atTime(19, 15), "Đường Võ Văn Kiệt, Quận 5",
                "Xe bị quẹt bởi xe máy khác khi chuyển làn, trầy xước bên hông phải và vỡ đèn xi-nhan.",
                DamageType.PROPERTY, 1_200_000, null, AccidentStatus.REPORTED, null);
        claim(a2, 1_200_000, null, ClaimStatus.PENDING, null,
                "Đề nghị bồi thường chi phí thay đèn xi-nhan và sơn lại phần bị trầy xước.");

        accident(lanContract, today.minusDays(2).atTime(7, 45), "Cầu Giấy, Hà Nội",
                "Va quệt nhẹ với xe đạp điện, người điều khiển xe đạp điện bị xây xát nhẹ ở tay.",
                DamageType.INJURY, 800_000, null, AccidentStatus.REPORTED, null);

        punishment(minh, vcxContract, ViolationType.FALSE_DECLARATION,
                "Kê khai sai màu xe trong hồ sơ yêu cầu bảo hiểm, yêu cầu bổ sung giấy tờ.", today.minusDays(5),
                200_000, today.plusDays(25), PunishmentStatus.UNPAID, staff);
        Punishment paid = punishment(lan, lanContract, ViolationType.LATE_PAYMENT,
                "Chậm bổ sung hồ sơ xe theo yêu cầu của công ty bảo hiểm.", today.minusDays(8),
                100_000, today.plusDays(22), PunishmentStatus.PAID, staff);
        payment(lan, lanContract, paid, null, PaymentType.PENALTY, 100_000, PaymentMethod.E_WALLET,
                PaymentStatus.PAID, "Nộp phạt " + paid.getPunishmentCode(), staff);

        log.info("Đã tạo dữ liệu demo: staff@insurancecard.vn / Staff@123, customer@insurancecard.vn / Customer@123");
    }

    private User user(String email, String password, String name, String phone, Role role, UserStatus status) {
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(password));
        u.setFullName(name);
        u.setPhone(phone);
        u.setRole(role);
        u.setStatus(status);
        return users.save(u);
    }

    private Customer customer(User u, String idNumber, LocalDate dob, Gender gender, String address) {
        Customer c = new Customer();
        c.setUser(u);
        c.setIdNumber(idNumber);
        c.setDateOfBirth(dob);
        c.setGender(gender);
        c.setAddress(address);
        return customers.save(c);
    }

    private InsuranceProduct product(String code, String name, String desc, int min, int max, long premium,
                                     long maxComp, ProductStatus status) {
        InsuranceProduct p = new InsuranceProduct();
        p.setCode(code);
        p.setName(name);
        p.setDescription(desc);
        p.setMinEngineCapacity(min);
        p.setMaxEngineCapacity(max);
        p.setAnnualPremium(BigDecimal.valueOf(premium));
        p.setMaxCompensation(BigDecimal.valueOf(maxComp));
        p.setStatus(status);
        return products.save(p);
    }

    private Vehicle vehicle(Customer c, String plate, String brand, String model, String color, int cc, int year,
                            String chassis, String engine) {
        Vehicle v = new Vehicle();
        v.setCustomer(c);
        v.setLicensePlate(plate);
        v.setBrand(brand);
        v.setModel(model);
        v.setColor(color);
        v.setEngineCapacity(cc);
        v.setManufactureYear(year);
        v.setChassisNumber(chassis);
        v.setEngineNumber(engine);
        return vehicles.save(v);
    }

    private Contract contract(Customer cu, Vehicle v, InsuranceProduct p, LocalDate start, int years,
                              ContractStatus status, User staff, PaymentMethod method) {
        Contract c = new Contract();
        c.setContractNumber(CodeGenerator.next("HD", contracts::existsByContractNumber));
        c.setCustomer(cu);
        c.setVehicle(v);
        c.setProduct(p);
        c.setStartDate(start);
        c.setEndDate(start.plusYears(years).minusDays(1));
        c.setTermYears(years);
        c.setPremiumAmount(p.getAnnualPremium().multiply(BigDecimal.valueOf(years)));
        c.setMaxCompensation(p.getMaxCompensation());
        c.setStatus(status);
        c.setCreatedBy(staff);
        contracts.save(c);
        boolean paid = status != ContractStatus.PENDING_PAYMENT;
        payment(cu, c, null, null, PaymentType.PREMIUM, c.getPremiumAmount().longValue(), paid ? method : null,
                paid ? PaymentStatus.PAID : PaymentStatus.PENDING, "Phí bảo hiểm hợp đồng " + c.getContractNumber(),
                paid ? staff : null);
        return c;
    }

    private void payment(Customer cu, Contract c, Punishment pn, Compensation cp, PaymentType type, long amount,
                         PaymentMethod method, PaymentStatus status, String note, User staff) {
        Payment p = new Payment();
        p.setPaymentCode(CodeGenerator.next("PM", payments::existsByPaymentCode));
        p.setCustomer(cu);
        p.setContract(c);
        p.setPunishment(pn);
        p.setCompensation(cp);
        p.setType(type);
        p.setAmount(BigDecimal.valueOf(amount));
        p.setMethod(method);
        p.setStatus(status);
        p.setPaidAt(status == PaymentStatus.PAID ? LocalDateTime.now() : null);
        p.setNote(note);
        p.setProcessedBy(staff);
        payments.save(p);
    }

    private Accident accident(Contract c, LocalDateTime time, String location, String desc, DamageType type,
                              long damage, String police, AccidentStatus status, User staff) {
        Accident a = new Accident();
        a.setAccidentCode(CodeGenerator.next("TN", accidents::existsByAccidentCode));
        a.setContract(c);
        a.setAccidentTime(time);
        a.setLocation(location);
        a.setDescription(desc);
        a.setDamageType(type);
        a.setEstimatedDamage(BigDecimal.valueOf(damage));
        a.setPoliceReportNumber(police);
        a.setStatus(status);
        a.setReportedBy(c.getCustomer().getUser());
        if (staff != null) {
            a.setResolvedBy(staff);
            a.setResolvedAt(LocalDateTime.now());
            a.setResolutionNote("Đã đối chiếu biên bản hiện trường");
        }
        return accidents.save(a);
    }

    private Compensation claim(Accident a, long requested, Long approved, ClaimStatus status, User staff,
                               String desc) {
        Compensation cp = new Compensation();
        cp.setClaimCode(CodeGenerator.next("BT", compensations::existsByClaimCode));
        cp.setAccident(a);
        cp.setContract(a.getContract());
        cp.setRequestedAmount(BigDecimal.valueOf(requested));
        cp.setApprovedAmount(approved == null ? null : BigDecimal.valueOf(approved));
        cp.setDescription(desc);
        cp.setStatus(status);
        cp.setRequestedBy(a.getContract().getCustomer().getUser());
        if (staff != null) {
            cp.setResolvedBy(staff);
            cp.setResolvedAt(LocalDateTime.now());
            cp.setResolutionNote("Duyệt theo hoá đơn sửa chữa, trừ phần hao mòn");
            cp.setPaidAt(status == ClaimStatus.PAID ? LocalDateTime.now() : null);
        }
        return compensations.save(cp);
    }

    private Punishment punishment(Customer cu, Contract c, ViolationType type, String desc, LocalDate date,
                                  long amount, LocalDate due, PunishmentStatus status, User staff) {
        Punishment p = new Punishment();
        p.setPunishmentCode(CodeGenerator.next("VP", punishments::existsByPunishmentCode));
        p.setCustomer(cu);
        p.setContract(c);
        p.setViolationType(type);
        p.setDescription(desc);
        p.setViolationDate(date);
        p.setAmount(BigDecimal.valueOf(amount));
        p.setDueDate(due);
        p.setStatus(status);
        p.setCreatedBy(staff);
        if (status == PunishmentStatus.PAID) {
            p.setResolvedBy(staff);
            p.setResolvedAt(LocalDateTime.now());
        }
        return punishments.save(p);
    }
}
