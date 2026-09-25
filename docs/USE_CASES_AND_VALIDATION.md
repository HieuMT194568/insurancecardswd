# Insurance Card – Đặc tả Use case, Quy tắc nghiệp vụ & Validate

Tài liệu này mô tả **mọi case** hệ thống xử lý và **mọi quy tắc validate**. Mỗi quy tắc được kiểm tra ở 3 tầng:

| Tầng | Vị trí | Vai trò |
|---|---|---|
| Frontend | `frontend/src/utils/validation.js` (zod) | Báo lỗi ngay trên từng ô nhập, cùng thông báo với backend |
| Backend | DTO (`@NotBlank`, `@Pattern`, `@AgeBetween`…) + Service | Nguồn sự thật: validate định dạng + quy tắc nghiệp vụ |
| Database | `NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY` (Flyway `V1__init_schema.sql`) | Chặn dữ liệu sai kể cả khi ghi thẳng vào DB |

Các case được kiểm chứng tự động bằng `tests/api-test.mjs` (mã `TC-xxx` bên dưới).

---

## 1. Vai trò

| Vai trò | Mô tả |
|---|---|
| Khách vãng lai (Guest) | Xem trang chủ, gói bảo hiểm; đăng ký, đăng nhập, quên mật khẩu |
| Khách hàng (CUSTOMER) | Quản lý hồ sơ, xe; mua/gia hạn/huỷ hợp đồng; thanh toán; khai báo tai nạn; yêu cầu bồi thường; nộp phạt; xem lịch sử |
| Nhân viên (STAFF) | Mọi chức năng của khách hàng trên mọi khách + quản lý khách hàng, xử lý tai nạn / bồi thường / vi phạm, sản phẩm, cấu hình |

Phân quyền: JWT + `@PreAuthorize`. Khách hàng chỉ thấy dữ liệu của mình — truy cập dữ liệu người khác trả **404** (không lộ sự tồn tại).

---

## 2. Chuẩn phản hồi lỗi

```json
{
  "timestamp": "2026-09-24T10:00:00",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "path": "/api/vehicles",
  "fieldErrors": { "licensePlate": "Biển số không đúng định dạng (ví dụ: 59-X1 123.45 hoặc 29-B1 1234)" }
}
```

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Sai định dạng / thiếu trường / sai kiểu / sai enum / sai định dạng ngày (có `fieldErrors`) |
| 400 | `MALFORMED_JSON` | JSON sai cú pháp |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | Chưa đăng nhập, token sai/hết hạn/bị vô hiệu, sai email hoặc mật khẩu |
| 403 | `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED`, `TEMPORARILY_LOCKED` | Sai vai trò, tài khoản chưa kích hoạt / bị khoá / tạm khoá do sai mật khẩu |
| 404 | `NOT_FOUND` | Không tồn tại hoặc không thuộc quyền xem |
| 409 | `DUPLICATE`, `CONTRACT_OVERLAP`, `*_HAS_*`, `CLAIM_EXISTS`, `DATA_CONSTRAINT` | Trùng dữ liệu, xung đột, xoá dữ liệu đang được sử dụng |
| 422 | Mã nghiệp vụ (`CONTRACT_NOT_RENEWABLE`, `ACCIDENT_NOT_VERIFIED`…) | Vi phạm quy tắc nghiệp vụ / sai trạng thái |

Chuẩn hoá đầu vào: mọi chuỗi được **trim**, chuỗi rỗng/chỉ khoảng trắng coi như **bỏ trống** (TC-E05); riêng mật khẩu giữ nguyên để khoảng trắng bị bắt lỗi (TC-A11). Email → chữ thường; biển số, số khung, số máy, mã sản phẩm → CHỮ HOA; họ tên → gộp khoảng trắng thừa.

---

## 3. Quy tắc định dạng dữ liệu

