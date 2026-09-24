import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicleApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { Field } from '../../components/form';
import { CustomerPicker } from '../../components/pickers';
import { ConfirmModal, EmptyRow, Loading, PageHeader, Paging, SearchBox, SubmitButton } from '../../components/ui';
import { toFormValues, vehicleSchema } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';

const FIELDS = ['licensePlate', 'brand', 'model', 'color', 'engineCapacity', 'manufactureYear', 'chassisNumber', 'engineNumber'];

/**
 * Form thêm/sửa xe. fixedCustomer: khách hàng cố định (trang chi tiết KH);
 * nếu nhân viên thêm xe từ danh sách chung thì phải chọn khách hàng.
 */
export function VehicleFormModal({ show, vehicle, fixedCustomer, onHide, onSaved }) {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const form = useForm({ resolver: zodResolver(vehicleSchema) });
  const needPicker = isStaff && !vehicle && !fixedCustomer;

  useEffect(() => {
    if (!show) return;
    setError(null);
    setCustomer(null);
    form.reset({ ...toFormValues(vehicle, FIELDS), customerId: fixedCustomer ? String(fixedCustomer.id) : '' });
  }, [show, vehicle, fixedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (needPicker && !values.customerId) {
      form.setError('customerId', { message: 'Vui lòng chọn khách hàng sở hữu xe' });
      return;
    }
    try {
      const saved = vehicle ? await vehicleApi.update(vehicle.id, values) : await vehicleApi.create(values);
      toast.success(vehicle ? 'Đã cập nhật thông tin xe' : `Đã thêm xe ${saved.licensePlate}`);
      onSaved(saved);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">{vehicle ? `Sửa xe ${vehicle.licensePlate}` : 'Thêm xe'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {fixedCustomer && <Alert variant="light" className="py-2">Chủ xe: <strong>{fixedCustomer.fullName}</strong> ({fixedCustomer.customerCode})</Alert>}
          {needPicker && (
            <CustomerPicker value={customer} error={form.formState.errors.customerId?.message}
              onChange={(c) => { setCustomer(c); form.setValue('customerId', c ? String(c.id) : ''); form.clearErrors('customerId'); }} />
          )}
          {vehicle && <Alert variant="info" className="py-2 small">Xe đã có hợp đồng sẽ không được sửa số khung, số máy và dung tích xi-lanh.</Alert>}
          <Row>
            <Col md={6}><Field form={form} name="licensePlate" label="Biển số" required maxLength={15} placeholder="59-X1 123.45" help="Định dạng: 59-X1 123.45 hoặc 29-B1 1234" /></Col>
            <Col md={6}><Field form={form} name="color" label="Màu xe" required maxLength={30} /></Col>
            <Col md={6}><Field form={form} name="brand" label="Hãng xe" required maxLength={50} placeholder="Honda, Yamaha..." /></Col>
            <Col md={6}><Field form={form} name="model" label="Dòng xe" required maxLength={50} placeholder="Vision, Exciter..." /></Col>
            <Col md={6}><Field form={form} name="engineCapacity" label="Dung tích xi-lanh (cc)" required inputMode="numeric" maxLength={4} /></Col>
            <Col md={6}><Field form={form} name="manufactureYear" label="Năm sản xuất" required inputMode="numeric" maxLength={4} /></Col>
            <Col md={6}><Field form={form} name="chassisNumber" label="Số khung" required maxLength={20} help="6-20 ký tự chữ và số" /></Col>
            <Col md={6}><Field form={form} name="engineNumber" label="Số máy" required maxLength={20} help="6-20 ký tự chữ và số" /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton busy={form.formState.isSubmitting}>Lưu</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/** Bảng xe dùng chung (trang Xe và tab Xe trong chi tiết khách hàng). */
export function VehicleTable({ paged, showOwner, onEdit, onDelete, basePath }) {
  const { data, loading } = paged;
  return (
    <>
      <Table responsive hover className="mb-0">
        <thead>
          <tr>
            <th>Biển số</th><th>Xe</th><th>Dung tích</th><th>Năm SX</th><th>Số khung / Số máy</th>
            {showOwner && <th>Chủ xe</th>}<th className="text-end">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading && !data && <tr><td colSpan={7}><Loading /></td></tr>}
          {data?.content.length === 0 && <EmptyRow colSpan={7} text="Chưa có xe nào" />}
          {data?.content.map((v) => (
            <tr key={v.id}>
              <td className="fw-semibold">{v.licensePlate}</td>
              <td>{v.brand} {v.model}<div className="small text-muted">{v.color}</div></td>
              <td>{v.engineCapacity} cc</td>
              <td>{v.manufactureYear}</td>
              <td className="small">{v.chassisNumber}<div className="text-muted">{v.engineNumber}</div></td>
              {showOwner && <td>{v.customerName}<div className="small text-muted">{v.customerCode}</div></td>}
              <td className="text-end text-nowrap">
                <Link to={`${basePath}/contracts/new?vehicleId=${v.id}${showOwner ? `&customerId=${v.customerId}` : ''}`}
                  className="btn btn-sm btn-outline-success me-1" title="Mua bảo hiểm cho xe này"><i className="bi bi-cart-plus" /></Link>
                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => onEdit(v)} title="Sửa"><i className="bi bi-pencil" /></Button>
                <Button size="sm" variant="outline-danger" onClick={() => onDelete(v)} title="Xoá"><i className="bi bi-trash" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Paging data={data} onChange={paged.setPage} />
    </>
  );
}

export function useVehicleActions(reload) {
  const toast = useToast();
  const [editing, setEditing] = useState(undefined); // undefined: đóng, null: thêm mới, object: sửa
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await vehicleApi.remove(deleting.id);
      toast.success(`Đã xoá xe ${deleting.licensePlate}`);
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };
  return { editing, setEditing, deleting, setDeleting, busy, confirmDelete };
}

export default function VehiclesPage() {
  const { isStaff, basePath } = useAuth();
  const [params] = useSearchParams();
  const paged = usePaged(vehicleApi.search, { q: '', customerId: params.get('customerId') || '' });
  const actions = useVehicleActions(paged.reload);

  return (
    <>
      <PageHeader title={isStaff ? 'Danh sách xe' : 'Xe của tôi'} icon="bi-scooter"
        subtitle="Xe phải được đăng ký trước khi mua bảo hiểm">
        <Button onClick={() => actions.setEditing(null)}><i className="bi bi-plus-lg me-1" />Thêm xe</Button>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6} lg={4}>
              <SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)}
                placeholder={isStaff ? 'Biển số, hãng, dòng xe, tên chủ xe...' : 'Biển số, hãng, dòng xe...'} />
            </Col>
            {paged.filters.customerId && (
              <Col xs="auto">
                <Button variant="outline-secondary" onClick={() => paged.setFilter('customerId', '')}>
                  Đang lọc theo khách hàng #{paged.filters.customerId} <i className="bi bi-x" />
                </Button>
              </Col>
            )}
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <VehicleTable paged={paged} showOwner={isStaff} basePath={basePath}
            onEdit={actions.setEditing} onDelete={actions.setDeleting} />
        </Card.Body>
      </Card>

      <VehicleFormModal show={actions.editing !== undefined} vehicle={actions.editing}
        onHide={() => actions.setEditing(undefined)} onSaved={() => { actions.setEditing(undefined); paged.reload(); }} />
      <ConfirmModal show={!!actions.deleting} title="Xoá xe" busy={actions.busy} confirmText="Xoá"
        onHide={() => actions.setDeleting(null)} onConfirm={actions.confirmDelete}>
        Bạn chắc chắn muốn xoá xe <strong>{actions.deleting?.licensePlate}</strong>?
        <div className="small text-muted mt-2">Xe đã có hợp đồng bảo hiểm sẽ không thể xoá.</div>
      </ConfirmModal>
    </>
  );
}
