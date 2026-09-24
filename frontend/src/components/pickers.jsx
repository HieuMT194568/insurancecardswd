import { useEffect, useState } from 'react';
import { Button, Card, Form, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { contractApi, customerApi } from '../api/services';
import { date } from '../utils/format';
import { StatusBadge } from './ui';

function useSearch(fetcher, enabled) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setItems(await fetcher(q.trim()));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return { q, setQ, items, loading };
}

/** Chọn khách hàng (nhân viên): tìm theo tên, email, SĐT, CCCD, mã KH. */
export function CustomerPicker({ value, onChange, error, label = 'Khách hàng', required = true, disabled }) {
  const { q, setQ, items, loading } = useSearch(
    (keyword) => customerApi.search({ q: keyword, status: 'ACTIVE', size: 8 }).then((r) => r.content),
    !value,
  );
  return (
    <Form.Group className="mb-3">
      <Form.Label><span className={required ? 'required' : ''}>{label}</span></Form.Label>
      {value ? (
        <Card body className="py-0 border-primary-subtle">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{value.fullName} <span className="text-muted small">({value.customerCode})</span></div>
              <div className="small text-muted">{value.phone} · {value.email} · CCCD {value.idNumber}</div>
            </div>
            {!disabled && <Button size="sm" variant="outline-secondary" onClick={() => onChange(null)}>Đổi</Button>}
          </div>
        </Card>
      ) : (
        <>
          <InputGroup hasValidation>
            <InputGroup.Text><i className="bi bi-person-search" /></InputGroup.Text>
            <Form.Control placeholder="Nhập tên, SĐT, email, CCCD hoặc mã KH..." value={q} maxLength={100}
              onChange={(e) => setQ(e.target.value)} isInvalid={!!error} />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </InputGroup>
          <ListGroup className="picker-results mt-1">
            {loading && <ListGroup.Item className="text-muted small"><Spinner size="sm" /> Đang tìm...</ListGroup.Item>}
            {!loading && items.length === 0 && <ListGroup.Item className="text-muted small">Không tìm thấy khách hàng đang hoạt động</ListGroup.Item>}
            {!loading && items.map((c) => (
              <ListGroup.Item key={c.id} action onClick={() => onChange(c)}>
                <div className="fw-medium">{c.fullName} <span className="text-muted small">({c.customerCode})</span></div>
                <div className="small text-muted">{c.phone} · {c.email}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </Form.Group>
  );
}

/** Chọn hợp đồng: tìm theo số HĐ, biển số, tên khách. statuses: lọc trạng thái hợp lệ. */
export function ContractPicker({ value, onChange, error, statuses = ['ACTIVE', 'EXPIRED'], customerId, label = 'Hợp đồng', required = true }) {
  const { q, setQ, items, loading } = useSearch(
    (keyword) => contractApi.search({ q: keyword, customerId, size: 20 })
      .then((r) => r.content.filter((c) => statuses.includes(c.status))),
    !value,
  );
  return (
    <Form.Group className="mb-3">
      <Form.Label><span className={required ? 'required' : ''}>{label}</span></Form.Label>
      {value ? (
        <Card body className="py-0 border-primary-subtle">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{value.contractNumber} <StatusBadge type="contract" value={value.status} /></div>
              <div className="small text-muted">
                {value.licensePlate} · {value.productName} · {date(value.startDate)} - {date(value.endDate)}
              </div>
            </div>
            <Button size="sm" variant="outline-secondary" onClick={() => onChange(null)}>Đổi</Button>
          </div>
        </Card>
      ) : (
        <>
          <InputGroup hasValidation>
            <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
            <Form.Control placeholder="Nhập số hợp đồng, biển số xe hoặc tên khách hàng..." value={q} maxLength={100}
              onChange={(e) => setQ(e.target.value)} isInvalid={!!error} />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </InputGroup>
          <ListGroup className="picker-results mt-1">
            {loading && <ListGroup.Item className="text-muted small"><Spinner size="sm" /> Đang tìm...</ListGroup.Item>}
            {!loading && items.length === 0 && <ListGroup.Item className="text-muted small">Không có hợp đồng phù hợp (chỉ hợp đồng đang hiệu lực hoặc đã hết hạn)</ListGroup.Item>}
            {!loading && items.map((c) => (
              <ListGroup.Item key={c.id} action onClick={() => onChange(c)}>
                <div className="fw-medium">{c.contractNumber} <StatusBadge type="contract" value={c.status} /></div>
                <div className="small text-muted">{c.customerName} · {c.licensePlate} · {c.productName} · {date(c.startDate)} - {date(c.endDate)}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </Form.Group>
  );
}
