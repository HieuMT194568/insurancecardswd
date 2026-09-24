package com.insurancecard.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.insurancecard.common.MessageResponse;
import com.insurancecard.common.PageResponse;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.dto.CustomerDtos.CustomerCreatedResponse;
import com.insurancecard.dto.CustomerDtos.CustomerRequest;
import com.insurancecard.dto.CustomerDtos.CustomerResponse;
import com.insurancecard.dto.CustomerDtos.SetPasswordRequest;
import com.insurancecard.dto.CustomerDtos.StatusRequest;
import com.insurancecard.service.CustomerService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasRole('STAFF')")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public PageResponse<CustomerResponse> search(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) UserStatus status,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return customerService.search(q, status, page, size);
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable Long id) {
        return customerService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerCreatedResponse create(@Valid @RequestBody CustomerRequest request) {
        return customerService.create(request);
    }

    @PutMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public CustomerResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return customerService.updateStatus(id, request.status());
    }

    @PostMapping("/{id}/set-password")
    public MessageResponse setPassword(@PathVariable Long id, @Valid @RequestBody SetPasswordRequest request) {
        customerService.setPassword(id, request);
        return new MessageResponse("Đã đặt lại mật khẩu cho khách hàng");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        customerService.delete(id);
    }
}
