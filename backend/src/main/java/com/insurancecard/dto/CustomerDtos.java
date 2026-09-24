package com.insurancecard.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.insurancecard.domain.enums.Gender;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.validation.AgeBetween;
import com.insurancecard.validation.RawString;
import com.insurancecard.validation.ValidationRules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CustomerDtos {

    private CustomerDtos() {}

    /** Nhân viên tạo mới / cập nhật khách hàng. */
    public record CustomerRequest(
            @NotBlank(message = "Vui lòng nhập họ tên")
            @Size(min = 2, max = 100, message = "Họ tên từ 2 đến 100 ký tự")
            @Pattern(regexp = ValidationRules.FULL_NAME, message = ValidationRules.FULL_NAME_MSG)
            String fullName,

            @NotBlank(message = "Vui lòng nhập email")
            @Size(max = 100, message = "Email tối đa 100 ký tự")
            @Pattern(regexp = ValidationRules.EMAIL, message = ValidationRules.EMAIL_MSG)
            String email,

            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Pattern(regexp = ValidationRules.PHONE, message = ValidationRules.PHONE_MSG)
            String phone,

            @NotBlank(message = "Vui lòng nhập số CCCD")
            @Pattern(regexp = ValidationRules.ID_NUMBER, message = ValidationRules.ID_NUMBER_MSG)
            String idNumber,

            @NotNull(message = "Vui lòng nhập ngày sinh")
            @Past(message = "Ngày sinh phải là ngày trong quá khứ")
            @AgeBetween
            LocalDate dateOfBirth,

            @NotNull(message = "Vui lòng chọn giới tính")
            Gender gender,

            @NotBlank(message = "Vui lòng nhập địa chỉ")
            @Size(min = 5, max = 255, message = "Địa chỉ từ 5 đến 255 ký tự")
            String address) {}

    /** Khách hàng tự cập nhật hồ sơ: không được đổi email và số CCCD. */
    public record ProfileUpdateRequest(
            @NotBlank(message = "Vui lòng nhập họ tên")
            @Size(min = 2, max = 100, message = "Họ tên từ 2 đến 100 ký tự")
            @Pattern(regexp = ValidationRules.FULL_NAME, message = ValidationRules.FULL_NAME_MSG)
            String fullName,

            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Pattern(regexp = ValidationRules.PHONE, message = ValidationRules.PHONE_MSG)
            String phone,

            @NotNull(message = "Vui lòng nhập ngày sinh")
            @Past(message = "Ngày sinh phải là ngày trong quá khứ")
            @AgeBetween
            LocalDate dateOfBirth,

            @NotNull(message = "Vui lòng chọn giới tính")
            Gender gender,

            @NotBlank(message = "Vui lòng nhập địa chỉ")
            @Size(min = 5, max = 255, message = "Địa chỉ từ 5 đến 255 ký tự")
            String address) {}

    /** Nhân viên cập nhật hồ sơ của chính mình. */
    public record StaffProfileUpdateRequest(
            @NotBlank(message = "Vui lòng nhập họ tên")
            @Size(min = 2, max = 100, message = "Họ tên từ 2 đến 100 ký tự")
            @Pattern(regexp = ValidationRules.FULL_NAME, message = ValidationRules.FULL_NAME_MSG)
            String fullName,

            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Pattern(regexp = ValidationRules.PHONE, message = ValidationRules.PHONE_MSG)
            String phone) {}

    public record StatusRequest(
            @NotNull(message = "Vui lòng chọn trạng thái")
            UserStatus status) {}

    public record SetPasswordRequest(
            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MSG)
            String newPassword,

            @RawString
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới")
            String confirmPassword) {}

    public record CustomerResponse(
            Long id,
            String customerCode,
            Long userId,
            String fullName,
            String email,
            String phone,
            String idNumber,
            LocalDate dateOfBirth,
            Gender gender,
            String address,
            UserStatus status,
            long vehicleCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}

    public record CustomerCreatedResponse(CustomerResponse customer, String temporaryPassword) {}

    /** Hồ sơ người đang đăng nhập; customer = null với nhân viên. */
    public record ProfileResponse(
            Long userId,
            String email,
            String fullName,
            String phone,
            String role,
            UserStatus status,
            LocalDateTime createdAt,
            CustomerResponse customer) {}
}
