package com.insurancecard.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insurancecard.dto.AuthDtos.AuthResponse;
import com.insurancecard.dto.AuthDtos.ChangePasswordRequest;
import com.insurancecard.dto.CustomerDtos.ProfileResponse;
import com.insurancecard.dto.CustomerDtos.ProfileUpdateRequest;
import com.insurancecard.dto.CustomerDtos.StaffProfileUpdateRequest;
import com.insurancecard.dto.DashboardDtos.CustomerDashboard;
import com.insurancecard.dto.DashboardDtos.StaffDashboard;
import com.insurancecard.security.CurrentUser;
import com.insurancecard.service.AuthService;
import com.insurancecard.service.CustomerService;
import com.insurancecard.service.DashboardService;

import jakarta.validation.Valid;

/** Chức năng dùng chung của người đang đăng nhập: hồ sơ, đổi mật khẩu, dashboard. */
@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentUser currentUser;
    private final CustomerService customerService;
    private final AuthService authService;
    private final DashboardService dashboardService;

    public MeController(CurrentUser currentUser, CustomerService customerService, AuthService authService,
                        DashboardService dashboardService) {
        this.currentUser = currentUser;
        this.customerService = customerService;
        this.authService = authService;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        return customerService.getProfile(currentUser.get());
    }

    @PutMapping("/me/profile")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ProfileResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return customerService.updateCustomerProfile(currentUser.get(), request);
    }

    @PutMapping("/me/staff-profile")
    @PreAuthorize("hasRole('STAFF')")
    public ProfileResponse updateStaffProfile(@Valid @RequestBody StaffProfileUpdateRequest request) {
        return customerService.updateStaffProfile(currentUser.get(), request);
    }

    @PostMapping("/me/change-password")
    public AuthResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(currentUser.get().userId(), request);
    }

    @GetMapping("/dashboard/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CustomerDashboard customerDashboard() {
        return dashboardService.forCustomer(currentUser.get().customerId());
    }

    @GetMapping("/dashboard/staff")
    @PreAuthorize("hasRole('STAFF')")
    public StaffDashboard staffDashboard() {
        return dashboardService.forStaff();
    }
}
