import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { ConfirmModal, EmptyRow, Loading, PageHeader, Paging, SearchBox, StatusBadge } from '../../components/ui';
import { LABELS, date } from '../../utils/format';
import { errorMessage } from '../../utils/errors';

/** Hook dùng chung: khoá/mở khoá và xoá khách hàng (danh sách + trang chi tiết). */
export function useCustomerActions(onChanged) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null); // { type: 'lock'|'unlock'|'delete', customer }
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const { type, customer } = confirm;
    setBusy(true);
    try {
      if (type === 'delete') {
        await customerApi.remove(customer.id);
        toast.success(`Đã xoá khách hàng ${customer.fullName}`);
      } else {
        const status = type === 'lock' ? 'LOCKED' : 'ACTIVE';
        await customerApi.setStatus(customer.id, status);
        toast.success(type === 'lock' ? 'Đã khoá tài khoản' : 'Đã kích hoạt tài khoản');
      }
      onChanged(type);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const texts = {
    lock: ['Khoá tài khoản', 'Khách hàng sẽ không đăng nhập được, các phiên đăng nhập hiện tại bị vô hiệu. Hợp đồng vẫn giữ nguyên.', 'warning'],
    unlock: ['Kích hoạt tài khoản', 'Khách hàng có thể đăng nhập và sử dụng dịch vụ.', 'success'],
    delete: ['Xoá khách hàng', 'Chỉ xoá được khách hàng chưa có hợp đồng và biên bản phạt. Xe của khách hàng cũng bị xoá. Thao tác không thể hoàn tác.', 'danger'],
  };
  const modal = confirm && (
    <ConfirmModal show title={texts[confirm.type][0]} variant={texts[confirm.type][2]} busy={busy}
      confirmText={texts[confirm.type][0]} onHide={() => setConfirm(null)} onConfirm={run}>
      <p className="mb-1"><strong>{confirm.customer.fullName}</strong> ({confirm.customer.customerCode})</p>
      <div className="small text-muted">{texts[confirm.type][1]}</div>
    </ConfirmModal>
  );
  return { setConfirm, modal };
}

export default function CustomersPage() {
  const paged = usePaged(customerApi.search, { q: '', status: '' });
  const actions = useCustomerActions(() => paged.reload());
  const { data, loading } = paged;

  return (
    <>
      <PageHeader title="Khách hàng" icon="bi-people" subtitle="Quản lý hồ sơ và tài khoản khách hàng">
        <Link to="/staff/customers/new" className="btn btn-primary"><i className="bi bi-person-plus me-1" />Thêm khách hàng</Link>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Tên, email, SĐT, CCCD hoặc mã KH (VD: KH000003)" /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.user).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead><tr><th>Mã KH</th><th>Họ tên</th><th>Liên hệ</th><th>CCCD</th><th>Ngày sinh</th><th>Số xe</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={8} text="Không tìm thấy khách hàng" />}
              {data?.content.map((c) => (
                <tr key={c.id}>
                  <td className="fw-medium">{c.customerCode}</td>
                  <td><Link to={`/staff/customers/${c.id}`}>{c.fullName}</Link></td>
                  <td className="small">{c.phone}<div className="text-muted">{c.email}</div></td>
                  <td>{c.idNumber}</td>
                  <td>{date(c.dateOfBirth)}</td>
                  <td>{c.vehicleCount}</td>
                  <td><StatusBadge type="user" value={c.status} /></td>
                  <td className="text-end text-nowrap">
                    <Link to={`/staff/customers/${c.id}`} className="btn btn-sm btn-outline-secondary me-1" title="Xem"><i className="bi bi-eye" /></Link>
                    <Link to={`/staff/customers/${c.id}/edit`} className="btn btn-sm btn-outline-primary me-1" title="Sửa"><i className="bi bi-pencil" /></Link>
                    {c.status === 'LOCKED' || c.status === 'PENDING' ? (
                      <Button size="sm" variant="outline-success" className="me-1" title="Kích hoạt" onClick={() => actions.setConfirm({ type: 'unlock', customer: c })}><i className="bi bi-unlock" /></Button>
                    ) : (
                      <Button size="sm" variant="outline-warning" className="me-1" title="Khoá" onClick={() => actions.setConfirm({ type: 'lock', customer: c })}><i className="bi bi-lock" /></Button>
                    )}
                    <Button size="sm" variant="outline-danger" title="Xoá" onClick={() => actions.setConfirm({ type: 'delete', customer: c })}><i className="bi bi-trash" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paging data={data} onChange={paged.setPage} />
        </Card.Body>
      </Card>
      {actions.modal}
    </>
  );
}
