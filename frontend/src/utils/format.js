export const money = (v) =>
  v === null || v === undefined || v === '' ? '—' : `${Number(v).toLocaleString('vi-VN')} ₫`;

export const date = (v) => {
  if (!v) return '—';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const dateTime = (v) => {
  if (!v) return '—';
  const s = String(v);
  return `${date(s)} ${s.slice(11, 16)}`;
};

/** Nhãn tiếng Việt + màu badge cho mọi enum của backend. */
export const LABELS = {
  contract: {
    PENDING_PAYMENT: ['Chờ thanh toán', 'warning'],
    ACTIVE: ['Đang hiệu lực', 'success'],
    EXPIRED: ['Hết hạn', 'secondary'],
    CANCELLED: ['Đã huỷ', 'danger'],
  },
  user: {
    PENDING: ['Chưa kích hoạt', 'warning'],
    ACTIVE: ['Hoạt động', 'success'],
    LOCKED: ['Bị khoá', 'danger'],
  },
  product: {
    ACTIVE: ['Đang bán', 'success'],
    INACTIVE: ['Ngừng bán', 'secondary'],
  },
  paymentType: {
    PREMIUM: ['Thu phí bảo hiểm', 'primary'],
    REFUND: ['Hoàn phí', 'info'],
    PENALTY: ['Nộp phạt', 'warning'],
    COMPENSATION: ['Chi bồi thường', 'success'],
  },
  paymentStatus: {
    PENDING: ['Chờ thanh toán', 'warning'],
    PAID: ['Đã thanh toán', 'success'],
    CANCELLED: ['Đã huỷ', 'secondary'],
  },
  accident: {
    REPORTED: ['Chờ xác minh', 'warning'],
    VERIFIED: ['Đã xác minh', 'success'],
    REJECTED: ['Bị bác bỏ', 'danger'],
  },
  claim: {
    PENDING: ['Chờ duyệt', 'warning'],
    APPROVED: ['Đã duyệt', 'info'],
    REJECTED: ['Từ chối', 'danger'],
    PAID: ['Đã chi trả', 'success'],
  },
  punishment: {
    UNPAID: ['Chưa nộp', 'warning'],
    PAID: ['Đã nộp', 'success'],
    WAIVED: ['Được miễn', 'secondary'],
  },
};

export const PAYMENT_METHODS = {
  CASH: 'Tiền mặt (tại quầy)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  CARD: 'Thẻ ngân hàng / Visa',
  E_WALLET: 'Ví điện tử',
};

export const GENDERS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

export const DAMAGE_TYPES = { PROPERTY: 'Tài sản / xe', INJURY: 'Thương tích người', BOTH: 'Cả người và tài sản' };

export const VIOLATION_TYPES = {
  LATE_PAYMENT: 'Chậm thực hiện nghĩa vụ / thanh toán',
  FALSE_DECLARATION: 'Kê khai sai thông tin',
  FRAUDULENT_CLAIM: 'Gian lận bồi thường',
  CONTRACT_VIOLATION: 'Vi phạm điều khoản hợp đồng',
  OTHER: 'Khác',
};
