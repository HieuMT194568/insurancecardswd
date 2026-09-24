import client from './client';

const data = (p) => p.then((r) => r.data);

/** Bỏ các tham số rỗng khỏi query string. */
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const authApi = {
  login: (body) => data(client.post('/auth/login', body)),
  register: (body) => data(client.post('/auth/register', body)),
  verifyEmail: (token) => data(client.post('/auth/verify-email', { token })),
  resendVerification: (email) => data(client.post('/auth/resend-verification', { email })),
  forgotPassword: (email) => data(client.post('/auth/forgot-password', { email })),
  resetPassword: (body) => data(client.post('/auth/reset-password', body)),
};

export const meApi = {
  get: () => data(client.get('/me')),
  updateProfile: (body) => data(client.put('/me/profile', body)),
  updateStaffProfile: (body) => data(client.put('/me/staff-profile', body)),
  changePassword: (body) => data(client.post('/me/change-password', body)),
  customerDashboard: () => data(client.get('/dashboard/customer')),
  staffDashboard: () => data(client.get('/dashboard/staff')),
};

export const customerApi = {
  search: (params) => data(client.get('/customers', { params: clean(params) })),
  get: (id) => data(client.get(`/customers/${id}`)),
  create: (body) => data(client.post('/customers', body)),
  update: (id, body) => data(client.put(`/customers/${id}`, body)),
  setStatus: (id, status) => data(client.patch(`/customers/${id}/status`, { status })),
  setPassword: (id, body) => data(client.post(`/customers/${id}/set-password`, body)),
  remove: (id) => data(client.delete(`/customers/${id}`)),
};

export const vehicleApi = {
  search: (params) => data(client.get('/vehicles', { params: clean(params) })),
  get: (id) => data(client.get(`/vehicles/${id}`)),
  create: (body) => data(client.post('/vehicles', body)),
  update: (id, body) => data(client.put(`/vehicles/${id}`, body)),
  remove: (id) => data(client.delete(`/vehicles/${id}`)),
};

export const productApi = {
  listActive: () => data(client.get('/products/public')),
  search: (params) => data(client.get('/products', { params: clean(params) })),
  create: (body) => data(client.post('/products', body)),
  update: (id, body) => data(client.put(`/products/${id}`, body)),
  remove: (id) => data(client.delete(`/products/${id}`)),
};

export const contractApi = {
  search: (params) => data(client.get('/contracts', { params: clean(params) })),
  get: (id) => data(client.get(`/contracts/${id}`)),
  create: (body) => data(client.post('/contracts', body)),
  update: (id, body) => data(client.put(`/contracts/${id}`, body)),
  pay: (id, method) => data(client.post(`/contracts/${id}/pay`, { method })),
  renew: (id, termYears) => data(client.post(`/contracts/${id}/renew`, { termYears })),
  cancel: (id, reason) => data(client.post(`/contracts/${id}/cancel`, { reason })),
};

export const paymentApi = {
  search: (params) => data(client.get('/payments', { params: clean(params) })),
};

export const accidentApi = {
  search: (params) => data(client.get('/accidents', { params: clean(params) })),
  get: (id) => data(client.get(`/accidents/${id}`)),
  create: (body) => data(client.post('/accidents', body)),
  update: (id, body) => data(client.put(`/accidents/${id}`, body)),
  resolve: (id, body) => data(client.post(`/accidents/${id}/resolve`, body)),
  remove: (id) => data(client.delete(`/accidents/${id}`)),
};

export const compensationApi = {
  search: (params) => data(client.get('/compensations', { params: clean(params) })),
  get: (id) => data(client.get(`/compensations/${id}`)),
  create: (body) => data(client.post('/compensations', body)),
  approve: (id, body) => data(client.post(`/compensations/${id}/approve`, body)),
  reject: (id, note) => data(client.post(`/compensations/${id}/reject`, { note })),
  payout: (id, method) => data(client.post(`/compensations/${id}/payout`, { method })),
};

export const punishmentApi = {
  search: (params) => data(client.get('/punishments', { params: clean(params) })),
  create: (body) => data(client.post('/punishments', body)),
  update: (id, body) => data(client.put(`/punishments/${id}`, body)),
  remove: (id) => data(client.delete(`/punishments/${id}`)),
  pay: (id, method) => data(client.post(`/punishments/${id}/pay`, { method })),
  waive: (id, note) => data(client.post(`/punishments/${id}/waive`, { note })),
};

export const settingApi = {
  list: () => data(client.get('/settings')),
  update: (key, value) => data(client.put(`/settings/${key}`, { value })),
};
