import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, InputGroup, Modal, Pagination, Spinner } from 'react-bootstrap';
import { LABELS } from '../utils/format';

export function StatusBadge({ type, value }) {
  const [label, variant] = LABELS[type]?.[value] || [value, 'secondary'];
  return <Badge bg={variant} text={variant === 'warning' || variant === 'info' ? 'dark' : undefined}>{label}</Badge>;
}

export function PageHeader({ title, subtitle, children, icon }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <h4 className="mb-0">{icon && <i className={`bi ${icon} me-2 text-primary`} />}{title}</h4>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
      <div className="d-flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Loading({ text = 'Đang tải...' }) {
  return (
    <div className="text-center text-muted py-5">
      <Spinner animation="border" size="sm" className="me-2" />{text}
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'Không có dữ liệu' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted py-4">
        <i className="bi bi-inbox me-2" />{text}
      </td>
    </tr>
  );
}

/** Ô tìm kiếm có debounce 400ms. */
export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...', maxLength = 100 }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => {
    const t = setTimeout(() => { if (text !== (value || '')) onChange(text.trim()); }, 400);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <InputGroup>
      <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
      <Form.Control value={text} maxLength={maxLength} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      {text && (
        <Button variant="outline-secondary" onClick={() => setText('')} aria-label="Xoá tìm kiếm">
          <i className="bi bi-x-lg" />
        </Button>
      )}
    </InputGroup>
  );
}

export function Paging({ data, onChange }) {
  if (!data || data.totalElements === 0) return null;
  const { page, totalPages, totalElements, size, content } = data;
  const from = page * size + 1;
  const to = page * size + content.length;
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <small className="text-muted">Hiển thị {from}-{to} / {totalElements} bản ghi</small>
      {totalPages > 1 && (
        <Pagination size="sm" className="mb-0">
          <Pagination.First disabled={page === 0} onClick={() => onChange(0)} />
          <Pagination.Prev disabled={page === 0} onClick={() => onChange(page - 1)} />
          {pages.map((p) => (
            <Pagination.Item key={p} active={p === page} onClick={() => onChange(p)}>{p + 1}</Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} />
          <Pagination.Last disabled={page >= totalPages - 1} onClick={() => onChange(totalPages - 1)} />
        </Pagination>
      )}
    </div>
  );
}

export function StatCard({ icon, label, value, variant = 'primary', footer }) {
  return (
    <Card className="stat-card h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div className={`stat-icon bg-${variant}-subtle text-${variant}`}><i className={`bi ${icon}`} /></div>
        <div className="min-w-0">
          <div className="text-muted small">{label}</div>
          <div className="fs-4 fw-semibold text-truncate">{value}</div>
          {footer && <div className="small">{footer}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

export function InfoItem({ label, children, className = 'col-sm-6 col-lg-4 mb-3' }) {
  return (
    <div className={className}>
      <div className="info-label">{label}</div>
      <div className="fw-medium text-break">{children ?? '—'}</div>
    </div>
  );
}

/** Hộp thoại xác nhận thao tác không hoàn tác được (xoá, khoá...). */
export function ConfirmModal({ show, title, children, confirmText = 'Xác nhận', variant = 'danger', onConfirm, onHide, busy }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title as="h5">{title}</Modal.Title></Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={busy}>Huỷ bỏ</Button>
        <Button variant={variant} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner size="sm" className="me-2" />}{confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export function SubmitButton({ busy, children, variant = 'primary', ...props }) {
  return (
    <Button type="submit" variant={variant} disabled={busy} {...props}>
      {busy && <Spinner size="sm" className="me-2" />}{children}
    </Button>
  );
}
