package com.insurancecard.common;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.function.Predicate;

/**
 * Sinh mã nghiệp vụ dạng PREFIX + yyMMdd + 4 chữ số ngẫu nhiên, ví dụ HD2609241234.
 * Kiểm tra trùng bằng predicate "exists" và thử lại tối đa 20 lần.
 */
public final class CodeGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyMMdd");

    private CodeGenerator() {}

    public static String next(String prefix, Predicate<String> exists) {
        String datePart = LocalDate.now().format(DATE);
        for (int i = 0; i < 20; i++) {
            String code = prefix + datePart + String.format("%04d", RANDOM.nextInt(10_000));
            if (!exists.test(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không sinh được mã duy nhất cho tiền tố " + prefix);
    }
}
