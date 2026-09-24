package com.insurancecard.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.LocalDate;
import java.time.Period;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/** Ngày sinh phải cho ra tuổi trong khoảng [min, max] tính đến hôm nay. null được bỏ qua (dùng @NotNull). */
@Documented
@Constraint(validatedBy = AgeBetween.Validator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface AgeBetween {

    int min() default ValidationRules.MIN_CUSTOMER_AGE;

    int max() default ValidationRules.MAX_CUSTOMER_AGE;

    String message() default "Khách hàng phải từ {min} đến {max} tuổi";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<AgeBetween, LocalDate> {
        private int min;
        private int max;

        @Override
        public void initialize(AgeBetween annotation) {
            this.min = annotation.min();
            this.max = annotation.max();
        }

        @Override
        public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
            if (value == null) {
                return true;
            }
            LocalDate today = LocalDate.now();
            if (value.isAfter(today)) {
                return false;
            }
            int age = Period.between(value, today).getYears();
            return age >= min && age <= max;
        }
    }
}
