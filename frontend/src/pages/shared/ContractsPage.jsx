import { Alert, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { contractApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { usePaged } from '../../hooks/usePaged';
import { EmptyRow, Loading, PageHeader, Paging, SearchBox, StatusBadge } from '../../components/ui';
import { LABELS, date, money } from '../../utils/format';

/** Bảng hợp đồng dùng chung (trang Hợp đồng + tab trong chi tiết khách hàng). */
export function ContractTable({ paged, showCustomer, basePath }) {
  const { data, loading } = paged;
  return (
    <>
      <Table responsive hover className="mb-0">
        <thead>
          <tr>
            <th>Số HĐ</th>{showCustomer && <th>Khách hàng</th>}<th>Xe</th><th>Gói bảo hiểm</th>
            <th>Hiệu lực</th><th className="text-end">Phí</th><th>Trạng thái</th><th />
          </tr>
        </thead>
        <tbody>
          {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
          {data?.content.length === 0 && <EmptyRow colSpan={8} text="Chưa có hợp đồng" />}
          {data?.content.map((c) => (
            <tr key={c.id}>
              <td className="fw-semibold"><Link to={`${basePath}/contracts/${c.id}`}>{c.contractNumber}</Link></td>
              {showCustomer && <td>{c.customerName}<div className="small text-muted">{c.customerCode}</div></td>}
              <td>{c.licensePlate}<div className="small text-muted">{c.vehicleName}</div></td>
              <td>{c.productName}</td>
              <td className="text-nowrap">
                {date(c.startDate)} – {date(c.endDate)}
                {c.status === 'ACTIVE' && c.daysUntilExpiry <= 30 && (
                  <div><span className="badge bg-warning text-dark">Còn {c.daysUntilExpiry} ngày</span></div>
                )}
              </td>
              <td className="text-end text-nowrap">{money(c.premiumAmount)}</td>
              <td><StatusBadge type="contract" value={c.status} /></td>
              <td className="text-end"><Link to={`${basePath}/contracts/${c.id}`} className="btn btn-sm btn-outline-primary">Chi tiết</Link></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Paging data={data} onChange={paged.setPage} />
    </>
  );
}

export default function ContractsPage() {
  const { isStaff, basePath } = useAuth();
  const [params] = useSearchParams();
  const paged = usePaged(contractApi.search, { q: '', status: params.get('status') || '' });

  return (
    <>
      <PageHeader title="Hợp đồng bảo hiểm" icon="bi-file-earmark-text" subtitle="Hợp đồng là chứng từ nên không xoá được, chỉ có thể huỷ">
        <Link to={`${basePath}/contracts/new`} className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" />{isStaff ? 'Tạo hợp đồng' : 'Mua bảo hiểm'}
        </Link>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6} lg={5}>
              <SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)}
                placeholder={isStaff ? 'Số hợp đồng, biển số, tên khách hàng...' : 'Số hợp đồng, biển số...'} />
            </Col>
            <Col md={4} lg={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Lọc trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.contract).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <ContractTable paged={paged} showCustomer={isStaff} basePath={basePath} />
        </Card.Body>
      </Card>
    </>
  );
}
