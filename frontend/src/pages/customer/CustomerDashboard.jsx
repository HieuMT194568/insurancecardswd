import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { meApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { EmptyRow, Loading, PageHeader, StatCard } from '../../components/ui';
import { date, money } from '../../utils/format';
import { errorMessage } from '../../utils/errors';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    meApi.customerDashboard().then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} subtitle={`Mã khách hàng: ${user.customerCode}`}>
        <Link to="/customer/contracts/new" className="btn btn-primary"><i className="bi bi-cart-plus me-1" />Mua bảo hiểm</Link>
        <Link to="/customer/compensations/new" className="btn btn-outline-danger"><i className="bi bi-cash-coin me-1" />Yêu cầu bồi thường</Link>
      </PageHeader>

      {data.pendingPaymentContracts > 0 && (
        <Alert variant="warning">
          Bạn có <strong>{data.pendingPaymentContracts}</strong> hợp đồng chờ thanh toán. Hợp đồng sẽ tự huỷ nếu chưa thanh toán trước ngày bắt đầu hiệu lực.
          {' '}<Link to="/customer/contracts?status=PENDING_PAYMENT">Xem ngay</Link>
        </Alert>
      )}
      {data.unpaidPunishments > 0 && (
        <Alert variant="danger">
          Bạn có <strong>{data.unpaidPunishments}</strong> biên bản phạt chưa nộp. <Link to="/customer/punishments">Xem chi tiết</Link>
        </Alert>
      )}

      <Row className="g-3 mb-4">
        <Col sm={6} xl><StatCard icon="bi-scooter" label="Xe đã đăng ký" value={data.vehicleCount} footer={<Link to="/customer/vehicles">Quản lý xe</Link>} /></Col>
        <Col sm={6} xl><StatCard icon="bi-shield-check" variant="success" label="Hợp đồng hiệu lực" value={data.activeContracts} /></Col>
        <Col sm={6} xl><StatCard icon="bi-hourglass-split" variant="warning" label="Chờ thanh toán" value={data.pendingPaymentContracts} /></Col>
        <Col sm={6} xl><StatCard icon="bi-cash-coin" variant="info" label="Bồi thường chờ duyệt" value={data.pendingClaims} /></Col>
        <Col sm={6} xl><StatCard icon="bi-shield-exclamation" variant="danger" label="Phạt chưa nộp" value={data.unpaidPunishments} /></Col>
      </Row>

      <Card>
        <Card.Header className="bg-white fw-semibold">
          <i className="bi bi-bell me-2 text-warning" />Hợp đồng sắp hết hạn (trong {data.renewalWindowDays} ngày tới)
        </Card.Header>
        <Table responsive hover className="mb-0">
          <thead><tr><th>Số HĐ</th><th>Xe</th><th>Gói bảo hiểm</th><th>Hết hạn</th><th>Còn lại</th><th>Phí/năm hiện tại</th><th /></tr></thead>
          <tbody>
            {data.expiringSoon.length === 0 && <EmptyRow colSpan={7} text="Không có hợp đồng nào sắp hết hạn" />}
            {data.expiringSoon.map((c) => (
              <tr key={c.id}>
                <td className="fw-medium">{c.contractNumber}</td>
                <td>{c.licensePlate}<div className="small text-muted">{c.vehicleName}</div></td>
                <td>{c.productName}</td>
                <td>{date(c.endDate)}</td>
                <td><span className="badge bg-warning text-dark">{c.daysUntilExpiry} ngày</span></td>
                <td>{money(c.premiumAmount / c.termYears)}</td>
                <td className="text-end"><Link to={`/customer/contracts/${c.id}`} className="btn btn-sm btn-success">Gia hạn</Link></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
