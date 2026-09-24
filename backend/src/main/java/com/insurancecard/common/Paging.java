package com.insurancecard.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Chuẩn hoá tham số phân trang: page >= 0, 1 <= size <= 100. */
public final class Paging {

    public static final int MAX_SIZE = 100;

    private Paging() {}

    public static Pageable of(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        if (p < 0) {
            throw ApiException.validation("page", "Số trang phải >= 0");
        }
        if (s < 1 || s > MAX_SIZE) {
            throw ApiException.validation("size", "Kích thước trang phải từ 1 đến " + MAX_SIZE);
        }
        return PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "id"));
    }

    /** Chuỗi tìm kiếm: trim, rỗng -> null. */
    public static String keyword(String q) {
        if (q == null) {
            return null;
        }
        String t = q.trim();
        if (t.length() > 100) {
            throw ApiException.validation("q", "Từ khoá tìm kiếm tối đa 100 ký tự");
        }
        return t.isEmpty() ? null : t;
    }
}