| Trường | Quy tắc | Thông báo lỗi |
|---|---|---|
| Họ tên | Bắt buộc, 2–100 ký tự, chỉ chữ cái (có dấu) và khoảng trắng | Họ tên chỉ gồm chữ cái và khoảng trắng |
| Email | Bắt buộc, ≤ 100 ký tự, `local@domain.tld`, duy nhất (không phân biệt hoa thường) | Email không đúng định dạng / Email đã được sử dụng |
| Số điện thoại | 10 số, bắt đầu `03/05/07/08/09`, duy nhất | Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09 |
| Mật khẩu | 8–50 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt, không khoảng trắng | Mật khẩu 8-50 ký tự, gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt… |
| Nhập lại mật khẩu | Trùng mật khẩu | Mật khẩu nhập lại không khớp |
| Số CCCD | Đúng 12 chữ số, bắt đầu bằng 0, duy nhất | Số CCCD gồm đúng 12 chữ số và bắt đầu bằng 0 |
| Ngày sinh | Bắt buộc, trong quá khứ, tuổi 18–100 | Khách hàng phải từ 18 đến 100 tuổi |
| Giới tính | `MALE` / `FEMALE` / `OTHER` | Vui lòng chọn giới tính |
| Địa chỉ | 5–255 ký tự | Địa chỉ từ 5 đến 255 ký tự |
| Biển số | `NN-XX[N] NNN.NN` hoặc `NN-XX[N] NNNN`, mã tỉnh 11–99, duy nhất | VD hợp lệ: `59-X1 123.45`, `29-B1 1234`, `30-AA 123.45` |
| Hãng / Dòng / Màu xe | 2–50 / 1–50 / 2–30 ký tự | … từ a đến b ký tự |
| Dung tích xi-lanh | Số nguyên 1–3000 cc | Dung tích xi-lanh từ 1 đến 3000 cc |
| Năm sản xuất | 1980 – năm hiện tại | Năm sản xuất từ 1980 đến {năm nay} |
| Số khung / Số máy | 6–20 ký tự A-Z, 0-9; duy nhất; số máy ≠ số khung | Số khung gồm 6-20 ký tự chữ (A-Z) và số… |
| Mã sản phẩm | 3–20 ký tự `A-Z 0-9 - _`, duy nhất | Mã sản phẩm gồm 3-20 ký tự… |
| Tiền (VND) | Số nguyên, không phần thập phân | Số tiền phải là số nguyên (VND) |
| Ghi chú | ≤ 500 ký tự | Ghi chú tối đa 500 ký tự |
| Lý do huỷ / từ chối / miễn phạt / bác bỏ | 10–500 ký tự | … từ 10 đến 500 ký tự |
| Phân trang | `page ≥ 0`, `1 ≤ size ≤ 100`; từ khoá ≤ 100 ký tự | Kích thước trang phải từ 1 đến 100 |

---

## 4. Cấu hình hệ thống (bảng `system_settings`, nhân viên sửa trên màn hình Cấu hình)

| Khoá | Mặc định | Khoảng | Ý nghĩa |
|---|---|---|---|
| `RENEWAL_WINDOW_DAYS` | 30 | 1–90 | Chỉ được gia hạn khi hợp đồng còn ≤ N ngày |
| `MAX_START_DATE_ADVANCE_DAYS` | 60 | 0–365 | Ngày bắt đầu hợp đồng mới tối đa sau hôm nay N ngày |
| `CLAIM_DEADLINE_DAYS` | 365 | 1–730 | Hạn khai báo tai nạn / yêu cầu bồi thường kể từ ngày tai nạn |
| `CANCEL_REFUND_PERCENT` | 80 | 0–100 | % hoàn phí cho thời gian còn lại khi huỷ hợp đồng đang hiệu lực |
| `PENALTY_DUE_DAYS` | 30 | 1–180 | Hạn nộp phạt mặc định = ngày vi phạm + N |
| `VERIFY_TOKEN_EXPIRY_HOURS` | 24 | 1–168 | Hạn link xác thực email |
| `RESET_TOKEN_EXPIRY_MINUTES` | 30 | 5–1440 | Hạn link đặt lại mật khẩu |

Giá trị ngoài khoảng → 400 (TC-S01). Thay đổi có hiệu lực ngay (TC-S05).

---

## 5. Use case & case xử lý

### UC-01 Đăng ký (Guest)
**Luồng chính:** nhập thông tin cá nhân + đăng nhập → hệ thống tạo tài khoản `PENDING` + hồ sơ khách hàng → gửi link xác thực (hiệu lực 24h).
| Case | Kết quả | TC |
|---|---|---|
| Trường sai định dạng / thiếu | 400, lỗi từng trường | TC-A07, A08 |
| Nhập lại mật khẩu không khớp | 400 `confirmPassword` | TC-A09 |
| Email / SĐT / CCCD đã tồn tại | 409, báo **tất cả** trường trùng cùng lúc | TC-A10 |
| Mật khẩu có khoảng trắng đầu/cuối | 400 (không trim ngầm) | TC-A11 |
| Thành công | 201; chế độ demo trả `devLink` | TC-A12 |

