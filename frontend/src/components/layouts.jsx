import { useState } from 'react';
import { Container, Nav, Navbar, NavDropdown, Offcanvas } from 'react-bootstrap';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Brand() {
  return (
    <Navbar.Brand as={Link} to="/" className="fw-bold">
      <i className="bi bi-shield-check text-primary me-1" />InsuranceCard
    </Navbar.Brand>
  );
}

export function PublicLayout() {
  const { user, basePath } = useAuth();
  return (
    <>
      <Navbar bg="white" expand="md" className="border-bottom sticky-top">
        <Container>
          <Brand />
          <Navbar.Toggle aria-controls="public-nav" />
          <Navbar.Collapse id="public-nav">
            <Nav className="ms-auto align-items-md-center gap-md-2">
              <Nav.Link as={NavLink} to="/" end>Trang chủ</Nav.Link>
              {user ? (
                <Link to={`${basePath}/dashboard`} className="btn btn-primary btn-sm">
                  <i className="bi bi-speedometer2 me-1" />Vào trang quản lý
                </Link>
              ) : (
                <>
                  <Nav.Link as={NavLink} to="/login">Đăng nhập</Nav.Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Outlet />
      <footer className="border-top bg-white py-4 mt-5">
        <Container className="text-muted small d-flex flex-wrap justify-content-between gap-2">
          <span>© {new Date().getFullYear()} InsuranceCard – Bảo hiểm xe máy trực tuyến</span>
          <span>Hotline: 1900 1234 · hotro@insurancecard.vn</span>
        </Container>
      </footer>
    </>
  );
}

const MENUS = {
  CUSTOMER: [
    { heading: 'Tổng quan' },
    { to: 'dashboard', icon: 'bi-speedometer2', label: 'Bảng điều khiển' },
    { to: 'profile', icon: 'bi-person-circle', label: 'Hồ sơ cá nhân' },
    { heading: 'Bảo hiểm' },
    { to: 'vehicles', icon: 'bi-scooter', label: 'Xe của tôi' },
    { to: 'contracts/new', icon: 'bi-cart-plus', label: 'Mua bảo hiểm' },
    { to: 'contracts', icon: 'bi-file-earmark-text', label: 'Hợp đồng', end: true },
    { heading: 'Lịch sử' },
    { to: 'payments', icon: 'bi-credit-card', label: 'Thanh toán' },
    { to: 'accidents', icon: 'bi-exclamation-octagon', label: 'Tai nạn' },
    { to: 'compensations', icon: 'bi-cash-coin', label: 'Bồi thường' },
    { to: 'punishments', icon: 'bi-shield-exclamation', label: 'Vi phạm / phạt' },
  ],
  STAFF: [
    { heading: 'Tổng quan' },
    { to: 'dashboard', icon: 'bi-speedometer2', label: 'Bảng điều khiển' },
    { heading: 'Quản lý khách hàng' },
    { to: 'customers', icon: 'bi-people', label: 'Khách hàng' },
    { to: 'vehicles', icon: 'bi-scooter', label: 'Xe' },
    { heading: 'Quản lý hợp đồng' },
    { to: 'contracts', icon: 'bi-file-earmark-text', label: 'Hợp đồng' },
    { to: 'accidents', icon: 'bi-exclamation-octagon', label: 'Xử lý tai nạn' },
    { to: 'compensations', icon: 'bi-cash-coin', label: 'Xử lý bồi thường' },
    { to: 'punishments', icon: 'bi-shield-exclamation', label: 'Xử lý vi phạm' },
    { to: 'payments', icon: 'bi-credit-card', label: 'Giao dịch' },
    { heading: 'Hệ thống' },
    { to: 'products', icon: 'bi-box-seam', label: 'Sản phẩm bảo hiểm' },
    { to: 'settings', icon: 'bi-gear', label: 'Cấu hình' },
    { to: 'profile', icon: 'bi-person-circle', label: 'Hồ sơ cá nhân' },
  ],
};

function SideMenu({ role, basePath, onNavigate }) {
  return (
    <Nav className="flex-column p-2">
      {MENUS[role].map((m, i) => (m.heading ? (
        <div key={i} className="sidebar-heading">{m.heading}</div>
      ) : (
        <Nav.Link key={m.to} as={NavLink} to={`${basePath}/${m.to}`} end={m.end} onClick={onNavigate}>
          <i className={`bi ${m.icon}`} />{m.label}
        </Nav.Link>
      )))}
    </Nav>
  );
}

export function DashboardLayout() {
  const { user, basePath, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      <Navbar bg="white" className="border-bottom sticky-top" style={{ height: 56 }}>
        <Container fluid>
          <button type="button" className="btn btn-link text-dark d-lg-none me-1 p-1" onClick={() => setOpen(true)} aria-label="Mở menu">
            <i className="bi bi-list fs-4" />
          </button>
          <Brand />
          <span className="badge bg-primary-subtle text-primary d-none d-sm-inline">
            {user.role === 'STAFF' ? 'Nhân viên' : 'Khách hàng'}
          </span>
          <Nav className="ms-auto">
            <NavDropdown align="end" title={<span><i className="bi bi-person-circle me-1" />{user.fullName}</span>}>
              <NavDropdown.Item as={Link} to={`${basePath}/profile`}><i className="bi bi-person me-2" />Hồ sơ cá nhân</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/"><i className="bi bi-house me-2" />Trang chủ</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={doLogout} className="text-danger"><i className="bi bi-box-arrow-right me-2" />Đăng xuất</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Container>
      </Navbar>
      <div className="d-flex">
        <aside className="sidebar d-none d-lg-block flex-shrink-0">
          <SideMenu role={user.role} basePath={basePath} />
        </aside>
        <Offcanvas show={open} onHide={() => setOpen(false)} style={{ width: 270 }}>
          <Offcanvas.Header closeButton><Offcanvas.Title>Menu</Offcanvas.Title></Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <SideMenu role={user.role} basePath={basePath} onNavigate={() => setOpen(false)} />
          </Offcanvas.Body>
        </Offcanvas>
        <main className="content-area flex-grow-1 p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </>
  );
}

/** Chặn truy cập theo vai trò: chưa đăng nhập -> /login; sai vai trò -> dashboard của mình. */
export function RequireRole({ role }) {
  const { user, basePath } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={`${basePath}/dashboard`} replace />;
  return <Outlet />;
}

/** Trang chỉ dành cho khách chưa đăng nhập (login/register). */
export function GuestOnly() {
  const { user, basePath } = useAuth();
  if (user) return <Navigate to={`${basePath}/dashboard`} replace />;
  return <Outlet />;
}
