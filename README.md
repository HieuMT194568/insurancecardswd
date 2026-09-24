# Insurance Card – Hệ thống bảo hiểm xe máy

Full-stack CRUD theo tài liệu *InsuranceCard_Requirements*:

| Tầng | Công nghệ |
|---|---|
| Frontend | React 19 + **React Bootstrap** + React Router + React Hook Form + Zod (Vite) |
| Backend (API) | **Java 17**, Spring Boot 3.5 (Web, Data JPA, Validation, Security + JWT), Flyway, Swagger UI |
| Database | **MySQL 8** (mặc định) hoặc **SQL Server** (đổi bằng biến môi trường `DB_VENDOR=sqlserver`) |

Đặc tả use case, quy tắc nghiệp vụ và toàn bộ quy tắc validate: [docs/USE_CASES_AND_VALIDATION.md](docs/USE_CASES_AND_VALIDATION.md).

## 1. Chạy dự án

Yêu cầu: JDK 17+, Node.js 20+, MySQL 8 đang chạy (hoặc SQL Server). Maven **không cần cài** (dùng `mvnw`).

### Backend – http://localhost:8080

Lần đầu: khai báo tài khoản MySQL của máy bạn (file này không được đẩy lên git):

```bash
cp backend/src/main/resources/application-local.example.yml backend/src/main/resources/application-local.yml
```

Sửa `DB_USERNAME` / `DB_PASSWORD` trong file vừa tạo (hoặc đặt biến môi trường cùng tên), rồi chạy:

```bash
cd backend
./mvnw spring-boot:run
```

- Mặc định kết nối `jdbc:mysql://localhost:3306/insurance_card` (đổi bằng `DB_URL`).
- Lần chạy đầu: tự tạo database, Flyway tạo bảng, rồi nạp dữ liệu demo.
- Swagger UI: http://localhost:8080/swagger-ui.html

### Frontend – http://localhost:5173

```bash
cd frontend
npm install
npm run dev
```

Vite proxy `/api` sang `http://localhost:8080`.

### Chạy với SQL Server

1. Chạy `database/sqlserver/00_create_database.sql` (tạo database `InsuranceCard`).
2. Bật TCP/IP cổng 1433 và SQL Server Authentication.
3. Chạy backend:

```powershell
$env:DB_VENDOR="sqlserver"; $env:DB_USERNAME="sa"; $env:DB_PASSWORD="<mật khẩu>"; ./mvnw spring-boot:run
```

Flyway dùng `db/migration/sqlserver` (NVARCHAR, DATETIME2, IDENTITY). Nếu muốn tạo bảng thủ công, chạy thêm `database/sqlserver/01_schema_and_settings.sql`.

## 2. Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Nhân viên | `staff@insurancecard.vn` | `Staff@123` |
| Khách hàng (có đủ dữ liệu mẫu) | `customer@insurancecard.vn` | `Customer@123` |
| Khách hàng | `lan.nguyen@gmail.com` | `Customer@123` |
| Chưa xác thực email | `pending.user@gmail.com` | `Customer@123` |
| Bị khoá | `locked.user@gmail.com` | `Customer@123` |

Email ở **chế độ demo** (`MAIL_ENABLED=false`): link xác thực / đặt lại mật khẩu được ghi log và hiển thị ngay trên giao diện.
Gửi mail thật: đặt `MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`.

## 3. Kiểm thử tự động

Bộ 222 case API (xác thực, phân quyền, CRUD, validate, quy tắc nghiệp vụ), chạy khi backend đang chạy, chạy lặp lại được:

```bash
node tests/api-test.mjs
```

## 4. Chức năng

**Chung:** trang chủ + gói bảo hiểm, đăng ký (xác thực email), đăng nhập, quên/đặt lại mật khẩu, đổi mật khẩu, phân quyền theo vai trò.

**Khách hàng** (dashboard): hồ sơ; CRUD xe; mua bảo hiểm; thanh toán; gia hạn; huỷ (hoàn phí); khai báo tai nạn; yêu cầu bồi thường; nộp phạt; lịch sử thanh toán, tai nạn, bồi thường, vi phạm, hợp đồng.

**Nhân viên** (dashboard): CRUD khách hàng (khoá/mở khoá, đặt lại mật khẩu); CRUD xe; tạo/sửa/gia hạn/huỷ hợp đồng, thu tiền; xử lý tai nạn; duyệt/từ chối/chi trả bồi thường; lập/sửa/xoá/miễn/thu tiền phạt; CRUD sản phẩm bảo hiểm; cấu hình hệ thống; xem giao dịch.

## 5. Cấu trúc thư mục

```
backend/
  src/main/java/com/insurancecard/
    config/        Security, JWT filter, Jackson (trim chuỗi), dữ liệu demo, Swagger
    controller/    REST API /api/**
    service/       Nghiệp vụ + validate quy tắc
    dto/           Request/Response + annotation validate
    domain/        Entity JPA + enum
    repository/    Spring Data JPA
    validation/    Regex dùng chung, @AgeBetween, @RawString
    common/        ApiException, GlobalExceptionHandler, phân trang, sinh mã
  src/main/resources/db/migration/{mysql,sqlserver}/   Flyway
frontend/src/
  api/             axios client + các hàm gọi API
  context/         AuthContext (JWT), ToastContext
  components/      Layout, form field, picker, modal dùng chung
  pages/           public / customer / staff / shared
  utils/           validation.js (zod – khớp backend), format, errors
database/          Script SQL độc lập cho MySQL và SQL Server
docs/              Đặc tả use case & validate
tests/             Bộ test API tự động
```

## 6. API chính

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/auth/{login,register,verify-email,resend-verification,forgot-password,reset-password}` |
| Cá nhân | `GET /api/me`, `PUT /api/me/profile`, `PUT /api/me/staff-profile`, `POST /api/me/change-password`, `GET /api/dashboard/{customer,staff}` |
| Khách hàng | `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/{id}`, `PATCH /{id}/status`, `POST /{id}/set-password` |
| Xe | `GET/POST /api/vehicles`, `GET/PUT/DELETE /api/vehicles/{id}` |
| Sản phẩm | `GET /api/products/public`, `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` |
| Hợp đồng | `GET/POST /api/contracts`, `GET/PUT /api/contracts/{id}`, `POST /{id}/pay`, `/{id}/renew`, `/{id}/cancel` |
| Giao dịch | `GET /api/payments` |
| Tai nạn | `GET/POST /api/accidents`, `GET/PUT/DELETE /api/accidents/{id}`, `POST /{id}/resolve` |
| Bồi thường | `GET/POST /api/compensations`, `GET /{id}`, `POST /{id}/approve`, `/{id}/reject`, `/{id}/payout` |
| Phạt | `GET/POST /api/punishments`, `GET/PUT/DELETE /api/punishments/{id}`, `POST /{id}/pay`, `/{id}/waive` |
| Cấu hình | `GET /api/settings`, `PUT /api/settings/{key}` |

Danh sách đều hỗ trợ `q` (tìm kiếm), lọc trạng thái, `page` (từ 0) và `size` (1–100).
