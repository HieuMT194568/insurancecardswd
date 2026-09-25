import { Alert, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { paymentApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { usePaged } from '../../hooks/usePaged';
import { EmptyRow, Loading, PageHeader, Paging, SearchBox, StatusBadge } from '../../components/ui';
import { LABELS, PAYMENT_METHODS, dateTime, money } from '../../utils/format';

/** Tiền khách trả (+) hay nhận về (-) nhìn từ phía khách hàng. */
const SIGN = { PREMIUM: '-', PENALTY: '-', REFUND: '+', COMPENSATION: '+' };

export default function PaymentsPage() {
  const { isStaff, basePath } = useAuth();
  const paged = usePaged(paymentApi.search, { q: '', type: '', status: '' });
  const { data, loading } = paged;

  return (
    <>
      <PageHeader title={isStaff ? 'Giao dịch' : 'Lịch sử thanh toán'} icon="bi-credit-card"
        subtitle="Thu phí, hoàn phí, nộp phạt và chi trả bồi thường" />
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={5}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Mã giao dịch, số hợp đồng..." /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.type} onChange={(e) => paged.setFilter('type', e.target.value)} aria-label="Loại giao dịch">
                <option value="">Tất cả loại</option>
                {Object.entries(LABELS.paymentType).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.paymentStatus).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead>
              <tr><th>Mã GD</th>{isStaff && <th>Khách hàng</th>}<th>Loại</th><th>Liên quan</th><th className="text-end">Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thời gian</th></tr>
            </thead>
            <tbody>
              {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={8} text="Chưa có giao dịch" />}
              {data?.content.map((p) => (
                <tr key={p.id}>
                  <td className="fw-medium">{p.paymentCode}</td>
                  {isStaff && <td>{p.customerName}</td>}
                  <td><StatusBadge type="paymentType" value={p.type} /></td>
                  <td className="small">
                    {p.contractNumber && <div>HĐ <Link to={`${basePath}/contracts/${p.contractId}`}>{p.contractNumber}</Link></div>}
                    {p.punishmentCode && <div>Phạt {p.punishmentCode}</div>}
                    {p.claimCode && <div>Bồi thường {p.claimCode}</div>}
                  </td>
                  <td className={`text-end fw-semibold text-nowrap ${SIGN[p.type] === '+' ? 'text-success' : ''}`}>
                    {!isStaff && SIGN[p.type]}{money(p.amount)}
                  </td>
                  <td className="small">{PAYMENT_METHODS[p.method] || '—'}</td>
                  <td><StatusBadge type="paymentStatus" value={p.status} /></td>
                  <td className="small text-nowrap">{dateTime(p.paidAt || p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paging data={data} onChange={paged.setPage} />
        </Card.Body>
      </Card>
    </>
  );
}
