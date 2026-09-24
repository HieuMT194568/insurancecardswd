/** Lấy thông báo lỗi dễ hiểu từ lỗi axios. */
export function errorMessage(err, fallback = 'Có lỗi xảy ra, vui lòng thử lại') {
  if (!err?.response) return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.';
  return err.response.data?.message || fallback;
}

/**
 * Gắn lỗi từng trường (fieldErrors) từ backend vào react-hook-form.
 * @returns thông báo chung của lỗi
 */
export function applyServerErrors(err, setError) {
  const fieldErrors = err?.response?.data?.fieldErrors || {};
  Object.entries(fieldErrors).forEach(([field, message], idx) => {
    setError(field, { type: 'server', message }, { shouldFocus: idx === 0 });
  });
  return errorMessage(err);
}

/** Lấy lỗi của trường lồng nhau, vd "accident.accidentTime". */
export function getFieldError(errors, name) {
  return name.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), errors);
}
