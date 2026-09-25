import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { accidentApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { Field, MoneyField, SelectField, TextAreaField } from '../../components/form';
import { ContractPicker } from '../../components/pickers';
import { ConfirmModal, EmptyRow, InfoItem, Loading, PageHeader, Paging, SearchBox, StatusBadge, SubmitButton } from '../../components/ui';
import { accidentSchema, nowLocalStr, resolveAccidentSchema } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { DAMAGE_TYPES, LABELS, dateTime, money } from '../../utils/format';

/** Các ô nhập thông tin tai nạn — dùng chung cho form khai báo và form yêu cầu bồi thường (prefix "accident."). */
export function AccidentFields({ form, prefix = '' }) {
  const n = (name) => `${prefix}${name}`;
  return (
    <Row>
      <Col md={6}><Field form={form} name={n('accidentTime')} label="Thời điểm xảy ra" type="datetime-local" required max={nowLocalStr()} /></Col>
      <Col md={6}><SelectField form={form} name={n('damageType')} label="Loại thiệt hại" required options={DAMAGE_TYPES} /></Col>
      <Col md={12}><Field form={form} name={n('location')} label="Địa điểm" required maxLength={255} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" /></Col>
      <Col md={12}><TextAreaField form={form} name={n('description')} label="Diễn biến tai nạn" required maxLength={1000} help="Tối thiểu 20 ký tự" /></Col>
      <Col md={6}><MoneyField form={form} name={n('estimatedDamage')} label="Thiệt hại ước tính" required /></Col>
      <Col md={6}><Field form={form} name={n('policeReportNumber')} label="Số biên bản công an (nếu có)" maxLength={50} /></Col>
    </Row>
  );
}

const ACCIDENT_FIELDS = ['contractId', 'accidentTime', 'location', 'description', 'damageType', 'estimatedDamage', 'policeReportNumber'];

function AccidentFormModal({ show, accident, onHide, onSaved }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const [contract, setContract] = useState(null);
  const form = useForm({ resolver: zodResolver(accidentSchema) });

  useEffect(() => {
    if (!show) return;
    setError(null);
    const values = Object.fromEntries(ACCIDENT_FIELDS.map((k) => [k, accident?.[k] == null ? '' : String(accident[k])]));
    if (accident) values.accidentTime = accident.accidentTime.slice(0, 16);
    form.reset(values);
    setContract(accident ? { id: accident.contractId, contractNumber: accident.contractNumber, licensePlate: accident.licensePlate,
      status: 'ACTIVE', productName: '', startDate: null, endDate: null } : null);
  }, [show, accident]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = accident ? await accidentApi.update(accident.id, values) : await accidentApi.create(values);
      toast.success(accident ? 'Đã cập nhật tai nạn' : `Đã khai báo tai nạn ${saved.accidentCode}`);
      onSaved(saved);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">{accident ? `Sửa tai nạn ${accident.accidentCode}` : 'Khai báo tai nạn'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {accident ? (
            <Alert variant="light" className="py-2">Hợp đồng: <strong>{accident.contractNumber}</strong> ({accident.licensePlate})</Alert>
          ) : (
            <ContractPicker value={contract} error={form.formState.errors.contractId?.message}
              onChange={(c) => { setContract(c); form.setValue('contractId', c ? String(c.id) : ''); form.clearErrors('contractId'); }} />
          )}
          <AccidentFields form={form} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton busy={form.formState.isSubmitting}>Lưu</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ResolveModal({ accident, onHide, onDone }) {
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(resolveAccidentSchema), defaultValues: { status: '', note: '' } });
  useEffect(() => { if (accident) { form.reset({ status: '', note: '' }); setError(null); } }, [accident]); // eslint-disable-line

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      onDone(await accidentApi.resolve(accident.id, values));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={!!accident} onHide={onHide} centered>
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">Xử lý tai nạn {accident?.accidentCode}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <SelectField form={form} name="status" label="Kết quả" required
            options={{ VERIFIED: 'Xác minh – tai nạn hợp lệ', REJECTED: 'Bác bỏ – không đủ căn cứ' }} />
          <TextAreaField form={form} name="note" label="Ghi chú / lý do" maxLength={500}
            help="Bắt buộc (tối thiểu 10 ký tự) khi bác bỏ. Bác bỏ sẽ tự động từ chối các yêu cầu bồi thường đang chờ của tai nạn này." />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton busy={form.formState.isSubmitting}>Xác nhận</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function DetailModal({ accident, onHide }) {
  if (!accident) return null;
  const a = accident;
  return (
    <Modal show onHide={onHide} size="lg" centered>
      <Modal.Header closeButton><Modal.Title as="h5">Tai nạn {a.accidentCode} <StatusBadge type="accident" value={a.status} /></Modal.Title></Modal.Header>
      <Modal.Body>
        <Row>
          <InfoItem label="Hợp đồng">{a.contractNumber}</InfoItem>
          <InfoItem label="Khách hàng">{a.customerName}</InfoItem>
          <InfoItem label="Biển số">{a.licensePlate}</InfoItem>
          <InfoItem label="Thời điểm">{dateTime(a.accidentTime)}</InfoItem>
          <InfoItem label="Loại thiệt hại">{DAMAGE_TYPES[a.damageType]}</InfoItem>
          <InfoItem label="Thiệt hại ước tính">{money(a.estimatedDamage)}</InfoItem>
          <InfoItem label="Địa điểm" className="col-12 mb-3">{a.location}</InfoItem>
          <InfoItem label="Diễn biến" className="col-12 mb-3">{a.description}</InfoItem>
          <InfoItem label="Số biên bản công an">{a.policeReportNumber}</InfoItem>
          <InfoItem label="Người khai báo">{a.reportedByName}</InfoItem>
          <InfoItem label="Ngày khai báo">{dateTime(a.createdAt)}</InfoItem>
          {a.resolvedAt && (
            <>
              <InfoItem label="Người xử lý">{a.resolvedByName}</InfoItem>
              <InfoItem label="Xử lý lúc">{dateTime(a.resolvedAt)}</InfoItem>
              <InfoItem label="Ghi chú xử lý">{a.resolutionNote}</InfoItem>
            </>
          )}
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default function AccidentsPage() {
  const { isStaff, basePath } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const paged = usePaged(accidentApi.search, { q: '', status: params.get('status') || '' });
  const [editing, setEditing] = useState(undefined);
  const [viewing, setViewing] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading } = paged;

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await accidentApi.remove(deleting.id);
      toast.success('Đã xoá khai báo tai nạn');
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
      <PageHeader title={isStaff ? 'Xử lý tai nạn' : 'Lịch sử tai nạn'} icon="bi-exclamation-octagon"
        subtitle="Tai nạn phải xảy ra trong thời hạn hợp đồng và khai báo trong thời hạn quy định">
        <Button variant="outline-primary" onClick={() => setEditing(null)}><i className="bi bi-plus-lg me-1" />Khai báo tai nạn</Button>
        <Link to={`${basePath}/compensations/new`} className="btn btn-primary"><i className="bi bi-cash-coin me-1" />Yêu cầu bồi thường</Link>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Mã tai nạn, số hợp đồng, biển số..." /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.accident).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead><tr><th>Mã</th>{isStaff && <th>Khách hàng</th>}<th>Hợp đồng / Xe</th><th>Thời điểm</th><th>Thiệt hại</th><th className="text-end">Ước tính</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={8} text="Chưa có tai nạn nào" />}
              {data?.content.map((a) => (
                <tr key={a.id}>
                  <td className="fw-medium">{a.accidentCode}</td>
                  {isStaff && <td>{a.customerName}</td>}
                  <td><Link to={`${basePath}/contracts/${a.contractId}`}>{a.contractNumber}</Link><div className="small text-muted">{a.licensePlate}</div></td>
                  <td className="text-nowrap">{dateTime(a.accidentTime)}</td>
                  <td className="small">{DAMAGE_TYPES[a.damageType]}</td>
                  <td className="text-end text-nowrap">{money(a.estimatedDamage)}</td>
                  <td><StatusBadge type="accident" value={a.status} /></td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => setViewing(a)} title="Xem"><i className="bi bi-eye" /></Button>
                    {a.status === 'REPORTED' && (
                      <>
                        {isStaff && <Button size="sm" variant="success" className="me-1" onClick={() => setResolving(a)}>Xử lý</Button>}
                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setEditing(a)} title="Sửa"><i className="bi bi-pencil" /></Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleting(a)} title="Xoá"><i className="bi bi-trash" /></Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paging data={data} onChange={paged.setPage} />
        </Card.Body>
      </Card>

      <AccidentFormModal show={editing !== undefined} accident={editing} onHide={() => setEditing(undefined)}
        onSaved={() => { setEditing(undefined); paged.reload(); }} />
      <ResolveModal accident={resolving} onHide={() => setResolving(null)}
        onDone={(a) => { setResolving(null); toast.success(a.status === 'VERIFIED' ? 'Đã xác minh tai nạn' : 'Đã bác bỏ tai nạn'); paged.reload(); }} />
      <DetailModal accident={viewing} onHide={() => setViewing(null)} />
      <ConfirmModal show={!!deleting} title="Xoá khai báo tai nạn" busy={busy} confirmText="Xoá"
        onHide={() => setDeleting(null)} onConfirm={confirmDelete}>
        Xoá khai báo tai nạn <strong>{deleting?.accidentCode}</strong>? Chỉ xoá được tai nạn chưa xử lý và chưa có yêu cầu bồi thường.
      </ConfirmModal>
    </>
  );
}
