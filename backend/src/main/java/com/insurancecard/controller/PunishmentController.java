package com.insurancecard.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import com.insurancecard.domain.enums.PunishmentStatus;
import com.insurancecard.dto.ContractDtos.PayRequest;
import com.insurancecard.dto.PunishmentDtos.PunishmentRequest;
import com.insurancecard.dto.PunishmentDtos.PunishmentResponse;
import com.insurancecard.dto.PunishmentDtos.WaiveRequest;
import com.insurancecard.service.PunishmentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/punishments")
public class PunishmentController {

    private final PunishmentService punishmentService;

    public PunishmentController(PunishmentService punishmentService) {
        this.punishmentService = punishmentService;
    }

    @GetMapping
    public PageResponse<PunishmentResponse> search(@RequestParam(required = false) String q,
                                                   @RequestParam(required = false) Long customerId,
                                                   @RequestParam(required = false) PunishmentStatus status,
                                                   @RequestParam(required = false) Integer page,
                                                   @RequestParam(required = false) Integer size) {
        return punishmentService.search(q, customerId, status, page, size);
    }

    @GetMapping("/{id}")
    public PunishmentResponse get(@PathVariable Long id) {
        return punishmentService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('STAFF')")
    @ResponseStatus(HttpStatus.CREATED)
    public PunishmentResponse create(@Valid @RequestBody PunishmentRequest request) {
        return punishmentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STAFF')")
    public PunishmentResponse update(@PathVariable Long id, @Valid @RequestBody PunishmentRequest request) {
        return punishmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STAFF')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        punishmentService.delete(id);
    }

    @PostMapping("/{id}/pay")
    public PunishmentResponse pay(@PathVariable Long id, @Valid @RequestBody PayRequest request) {
        return punishmentService.pay(id, request);
    }

    @PostMapping("/{id}/waive")
    @PreAuthorize("hasRole('STAFF')")
    public PunishmentResponse waive(@PathVariable Long id, @Valid @RequestBody WaiveRequest request) {
        return punishmentService.waive(id, request);
    }
}