### UC-02 Xác thực email / gửi lại link
| Case | Kết quả | TC |
|---|---|---|
| Token không tồn tại | 400 `INVALID_TOKEN` | TC-A14 |
| Token hết hạn | 422 `TOKEN_EXPIRED` (giao diện cho gửi lại link) | – |
| Bấm lại link đã dùng khi tài khoản đã kích hoạt | 200 "đã kích hoạt trước đó" | TC-A16 |
| Gửi lại link | Luôn trả cùng thông báo (không lộ email), link cũ bị vô hiệu | – |

### UC-03 Đăng nhập
| Case | Kết quả | TC |
|---|---|---|
| Bỏ trống | 400 | TC-A01 |
| Sai email hoặc mật khẩu | 401, thông báo chung "Email hoặc mật khẩu không đúng" | TC-A02 |
| Chưa xác thực email | 403 `EMAIL_NOT_VERIFIED` (kèm nút gửi lại link) | TC-A03, A13 |
| Tài khoản bị khoá | 403 `ACCOUNT_LOCKED` | TC-A04, C17 |
| Sai mật khẩu 5 lần liên tiếp | Tạm khoá 15 phút, kể cả nhập đúng: 403 `TEMPORARILY_LOCKED` | TC-A31 |
| Email viết hoa | Vẫn đăng nhập được | TC-A05 |
| Thành công | JWT 8 giờ + thông tin người dùng (không có mật khẩu) | TC-A05, A06 |

### UC-04 Quên / đặt lại mật khẩu
| Case | Kết quả | TC |
|---|---|---|
| Email không tồn tại | Vẫn 200 cùng thông báo, không sinh link | TC-A18 |
| Mật khẩu mới yếu / nhập lại không khớp | 400 | TC-A20, A21 |
| Thành công | Mật khẩu cũ hết hiệu lực | TC-A22, A24, A25 |
| Dùng lại link | 422 `TOKEN_USED` | TC-A23 |

### UC-05 Đổi mật khẩu (mọi vai trò)
| Case | Kết quả | TC |
|---|---|---|
| Sai mật khẩu hiện tại | 400 `currentPassword` | TC-A26 |
| Mật khẩu mới trùng mật khẩu cũ | 400 `newPassword` | TC-A27 |
| Thành công | Trả token mới; **mọi token cũ bị vô hiệu** (401) | TC-A28–A30 |

### UC-06 Hồ sơ cá nhân
- Khách hàng sửa: họ tên, SĐT, ngày sinh, giới tính, địa chỉ. **Không** sửa email, CCCD (chỉ nhân viên).
- Nhân viên sửa: họ tên, SĐT.
| Case | Kết quả | TC |
|---|---|---|
| Sai định dạng | 400 | TC-P02 |
| SĐT trùng người khác | 409 | TC-P03 |
| Nhân viên gọi API hồ sơ khách | 403 | TC-P05 |

### UC-07 Quản lý khách hàng (Nhân viên)
| Chức năng | Quy tắc | TC |
|---|---|---|
| Danh sách | Tìm theo tên/email/SĐT/CCCD/mã KH (`KH000001`), lọc trạng thái, phân trang | TC-C01–C05 |
| Tạo | Kích hoạt ngay, sinh **mật khẩu tạm** đúng chính sách (hiển thị 1 lần) | TC-C09, C10 |
| Sửa | Được sửa cả email, CCCD; kiểm tra trùng (bỏ qua chính nó) | TC-C11, C12 |
| Khoá / mở khoá | Chỉ `ACTIVE`/`LOCKED`; khoá ⇒ token hiện tại vô hiệu, không đăng nhập được | TC-C14–C19 |
| Đặt lại mật khẩu cho khách | Theo chính sách mật khẩu | TC-C20–C22 |
| Xoá | Chỉ khi **chưa có hợp đồng và biên bản phạt** (xoá kèm xe); ngược lại 409 → hãy khoá | TC-C23–C25 |

