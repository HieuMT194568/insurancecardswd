-- Cấu hình hệ thống (nhân viên chỉnh được trên màn hình "Cấu hình hệ thống")
INSERT INTO system_settings (setting_key, setting_value, min_value, max_value, unit, description, updated_at) VALUES
('RENEWAL_WINDOW_DAYS',          30, 1,   90, N'ngày',  N'Được gia hạn hợp đồng khi còn tối đa N ngày trước ngày hết hạn', SYSDATETIME()),
('MAX_START_DATE_ADVANCE_DAYS',  60, 0,  365, N'ngày',  N'Ngày bắt đầu hiệu lực của hợp đồng mới tối đa sau hôm nay N ngày', SYSDATETIME()),
('CLAIM_DEADLINE_DAYS',         365, 1,  730, N'ngày',  N'Thời hạn khai báo tai nạn / yêu cầu bồi thường tính từ ngày xảy ra tai nạn', SYSDATETIME()),
('CANCEL_REFUND_PERCENT',        80, 0,  100, N'%',     N'Tỉ lệ hoàn phí cho thời gian còn lại khi huỷ hợp đồng đang hiệu lực (chưa phát sinh bồi thường)', SYSDATETIME()),
('PENALTY_DUE_DAYS',             30, 1,  180, N'ngày',  N'Hạn nộp phạt mặc định tính từ ngày lập biên bản phạt', SYSDATETIME()),
('VERIFY_TOKEN_EXPIRY_HOURS',    24, 1,  168, N'giờ',   N'Thời hạn của link xác thực email khi đăng ký', SYSDATETIME()),
('RESET_TOKEN_EXPIRY_MINUTES',   30, 5, 1440, N'phút',  N'Thời hạn của link đặt lại mật khẩu', SYSDATETIME());
