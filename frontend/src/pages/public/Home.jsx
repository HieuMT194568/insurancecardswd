import { useEffect, useState } from 'react';
import { Badge, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui';
import { money } from '../../utils/format';

const FEATURES = [
  { icon: 'bi-lightning-charge', title: 'Mua & gia hạn online', text: 'Tạo hợp đồng, thanh toán và gia hạn trong vài phút, không cần đến quầy.' },
  { icon: 'bi-qr-code-scan', title: 'Tra cứu hiệu lực tức thì', text: 'Xem trạng thái, thời hạn và hạn mức bồi thường còn lại của từng hợp đồng.' },
  { icon: 'bi-cash-stack', title: 'Yêu cầu bồi thường nhanh', text: 'Khai báo tai nạn và theo dõi tiến độ xử lý bồi thường trực tuyến.' },
  { icon: 'bi-bell', title: 'Nhắc hạn gia hạn', text: 'Dashboard hiển thị các hợp đồng sắp hết hạn để không bị gián đoạn bảo hiểm.' },
];

export default function Home() {
  const { user, basePath } = useAuth();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    productApi.listActive().then(setProducts).catch(() => setError(true));
  }, []);

  const cta = user ? `${basePath}/dashboard` : '/register';

  return (
    <>
      <section className="hero py-5">
        <Container className="py-lg-4">
          <Row className="align-items-center g-4">
            <Col lg={7}>
              <Badge bg="light" text="primary" className="mb-3">Bảo hiểm xe máy trực tuyến</Badge>
              <h1 className="display-5 fw-bold">An tâm trên mọi hành trình</h1>
              <p className="lead opacity-75">
                Quản lý thẻ bảo hiểm xe máy, gia hạn hợp đồng đúng hạn và yêu cầu bồi thường nhanh chóng — tất cả trong một hệ thống.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to={cta} className="btn btn-light btn-lg fw-semibold">
                  {user ? 'Vào trang quản lý' : 'Đăng ký ngay'}
                </Link>
                {!user && <Link to="/login" className="btn btn-outline-light btn-lg">Đăng nhập</Link>}
              </div>
            </Col>
            <Col lg={5} className="d-none d-lg-block text-center">
              <i className="bi bi-shield-fill-check" style={{ fontSize: '11rem', opacity: 0.9 }} />
            </Col>
          </Row>
        </Container>
      </section>

      <Container className="py-5">
        <Row className="g-4">
          {FEATURES.map((f) => (
            <Col md={6} lg={3} key={f.title}>
              <div className="text-primary fs-2 mb-2"><i className={`bi ${f.icon}`} /></div>
              <h6 className="fw-semibold">{f.title}</h6>
              <p className="text-muted small mb-0">{f.text}</p>
            </Col>
          ))}
        </Row>
      </Container>

      <Container className="pb-4">
        <h3 className="fw-bold mb-1">Các gói bảo hiểm</h3>
        <p className="text-muted">Phí tính theo năm, thời hạn hợp đồng từ 1 đến 3 năm.</p>
        {error && <div className="alert alert-warning">Không tải được danh sách gói bảo hiểm. Vui lòng kiểm tra backend.</div>}
        {!products && !error && <Loading />}
        <Row className="g-3">
          {products?.map((p) => (
            <Col md={6} lg={3} key={p.id}>
              <Card className="h-100 product-card">
                <Card.Body className="d-flex flex-column">
                  <Badge bg="primary-subtle" text="primary" className="align-self-start mb-2">{p.code}</Badge>
                  <Card.Title as="h6" className="fw-semibold">{p.name}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1">{p.description}</Card.Text>
                  <div className="small text-muted">Áp dụng: xe {p.minEngineCapacity} – {p.maxEngineCapacity} cc</div>
                  <div className="small text-muted mb-2">Bồi thường tối đa: <strong>{money(p.maxCompensation)}</strong></div>
                  <div className="fs-5 fw-bold text-primary">{money(p.annualPremium)}<span className="fs-6 text-muted fw-normal">/năm</span></div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
}