### UC-08 Quản lý xe
| Case | Kết quả | TC |
|---|---|---|
| Sai định dạng biển số / số khung / số máy / năm SX / dung tích | 400 | TC-V01, V02 |
| Số máy trùng số khung | 400 | TC-V03 |
| Trùng biển số / số khung / số máy (sau chuẩn hoá chữ hoa) | 409 | TC-V04 |
| Nhân viên thêm xe không chọn khách | 400 `customerId` | TC-V06 |
| Khách hàng bị khoá | 422 `CUSTOMER_LOCKED` | – |
| Xem/sửa/xoá xe của người khác | 404 | TC-V10, V13 |
| Xe **đã có hợp đồng**: sửa số khung/số máy/dung tích | 422 (chỉ sửa được biển số, hãng, dòng, màu, năm SX) | TC-V15, V16 |
| Xoá xe đã có hợp đồng | 409 | TC-V14 |
| Không được chuyển chủ sở hữu xe | 422 | – |

### UC-09 Sản phẩm bảo hiểm (Nhân viên)
| Case | Kết quả | TC |
|---|---|---|
| Trường sai ràng buộc | 400 | TC-PR02, PR03 |
| Dung tích tối đa < tối thiểu | 400 | TC-PR04 |
| Mức bồi thường ≤ phí/năm | 400 | TC-PR05 |
| Trùng mã (không phân biệt hoa thường) | 409 | TC-PR06 |
| Đổi mã sản phẩm đã có hợp đồng | 422 | TC-PR09 |
| Xoá sản phẩm đã có hợp đồng | 409 → chuyển "Ngừng bán" | TC-PR10 |
| Sửa phí/hạn mức | Chỉ áp dụng hợp đồng mới (hợp đồng đã ký lưu giá tại thời điểm ký) | – |

### UC-10 Tạo hợp đồng (Khách hàng / Nhân viên)
Công thức: **Phí = phí/năm × số năm**; **Ngày hết hạn = ngày bắt đầu + N năm − 1 ngày**; hợp đồng mới ở trạng thái `PENDING_PAYMENT` kèm 1 giao dịch `PREMIUM` chờ thanh toán.
| Case | Kết quả | TC |
|---|---|---|
| Ngày bắt đầu trước hôm nay | 400 | TC-K01 |
| Ngày bắt đầu > hôm nay + `MAX_START_DATE_ADVANCE_DAYS` | 400 | TC-K02 |
| Thời hạn ngoài 1–3 năm | 400 | TC-K03 |
| Gói không áp dụng cho dung tích xe | 422 `productId` | TC-K04 |
| Gói ngừng kinh doanh | 422 `productId` | TC-K05 |
| Xe không thuộc khách hàng | 422 `vehicleId` | TC-K06 |
| Nhân viên không chọn khách | 400 | TC-K07 |
| Khách hàng không ACTIVE | 422 `CUSTOMER_NOT_ACTIVE` | – |
| **Trùng thời gian**: cùng xe + cùng gói, đang hiệu lực/chờ thanh toán, khoảng ngày giao nhau | 409 `CONTRACT_OVERLAP` | TC-K09 |
| Thành công | 201 | TC-K08, K32 |

### UC-11 Sửa hợp đồng (Nhân viên)
| Trạng thái | Được sửa | TC |
|---|---|---|
| `PENDING_PAYMENT` | Xe, gói, ngày bắt đầu, thời hạn, ghi chú (kiểm tra lại như tạo mới; phí + giao dịch chờ được tính lại) | TC-K13 |
| `ACTIVE` | Chỉ ghi chú; đổi thông tin khác → 422 | TC-K17, K18 |
| `EXPIRED` / `CANCELLED` | Không được sửa → 422 | TC-K31 |
| Khách hàng gọi API sửa | 403 | TC-K14 |

### UC-12 Thanh toán hợp đồng
| Case | Kết quả | TC |
|---|---|---|
| Không chọn phương thức | 400 | TC-K12 |
| Khách hàng chọn tiền mặt | 422 (chỉ tại quầy – nhân viên thu) | TC-K11, K33 |
| Hợp đồng không chờ thanh toán | 422 | TC-K16 |
| Đã quá ngày bắt đầu | 422 `PAYMENT_OVERDUE` | – |
| Thành công | Giao dịch `PAID`, hợp đồng `ACTIVE` | TC-K15 |

