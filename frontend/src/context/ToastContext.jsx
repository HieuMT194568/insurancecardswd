import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const ToastContext = createContext(null);
let seq = 0;

const ICONS = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((message, variant = 'success') => {
    const id = ++seq;
    setToasts((list) => [...list, { id, message, variant }]);
  }, []);

  const api = useMemo(() => ({
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'danger'),
    warning: (m) => show(m, 'warning'),
    info: (m) => show(m, 'info'),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 2000 }}>
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant} onClose={() => remove(t.id)} delay={t.variant === 'danger' ? 6000 : 3500} autohide>
            <Toast.Body className="text-white d-flex align-items-start gap-2">
              <i className={`bi ${ICONS[t.variant]} mt-1`} />
              <span className="flex-grow-1">{t.message}</span>
              <button type="button" className="btn-close btn-close-white" onClick={() => remove(t.id)} aria-label="Đóng" />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
