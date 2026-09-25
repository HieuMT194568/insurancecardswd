import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { meApi } from '../../api/services';
import { EmptyRow, Loading, PageHeader, StatCard } from '../../components/ui';
import { date, money } from '../../utils/format';
import { errorMessage } from '../../utils/errors';

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    meApi.staffDashboard().then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!data) return <Loading />;

  const todo = [
    { n: data.reportedAccidents, text: 'tai nạn chờ xác minh', to: '/staff/accidents?status=REPORTED', variant: 'warning' },
    { n: data.pendingClaims, text: 'yêu cầu bồi thường chờ duyệt', to: '/staff/compensations?status=PENDING', variant: 'danger' },
    { n: data.approvedClaims, text: 'khoản bồi thường đã duyệt chờ chi trả', to: '/staff/compensations?status=APPROVED', variant: 'info' },
    { n: data.pendingPaymentContracts, text: 'hợp đồng chờ thanh toán', to: '/staff/contracts?status=PENDING_PAYMENT', variant: 'secondary' },
  ].filter((t) => t.n > 0);

  return (
    <>
      <PageHeader title="Bảng điều khiển" icon="bi-speedometer2" subtitle="Tổng quan hoạt động kinh doanh">
        <Link to="/staff/customers/new" className="btn btn-outline-primary"><i className="bi bi-person-plus me-1" />Thêm khách hàng</Link>
        <Link to="/staff/contracts/new" className="btn btn-primary"><i className="bi bi-file-earmark-plus me-1" />Tạo hợp đồng</Link>
      </PageHeader>

      <Row className="g-3 mb-3">
        <Col sm={6} xl={3}><StatCard icon="bi-people" label="Khách hàng hoạt động" value={data.activeCustomers} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-shield-check" variant="success" label="Hợp đồng hiệu lực" value={data.activeContracts} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-graph-up-arrow" variant="primary" label="Doanh thu phí tháng này" value={money(data.premiumRevenueThisMonth)} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-cash-stack" variant="danger" label="Đã chi bồi thường tháng này" value={money(data.compensationPaidThisMonth)} /></Col>
      </Row>
      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}><StatCard icon="bi-exclamation-octagon" variant="warning" label="Tai nạn chờ xác minh" value={data.reportedAccidents} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-hourglass-split" variant="danger" label="Bồi thường chờ duyệt" value={data.pendingClaims} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-wallet2" variant="info" label="Bồi thường chờ chi trả" value={data.approvedClaims} /></Col>
        <Col sm={6} xl={3}><StatCard icon="bi-shield-exclamation" variant="secondary" label="Biên bản phạt chưa nộp" value={data.unpaidPunishments} /></Col>
      </Row>

      <Row className="g-3">
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold"><i className="bi bi-list-check me-2" />Việc cần xử lý</Card.Header>
            <Card.Body>
              {todo.length === 0 && <div className="text-muted">Không có việc tồn đọng 🎉</div>}
              {todo.map((t) => (
                <Link key={t.to} to={t.to} className="d-flex align-items-center justify-content-between text-decoration-none py-2 border-bottom">
                  <span className="text-body">{t.text}</span>
                  <span className={`badge bg-${t.variant}`}>{t.n}</span>
                </Link>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">
              <i className="bi bi-bell me-2 text-warning" />Hợp đồng sắp hết hạn trong {data.renewalWindowDays} ngày
            </Card.Header>
            <Table responsive hover className="mb-0">
              <thead><tr><th>Số HĐ</th><th>Khách hàng</th><th>Xe</th><th>Hết hạn</th><th>Còn</th></tr></thead>
              <tbody>
                {data.expiringSoon.length === 0 && <EmptyRow colSpan={5} />}
                {data.expiringSoon.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/staff/contracts/${c.id}`}>{c.contractNumber}</Link></td>
                    <td>{c.customerName}<div className="small text-muted">{c.customerPhone}</div></td>
                    <td>{c.licensePlate}</td>
                    <td>{date(c.endDate)}</td>
                    <td><span className="badge bg-warning text-dark">{c.daysUntilExpiry} ngày</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </>
  );
}