### UC-13 Gia hạn hợp đồng
Tạo **hợp đồng mới** liên kết `renewedFrom`, trạng thái chờ thanh toán, giá theo biểu phí hiện hành. Ngày bắt đầu = ngày hết hạn cũ + 1 (nếu đang hiệu lực) hoặc hôm nay (nếu đã hết hạn).
| Case | Kết quả | TC |
|---|---|---|
| Hợp đồng chưa thanh toán / đã huỷ | 422 | TC-K10 |
| Còn > `RENEWAL_WINDOW_DAYS` ngày | 422 "Chỉ được gia hạn trong vòng 30 ngày… (còn N ngày)" | TC-K19 |
| Đã được gia hạn (bản gia hạn chưa huỷ) | 422 | TC-K24 |
| Gói ngừng bán / xe không còn phù hợp / khách không ACTIVE | 422 | – |
| Trùng thời gian với hợp đồng khác | 409 | TC-K28 |
| Huỷ bản gia hạn | Hợp đồng cũ gia hạn lại được | TC-K26, K27 |

### UC-14 Huỷ hợp đồng
| Trạng thái | Xử lý | TC |
|---|---|---|
| `PENDING_PAYMENT` | Huỷ; giao dịch chờ thanh toán → `CANCELLED` | TC-K26 |
| `ACTIVE` có yêu cầu bồi thường chờ duyệt/đã duyệt chưa chi | 422 `CONTRACT_HAS_OPEN_CLAIMS` | TC-K34 |
| `ACTIVE` chưa phát sinh bồi thường | Hoàn phí = phí × (ngày còn lại / tổng ngày) × 80%, làm tròn xuống 1.000đ → giao dịch `REFUND` | TC-K29 |
| `ACTIVE` đã phát sinh bồi thường | Huỷ, **không hoàn phí** | TC-K35 |
| `EXPIRED` / `CANCELLED` | 422 | TC-K30 |
| Lý do < 10 ký tự | 400 | TC-K25 |

Hợp đồng **không có chức năng xoá** (là chứng từ) – chỉ huỷ.

### UC-15 Tự động cập nhật trạng thái (chạy khi khởi động + mỗi giờ)
- `ACTIVE` có ngày hết hạn < hôm nay → `EXPIRED`.
- `PENDING_PAYMENT` có ngày bắt đầu < hôm nay → `CANCELLED` ("Tự động huỷ do chưa thanh toán…"), giao dịch chờ → `CANCELLED`.

### UC-16 Khai báo tai nạn
| Case | Kết quả | TC |
|---|---|---|
| Thời điểm ở tương lai | 400 | TC-T01 |
| Ngoài thời hạn hợp đồng | 422 `OUT_OF_COVERAGE` | TC-T02 |
| Hợp đồng chưa hiệu lực / đã huỷ | 422 `CONTRACT_NOT_EFFECTIVE` | TC-T03 |
| Quá `CLAIM_DEADLINE_DAYS` ngày kể từ tai nạn | 422 `REPORT_DEADLINE_PASSED` | – |
| Sai loại thiệt hại / mô tả < 20 ký tự / thiệt hại âm | 400 | TC-T04, T05 |
| Hợp đồng của người khác | 404 | TC-T06 |
| Sửa / xoá | Chỉ khi `REPORTED`; xoá khi chưa có yêu cầu bồi thường | TC-T08, T12, T15, T17 |

### UC-17 Xử lý tai nạn (Nhân viên)
`REPORTED` → `VERIFIED` hoặc `REJECTED` (bắt buộc lý do ≥ 10 ký tự). Bác bỏ ⇒ các yêu cầu bồi thường đang chờ của tai nạn tự động bị từ chối. Xử lý lại → 422. (TC-T09–T11, T13, T14, T16, B21)

### UC-18 Yêu cầu bồi thường
Chọn **một trong hai**: tai nạn đã khai báo (`accidentId`) hoặc khai báo mới (`accident{…}`) cùng lúc.
| Case | Kết quả | TC |
|---|---|---|
| Không chọn / chọn cả hai | 400 | TC-B01, B02 |
| Số tiền > thiệt hại ước tính | 422 `requestedAmount` | TC-B03 |
| Số tiền > hạn mức còn lại (hạn mức − tổng đã duyệt/đã chi) | 422 `requestedAmount` | TC-B05, B18 |
| Lỗi ở phần tai nạn mới | Gắn đúng trường lồng nhau `accident.xxx` | TC-B06 |
| Tai nạn đã có yêu cầu đang xử lý/đã chi | 409 `CLAIM_EXISTS` | TC-B08 |
| Tai nạn đã bị bác bỏ | 422 | TC-B22 |
| Xem yêu cầu của người khác | 404 | TC-B23 |

