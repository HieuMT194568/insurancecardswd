package com.insurancecard.validation;

/**
 * Quy tắc định dạng dữ liệu đầu vào dùng chung cho toàn hệ thống.
 * Frontend (src/utils/validation.js) dùng đúng các biểu thức và thông báo tương ứng.
 */
public final class ValidationRules {

    private ValidationRules() {}

    /** Email: tối đa 100 ký tự, dạng local@domain.tld */
    public static final String EMAIL = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$";
    public static final String EMAIL_MSG = "Email không đúng định dạng (ví dụ: ten@gmail.com)";

    /** Mật khẩu 8-50 ký tự, có chữ hoa, chữ thường, chữ số, ký tự đặc biệt, không có khoảng trắng. */
    public static final String PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{8,50}$";
    public static final String PASSWORD_MSG =
            "Mật khẩu 8-50 ký tự, gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt và không chứa khoảng trắng";

    /** Họ tên: chỉ chữ cái (có dấu tiếng Việt) và khoảng trắng giữa các từ, 2-100 ký tự (khoảng trắng thừa được gộp). */
    public static final String FULL_NAME = "^[\\p{L}\\p{M}]+(\\s+[\\p{L}\\p{M}]+)*$";
    public static final String FULL_NAME_MSG = "Họ tên chỉ gồm chữ cái và khoảng trắng";

    /** Số di động Việt Nam: 10 số, bắt đầu 03|05|07|08|09. */
    public static final String PHONE = "^0[35789]\\d{8}$";
    public static final String PHONE_MSG = "Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09";

    /** CCCD: 12 chữ số, bắt đầu bằng 0 (mã tỉnh 001-096). */
    public static final String ID_NUMBER = "^0\\d{11}$";
    public static final String ID_NUMBER_MSG = "Số CCCD gồm đúng 12 chữ số và bắt đầu bằng 0";

    /** Biển số xe máy: 59-X1 123.45 | 29-B1 1234 | 30-AA 123.45 (mã tỉnh 11-99). */
    public static final String LICENSE_PLATE = "^(1[1-9]|[2-9][0-9])-[A-Z]{1,2}[0-9]? ([0-9]{4}|[0-9]{3}\\.[0-9]{2})$";
    public static final String LICENSE_PLATE_MSG = "Biển số không đúng định dạng (ví dụ: 59-X1 123.45 hoặc 29-B1 1234)";

    /** Số khung / số máy: 6-20 ký tự chữ và số. */
    public static final String SERIAL = "^[A-Z0-9]{6,20}$";
    public static final String CHASSIS_MSG = "Số khung gồm 6-20 ký tự chữ (A-Z) và số, không dấu, không khoảng trắng";
    public static final String ENGINE_MSG = "Số máy gồm 6-20 ký tự chữ (A-Z) và số, không dấu, không khoảng trắng";

    /** Mã sản phẩm: 3-20 ký tự A-Z, 0-9, gạch ngang, gạch dưới. */
    public static final String PRODUCT_CODE = "^[A-Z0-9_-]{3,20}$";
    public static final String PRODUCT_CODE_MSG = "Mã sản phẩm gồm 3-20 ký tự: chữ in hoa, số, '-' hoặc '_'";

    public static final int MIN_CUSTOMER_AGE = 18;
    public static final int MAX_CUSTOMER_AGE = 100;
    public static final int MIN_MANUFACTURE_YEAR = 1980;
    public static final int MIN_ENGINE_CC = 1;
    public static final int MAX_ENGINE_CC = 3000;
}
