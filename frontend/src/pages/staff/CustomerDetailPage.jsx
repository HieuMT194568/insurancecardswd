import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Row, Tab, Tabs } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { contractApi, customerApi, vehicleApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { PASSWORD_HELP, PasswordField } from '../../components/form';
import { ConfirmModal, InfoItem, Loading, PageHeader, StatusBadge, SubmitButton } from '../../components/ui';
import { setPasswordSchema } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { GENDERS, date, dateTime } from '../../utils/format';
import { VehicleFormModal, VehicleTable, useVehicleActions } from '../shared/VehiclesPage';
import { ContractTable } from '../shared/ContractsPage';
import { useCustomerActions } from './CustomersPage';

function SetPasswordModal({ customer, show, onHide }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(setPasswordSchema), defaultValues: { newPassword: '', confirmPassword: '' } });
  useEffect(() => { if (show) { form.reset(); setError(null); } }, [show]); // eslint-disable-line

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await customerApi.setPassword(customer.id, values);
      toast.success('Đã đặt lại mật khẩu cho khách hàng');
      onHide();
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">Đặt lại mật khẩu cho {customer.fullName}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <PasswordField form={form} name="newPassword" label="Mật khẩu mới" required maxLength={50} help={PASSWORD_HELP} autoComplete="new-password" />
          <PasswordField form={form} name="confirmPassword" label="Nhập lại mật khẩu mới" required maxLength={50} autoComplete="new-password" />
          <div className="small text-muted">Các phiên đăng nhập hiện tại của khách hàng sẽ bị đăng xuất.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton variant="warning" busy={form.formState.isSubmitting}>Đặt lại mật khẩu</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);

  const load = useCallback(() => {
    customerApi.get(id).then(setCustomer).catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const vehicles = usePaged((p) => vehicleApi.search({ ...p, customerId: id }), {}, 10);
  const contracts = usePaged((p) => contractApi.search({ ...p, customerId: id }), {}, 10);
  const vActions = useVehicleActions(() => { vehicles.reload(); load(); });
  const cActions = useCustomerActions((type) => (type === 'delete' ? navigate('/staff/customers') : load()));

  if (error) return <Alert variant="danger">{error} <Link to="/staff/customers">Quay lại</Link></Alert>;
  if (!customer) return <Loading />;
  const c = customer;
  const locked = c.status !== 'ACTIVE';

  return (
    <>
      <PageHeader title={<>{c.fullName} <StatusBadge type="user" value={c.status} /></>} subtitle={`Mã khách hàng ${c.customerCode}`}>
        <Link to={`/staff/customers/${c.id}/edit`} className="btn btn-outline-primary"><i className="bi bi-pencil me-1" />Sửa</Link>
        <Button variant="outline-warning" onClick={() => setPwOpen(true)}><i className="bi bi-key me-1" />Đặt lại mật khẩu</Button>
        <Button variant={locked ? 'outline-success' : 'outline-secondary'} onClick={() => cActions.setConfirm({ type: locked ? 'unlock' : 'lock', customer: c })}>
          <i className={`bi ${locked ? 'bi-unlock' : 'bi-lock'} me-1`} />{locked ? 'Kích hoạt' : 'Khoá'}
        </Button>
        <Button variant="outline-danger" onClick={() => cActions.setConfirm({ type: 'delete', customer: c })}><i className="bi bi-trash me-1" />Xoá</Button>
      </PageHeader>

      <Card className="mb-3">
        <Card.Body>
          <Row>
            <InfoItem label="Email">{c.email}</InfoItem>
            <InfoItem label="Số điện thoại">{c.phone}</InfoItem>
            <InfoItem label="Số CCCD">{c.idNumber}</InfoItem>
            <InfoItem label="Ngày sinh">{date(c.dateOfBirth)}</InfoItem>
            <InfoItem label="Giới tính">{GENDERS[c.gender]}</InfoItem>
            <InfoItem label="Ngày tạo">{dateTime(c.createdAt)}</InfoItem>
            <InfoItem label="Địa chỉ" className="col-12">{c.address}</InfoItem>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Tabs defaultActiveKey="vehicles" className="mb-3">
            <Tab eventKey="vehicles" title={`Xe (${c.vehicleCount})`}>
              <div className="d-flex justify-content-end mb-2">
                <Button size="sm" onClick={() => vActions.setEditing(null)} disabled={locked}><i className="bi bi-plus-lg me-1" />Thêm xe</Button>
              </div>
              <VehicleTable paged={vehicles} basePath="/staff" showOwner={false} onEdit={vActions.setEditing} onDelete={vActions.setDeleting} />
            </Tab>
            <Tab eventKey="contracts" title="Hợp đồng">
              <div className="d-flex justify-content-end mb-2">
                <Link to={`/staff/contracts/new?customerId=${c.id}`} className={`btn btn-sm btn-primary ${locked ? 'disabled' : ''}`}>
                  <i className="bi bi-plus-lg me-1" />Tạo hợp đồng
                </Link>
              </div>
              <ContractTable paged={contracts} basePath="/staff" showCustomer={false} />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <VehicleFormModal show={vActions.editing !== undefined} vehicle={vActions.editing} fixedCustomer={customer}
        onHide={() => vActions.setEditing(undefined)} onSaved={() => { vActions.setEditing(undefined); vehicles.reload(); load(); }} />
      <ConfirmModal show={!!vActions.deleting} title="Xoá xe" busy={vActions.busy} confirmText="Xoá"
        onHide={() => vActions.setDeleting(null)} onConfirm={vActions.confirmDelete}>
        Xoá xe <strong>{vActions.deleting?.licensePlate}</strong>? Xe đã có hợp đồng sẽ không thể xoá.
      </ConfirmModal>
      <SetPasswordModal customer={c} show={pwOpen} onHide={() => setPwOpen(false)} />
      {cActions.modal}
    </>
  );
}
