/**
 * Bộ test API tự động cho Insurance Card.
 * Chạy:  node tests/api-test.mjs          (backend phải đang chạy ở http://localhost:8080)
 * Có thể chạy lặp lại nhiều lần: dữ liệu test được sinh ngẫu nhiên, không phụ thuộc lần chạy trước.
 */
const BASE = process.env.API_URL || 'http://localhost:8080/api';

let passed = 0;
let failed = 0;
const failures = [];

// ------------------------------------------------------------------ helpers
async function api(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

function check(id, name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32mPASS\x1b[0m ${id} ${name}`);
  } else {
    failed++;
    failures.push(`${id} ${name}`);
    console.log(`  \x1b[31mFAIL\x1b[0m ${id} ${name}`);
    if (detail !== undefined) console.log('       ->', JSON.stringify(detail).slice(0, 600));
  }
}

/** Kiểm tra status code (+ các field lỗi mong đợi). */
function expect(id, name, res, status, fields = []) {
  const okStatus = res.status === status;
  const fe = (res.data && res.data.fieldErrors) || {};
  const okFields = fields.every((f) => fe[f]);
  check(id, `${name} -> ${status}${fields.length ? ' [' + fields.join(', ') + ']' : ''}`, okStatus && okFields, res);
  return res.data;
}

function section(title) { console.log(`\n\x1b[36m== ${title} ==\x1b[0m`); }

const pad = (n) => String(n).padStart(2, '0');
function day(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dateTime(offsetDays = 0, h = 9, m = 0) { return `${day(offsetDays)}T${pad(h)}:${pad(m)}:00`; }
const rnd = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const rndLetters = (n) => Array.from({ length: n }, () => 'ABCDEFGHKLMNPSTUVXYZ'[Math.floor(Math.random() * 20)]).join('');
const uniq = Date.now().toString(36);
const phone = () => '09' + rnd(8);
const idNumber = () => '0' + rnd(11);
const plate = () => `${String(11 + Math.floor(Math.random() * 88))}-${rndLetters(1)}${1 + Math.floor(Math.random() * 9)} ${rnd(3)}.${rnd(2)}`;
const serial = () => rndLetters(4) + rnd(8);

function newCustomerPayload(extra = {}) {
  return {
    fullName: 'Khách Hàng Kiểm Thử',
    email: `test.${uniq}.${rnd(5)}@example.com`,
    phone: phone(),
    idNumber: idNumber(),
    dateOfBirth: '1992-03-04',
    gender: 'MALE',
    address: '12 Đường Kiểm Thử, Quận 3, TP. Hồ Chí Minh',
    ...extra,
  };
}
function newVehiclePayload(extra = {}) {
  return {
    licensePlate: plate(), brand: 'Honda', model: 'Air Blade', color: 'Đen',
    engineCapacity: 125, manufactureYear: 2022, chassisNumber: serial(), engineNumber: serial(), ...extra,
  };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { email, password });
  return r.data && r.data.accessToken;
}

// ------------------------------------------------------------------ tests
async function main() {
  console.log(`API: ${BASE}`);

  // ================================================================ AUTH
  section('1. Xác thực & phân quyền');
  let r = await api('POST', '/auth/login', {});
  expect('TC-A01', 'Đăng nhập bỏ trống email & mật khẩu', r, 400, ['email', 'password']);

  r = await api('POST', '/auth/login', { email: 'staff@insurancecard.vn', password: 'Sai@12345' });
  expect('TC-A02', 'Đăng nhập sai mật khẩu', r, 401);
  check('TC-A02b', 'Thông báo chung chung, không lộ email tồn tại', r.data?.code === 'INVALID_CREDENTIALS', r.data);

  r = await api('POST', '/auth/login', { email: 'pending.user@gmail.com', password: 'Customer@123' });
  expect('TC-A03', 'Đăng nhập tài khoản chưa xác thực email', r, 403);
  check('TC-A03b', 'Mã lỗi EMAIL_NOT_VERIFIED', r.data?.code === 'EMAIL_NOT_VERIFIED', r.data);

  r = await api('POST', '/auth/login', { email: 'locked.user@gmail.com', password: 'Customer@123' });
  expect('TC-A04', 'Đăng nhập tài khoản bị khoá', r, 403);
  check('TC-A04b', 'Mã lỗi ACCOUNT_LOCKED', r.data?.code === 'ACCOUNT_LOCKED', r.data);

  r = await api('POST', '/auth/login', { email: 'STAFF@insurancecard.vn', password: 'Staff@123' });
  const staffLogin = expect('TC-A05', 'Nhân viên đăng nhập (email không phân biệt hoa thường)', r, 200);
  const staff = staffLogin?.accessToken;
  check('TC-A05b', 'Role = STAFF, không trả passwordHash', staffLogin?.user?.role === 'STAFF'
    && !JSON.stringify(staffLogin).includes('passwordHash'), staffLogin);

  r = await api('POST', '/auth/login', { email: 'customer@insurancecard.vn', password: 'Customer@123' });
  const seedCustomer = expect('TC-A06', 'Khách hàng đăng nhập', r, 200);
  const cust = seedCustomer?.accessToken;
  const seedCustomerId = seedCustomer?.user?.customerId;

  r = await api('POST', '/auth/register', {
    fullName: 'Nguyen 123', email: 'abc@', phone: '0123', password: 'abc', confirmPassword: 'abc',
    idNumber: '123', dateOfBirth: day(-365 * 10), gender: 'X', address: 'abc',
  });
  expect('TC-A07', 'Đăng ký: giới tính sai giá trị enum', r, 400, ['gender']);

  r = await api('POST', '/auth/register', {
    fullName: 'Nguyen 123', email: 'abc@', phone: '0123', password: 'abc', confirmPassword: 'abc',
    idNumber: '123', dateOfBirth: day(-365 * 10), gender: 'MALE', address: 'abc',
  });
  expect('TC-A08', 'Đăng ký: mọi trường sai định dạng', r, 400,
    ['fullName', 'email', 'phone', 'password', 'idNumber', 'dateOfBirth', 'address']);

  const reg = newCustomerPayload({ fullName: 'Lê   Văn   Đăng Ký', password: 'Test@1234', confirmPassword: 'Test@9999' });
  r = await api('POST', '/auth/register', reg);
  expect('TC-A09', 'Đăng ký: mật khẩu nhập lại không khớp', r, 400, ['confirmPassword']);

  r = await api('POST', '/auth/register', { ...newCustomerPayload(), email: 'customer@insurancecard.vn',
    phone: '0912345678', idNumber: '079090001234', password: 'Test@1234', confirmPassword: 'Test@1234' });
  expect('TC-A10', 'Đăng ký: trùng email, SĐT, CCCD', r, 409, ['email', 'phone', 'idNumber']);

  r = await api('POST', '/auth/register', { ...reg, password: ' Test@1234', confirmPassword: ' Test@1234' });
  expect('TC-A11', 'Đăng ký: mật khẩu có khoảng trắng đầu (không bị trim ngầm)', r, 400, ['password']);

  r = await api('POST', '/auth/register', { ...reg, confirmPassword: 'Test@1234' });
  const regRes = expect('TC-A12', 'Đăng ký thành công', r, 201);
  const verifyToken = regRes?.devLink?.split('token=')[1];
  check('TC-A12b', 'Chế độ demo trả về link xác thực', !!verifyToken, regRes);

  r = await api('POST', '/auth/login', { email: reg.email, password: 'Test@1234' });
  expect('TC-A13', 'Đăng nhập trước khi xác thực email', r, 403);

  r = await api('POST', '/auth/verify-email', { token: 'khong-ton-tai' });
  expect('TC-A14', 'Xác thực email với token sai', r, 400);

  r = await api('POST', '/auth/verify-email', { token: verifyToken });
  expect('TC-A15', 'Xác thực email thành công', r, 200);
  r = await api('POST', '/auth/verify-email', { token: verifyToken });
  expect('TC-A16', 'Bấm lại link đã xác thực -> báo đã kích hoạt', r, 200);

  r = await api('POST', '/auth/login', { email: reg.email, password: 'Test@1234' });
  const regLogin = expect('TC-A17', 'Đăng nhập sau khi xác thực', r, 200);
  check('TC-A17b', 'Họ tên được chuẩn hoá khoảng trắng', regLogin?.user?.fullName === 'Lê Văn Đăng Ký', regLogin?.user);

  r = await api('POST', '/auth/forgot-password', { email: `khong.co.${uniq}@example.com` });
  const fp1 = expect('TC-A18', 'Quên mật khẩu với email không tồn tại -> vẫn trả 200 (chống dò email)', r, 200);
  check('TC-A18b', 'Không sinh link khi email không tồn tại', fp1?.devLink === null, fp1);

  r = await api('POST', '/auth/forgot-password', { email: reg.email });
  const resetToken = r.data?.devLink?.split('token=')[1];
  check('TC-A19', 'Quên mật khẩu -> sinh link đặt lại', r.status === 200 && !!resetToken, r.data);

  r = await api('POST', '/auth/reset-password', { token: resetToken, newPassword: 'weak', confirmPassword: 'weak' });
  expect('TC-A20', 'Đặt lại mật khẩu yếu', r, 400, ['newPassword']);
  r = await api('POST', '/auth/reset-password', { token: resetToken, newPassword: 'New@12345', confirmPassword: 'New@00000' });
  expect('TC-A21', 'Đặt lại mật khẩu: nhập lại không khớp', r, 400, ['confirmPassword']);
  r = await api('POST', '/auth/reset-password', { token: resetToken, newPassword: 'New@12345', confirmPassword: 'New@12345' });
  expect('TC-A22', 'Đặt lại mật khẩu thành công', r, 200);
  r = await api('POST', '/auth/reset-password', { token: resetToken, newPassword: 'New@12345', confirmPassword: 'New@12345' });
  expect('TC-A23', 'Dùng lại link đặt lại mật khẩu', r, 422);
  check('TC-A24', 'Mật khẩu cũ không còn đăng nhập được', !(await login(reg.email, 'Test@1234')));
  let regToken = await login(reg.email, 'New@12345');
  check('TC-A25', 'Mật khẩu mới đăng nhập được', !!regToken);

  r = await api('POST', '/me/change-password', { currentPassword: 'Sai@12345', newPassword: 'Abc@12345', confirmPassword: 'Abc@12345' }, regToken);
  expect('TC-A26', 'Đổi mật khẩu: sai mật khẩu hiện tại', r, 400, ['currentPassword']);
  r = await api('POST', '/me/change-password', { currentPassword: 'New@12345', newPassword: 'New@12345', confirmPassword: 'New@12345' }, regToken);
  expect('TC-A27', 'Đổi mật khẩu: mật khẩu mới trùng mật khẩu cũ', r, 400, ['newPassword']);
  await new Promise((res) => setTimeout(res, 1100)); // token cũ phải được cấp ở giây trước lúc đổi mật khẩu
  r = await api('POST', '/me/change-password', { currentPassword: 'New@12345', newPassword: 'Abc@12345', confirmPassword: 'Abc@12345' }, regToken);
  const changed = expect('TC-A28', 'Đổi mật khẩu thành công, trả token mới', r, 200);
  r = await api('GET', '/me', undefined, regToken);
  expect('TC-A29', 'Token cũ bị vô hiệu sau khi đổi mật khẩu', r, 401);
  regToken = changed?.accessToken;
  r = await api('GET', '/me', undefined, regToken);
  expect('TC-A30', 'Token mới dùng được', r, 200);

  for (let i = 0; i < 5; i++) await api('POST', '/auth/login', { email: reg.email, password: 'Wrong@123' });
  r = await api('POST', '/auth/login', { email: reg.email, password: 'Abc@12345' });
  expect('TC-A31', 'Sai mật khẩu 5 lần -> tạm khoá đăng nhập (kể cả nhập đúng)', r, 403);
  check('TC-A31b', 'Mã lỗi TEMPORARILY_LOCKED', r.data?.code === 'TEMPORARILY_LOCKED', r.data);

  r = await api('GET', '/customers');
  expect('TC-A32', 'Gọi API cần đăng nhập khi không có token', r, 401);
  r = await api('GET', '/customers', undefined, 'abc.def.ghi');
  expect('TC-A33', 'Token giả mạo', r, 401);
  r = await api('GET', '/customers', undefined, cust);
  expect('TC-A34', 'Khách hàng gọi API của nhân viên', r, 403);

  // ================================================================ PROFILE
  section('2. Hồ sơ cá nhân');
  r = await api('GET', '/me', undefined, cust);
  const me = expect('TC-P01', 'Xem hồ sơ khách hàng', r, 200);
  check('TC-P01b', 'Hồ sơ có mã KH và CCCD', !!me?.customer?.customerCode && !!me?.customer?.idNumber, me);
  r = await api('PUT', '/me/profile', { fullName: 'A', phone: '12345', dateOfBirth: day(1), gender: 'MALE', address: '' }, cust);
  expect('TC-P02', 'Cập nhật hồ sơ sai định dạng', r, 400, ['fullName', 'phone', 'dateOfBirth', 'address']);
  r = await api('PUT', '/me/profile', { fullName: me.fullName, phone: '0987654321', dateOfBirth: me.customer.dateOfBirth, gender: me.customer.gender, address: me.customer.address }, cust);
  expect('TC-P03', 'Cập nhật SĐT trùng người khác', r, 409, ['phone']);
  r = await api('PUT', '/me/profile', { fullName: me.fullName, phone: me.phone, dateOfBirth: me.customer.dateOfBirth, gender: me.customer.gender, address: me.customer.address }, cust);
  expect('TC-P04', 'Cập nhật hồ sơ hợp lệ', r, 200);
  r = await api('PUT', '/me/profile', { fullName: 'Nhân Viên', phone: '0901234567', dateOfBirth: '1990-01-01', gender: 'MALE', address: 'Địa chỉ nhân viên' }, staff);
  expect('TC-P05', 'Nhân viên gọi API hồ sơ khách hàng', r, 403);

  // ================================================================ CUSTOMERS
  section('3. Quản lý khách hàng (nhân viên)');
  r = await api('GET', '/customers?size=0', undefined, staff);
  expect('TC-C01', 'Phân trang size = 0', r, 400, ['size']);
  r = await api('GET', '/customers?size=101', undefined, staff);
  expect('TC-C02', 'Phân trang size = 101', r, 400, ['size']);
  r = await api('GET', '/customers?status=ABC', undefined, staff);
  expect('TC-C03', 'Lọc trạng thái không hợp lệ', r, 400, ['status']);
  r = await api('GET', `/customers?q=KH${String(seedCustomerId).padStart(6, '0')}`, undefined, staff);
  check('TC-C04', 'Tìm theo mã KH', r.status === 200 && r.data.content.length === 1 && r.data.content[0].id === seedCustomerId, r.data);
  r = await api('GET', '/customers?q=nguyễn thị&status=ACTIVE&page=0&size=5', undefined, staff);
  check('TC-C05', 'Tìm theo tên có dấu + lọc trạng thái', r.status === 200 && r.data.content.every((c) => c.status === 'ACTIVE'), r.data);

  r = await api('POST', '/customers', { fullName: '', email: 'x', phone: '', idNumber: 'abc', dateOfBirth: '2020-13-45', gender: 'MALE', address: 'x' }, staff);
  expect('TC-C06', 'Tạo khách hàng: ngày sinh sai định dạng', r, 400, ['dateOfBirth']);
  r = await api('POST', '/customers', { fullName: '', email: 'x', phone: '', idNumber: 'abc', dateOfBirth: day(-365 * 101 - 30), gender: 'MALE', address: 'x' }, staff);
  expect('TC-C07', 'Tạo khách hàng: nhiều trường sai (tuổi > 100)', r, 400, ['fullName', 'email', 'phone', 'idNumber', 'dateOfBirth', 'address']);
  const newCus = newCustomerPayload({ fullName: 'Hoàng Thị Mới' });
  r = await api('POST', '/customers', { ...newCus, email: 'lan.nguyen@gmail.com' }, staff);
  expect('TC-C08', 'Tạo khách hàng trùng email', r, 409, ['email']);
  r = await api('POST', '/customers', newCus, staff);
  const created = expect('TC-C09', 'Tạo khách hàng thành công', r, 201);
  const tCusId = created?.customer?.id;
  check('TC-C09b', 'Có mật khẩu tạm thời đúng chính sách',
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(created?.temporaryPassword || ''), created);
  let tCus = await login(newCus.email, created?.temporaryPassword);
  check('TC-C10', 'Khách hàng mới đăng nhập bằng mật khẩu tạm', !!tCus);

  r = await api('PUT', `/customers/${tCusId}`, { ...newCus, fullName: 'Hoàng Thị Mới Sửa', address: '99 Đường Mới, Quận 7, TP. HCM' }, staff);
  const upd = expect('TC-C11', 'Cập nhật khách hàng', r, 200);
  check('TC-C11b', 'Dữ liệu được cập nhật', upd?.fullName === 'Hoàng Thị Mới Sửa', upd);
  r = await api('PUT', `/customers/${tCusId}`, { ...newCus, idNumber: '079090001234' }, staff);
  expect('TC-C12', 'Cập nhật CCCD trùng khách khác', r, 409, ['idNumber']);
  r = await api('GET', '/customers/999999', undefined, staff);
  expect('TC-C13', 'Xem khách hàng không tồn tại', r, 404);

  r = await api('PATCH', `/customers/${tCusId}/status`, { status: 'PENDING' }, staff);
  expect('TC-C14', 'Chuyển trạng thái về PENDING', r, 400, ['status']);
  r = await api('PATCH', `/customers/${tCusId}/status`, { status: 'LOCKED' }, staff);
  expect('TC-C15', 'Khoá tài khoản khách hàng', r, 200);
  r = await api('GET', '/me', undefined, tCus);
  expect('TC-C16', 'Token của tài khoản bị khoá không dùng được nữa', r, 401);
  r = await api('POST', '/auth/login', { email: newCus.email, password: created?.temporaryPassword });
  expect('TC-C17', 'Tài khoản bị khoá không đăng nhập được', r, 403);
  r = await api('PATCH', `/customers/${tCusId}/status`, { status: 'LOCKED' }, staff);
  expect('TC-C18', 'Khoá tài khoản đã khoá', r, 422);
  r = await api('PATCH', `/customers/${tCusId}/status`, { status: 'ACTIVE' }, staff);
  expect('TC-C19', 'Mở khoá tài khoản', r, 200);

  r = await api('POST', `/customers/${tCusId}/set-password`, { newPassword: 'Cus@12345', confirmPassword: 'Cus@1234' }, staff);
  expect('TC-C20', 'Nhân viên đặt lại mật khẩu: nhập lại không khớp', r, 400, ['confirmPassword']);
  r = await api('POST', `/customers/${tCusId}/set-password`, { newPassword: 'Cus@12345', confirmPassword: 'Cus@12345' }, staff);
  expect('TC-C21', 'Nhân viên đặt lại mật khẩu cho khách', r, 200);
  tCus = await login(newCus.email, 'Cus@12345');
  check('TC-C22', 'Khách đăng nhập bằng mật khẩu mới', !!tCus);

  r = await api('DELETE', `/customers/${seedCustomerId}`, undefined, staff);
  expect('TC-C23', 'Xoá khách hàng đã có hợp đồng', r, 409);
  const tmp = newCustomerPayload();
  const tmpCreated = (await api('POST', '/customers', tmp, staff)).data;
  await api('POST', '/vehicles', { ...newVehiclePayload(), customerId: tmpCreated.customer.id }, staff);
  r = await api('DELETE', `/customers/${tmpCreated.customer.id}`, undefined, staff);
  expect('TC-C24', 'Xoá khách hàng chưa có hợp đồng (xoá kèm xe)', r, 204);
  r = await api('GET', `/customers/${tmpCreated.customer.id}`, undefined, staff);
  expect('TC-C25', 'Khách hàng đã xoá không còn', r, 404);

  // ================================================================ VEHICLES
  section('4. Quản lý xe');
  r = await api('POST', '/vehicles', newVehiclePayload({ licensePlate: '59X1-12345', chassisNumber: 'ab-12', engineNumber: 'ÂBC123', manufactureYear: 2100, engineCapacity: 0 }), tCus);
  expect('TC-V01', 'Thêm xe: biển số, số khung, số máy, dung tích sai', r, 400, ['engineCapacity']);
  r = await api('POST', '/vehicles', newVehiclePayload({ licensePlate: '59X1-12345', chassisNumber: 'ab-12', engineNumber: 'ÂBC123', manufactureYear: 2100 }), tCus);
  expect('TC-V02', 'Thêm xe: sai định dạng biển số/khung/máy/năm SX', r, 400, ['licensePlate', 'chassisNumber', 'engineNumber', 'manufactureYear']);
  const same = serial();
  r = await api('POST', '/vehicles', newVehiclePayload({ chassisNumber: same, engineNumber: same }), tCus);
  expect('TC-V03', 'Thêm xe: số máy trùng số khung', r, 400, ['engineNumber']);
  r = await api('POST', '/vehicles', newVehiclePayload({ licensePlate: '59-x1 123.45', chassisNumber: 'RLHJF1234567' }), tCus);
  expect('TC-V04', 'Thêm xe: trùng biển số (chuẩn hoá chữ hoa) và số khung', r, 409, ['licensePlate', 'chassisNumber']);
  r = await api('POST', '/vehicles', { ...newVehiclePayload(), engineCapacity: 'abc' }, tCus);
  expect('TC-V05', 'Thêm xe: dung tích không phải số', r, 400, ['engineCapacity']);
  r = await api('POST', '/vehicles', newVehiclePayload(), staff);
  expect('TC-V06', 'Nhân viên thêm xe không chọn khách hàng', r, 400, ['customerId']);

  const v1 = newVehiclePayload({ licensePlate: plate().toLowerCase() });
  r = await api('POST', '/vehicles', v1, tCus);
  const veh1 = expect('TC-V07', 'Khách hàng thêm xe hợp lệ', r, 201);
  check('TC-V07b', 'Biển số được chuẩn hoá chữ in hoa', veh1?.licensePlate === v1.licensePlate.toUpperCase(), veh1);
  r = await api('POST', '/vehicles', { ...newVehiclePayload({ engineCapacity: 50, model: 'Cub 50' }), customerId: tCusId }, staff);
  const veh50 = expect('TC-V08', 'Nhân viên thêm xe 50cc cho khách', r, 201);
  const vTmp = (await api('POST', '/vehicles', newVehiclePayload(), tCus)).data;

  r = await api('GET', '/vehicles?size=100', undefined, tCus);
  check('TC-V09', 'Khách chỉ thấy xe của mình', r.status === 200 && r.data.content.length === 3
    && r.data.content.every((v) => v.customerId === tCusId), r.data);
  r = await api('GET', '/vehicles?size=100', undefined, cust);
  const seedVehicles = r.data.content;
  r = await api('GET', `/vehicles/${seedVehicles[0].id}`, undefined, tCus);
  expect('TC-V10', 'Khách xem xe của người khác -> 404', r, 404);
  r = await api('PUT', `/vehicles/${vTmp.id}`, { ...newVehiclePayload(), color: 'Bạc' }, tCus);
  expect('TC-V11', 'Sửa xe chưa có hợp đồng', r, 200);
  r = await api('DELETE', `/vehicles/${vTmp.id}`, undefined, tCus);
  expect('TC-V12', 'Xoá xe chưa có hợp đồng', r, 204);
  r = await api('DELETE', `/vehicles/${seedVehicles[0].id}`, undefined, tCus);
  expect('TC-V13', 'Khách xoá xe của người khác -> 404', r, 404);

  // ================================================================ PRODUCTS
  section('5. Sản phẩm bảo hiểm');
  r = await api('GET', '/products/public');
  const products = r.data || [];
  check('TC-PR01', 'Khách vãng lai xem gói đang bán (chỉ ACTIVE)', r.status === 200 && products.length >= 4
    && products.every((p) => p.status === 'ACTIVE'), r.data);
  const pTNDS50 = products.find((p) => p.code === 'TNDS-50');
  const pTNDS50P = products.find((p) => p.code === 'TNDS-50P');
  const pCombo = products.find((p) => p.code === 'COMBO-TN');
  const pVCX = products.find((p) => p.code === 'VCX-100');

  r = await api('POST', '/products', { code: 'a b', name: 'X', minEngineCapacity: 0, maxEngineCapacity: 5000, annualPremium: 100.5, maxCompensation: 0, status: 'ACTIVE' }, staff);
  expect('TC-PR02', 'Tạo sản phẩm sai ràng buộc', r, 400, ['name', 'minEngineCapacity', 'maxEngineCapacity', 'annualPremium', 'maxCompensation']);
  r = await api('POST', '/products', { code: 'a b', name: 'Gói test', minEngineCapacity: 100, maxEngineCapacity: 50, annualPremium: 100000, maxCompensation: 5000000, status: 'ACTIVE' }, staff);
  expect('TC-PR03', 'Tạo sản phẩm mã sai định dạng', r, 400, ['code']);
  const code = ('T' + uniq).toUpperCase().slice(0, 12);
  r = await api('POST', '/products', { code, name: 'Gói test', minEngineCapacity: 100, maxEngineCapacity: 50, annualPremium: 100000, maxCompensation: 5000000, status: 'ACTIVE' }, staff);
  expect('TC-PR04', 'Dung tích tối đa < tối thiểu', r, 400, ['maxEngineCapacity']);
  r = await api('POST', '/products', { code, name: 'Gói test', minEngineCapacity: 50, maxEngineCapacity: 100, annualPremium: 5000000, maxCompensation: 5000000, status: 'ACTIVE' }, staff);
  expect('TC-PR05', 'Mức bồi thường <= phí', r, 400, ['maxCompensation']);
  r = await api('POST', '/products', { code: 'tnds-50', name: 'Gói test', minEngineCapacity: 50, maxEngineCapacity: 100, annualPremium: 100000, maxCompensation: 5000000, status: 'ACTIVE' }, staff);
  expect('TC-PR06', 'Trùng mã sản phẩm (không phân biệt hoa thường)', r, 409, ['code']);
  r = await api('POST', '/products', { code, name: 'Gói test', minEngineCapacity: 50, maxEngineCapacity: 100, annualPremium: 100000, maxCompensation: 5000000, status: 'ACTIVE' }, cust);
  expect('TC-PR07', 'Khách hàng tạo sản phẩm', r, 403);
  r = await api('POST', '/products', { code: code.toLowerCase(), name: 'Gói test', minEngineCapacity: 50, maxEngineCapacity: 100, annualPremium: 100000, maxCompensation: 5000000, status: 'INACTIVE' }, staff);
  const prodTmp = expect('TC-PR08', 'Tạo sản phẩm hợp lệ (mã chuẩn hoá in hoa)', r, 201);
  check('TC-PR08b', 'Mã sản phẩm in hoa', prodTmp?.code === code, prodTmp);
  r = await api('PUT', `/products/${pTNDS50.id}`, { ...pTNDS50, code: 'TNDS-50X' }, staff);
  expect('TC-PR09', 'Đổi mã sản phẩm đã có hợp đồng', r, 422, ['code']);
  r = await api('DELETE', `/products/${pTNDS50P.id}`, undefined, staff);
  expect('TC-PR10', 'Xoá sản phẩm đã có hợp đồng', r, 409);
  r = await api('GET', '/products?status=INACTIVE&size=50', undefined, staff);
  check('TC-PR11', 'Nhân viên lọc sản phẩm ngừng bán', r.status === 200 && r.data.content.some((p) => p.id === prodTmp?.id), r.data);

  // ================================================================ CONTRACTS
  section('6. Hợp đồng');
  const baseContract = { vehicleId: veh1.id, productId: pCombo.id, startDate: day(0), termYears: 1 };
  r = await api('POST', '/contracts', { ...baseContract, startDate: day(-1) }, tCus);
  expect('TC-K01', 'Ngày bắt đầu trong quá khứ', r, 400, ['startDate']);
  r = await api('POST', '/contracts', { ...baseContract, startDate: day(61) }, tCus);
  expect('TC-K02', 'Ngày bắt đầu quá 60 ngày (theo cấu hình)', r, 400, ['startDate']);
  r = await api('POST', '/contracts', { ...baseContract, termYears: 4 }, tCus);
  expect('TC-K03', 'Thời hạn 4 năm', r, 400, ['termYears']);
  r = await api('POST', '/contracts', { ...baseContract, vehicleId: veh50.id, productId: pTNDS50P.id }, tCus);
  expect('TC-K04', 'Gói không áp dụng cho dung tích xe', r, 422, ['productId']);
  r = await api('POST', '/contracts', { ...baseContract, productId: prodTmp.id }, tCus);
  expect('TC-K05', 'Gói đã ngừng kinh doanh', r, 422, ['productId']);
  r = await api('POST', '/contracts', { ...baseContract, vehicleId: seedVehicles[0].id }, tCus);
  expect('TC-K06', 'Mua bảo hiểm cho xe của người khác', r, 422, ['vehicleId']);
  r = await api('POST', '/contracts', baseContract, staff);
  expect('TC-K07', 'Nhân viên tạo hợp đồng không chọn khách hàng', r, 400, ['customerId']);

  r = await api('POST', '/contracts', { ...baseContract, termYears: 2 }, tCus);
  const k1 = expect('TC-K08', 'Khách hàng tạo hợp đồng hợp lệ', r, 201);
  const k1c = k1?.contract;
  const expectedEnd = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 2); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  check('TC-K08b', 'Trạng thái chờ thanh toán, phí = phí năm x 2, hết hạn = bắt đầu + 2 năm - 1 ngày',
    k1c?.status === 'PENDING_PAYMENT' && Number(k1c?.premiumAmount) === Number(pCombo.annualPremium) * 2
    && k1c?.endDate === expectedEnd, k1c);
  check('TC-K08c', 'Sinh giao dịch phí chờ thanh toán', k1?.payments?.length === 1 && k1.payments[0].status === 'PENDING', k1?.payments);

  r = await api('POST', '/contracts', baseContract, tCus);
  expect('TC-K09', 'Trùng thời gian bảo hiểm cùng xe cùng gói', r, 409);
  r = await api('POST', `/contracts/${k1c.id}/renew`, { termYears: 1 }, tCus);
  expect('TC-K10', 'Gia hạn hợp đồng chưa thanh toán', r, 422);
  r = await api('POST', `/contracts/${k1c.id}/pay`, { method: 'CASH' }, tCus);
  expect('TC-K11', 'Khách hàng chọn thanh toán tiền mặt online', r, 422, ['method']);
  r = await api('POST', `/contracts/${k1c.id}/pay`, {}, tCus);
  expect('TC-K12', 'Thanh toán không chọn phương thức', r, 400, ['method']);

  r = await api('PUT', `/contracts/${k1c.id}`, { vehicleId: veh1.id, productId: pCombo.id, startDate: day(0), termYears: 3, note: 'Khách yêu cầu 3 năm' }, staff);
  const k1u = expect('TC-K13', 'Nhân viên sửa hợp đồng chờ thanh toán (đổi thời hạn)', r, 200);
  check('TC-K13b', 'Phí và giao dịch chờ thanh toán được tính lại',
    Number(k1u?.contract?.premiumAmount) === Number(pCombo.annualPremium) * 3
    && Number(k1u?.payments?.[0]?.amount) === Number(pCombo.annualPremium) * 3, k1u);
  r = await api('PUT', `/contracts/${k1c.id}`, { vehicleId: veh1.id, productId: pCombo.id, startDate: day(0), termYears: 3 }, tCus);
  expect('TC-K14', 'Khách hàng sửa hợp đồng (chỉ nhân viên)', r, 403);

  r = await api('POST', `/contracts/${k1c.id}/pay`, { method: 'E_WALLET' }, tCus);
  const k1p = expect('TC-K15', 'Thanh toán qua ví điện tử', r, 200);
  check('TC-K15b', 'Hợp đồng chuyển ACTIVE, giao dịch PAID', k1p?.contract?.status === 'ACTIVE'
    && k1p?.payments?.[0]?.status === 'PAID', k1p);
  r = await api('POST', `/contracts/${k1c.id}/pay`, { method: 'E_WALLET' }, tCus);
  expect('TC-K16', 'Thanh toán lại hợp đồng đã thanh toán', r, 422);
  r = await api('PUT', `/contracts/${k1c.id}`, { vehicleId: veh1.id, productId: pCombo.id, startDate: day(1), termYears: 3 }, staff);
  expect('TC-K17', 'Sửa ngày bắt đầu của hợp đồng đang hiệu lực', r, 422);
  r = await api('PUT', `/contracts/${k1c.id}`, { vehicleId: veh1.id, productId: pCombo.id, startDate: day(0), termYears: 3, note: 'Đã thu phí' }, staff);
  expect('TC-K18', 'Sửa ghi chú hợp đồng đang hiệu lực', r, 200);
  r = await api('POST', `/contracts/${k1c.id}/renew`, { termYears: 1 }, tCus);
  expect('TC-K19', 'Gia hạn quá sớm (ngoài cửa sổ 30 ngày)', r, 422);

  r = await api('GET', `/contracts/${k1c.id}`, undefined, cust);
  expect('TC-K20', 'Khách xem hợp đồng của người khác', r, 404);
  r = await api('GET', '/contracts?status=ACTIVE&size=100', undefined, tCus);
  check('TC-K21', 'Khách chỉ thấy hợp đồng của mình', r.status === 200 && r.data.content.every((c) => c.customerId === tCusId), r.data);
  r = await api('GET', '/contracts?status=DONE', undefined, tCus);
  expect('TC-K22', 'Lọc trạng thái hợp đồng không hợp lệ', r, 400, ['status']);

  // Gia hạn: dùng hợp đồng seed sắp hết hạn
  r = await api('GET', '/contracts?status=ACTIVE&size=100', undefined, cust);
  let renewable = null;
  for (const c of r.data.content) {
    const d = (await api('GET', `/contracts/${c.id}`, undefined, cust)).data;
    if (d.canRenew) { renewable = d; break; }
  }
  if (renewable) {
    const rc = renewable.contract;
    r = await api('POST', `/contracts/${rc.id}/renew`, { termYears: 1 }, cust);
    const renewed = expect('TC-K23', 'Gia hạn hợp đồng trong cửa sổ gia hạn', r, 201);
    const next = (() => { const d = new Date(rc.endDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
    check('TC-K23b', 'Hợp đồng mới bắt đầu ngay sau ngày hết hạn cũ và liên kết hợp đồng cũ',
      renewed?.contract?.startDate === next && renewed?.contract?.renewedFromId === rc.id, renewed?.contract);
    r = await api('POST', `/contracts/${rc.id}/renew`, { termYears: 1 }, cust);
    expect('TC-K24', 'Gia hạn lần 2 hợp đồng đã gia hạn', r, 422);
    r = await api('POST', `/contracts/${renewed.contract.id}/cancel`, { reason: 'ngắn' }, cust);
    expect('TC-K25', 'Huỷ với lý do quá ngắn', r, 400, ['reason']);
    r = await api('POST', `/contracts/${renewed.contract.id}/cancel`, { reason: 'Khách đổi ý, chưa muốn gia hạn lúc này' }, cust);
    const cancelled = expect('TC-K26', 'Huỷ hợp đồng chờ thanh toán', r, 200);
    check('TC-K26b', 'Giao dịch chờ thanh toán bị huỷ theo', cancelled?.contract?.status === 'CANCELLED'
      && cancelled?.payments?.[0]?.status === 'CANCELLED', cancelled);
    r = await api('GET', `/contracts/${rc.id}`, undefined, cust);
    check('TC-K27', 'Huỷ bản gia hạn -> hợp đồng cũ gia hạn lại được', r.data?.canRenew === true, r.data);
  } else {
    console.log('  SKIP TC-K23..K27 (không còn hợp đồng seed trong cửa sổ gia hạn)');
  }
  r = await api('GET', '/contracts?status=EXPIRED&size=100', undefined, cust);
  const expired = r.data.content[0];
  if (expired) {
    r = await api('POST', `/contracts/${expired.id}/renew`, { termYears: 1 }, cust);
    expect('TC-K28', 'Gia hạn hợp đồng hết hạn khi xe đang có hợp đồng cùng gói hiệu lực', r, 409);
  }
  r = await api('POST', `/contracts/${k1c.id}/cancel`, { reason: 'Bán xe nên không cần bảo hiểm nữa' }, tCus);
  const k1x = expect('TC-K29', 'Huỷ hợp đồng đang hiệu lực -> hoàn phí', r, 200);
  const refund = k1x?.payments?.find((p) => p.type === 'REFUND');
  check('TC-K29b', 'Hoàn 80% phí (làm tròn nghìn) cho thời gian còn lại', !!refund
    && Number(refund.amount) === Math.floor(Number(k1x.contract.premiumAmount) * 0.8 / 1000) * 1000, k1x?.payments);
  r = await api('POST', `/contracts/${k1c.id}/cancel`, { reason: 'Huỷ lại lần nữa để kiểm thử' }, tCus);
  expect('TC-K30', 'Huỷ hợp đồng đã huỷ', r, 422);
  r = await api('PUT', `/contracts/${k1c.id}`, { vehicleId: veh1.id, productId: pCombo.id, startDate: day(0), termYears: 3 }, staff);
  expect('TC-K31', 'Sửa hợp đồng đã huỷ', r, 422);
  r = await api('DELETE', `/vehicles/${veh1.id}`, undefined, tCus);
  expect('TC-V14', 'Xoá xe đã có hợp đồng', r, 409);
  r = await api('PUT', `/vehicles/${veh1.id}`, { ...v1, engineCapacity: 150 }, tCus);
  expect('TC-V15', 'Sửa dung tích xe đã có hợp đồng', r, 422, ['engineCapacity']);
  r = await api('PUT', `/vehicles/${veh1.id}`, { ...v1, color: 'Trắng ngọc trai' }, tCus);
  expect('TC-V16', 'Sửa màu xe đã có hợp đồng', r, 200);

  // Hợp đồng cho phần tai nạn / bồi thường (nhân viên tạo cho khách, thu tiền mặt)
  r = await api('POST', '/contracts', { customerId: tCusId, vehicleId: veh1.id, productId: pVCX.id, startDate: day(0), termYears: 1 }, staff);
  const k2 = expect('TC-K32', 'Nhân viên tạo hợp đồng cho khách', r, 201)?.contract;
  r = await api('POST', `/contracts/${k2.id}/pay`, { method: 'CASH' }, staff);
  expect('TC-K33', 'Nhân viên thu tiền mặt tại quầy', r, 200);
  r = await api('POST', '/contracts', { customerId: tCusId, vehicleId: veh50.id, productId: pTNDS50.id, startDate: day(10), termYears: 1 }, staff);
  const kPending = r.data?.contract;

  // ================================================================ ACCIDENTS
  section('7. Tai nạn');
  const acc = { contractId: k2.id, accidentTime: dateTime(0, 0, 5), location: 'Ngã tư Phú Nhuận, TP. HCM',
    description: 'Va chạm với xe máy khác khi rẽ trái, xe bị móp yếm và vỡ đèn pha.', damageType: 'PROPERTY', estimatedDamage: 5000000 };
  r = await api('POST', '/accidents', { ...acc, accidentTime: dateTime(1) }, tCus);
  expect('TC-T01', 'Thời điểm tai nạn ở tương lai', r, 400, ['accidentTime']);
  r = await api('POST', '/accidents', { ...acc, accidentTime: dateTime(-1) }, tCus);
  expect('TC-T02', 'Tai nạn trước ngày hợp đồng có hiệu lực', r, 422, ['accidentTime']);
  r = await api('POST', '/accidents', { ...acc, contractId: kPending.id }, tCus);
  expect('TC-T03', 'Khai báo tai nạn cho hợp đồng chưa thanh toán', r, 422, ['contractId']);
  r = await api('POST', '/accidents', { ...acc, description: 'ngắn', location: 'abc', estimatedDamage: -1, damageType: 'FIRE' }, tCus);
  expect('TC-T04', 'Khai báo tai nạn: loại thiệt hại sai', r, 400, ['damageType']);
  r = await api('POST', '/accidents', { ...acc, description: 'ngắn', location: 'abc', estimatedDamage: -1 }, tCus);
  expect('TC-T05', 'Khai báo tai nạn: mô tả/địa điểm/thiệt hại sai', r, 400, ['description', 'location', 'estimatedDamage']);
  if (expired) {
    r = await api('POST', '/accidents', { ...acc, contractId: expired.id }, tCus);
    expect('TC-T06', 'Khai báo tai nạn trên hợp đồng của người khác', r, 404);
  }
  r = await api('POST', '/accidents', acc, tCus);
  const a1 = expect('TC-T07', 'Khách khai báo tai nạn hợp lệ', r, 201);
  r = await api('PUT', `/accidents/${a1.id}`, { ...acc, estimatedDamage: 6000000 }, tCus);
  expect('TC-T08', 'Sửa tai nạn khi đang chờ xử lý', r, 200);
  r = await api('POST', `/accidents/${a1.id}/resolve`, { status: 'VERIFIED' }, tCus);
  expect('TC-T09', 'Khách tự xác minh tai nạn', r, 403);
  r = await api('POST', `/accidents/${a1.id}/resolve`, { status: 'REJECTED', note: 'ngắn' }, staff);
  expect('TC-T10', 'Bác bỏ tai nạn không ghi đủ lý do', r, 400, ['note']);
  r = await api('POST', `/accidents/${a1.id}/resolve`, { status: 'REPORTED' }, staff);
  expect('TC-T11', 'Kết quả xử lý không hợp lệ (REPORTED)', r, 400, ['status']);

  // ================================================================ COMPENSATIONS
  section('8. Bồi thường');
  r = await api('POST', '/compensations', { requestedAmount: 1000000, description: 'Yêu cầu bồi thường chi phí sửa xe sau va chạm.' }, tCus);
  expect('TC-B01', 'Không chọn tai nạn nào', r, 400, ['accidentId']);
  r = await api('POST', '/compensations', { accidentId: a1.id, accident: acc, requestedAmount: 1000000, description: 'Yêu cầu bồi thường chi phí sửa xe sau va chạm.' }, tCus);
  expect('TC-B02', 'Chọn cả tai nạn cũ và khai báo mới', r, 400, ['accidentId']);
  r = await api('POST', '/compensations', { accidentId: a1.id, requestedAmount: 7000000, description: 'Yêu cầu bồi thường chi phí sửa xe sau va chạm.' }, tCus);
  expect('TC-B03', 'Số tiền yêu cầu > thiệt hại ước tính', r, 422, ['requestedAmount']);
  r = await api('POST', '/compensations', { accidentId: a1.id, requestedAmount: 5000, description: 'ngắn' }, tCus);
  expect('TC-B04', 'Số tiền < 10.000 và nội dung quá ngắn', r, 400, ['requestedAmount', 'description']);
  r = await api('POST', '/compensations', { accident: { ...acc, estimatedDamage: 60000000 }, requestedAmount: 55000000, description: 'Xe bị hư hỏng nặng, đề nghị bồi thường gần như toàn bộ.' }, tCus);
  expect('TC-B05', 'Số tiền yêu cầu > hạn mức bồi thường của hợp đồng (50 triệu)', r, 422, ['requestedAmount']);
  r = await api('POST', '/compensations', { accident: { ...acc, accidentTime: dateTime(1) }, requestedAmount: 1000000, description: 'Yêu cầu bồi thường chi phí sửa xe sau va chạm.' }, tCus);
  expect('TC-B06', 'Khai báo tai nạn mới kèm yêu cầu: lỗi gắn đúng trường lồng nhau', r, 400, ['accident.accidentTime']);

  r = await api('POST', '/compensations', { accidentId: a1.id, requestedAmount: 4500000, description: 'Đề nghị bồi thường chi phí thay yếm và đèn pha theo báo giá.' }, tCus);
  const cl1 = expect('TC-B07', 'Yêu cầu bồi thường cho tai nạn đã khai báo', r, 201);
  r = await api('POST', '/compensations', { accidentId: a1.id, requestedAmount: 1000000, description: 'Gửi trùng yêu cầu bồi thường cho cùng tai nạn.' }, tCus);
  expect('TC-B08', 'Gửi trùng yêu cầu cho cùng tai nạn', r, 409);
  r = await api('POST', `/contracts/${k2.id}/cancel`, { reason: 'Muốn huỷ khi đang chờ bồi thường' }, tCus);
  expect('TC-K34', 'Huỷ hợp đồng khi đang có yêu cầu bồi thường chờ xử lý', r, 422);
  r = await api('DELETE', `/accidents/${a1.id}`, undefined, tCus);
  expect('TC-T12', 'Xoá tai nạn đã có yêu cầu bồi thường', r, 409);

  r = await api('POST', `/compensations/${cl1.id}/approve`, { approvedAmount: 4000000 }, staff);
  expect('TC-B09', 'Duyệt bồi thường khi tai nạn chưa được xác minh', r, 422);
  r = await api('POST', `/accidents/${a1.id}/resolve`, { status: 'VERIFIED', note: 'Đã đối chiếu biên bản' }, staff);
  expect('TC-T13', 'Nhân viên xác minh tai nạn', r, 200);
  r = await api('POST', `/accidents/${a1.id}/resolve`, { status: 'VERIFIED' }, staff);
  expect('TC-T14', 'Xử lý lại tai nạn đã xử lý', r, 422);
  r = await api('PUT', `/accidents/${a1.id}`, acc, tCus);
  expect('TC-T15', 'Sửa tai nạn đã xử lý', r, 422);
  r = await api('POST', `/compensations/${cl1.id}/approve`, { approvedAmount: 4600000 }, staff);
  expect('TC-B10', 'Duyệt số tiền > số tiền yêu cầu', r, 400, ['approvedAmount']);
  r = await api('POST', `/compensations/${cl1.id}/approve`, { approvedAmount: 4000000, note: 'Trừ 10% khấu hao' }, cust);
  expect('TC-B11', 'Khách hàng tự duyệt bồi thường', r, 403);
  r = await api('POST', `/compensations/${cl1.id}/payout`, { method: 'CASH' }, staff);
  expect('TC-B12', 'Chi trả khi chưa duyệt', r, 422);
  r = await api('POST', `/compensations/${cl1.id}/approve`, { approvedAmount: 4000000, note: 'Trừ 10% khấu hao' }, staff);
  const cl1a = expect('TC-B13', 'Duyệt bồi thường', r, 200);
  check('TC-B13b', 'Trạng thái APPROVED, số tiền duyệt 4.000.000', cl1a?.status === 'APPROVED' && Number(cl1a?.approvedAmount) === 4000000, cl1a);
  r = await api('POST', `/compensations/${cl1.id}/reject`, { note: 'Từ chối sau khi đã duyệt' }, staff);
  expect('TC-B14', 'Từ chối yêu cầu đã duyệt', r, 422);
  r = await api('POST', `/compensations/${cl1.id}/payout`, { method: 'CARD' }, staff);
  expect('TC-B15', 'Chi trả qua thẻ (không hỗ trợ)', r, 400, ['method']);
  r = await api('POST', `/compensations/${cl1.id}/payout`, { method: 'BANK_TRANSFER' }, staff);
  expect('TC-B16', 'Chi trả bồi thường qua chuyển khoản', r, 200);
  r = await api('GET', `/contracts/${k2.id}`, undefined, tCus);
  check('TC-B17', 'Hạn mức còn lại = 50tr - 4tr; có giao dịch COMPENSATION',
    Number(r.data?.remainingCompensation) === 46000000 && r.data?.payments?.some((p) => p.type === 'COMPENSATION'), r.data);
  r = await api('POST', '/compensations', { accident: { ...acc, estimatedDamage: 50000000 }, requestedAmount: 47000000, description: 'Tai nạn lần hai, xe hư hỏng nặng phần đầu và khung.' }, tCus);
  expect('TC-B18', 'Yêu cầu vượt hạn mức còn lại (46 triệu)', r, 422, ['requestedAmount']);

  r = await api('POST', '/compensations', { accident: { ...acc, accidentTime: dateTime(0, 0, 10), estimatedDamage: 2000000 }, requestedAmount: 2000000, description: 'Khai báo tai nạn mới và yêu cầu bồi thường cùng lúc.' }, tCus);
  const cl2 = expect('TC-B19', 'Khai báo tai nạn mới kèm yêu cầu bồi thường', r, 201);
  r = await api('POST', `/compensations/${cl2.id}/reject`, { note: 'ngắn' }, staff);
  expect('TC-B20', 'Từ chối không đủ lý do', r, 400, ['note']);
  r = await api('POST', `/accidents/${cl2.accidentId}/resolve`, { status: 'REJECTED', note: 'Không có biên bản hiện trường, thông tin mâu thuẫn' }, staff);
  expect('TC-T16', 'Bác bỏ tai nạn', r, 200);
  r = await api('GET', `/compensations/${cl2.id}`, undefined, tCus);
  check('TC-B21', 'Yêu cầu bồi thường chờ xử lý tự động bị từ chối theo', r.data?.status === 'REJECTED', r.data);
  r = await api('POST', '/compensations', { accidentId: cl2.accidentId, requestedAmount: 1000000, description: 'Gửi lại yêu cầu cho tai nạn đã bị bác bỏ.' }, tCus);
  expect('TC-B22', 'Yêu cầu bồi thường cho tai nạn đã bị bác bỏ', r, 422, ['accidentId']);
  r = await api('GET', `/compensations/${cl1.id}`, undefined, cust);
  expect('TC-B23', 'Khách xem yêu cầu bồi thường của người khác', r, 404);

  const a3 = (await api('POST', '/accidents', { ...acc, accidentTime: dateTime(0, 0, 15) }, tCus)).data;
  r = await api('DELETE', `/accidents/${a3.id}`, undefined, tCus);
  expect('TC-T17', 'Xoá tai nạn chờ xử lý chưa có yêu cầu bồi thường', r, 204);

  r = await api('POST', `/contracts/${k2.id}/cancel`, { reason: 'Huỷ sau khi đã nhận bồi thường' }, tCus);
  const k2x = expect('TC-K35', 'Huỷ hợp đồng đã phát sinh bồi thường', r, 200);
  check('TC-K35b', 'Không hoàn phí khi hợp đồng đã phát sinh bồi thường', !k2x?.payments?.some((p) => p.type === 'REFUND'), k2x?.payments);

  // ================================================================ PUNISHMENTS
  section('9. Biên bản phạt');
  const pun = { customerId: tCusId, violationType: 'FALSE_DECLARATION', description: 'Kê khai sai thông tin xe khi mua bảo hiểm.', violationDate: day(-2), amount: 300000 };
  r = await api('POST', '/punishments', { ...pun, violationDate: day(1), amount: 5000 }, staff);
  expect('TC-F01', 'Ngày vi phạm tương lai, số tiền < 10.000', r, 400, ['violationDate', 'amount']);
  r = await api('POST', '/punishments', { ...pun, violationType: 'SPEEDING' }, staff);
  expect('TC-F02', 'Loại vi phạm không hợp lệ', r, 400, ['violationType']);
  r = await api('POST', '/punishments', { ...pun, contractId: expired ? expired.id : 1 }, staff);
  expect('TC-F03', 'Hợp đồng không thuộc khách hàng', r, 422, ['contractId']);
  r = await api('POST', '/punishments', { ...pun, dueDate: day(-3) }, staff);
  expect('TC-F04', 'Hạn nộp trước ngày vi phạm', r, 400, ['dueDate']);
  r = await api('POST', '/punishments', pun, tCus);
  expect('TC-F05', 'Khách hàng tự lập biên bản phạt', r, 403);
  r = await api('POST', '/punishments', { ...pun, contractId: k2.id }, staff);
  const p1 = expect('TC-F06', 'Lập biên bản phạt hợp lệ', r, 201);
  check('TC-F06b', 'Hạn nộp mặc định = ngày vi phạm + 30 ngày', p1?.dueDate === day(28), p1);
  r = await api('PUT', `/punishments/${p1.id}`, { ...pun, customerId: seedCustomerId }, staff);
  expect('TC-F07', 'Đổi khách hàng của biên bản', r, 422, ['customerId']);
  r = await api('PUT', `/punishments/${p1.id}`, { ...pun, amount: 250000, dueDate: day(20) }, staff);
  expect('TC-F08', 'Sửa biên bản chưa nộp', r, 200);
  r = await api('POST', `/punishments/${p1.id}/pay`, { method: 'CASH' }, tCus);
  expect('TC-F09', 'Khách nộp phạt tiền mặt online', r, 422, ['method']);
  r = await api('POST', `/punishments/${p1.id}/pay`, { method: 'BANK_TRANSFER' }, tCus);
  const p1p = expect('TC-F10', 'Khách nộp phạt chuyển khoản', r, 200);
  check('TC-F10b', 'Trạng thái PAID', p1p?.status === 'PAID', p1p);
  r = await api('POST', `/punishments/${p1.id}/pay`, { method: 'BANK_TRANSFER' }, tCus);
  expect('TC-F11', 'Nộp phạt lần 2', r, 422);
  r = await api('DELETE', `/punishments/${p1.id}`, undefined, staff);
  expect('TC-F12', 'Xoá biên bản đã nộp', r, 422);
  const p2 = (await api('POST', '/punishments', pun, staff)).data;
  r = await api('POST', `/punishments/${p2.id}/waive`, { note: 'ngắn' }, staff);
  expect('TC-F13', 'Miễn phạt không đủ lý do', r, 400, ['note']);
  r = await api('POST', `/punishments/${p2.id}/waive`, { note: 'Khách đã bổ sung giấy tờ đầy đủ, miễn phạt' }, staff);
  expect('TC-F14', 'Miễn phạt', r, 200);
  const p3 = (await api('POST', '/punishments', pun, staff)).data;
  r = await api('DELETE', `/punishments/${p3.id}`, undefined, staff);
  expect('TC-F15', 'Xoá biên bản lập nhầm (chưa nộp)', r, 204);

  // ================================================================ PAYMENTS
  section('10. Lịch sử giao dịch');
  r = await api('GET', '/payments?size=100', undefined, tCus);
  const pays = r.data?.content || [];
  check('TC-M01', 'Khách chỉ thấy giao dịch của mình', r.status === 200 && pays.every((p) => p.customerId === tCusId), r.data);
  check('TC-M02', 'Đủ các loại giao dịch: PREMIUM, REFUND, COMPENSATION, PENALTY',
    ['PREMIUM', 'REFUND', 'COMPENSATION', 'PENALTY'].every((t) => pays.some((p) => p.type === t)), pays.map((p) => p.type));
  r = await api('GET', '/payments?type=REFUND', undefined, tCus);
  check('TC-M03', 'Lọc theo loại giao dịch', r.status === 200 && r.data.content.every((p) => p.type === 'REFUND'), r.data);
  r = await api('GET', `/payments?customerId=${seedCustomerId}`, undefined, tCus);
  check('TC-M04', 'Khách không xem được giao dịch người khác (bỏ qua customerId)', r.data.content.every((p) => p.customerId === tCusId), r.data);

  // ================================================================ SETTINGS & DASHBOARD
  section('11. Cấu hình & Dashboard');
  r = await api('PUT', '/settings/RENEWAL_WINDOW_DAYS', { value: 500 }, staff);
  expect('TC-S01', 'Cấu hình vượt khoảng cho phép', r, 400, ['value']);
  r = await api('PUT', '/settings/KHONG_TON_TAI', { value: 5 }, staff);
  expect('TC-S02', 'Cấu hình không tồn tại', r, 404);
  r = await api('PUT', '/settings/RENEWAL_WINDOW_DAYS', { value: 30 }, cust);
  expect('TC-S03', 'Khách hàng sửa cấu hình', r, 403);
  r = await api('PUT', '/settings/MAX_START_DATE_ADVANCE_DAYS', { value: 90 }, staff);
  expect('TC-S04', 'Sửa cấu hình hợp lệ', r, 200);
  r = await api('POST', '/contracts', { customerId: tCusId, vehicleId: veh50.id, productId: pCombo.id, startDate: day(80), termYears: 1 }, staff);
  expect('TC-S05', 'Cấu hình mới có hiệu lực ngay (ngày bắt đầu +80 ngày hợp lệ)', r, 201);
  await api('PUT', '/settings/MAX_START_DATE_ADVANCE_DAYS', { value: 60 }, staff);

  r = await api('GET', '/dashboard/customer', undefined, cust);
  check('TC-D01', 'Dashboard khách hàng', r.status === 200 && typeof r.data.activeContracts === 'number', r.data);
  r = await api('GET', '/dashboard/staff', undefined, staff);
  check('TC-D02', 'Dashboard nhân viên', r.status === 200 && typeof r.data.pendingClaims === 'number', r.data);
  r = await api('GET', '/dashboard/staff', undefined, cust);
  expect('TC-D03', 'Khách xem dashboard nhân viên', r, 403);

  // ================================================================ REQUEST FORMAT
  section('12. Định dạng request');
  r = await api('POST', '/auth/login', '{"email": "a@b.com", ');
  expect('TC-E01', 'JSON sai cú pháp', r, 400);
  r = await api('POST', '/contracts', { vehicleId: 'abc', productId: 1, startDate: day(0), termYears: 1 }, tCus);
  expect('TC-E02', 'Sai kiểu dữ liệu (vehicleId là chữ)', r, 400, ['vehicleId']);
  r = await api('GET', '/contracts/abc', undefined, tCus);
  expect('TC-E03', 'Path variable sai kiểu', r, 400);
  r = await api('GET', '/khong-ton-tai', undefined, tCus);
  expect('TC-E04', 'Endpoint không tồn tại', r, 404);
  r = await api('POST', '/vehicles', { ...newVehiclePayload(), brand: '   ' }, tCus);
  expect('TC-E05', 'Chuỗi chỉ có khoảng trắng coi như bỏ trống', r, 400, ['brand']);

  // ------------------------------------------------------------------ summary
  console.log(`\n\x1b[1mKết quả: ${passed} PASS, ${failed} FAIL\x1b[0m`);
  if (failed) {
    console.log('Các case lỗi:\n - ' + failures.join('\n - '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
