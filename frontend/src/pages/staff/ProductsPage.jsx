import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { Field, MoneyField, SelectField, TextAreaField } from '../../components/form';
import { ConfirmModal, EmptyRow, Loading, PageHeader, Paging, SearchBox, StatusBadge, SubmitButton } from '../../components/ui';
import { productSchema, toFormValues } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { LABELS, money } from '../../utils/format';

const FIELDS = ['code', 'name', 'description', 'minEngineCapacity', 'maxEngineCapacity', 'annualPremium', 'maxCompensation', 'status'];

function ProductFormModal({ show, product, onHide, onSaved }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(productSchema) });

  useEffect(() => {
    if (!show) return;
    setError(null);
    form.reset(product ? toFormValues(product, FIELDS) : { ...toFormValues({}, FIELDS), status: 'ACTIVE' });
  }, [show, product]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = product ? await productApi.update(product.id, values) : await productApi.create(values);
      toast.success(product ? 'Đã cập nhật sản phẩm' : `Đã tạo sản phẩm ${saved.code}`);
      onSaved();
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">{product ? `Sửa sản phẩm ${product.code}` : 'Thêm sản phẩm bảo hiểm'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {product && <Alert variant="info" className="small py-2">Thay đổi phí / hạn mức chỉ áp dụng cho hợp đồng mới; hợp đồng đã ký giữ nguyên giá trị tại thời điểm ký.</Alert>}
          <Row>
            <Col md={4}><Field form={form} name="code" label="Mã sản phẩm" required maxLength={20} help="VD: TNDS-50P" /></Col>
            <Col md={8}><Field form={form} name="name" label="Tên sản phẩm" required maxLength={100} /></Col>
            <Col md={12}><TextAreaField form={form} name="description" label="Mô tả" maxLength={500} rows={2} /></Col>
            <Col md={6}><Field form={form} name="minEngineCapacity" label="Dung tích tối thiểu (cc)" required inputMode="numeric" maxLength={4} /></Col>
            <Col md={6}><Field form={form} name="maxEngineCapacity" label="Dung tích tối đa (cc)" required inputMode="numeric" maxLength={4} /></Col>
            <Col md={6}><MoneyField form={form} name="annualPremium" label="Phí bảo hiểm / năm" required /></Col>
            <Col md={6}><MoneyField form={form} name="maxCompensation" label="Mức bồi thường tối đa / hợp đồng" required /></Col>
            <Col md={6}><SelectField form={form} name="status" label="Trạng thái" required placeholder={null} options={{ ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán' }} /></Col>
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

export default function ProductsPage() {
  const toast = useToast();
  const paged = usePaged(productApi.search, { q: '', status: '' });
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading } = paged;

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await productApi.remove(deleting.id);
      toast.success('Đã xoá sản phẩm');
      paged.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader title="Sản phẩm bảo hiểm" icon="bi-box-seam" subtitle="Cấu hình gói bảo hiểm, phí và phạm vi áp dụng theo dung tích xe">
        <Button onClick={() => setEditing(null)}><i className="bi bi-plus-lg me-1" />Thêm sản phẩm</Button>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Mã hoặc tên sản phẩm..." /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.product).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead><tr><th>Mã</th><th>Tên sản phẩm</th><th>Dung tích áp dụng</th><th className="text-end">Phí / năm</th><th className="text-end">Bồi thường tối đa</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading && !data && <tr><td colSpan={7}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={7} />}
              {data?.content.map((p) => (
                <tr key={p.id}>
                  <td className="fw-medium">{p.code}</td>
                  <td>{p.name}<div className="small text-muted text-truncate" style={{ maxWidth: 360 }}>{p.description}</div></td>
                  <td>{p.minEngineCapacity} – {p.maxEngineCapacity} cc</td>
                  <td className="text-end text-nowrap">{money(p.annualPremium)}</td>
                  <td className="text-end text-nowrap">{money(p.maxCompensation)}</td>
                  <td><StatusBadge type="product" value={p.status} /></td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setEditing(p)} title="Sửa"><i className="bi bi-pencil" /></Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setDeleting(p)} title="Xoá"><i className="bi bi-trash" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paging data={data} onChange={paged.setPage} />
        </Card.Body>
      </Card>
      <ProductFormModal show={editing !== undefined} product={editing} onHide={() => setEditing(undefined)}
        onSaved={() => { setEditing(undefined); paged.reload(); }} />
      <ConfirmModal show={!!deleting} title="Xoá sản phẩm" busy={busy} confirmText="Xoá" onHide={() => setDeleting(null)} onConfirm={confirmDelete}>
        Xoá sản phẩm <strong>{deleting?.name}</strong>? Sản phẩm đã có hợp đồng không thể xoá — hãy chuyển sang "Ngừng bán".
      </ConfirmModal>
    </>
  );
}
