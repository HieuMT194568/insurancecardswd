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
import com.insurancecard.domain.enums.AccidentStatus;
import com.insurancecard.dto.AccidentDtos.AccidentRequest;
import com.insurancecard.dto.AccidentDtos.AccidentResolveRequest;
import com.insurancecard.dto.AccidentDtos.AccidentResponse;
import com.insurancecard.service.AccidentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/accidents")
public class AccidentController {

    private final AccidentService accidentService;

    public AccidentController(AccidentService accidentService) {
        this.accidentService = accidentService;
    }

    @GetMapping
    public PageResponse<AccidentResponse> search(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) Long customerId,
                                                 @RequestParam(required = false) Long contractId,
                                                 @RequestParam(required = false) AccidentStatus status,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return accidentService.search(q, customerId, contractId, status, page, size);
    }

    @GetMapping("/{id}")
    public AccidentResponse get(@PathVariable Long id) {
        return accidentService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccidentResponse create(@Valid @RequestBody AccidentRequest request) {
        return accidentService.create(request);
    }

    @PutMapping("/{id}")
    public AccidentResponse update(@PathVariable Long id, @Valid @RequestBody AccidentRequest request) {
        return accidentService.update(id, request);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('STAFF')")
    public AccidentResponse resolve(@PathVariable Long id, @Valid @RequestBody AccidentResolveRequest request) {
        return accidentService.resolve(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        accidentService.delete(id);
    }
}