### UC-19 Xử lý bồi thường (Nhân viên)
Trạng thái: `PENDING` → `APPROVED` → `PAID`, hoặc `PENDING` → `REJECTED`.
| Case | Kết quả | TC |
|---|---|---|
| Duyệt khi tai nạn chưa xác minh | 422 `ACCIDENT_NOT_VERIFIED` | TC-B09 |
| Số tiền duyệt > số tiền yêu cầu | 400 | TC-B10 |
| Số tiền duyệt > hạn mức còn lại | 422 | – |
| Khách hàng tự duyệt | 403 | TC-B11 |
| Chi trả khi chưa duyệt | 422 | TC-B12 |
| Từ chối yêu cầu đã duyệt | 422 | TC-B14 |
| Chi trả qua thẻ | 400 (chỉ tiền mặt / chuyển khoản) | TC-B15 |
| Chi trả thành công | Giao dịch `COMPENSATION`, hạn mức còn lại giảm | TC-B16, B17 |

### UC-20 Vi phạm / phạt
| Case | Kết quả | TC |
|---|---|---|
| Ngày vi phạm tương lai, tiền < 10.000 | 400 | TC-F01 |
| Loại vi phạm không hợp lệ | 400 | TC-F02 |
| Hợp đồng không thuộc khách hàng | 422 | TC-F03 |
| Hạn nộp < ngày vi phạm hoặc < hôm nay | 400 | TC-F04 |
| Khách hàng lập biên bản | 403 | TC-F05 |
| Để trống hạn nộp | = ngày vi phạm + 30 ngày | TC-F06 |
| Sửa / xoá / miễn | Chỉ khi `UNPAID`; không đổi khách hàng; miễn cần lý do ≥ 10 ký tự | TC-F07, F08, F12–F15 |
| Nộp phạt | Khách không dùng tiền mặt; tạo giao dịch `PENALTY`; không nộp 2 lần | TC-F09–F11 |

### UC-21 Lịch sử giao dịch
Mọi dòng tiền đều ghi vào `payments`: `PREMIUM` (thu phí), `REFUND` (hoàn phí), `PENALTY` (thu phạt), `COMPENSATION` (chi bồi thường). Khách hàng chỉ thấy giao dịch của mình kể cả khi truyền `customerId` khác (TC-M01–M04).

### UC-22 Dashboard
- Khách hàng: số xe, hợp đồng hiệu lực, chờ thanh toán, bồi thường chờ duyệt, phạt chưa nộp, hợp đồng sắp hết hạn (nút gia hạn).
- Nhân viên: khách hàng hoạt động, hợp đồng hiệu lực, doanh thu phí & tiền chi bồi thường trong tháng, việc tồn đọng, hợp đồng sắp hết hạn.

---

## 6. Sơ đồ trạng thái

```
Hợp đồng:     PENDING_PAYMENT --thanh toán--> ACTIVE --quá ngày hết hạn--> EXPIRED
                    |                           |
                    +--huỷ / quá ngày bắt đầu--+--huỷ (hoàn phí)--> CANCELLED

Tai nạn:      REPORTED --xác minh--> VERIFIED
                  +------bác bỏ-----> REJECTED (tự từ chối yêu cầu bồi thường đang chờ)

Bồi thường:   PENDING --duyệt--> APPROVED --chi trả--> PAID
                  +----từ chối----> REJECTED

Phạt:         UNPAID --nộp--> PAID
                 +---miễn---> WAIVED

Tài khoản:    PENDING --xác thực email--> ACTIVE <--khoá/mở khoá--> LOCKED
```

---

## 7. Bảo mật

- Mật khẩu băm BCrypt; API không bao giờ trả `passwordHash`.
- JWT HS256, hết hạn 8 giờ; token bị vô hiệu khi đổi/đặt lại mật khẩu hoặc tài khoản bị khoá.
- Chống dò tài khoản: quên mật khẩu / gửi lại link luôn trả cùng thông báo; đăng nhập sai trả thông báo chung.
- Chống brute-force: 5 lần sai liên tiếp ⇒ tạm khoá 15 phút.
- Link xác thực / đặt lại mật khẩu: token ngẫu nhiên 256-bit, dùng 1 lần, có hạn; tạo link mới vô hiệu link cũ.
- Khách hàng truy cập dữ liệu người khác ⇒ 404.
