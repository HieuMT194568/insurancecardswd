package com.insurancecard.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.CodeGenerator;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.Compensation;
import com.insurancecard.domain.Contract;
import com.insurancecard.domain.Customer;
import com.insurancecard.domain.Payment;
import com.insurancecard.domain.Punishment;
import com.insurancecard.domain.User;
import com.insurancecard.domain.enums.PaymentMethod;
import com.insurancecard.domain.enums.PaymentStatus;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.dto.PaymentDtos.PaymentResponse;
import com.insurancecard.repository.PaymentRepository;
import com.insurancecard.security.CurrentUser;

/** Mọi giao dịch tiền (thu phí, hoàn phí, thu phạt, chi bồi thường) đều ghi vào bảng payments. */
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CurrentUser currentUser;

    public PaymentService(PaymentRepository paymentRepository, CurrentUser currentUser) {
        this.paymentRepository = paymentRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> search(String q, Long customerId, PaymentType type, PaymentStatus status,
                                                Integer page, Integer size) {
        return PageResponse.of(paymentRepository.search(Paging.keyword(q), currentUser.scopeCustomerId(customerId),
                type, status, Paging.of(page, size)), DtoMapper::payment);
    }

    public Payment createPending(Customer customer, Contract contract, PaymentType type, BigDecimal amount,
                                 String note) {
        Payment p = newPayment(customer, type, amount, note);
        p.setContract(contract);
        p.setStatus(PaymentStatus.PENDING);
        return paymentRepository.save(p);
    }

    public Payment createPaid(Customer customer, Contract contract, Punishment punishment, Compensation compensation,
                              PaymentType type, BigDecimal amount, PaymentMethod method, String note,
                              User processedBy) {
        Payment p = newPayment(customer, type, amount, note);
        p.setContract(contract);
        p.setPunishment(punishment);
        p.setCompensation(compensation);
        p.setStatus(PaymentStatus.PAID);
        p.setMethod(method);
        p.setPaidAt(LocalDateTime.now());
        p.setProcessedBy(processedBy);
        return paymentRepository.save(p);
    }

    public void markPaid(Payment p, PaymentMethod method, User processedBy) {
        p.setStatus(PaymentStatus.PAID);
        p.setMethod(method);
        p.setPaidAt(LocalDateTime.now());
        p.setProcessedBy(processedBy);
    }

    private Payment newPayment(Customer customer, PaymentType type, BigDecimal amount, String note) {
        Payment p = new Payment();
        p.setPaymentCode(CodeGenerator.next("PM", paymentRepository::existsByPaymentCode));
        p.setCustomer(customer);
        p.setType(type);
        p.setAmount(amount);
        p.setNote(note);
        return p;
    }
}
