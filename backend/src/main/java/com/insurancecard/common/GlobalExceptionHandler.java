package com.insurancecard.common;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex, HttpServletRequest req) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), req, ex.getFieldErrors());
    }

    /** Lỗi @Valid trên @RequestBody: trả về lỗi đầu tiên của từng trường. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleBodyValidation(MethodArgumentNotValidException ex,
                                                              HttpServletRequest req) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(ge -> errors.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", req, errors);
    }

    /** Lỗi ràng buộc trên @RequestParam / @PathVariable. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException ex,
                                                                HttpServletRequest req) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getParameterValidationResults().forEach(r -> {
            String name = r.getMethodParameter().getParameterName();
            r.getResolvableErrors().forEach(e -> errors.putIfAbsent(name, e.getDefaultMessage()));
        });
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Tham số không hợp lệ", req, errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> errors = ex.getConstraintViolations().stream().collect(Collectors.toMap(
                v -> {
                    String path = v.getPropertyPath().toString();
                    return path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                },
                v -> v.getMessage(), (a, b) -> a, LinkedHashMap::new));
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Tham số không hợp lệ", req, errors);
    }

    /** JSON sai cú pháp, sai kiểu dữ liệu, sai giá trị enum, sai định dạng ngày... */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        // Lỗi mapping của Jackson nằm trong chuỗi nguyên nhân (nguyên nhân gốc có thể là DateTimeParseException...)
        for (Throwable cause = ex.getCause(); cause != null && cause != cause.getCause(); cause = cause.getCause()) {
            if (cause instanceof JsonMappingException jme && !jme.getPath().isEmpty()) {
                String field = jme.getPath().stream()
                        .map(JsonMappingException.Reference::getFieldName)
                        .filter(f -> f != null)
                        .collect(Collectors.joining("."));
                String message = describeTypeError(jme);
                return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, req, Map.of(field, message));
            }
        }
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "Dữ liệu gửi lên không đúng định dạng JSON", req, null);
    }

    private String describeTypeError(JsonMappingException ex) {
        Class<?> target = ex instanceof MismatchedInputException mie ? mie.getTargetType() : null;
        if (target != null && target.isEnum()) {
            String allowed = Arrays.stream(target.getEnumConstants()).map(Object::toString)
                    .collect(Collectors.joining(", "));
            return "Giá trị không hợp lệ. Chỉ chấp nhận: " + allowed;
        }
        if (target != null && target.getSimpleName().equals("LocalDate")) {
            return "Ngày không hợp lệ (định dạng yyyy-MM-dd)";
        }
        if (target != null && target.getSimpleName().equals("LocalDateTime")) {
            return "Thời gian không hợp lệ (định dạng yyyy-MM-ddTHH:mm)";
        }
        if (target != null && (Number.class.isAssignableFrom(target) || target.isPrimitive())) {
            return "Giá trị phải là số hợp lệ";
        }
        if (ex instanceof InvalidFormatException) {
            return "Giá trị không đúng định dạng";
        }
        return "Kiểu dữ liệu không hợp lệ";
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                            HttpServletRequest req) {
        String message = "Giá trị không hợp lệ";
        Class<?> type = ex.getRequiredType();
        if (type != null && type.isEnum()) {
            message += ". Chỉ chấp nhận: " + Arrays.stream(type.getEnumConstants()).map(Object::toString)
                    .collect(Collectors.joining(", "));
        }
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, req, Map.of(ex.getName(), message));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex,
                                                            HttpServletRequest req) {
        String message = "Thiếu tham số bắt buộc";
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, req,
                Map.of(ex.getParameterName(), message));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện chức năng này", req, null);
    }

    /** Phòng trường hợp 2 request đồng thời vượt qua kiểm tra trùng và bị DB chặn bởi UNIQUE/CHECK. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "DATA_CONSTRAINT",
                "Dữ liệu vi phạm ràng buộc (trùng lặp hoặc đang được sử dụng). Vui lòng tải lại và thử lại.", req, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy đường dẫn", req, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethod(HttpRequestMethodNotSupportedException ex,
                                                      HttpServletRequest req) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ", req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error at {}", req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Lỗi hệ thống, vui lòng thử lại sau", req, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String code, String message,
                                                HttpServletRequest req, Map<String, String> fieldErrors) {
        ErrorResponse body = new ErrorResponse(LocalDateTime.now(), status.value(), code, message,
                req.getRequestURI(), fieldErrors == null ? Map.of() : fieldErrors);
        return ResponseEntity.status(status).body(body);
    }
}
