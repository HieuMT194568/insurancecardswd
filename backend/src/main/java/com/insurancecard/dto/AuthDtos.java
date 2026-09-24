package com.insurancecard.dto;

import java.time.LocalDate;

import com.insurancecard.domain.enums.Gender;
import com.insurancecard.domain.enums.Role;
import com.insurancecard.domain.enums.UserStatus;
import com.insurancecard.validation.AgeBetween;
import com.insurancecard.validation.RawString;
import com.insurancecard.validation.ValidationRules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank(message = "Vui lòng nhập email")
            @Size(max = 100, message = "Email tối đa 100 ký tự")
            String email,

            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu")
            @Size(max = 50, message = "Mật khẩu tối đa 50 ký tự")
            String password) {}

    public record RegisterRequest(
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

            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu")
            @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MSG)
            String password,

            @RawString
            @NotBlank(message = "Vui lòng nhập lại mật khẩu")
            String confirmPassword,

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

    public record TokenRequest(
            @NotBlank(message = "Thiếu mã xác thực")
            @Size(max = 64, message = "Mã xác thực không hợp lệ")
            String token) {}

    public record EmailRequest(
            @NotBlank(message = "Vui lòng nhập email")
            @Size(max = 100, message = "Email tối đa 100 ký tự")
            @Pattern(regexp = ValidationRules.EMAIL, message = ValidationRules.EMAIL_MSG)
            String email) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Thiếu mã đặt lại mật khẩu")
            @Size(max = 64, message = "Mã đặt lại mật khẩu không hợp lệ")
            String token,

            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MSG)
            String newPassword,

            @RawString
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới")
            String confirmPassword) {}

    public record ChangePasswordRequest(
            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
            String currentPassword,

            @RawString
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = ValidationRules.PASSWORD, message = ValidationRules.PASSWORD_MSG)
            String newPassword,

            @RawString
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới")
            String confirmPassword) {}

    public record UserInfo(
            Long id,
            String email,
            String fullName,
            String phone,
            Role role,
            UserStatus status,
            Long customerId,
            String customerCode) {}

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserInfo user) {}

    /** devLink chỉ có ở chế độ demo (không gửi email thật). */
    public record ActionResponse(String message, String devLink) {}
}
