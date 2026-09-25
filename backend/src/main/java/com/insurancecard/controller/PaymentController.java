package com.insurancecard.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insurancecard.common.PageResponse;
import com.insurancecard.domain.enums.PaymentStatus;
import com.insurancecard.domain.enums.PaymentType;
import com.insurancecard.dto.PaymentDtos.PaymentResponse;
import com.insurancecard.service.PaymentService;

/** Lịch sử giao dịch: chỉ đọc (giao dịch được sinh tự động từ nghiệp vụ hợp đồng/phạt/bồi thường). */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public PageResponse<PaymentResponse> search(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) Long customerId,
                                                @RequestParam(required = false) PaymentType type,
                                                @RequestParam(required = false) PaymentStatus status,
                                                @RequestParam(required = false) Integer page,
                                                @RequestParam(required = false) Integer size) {
        return paymentService.search(q, customerId, type, status, page, size);
    }
}
