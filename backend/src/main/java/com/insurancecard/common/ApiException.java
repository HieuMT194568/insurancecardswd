package com.insurancecard.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * Lỗi nghiệp vụ có kiểm soát. Được GlobalExceptionHandler chuyển thành ErrorResponse:
 * <ul>
 *   <li>400 VALIDATION_ERROR - dữ liệu không hợp lệ (kèm fieldErrors)</li>
 *   <li>401/403 - chưa đăng nhập / không có quyền</li>
 *   <li>404 NOT_FOUND - không tìm thấy dữ liệu</li>
 *   <li>409 xxx_DUPLICATE / CONFLICT - trùng dữ liệu, xung đột</li>
 *   <li>422 xxx - vi phạm quy tắc nghiệp vụ (sai trạng thái...)</li>
 * </ul>
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fieldErrors;

    public ApiException(HttpStatus status, String code, String message, Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors == null ? Map.of() : fieldErrors;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message, null);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message, null);
    }

    public static ApiException unauthorized(String code, String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, message, null);
    }

    /** Vi phạm quy tắc nghiệp vụ (trạng thái không cho phép thao tác...). */
    public static ApiException business(String code, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, null);
    }

    /** Vi phạm quy tắc nghiệp vụ gắn với 1 trường cụ thể trên form. */
    public static ApiException businessField(String code, String field, String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, code, message, Map.of(field, message));
    }

    /** Trùng dữ liệu (email, SĐT, biển số...). */
    public static ApiException duplicate(String field, String message) {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE", message, Map.of(field, message));
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message, null);
    }

    public static ApiException validation(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, Map.of(field, message));
    }

    public static ApiException validation(Map<String, String> fieldErrors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ",
                new LinkedHashMap<>(fieldErrors));
    }
}
