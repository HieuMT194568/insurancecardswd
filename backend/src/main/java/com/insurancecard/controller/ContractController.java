package com.insurancecard.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.insurancecard.common.PageResponse;
import com.insurancecard.domain.enums.ContractStatus;
import com.insurancecard.dto.ContractDtos.CancelRequest;
import com.insurancecard.dto.ContractDtos.ContractCreateRequest;
import com.insurancecard.dto.ContractDtos.ContractDetailResponse;
import com.insurancecard.dto.ContractDtos.ContractResponse;
import com.insurancecard.dto.ContractDtos.ContractUpdateRequest;
import com.insurancecard.dto.ContractDtos.PayRequest;
import com.insurancecard.dto.ContractDtos.RenewRequest;
import com.insurancecard.service.ContractService;

import jakarta.validation.Valid;

/**
 * Hợp đồng không có API xoá: hợp đồng là chứng từ, chỉ được huỷ (giữ lịch sử).
 * Khách hàng chỉ thấy/thao tác hợp đồng của mình.
 */
@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public PageResponse<ContractResponse> search(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) Long customerId,
                                                 @RequestParam(required = false) Long vehicleId,
                                                 @RequestParam(required = false) ContractStatus status,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return contractService.search(q, customerId, vehicleId, status, page, size);
    }

    @GetMapping("/{id}")
    public ContractDetailResponse get(@PathVariable Long id) {
        return contractService.getDetail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContractDetailResponse create(@Valid @RequestBody ContractCreateRequest request) {
        return contractService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STAFF')")
    public ContractDetailResponse update(@PathVariable Long id, @Valid @RequestBody ContractUpdateRequest request) {
        return contractService.update(id, request);
    }

    @PostMapping("/{id}/pay")
    public ContractDetailResponse pay(@PathVariable Long id, @Valid @RequestBody PayRequest request) {
        return contractService.pay(id, request);
    }

    @PostMapping("/{id}/renew")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractDetailResponse renew(@PathVariable Long id, @Valid @RequestBody RenewRequest request) {
        return contractService.renew(id, request);
    }

    @PostMapping("/{id}/cancel")
    public ContractDetailResponse cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request) {
        return contractService.cancel(id, request);
    }
}
