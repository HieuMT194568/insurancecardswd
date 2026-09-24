import { z } from 'zod';

/**
 * Quy tắc validate phía client — giống hệt backend (ValidationRules.java + các DTO).
 * Backend vẫn luôn validate lại; lỗi từ server được gắn vào đúng ô nhập (xem utils/errors.js).
 */
export const RX = {
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,50}$/,
  fullName: /^[\p{L}\p{M}]+(\s+[\p{L}\p{M}]+)*$/u,
  phone: /^0[35789]\d{8}$/,
  idNumber: /^0\d{11}$/,
  plate: /^(1[1-9]|[2-9][0-9])-[A-Z]{1,2}[0-9]? ([0-9]{4}|[0-9]{3}\.[0-9]{2})$/,
  serial: /^[A-Z0-9]{6,20}$/,
  productCode: /^[A-Z0-9_-]{3,20}$/,
};

export const MSG = {
  email: 'Email không đúng định dạng (ví dụ: ten@gmail.com)',
  password: 'Mật khẩu 8-50 ký tự, gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt và không chứa khoảng trắng',
  fullName: 'Họ tên chỉ gồm chữ cái và khoảng trắng',
  phone: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09',
  idNumber: 'Số CCCD gồm đúng 12 chữ số và bắt đầu bằng 0',
  plate: 'Biển số không đúng định dạng (ví dụ: 59-X1 123.45 hoặc 29-B1 1234)',
  chassis: 'Số khung gồm 6-20 ký tự chữ (A-Z) và số, không dấu, không khoảng trắng',
  engine: 'Số máy gồm 6-20 ký tự chữ (A-Z) và số, không dấu, không khoảng trắng',
  productCode: "Mã sản phẩm gồm 3-20 ký tự: chữ in hoa, số, '-' hoặc '_'",
  confirm: 'Mật khẩu nhập lại không khớp',
};

