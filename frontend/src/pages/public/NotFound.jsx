import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Container className="py-5 text-center">
      <div className="display-1 fw-bold text-primary">404</div>
      <p className="lead text-muted">Không tìm thấy trang bạn yêu cầu.</p>
      <Link to="/" className="btn btn-primary">Về trang chủ</Link>
    </Container>
  );
}
