-- Cấu hình hệ thống (nhân viên chỉnh được trên màn hình "Cấu hình hệ thống")
INSERT INTO system_settings (setting_key, setting_value, min_value, max_value, unit, description, updated_at) VALUES
('RENEWAL_WINDOW_DAYS',          30, 1,   90, 'ngày',  'Được gia hạn hợp đồng khi còn tối đa N ngày trước ngày hết hạn', CURRENT_TIMESTAMP(6)),
('MAX_START_DATE_ADVANCE_DAYS',  60, 0,  365, 'ngày',  'Ngày bắt đầu hiệu lực của hợp đồng mới tối đa sau hôm nay N ngày', CURRENT_TIMESTAMP(6)),
('CLAIM_DEADLINE_DAYS',         365, 1,  730, 'ngày',  'Thời hạn khai báo tai nạn / yêu cầu bồi thường tính từ ngày xảy ra tai nạn', CURRENT_TIMESTAMP(6)),
('CANCEL_REFUND_PERCENT',        80, 0,  100, '%',     'Tỉ lệ hoàn phí cho thời gian còn lại khi huỷ hợp đồng đang hiệu lực (chưa phát sinh bồi thường)', CURRENT_TIMESTAMP(6)),
('PENALTY_DUE_DAYS',             30, 1,  180, 'ngày',  'Hạn nộp phạt mặc định tính từ ngày lập biên bản phạt', CURRENT_TIMESTAMP(6)),
('VERIFY_TOKEN_EXPIRY_HOURS',    24, 1,  168, 'giờ',   'Thời hạn của link xác thực email khi đăng ký', CURRENT_TIMESTAMP(6)),
('RESET_TOKEN_EXPIRY_MINUTES',   30, 5, 1440, 'phút',  'Thời hạn của link đặt lại mật khẩu', CURRENT_TIMESTAMP(6));