// ------------------------------------------------------------------ ngày giờ
const pad = (n) => String(n).padStart(2, '0');
export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function nowLocalStr() {
  const d = new Date();
  return `${todayStr()}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function ageOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}
/** Ngày hết hạn = ngày bắt đầu + N năm - 1 ngày (giống backend). */
export function endDateOf(start, years) {
  if (!start || !years) return null;
  const [y, m, d] = start.split('-').map(Number);
  const dt = new Date(y + Number(years), m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// ------------------------------------------------------------------ builder
const required = (msg) => z.string({ required_error: msg, invalid_type_error: msg }).trim().min(1, msg);

const text = (label, min, max, msg = `${label} từ ${min} đến ${max} ký tự`) =>
  required(`Vui lòng nhập ${label.toLowerCase()}`).pipe(z.string().min(min, msg).max(max, msg));

const optionalText = (max, msg) =>
  z.string().trim().max(max, msg).optional().transform((v) => (v ? v : null));

/** Ô nhập số nguyên (giá trị form là chuỗi) -> number. */
const intField = (requiredMsg, min, max, rangeMsg, intMsg = 'Giá trị phải là số nguyên') =>
  required(requiredMsg)
    .pipe(z.string().regex(/^-?\d+$/, intMsg))
    .transform(Number)
    .pipe(z.number().min(min, rangeMsg).max(max, rangeMsg));

const money = (requiredMsg, min, max, rangeMsg) =>
  intField(requiredMsg, min, max, rangeMsg, 'Số tiền phải là số nguyên (VND), không có dấu chấm/phẩy');

/** Select id (chuỗi) -> number. */
const idField = (msg) => required(msg).transform(Number);

const enumField = (values, msg) => z.enum(values, { errorMap: () => ({ message: msg }) });

// ------------------------------------------------------------------ trường dùng chung
export const f = {
  fullName: required('Vui lòng nhập họ tên')
    .pipe(z.string().min(2, 'Họ tên từ 2 đến 100 ký tự').max(100, 'Họ tên từ 2 đến 100 ký tự').regex(RX.fullName, MSG.fullName)),
  email: required('Vui lòng nhập email').pipe(z.string().max(100, 'Email tối đa 100 ký tự').regex(RX.email, MSG.email)),
  phone: required('Vui lòng nhập số điện thoại').pipe(z.string().regex(RX.phone, MSG.phone)),
  idNumber: required('Vui lòng nhập số CCCD').pipe(z.string().regex(RX.idNumber, MSG.idNumber)),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').regex(RX.password, MSG.password),
  dateOfBirth: required('Vui lòng nhập ngày sinh')
    .refine((v) => v < todayStr(), 'Ngày sinh phải là ngày trong quá khứ')
    .refine((v) => { const a = ageOf(v); return a >= 18 && a <= 100; }, 'Khách hàng phải từ 18 đến 100 tuổi'),
  gender: enumField(['MALE', 'FEMALE', 'OTHER'], 'Vui lòng chọn giới tính'),
  address: text('Địa chỉ', 5, 255),
  note: optionalText(500, 'Ghi chú tối đa 500 ký tự'),
};

// ------------------------------------------------------------------ Xác thực
export const loginSchema = z.object({
  email: required('Vui lòng nhập email').pipe(z.string().max(100, 'Email tối đa 100 ký tự')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(50, 'Mật khẩu tối đa 50 ký tự'),
});

export const emailSchema = z.object({ email: f.email });

const withConfirm = (schema, field = 'password') =>
  schema.refine((v) => v[field] === v.confirmPassword, { path: ['confirmPassword'], message: MSG.confirm });

export const registerSchema = withConfirm(z.object({
  fullName: f.fullName,
  email: f.email,
  phone: f.phone,
  password: f.password,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  idNumber: f.idNumber,
  dateOfBirth: f.dateOfBirth,
  gender: f.gender,
  address: f.address,
}));

export const resetPasswordSchema = withConfirm(z.object({
  newPassword: f.password,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
}), 'newPassword');

export const setPasswordSchema = resetPasswordSchema;

export const changePasswordSchema = withConfirm(z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: f.password,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
}), 'newPassword').refine((v) => v.newPassword !== v.currentPassword, {
  path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
});

// ------------------------------------------------------------------ Khách hàng
export const customerSchema = z.object({
  fullName: f.fullName, email: f.email, phone: f.phone, idNumber: f.idNumber,
  dateOfBirth: f.dateOfBirth, gender: f.gender, address: f.address,
});

export const profileSchema = z.object({
  fullName: f.fullName, phone: f.phone, dateOfBirth: f.dateOfBirth, gender: f.gender, address: f.address,
});

export const staffProfileSchema = z.object({ fullName: f.fullName, phone: f.phone });

// ------------------------------------------------------------------ Xe
const upper = (s) => s.toUpperCase();
export const vehicleSchema = z.object({
  customerId: z.any().transform((v) => (v ? Number(v) : null)),
  licensePlate: required('Vui lòng nhập biển số xe')
    .transform((v) => upper(v).replace(/\s+/g, ' '))
    .pipe(z.string().regex(RX.plate, MSG.plate)),
  brand: text('Hãng xe', 2, 50),
  model: text('Dòng xe', 1, 50),
  color: text('Màu xe', 2, 30),
  engineCapacity: intField('Vui lòng nhập dung tích xi-lanh', 1, 3000, 'Dung tích xi-lanh từ 1 đến 3000 cc'),
  manufactureYear: intField('Vui lòng nhập năm sản xuất', 1980, new Date().getFullYear(),
    `Năm sản xuất từ 1980 đến ${new Date().getFullYear()}`),
  chassisNumber: required('Vui lòng nhập số khung').transform(upper).pipe(z.string().regex(RX.serial, MSG.chassis)),
  engineNumber: required('Vui lòng nhập số máy').transform(upper).pipe(z.string().regex(RX.serial, MSG.engine)),
}).refine((v) => v.chassisNumber !== v.engineNumber, { path: ['engineNumber'], message: 'Số máy không được trùng số khung' });

// ------------------------------------------------------------------ Sản phẩm
export const productSchema = z.object({
  code: required('Vui lòng nhập mã sản phẩm').transform(upper).pipe(z.string().regex(RX.productCode, MSG.productCode)),
  name: text('Tên sản phẩm', 3, 100),
  description: optionalText(500, 'Mô tả tối đa 500 ký tự'),
  minEngineCapacity: intField('Vui lòng nhập dung tích tối thiểu', 1, 3000, 'Dung tích tối thiểu từ 1 đến 3000 cc'),
  maxEngineCapacity: intField('Vui lòng nhập dung tích tối đa', 1, 3000, 'Dung tích tối đa từ 1 đến 3000 cc'),
  annualPremium: money('Vui lòng nhập phí bảo hiểm/năm', 1000, 100_000_000, 'Phí bảo hiểm từ 1.000 đến 100.000.000 VND'),
  maxCompensation: money('Vui lòng nhập mức bồi thường tối đa', 1_000_000, 10_000_000_000,
    'Mức bồi thường tối đa từ 1.000.000 đến 10.000.000.000 VND'),
  status: enumField(['ACTIVE', 'INACTIVE'], 'Vui lòng chọn trạng thái'),
}).refine((v) => v.maxEngineCapacity >= v.minEngineCapacity, {
  path: ['maxEngineCapacity'], message: 'Dung tích tối đa phải lớn hơn hoặc bằng dung tích tối thiểu',
}).refine((v) => v.maxCompensation > v.annualPremium, {
  path: ['maxCompensation'], message: 'Mức bồi thường tối đa phải lớn hơn phí bảo hiểm/năm',
});

// ------------------------------------------------------------------ Hợp đồng
const termYears = intField('Vui lòng chọn thời hạn', 1, 3, 'Thời hạn từ 1 đến 3 năm');

export const contractSchema = (needCustomer) => z.object({
  customerId: needCustomer ? idField('Vui lòng chọn khách hàng') : z.any().optional().transform(() => null),
  vehicleId: idField('Vui lòng chọn xe'),
  productId: idField('Vui lòng chọn gói bảo hiểm'),
  startDate: required('Vui lòng chọn ngày bắt đầu hiệu lực')
    .refine((v) => v >= todayStr(), 'Ngày bắt đầu không được trước ngày hôm nay'),
  termYears,
  note: f.note,
});

/** Sửa hợp đồng (nhân viên). Hợp đồng ACTIVE giữ nguyên ngày bắt đầu nên không kiểm tra >= hôm nay. */
export const contractUpdateSchema = (isActive) => z.object({
  vehicleId: idField('Vui lòng chọn xe'),
  productId: idField('Vui lòng chọn gói bảo hiểm'),
  startDate: isActive ? required('Vui lòng chọn ngày bắt đầu hiệu lực')
    : required('Vui lòng chọn ngày bắt đầu hiệu lực').refine((v) => v >= todayStr(), 'Ngày bắt đầu không được trước ngày hôm nay'),
  termYears,
  note: f.note,
});

export const renewSchema = z.object({ termYears });

export const methodSchema = z.object({
  method: enumField(['CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET'], 'Vui lòng chọn phương thức thanh toán'),
});

/** Lý do (huỷ hợp đồng, từ chối bồi thường, miễn phạt...). */
export const reasonSchema = (label, min = 10, max = 500) => z.object({
  reason: required(`Vui lòng nhập ${label.toLowerCase()}`)
    .pipe(z.string().min(min, `${label} từ ${min} đến ${max} ký tự`).max(max, `${label} từ ${min} đến ${max} ký tự`)),
});

// ------------------------------------------------------------------ Tai nạn / bồi thường
export const accidentSchema = z.object({
  contractId: idField('Vui lòng chọn hợp đồng'),
  accidentTime: required('Vui lòng nhập thời điểm xảy ra tai nạn')
    .refine((v) => v <= nowLocalStr(), 'Thời điểm tai nạn không được ở tương lai'),
  location: text('Địa điểm', 5, 255),
  description: required('Vui lòng mô tả diễn biến tai nạn')
    .pipe(z.string().min(20, 'Mô tả từ 20 đến 1000 ký tự').max(1000, 'Mô tả từ 20 đến 1000 ký tự')),
  damageType: enumField(['PROPERTY', 'INJURY', 'BOTH'], 'Vui lòng chọn loại thiệt hại'),
  estimatedDamage: money('Vui lòng nhập thiệt hại ước tính', 0, 10_000_000_000,
    'Thiệt hại ước tính từ 0 đến 10.000.000.000 VND'),
  policeReportNumber: optionalText(50, 'Số biên bản công an tối đa 50 ký tự'),
});

export const resolveAccidentSchema = z.object({
  status: enumField(['VERIFIED', 'REJECTED'], 'Vui lòng chọn kết quả xử lý'),
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
}).superRefine((v, ctx) => {
  if (v.status === 'REJECTED' && (!v.note || v.note.length < 10)) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'Vui lòng nhập lý do bác bỏ (10-500 ký tự)' });
  }
});

const claimBase = {
  requestedAmount: money('Vui lòng nhập số tiền yêu cầu bồi thường', 10_000, 10_000_000_000,
    'Số tiền yêu cầu từ 10.000 đến 10.000.000.000 VND'),
  description: required('Vui lòng nhập nội dung yêu cầu')
    .pipe(z.string().min(20, 'Nội dung yêu cầu từ 20 đến 1000 ký tự').max(1000, 'Nội dung yêu cầu từ 20 đến 1000 ký tự')),
};
export const claimExistingSchema = z.object({
  mode: z.literal('existing'), accidentId: idField('Vui lòng chọn tai nạn đã khai báo'), ...claimBase,
});
export const claimNewSchema = z.object({ mode: z.literal('new'), accident: accidentSchema, ...claimBase });

export const approveSchema = (requested) => z.object({
  approvedAmount: money('Vui lòng nhập số tiền duyệt chi', 10_000, Number(requested),
    `Số tiền duyệt từ 10.000 đến ${Number(requested).toLocaleString('vi-VN')} VND (số tiền yêu cầu)`),
  note: f.note,
});

// ------------------------------------------------------------------ Phạt
export const punishmentSchema = z.object({
  customerId: idField('Vui lòng chọn khách hàng'),
  contractId: z.any().transform((v) => (v ? Number(v) : null)),
  violationType: enumField(['LATE_PAYMENT', 'FALSE_DECLARATION', 'FRAUDULENT_CLAIM', 'CONTRACT_VIOLATION', 'OTHER'],
    'Vui lòng chọn loại vi phạm'),
  description: required('Vui lòng nhập nội dung vi phạm')
    .pipe(z.string().min(10, 'Nội dung vi phạm từ 10 đến 500 ký tự').max(500, 'Nội dung vi phạm từ 10 đến 500 ký tự')),
  violationDate: required('Vui lòng nhập ngày vi phạm').refine((v) => v <= todayStr(), 'Ngày vi phạm không được ở tương lai'),
  amount: money('Vui lòng nhập số tiền phạt', 10_000, 100_000_000, 'Số tiền phạt từ 10.000 đến 100.000.000 VND'),
  dueDate: z.string().optional().transform((v) => (v ? v : null)),
}).superRefine((v, ctx) => {
  if (v.dueDate && v.violationDate && v.dueDate < v.violationDate) {
    ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Hạn nộp phạt không được trước ngày vi phạm' });
  } else if (v.dueDate && v.dueDate < todayStr()) {
    ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Hạn nộp phạt không được trước ngày hôm nay' });
  }
});

/** Chuyển object số -> chuỗi để đổ vào form (ô input luôn là chuỗi). */
export function toFormValues(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    const v = obj?.[k];
    out[k] = v === null || v === undefined ? '' : String(v);
  });
  return out;
}
