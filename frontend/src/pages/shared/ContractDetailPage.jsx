import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, ProgressBar, Row, Tab, Table, Tabs } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { contractApi, productApi, vehicleApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, SelectField, TextAreaField } from '../../components/form';
import { MethodModal, ReasonModal } from '../../components/modals';
import { EmptyRow, InfoItem, Loading, PageHeader, StatusBadge, SubmitButton } from '../../components/ui';
import { contractUpdateSchema, endDateOf, renewSchema, todayStr, toFormValues } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { DAMAGE_TYPES, PAYMENT_METHODS, date, dateTime, money } from '../../utils/format';

const TERM_OPTIONS = [{ value: '1', label: '1 năm' }, { value: '2', label: '2 năm' }, { value: '3', label: '3 năm' }];

function RenewModal({ show, contract, onHide, onDone }) {
  const [error, setError] = useState(null);
  const [price, setPrice] = useState(null);
  const form = useForm({ resolver: zodResolver(renewSchema), defaultValues: { termYears: '1' } });
  const term = Number(form.watch('termYears')) || 1;

  useEffect(() => {
    if (!show) return;
    setError(null);
    form.reset({ termYears: '1' });
    productApi.listActive().then((list) => setPrice(list.find((p) => p.id === contract.productId)?.annualPremium ?? null));
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = contract.status === 'ACTIVE'
    ? (() => { const [y, m, d] = contract.endDate.split('-').map(Number); const dt = new Date(y, m - 1, d + 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; })()
    : todayStr();

  const onSubmit = form.handleSubmit(async ({ termYears }) => {
    setError(null);
    try {
      onDone(await contractApi.renew(contract.id, termYears));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">Gia hạn hợp đồng {contract.contractNumber}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <SelectField form={form} name="termYears" label="Thời hạn gia hạn" required placeholder={null} options={TERM_OPTIONS} />
          <div className="bg-light rounded p-3 small">
            <div className="d-flex justify-content-between"><span>Hiệu lực mới</span><strong>{date(start)} – {date(endDateOf(start, term))}</strong></div>
            <div className="d-flex justify-content-between"><span>Phí dự kiến (giá hiện hành)</span><strong>{price ? money(price * term) : '—'}</strong></div>
            <div className="text-muted mt-2">Hệ thống tạo hợp đồng gia hạn ở trạng thái chờ thanh toán, liên kết với hợp đồng hiện tại.</div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton variant="success" busy={form.formState.isSubmitting}>Gia hạn</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function EditModal({ show, contract, onHide, onDone }) {
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const isActive = contract.status === 'ACTIVE';
  const form = useForm({ resolver: zodResolver(contractUpdateSchema(isActive)) });

  useEffect(() => {
    if (!show) return;
    setError(null);
    form.reset(toFormValues(contract, ['vehicleId', 'productId', 'startDate', 'termYears', 'note']));
    vehicleApi.search({ customerId: contract.customerId, size: 100 }).then((r) => setVehicles(r.content));
    productApi.listActive().then((list) => {
      // gói đang dùng có thể đã ngừng bán -> vẫn hiển thị để giữ giá trị
      const hasCurrent = list.some((p) => p.id === contract.productId);
      setProducts(hasCurrent ? list : [...list, { id: contract.productId, name: `${contract.productName} (ngừng bán)` }]);
    });
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      onDone(await contractApi.update(contract.id, values));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">Sửa hợp đồng {contract.contractNumber}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {isActive && <Alert variant="info" className="small py-2">Hợp đồng đã có hiệu lực: chỉ được sửa ghi chú.</Alert>}
          <Row>
            <Col md={6}>
              <SelectField form={form} name="vehicleId" label="Xe" required disabled={isActive}
                options={vehicles.map((v) => ({ value: String(v.id), label: `${v.licensePlate} (${v.engineCapacity} cc)` }))} />
            </Col>
            <Col md={6}>
              <SelectField form={form} name="productId" label="Gói bảo hiểm" required disabled={isActive}
                options={products.map((p) => ({ value: String(p.id), label: p.name }))} />
            </Col>
            <Col md={6}><Field form={form} name="startDate" label="Ngày bắt đầu" type="date" required disabled={isActive} min={isActive ? undefined : todayStr()} /></Col>
            <Col md={6}><SelectField form={form} name="termYears" label="Thời hạn" required disabled={isActive} placeholder={null} options={TERM_OPTIONS} /></Col>
          </Row>
          <TextAreaField form={form} name="note" label="Ghi chú" maxLength={500} rows={2} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton busy={form.formState.isSubmitting}>Lưu thay đổi</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const { isStaff, basePath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // pay | renew | cancel | edit

  const load = useCallback(() => {
    setError(null);
    contractApi.get(id).then(setDetail).catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Alert variant="danger">{error} <Link to={`${basePath}/contracts`}>Quay lại danh sách</Link></Alert>;
  if (!detail) return <Loading />;
  const c = detail.contract;
  const usedPct = Number(c.maxCompensation) > 0 ? (Number(detail.usedCompensation) * 100) / Number(c.maxCompensation) : 0;
  const methods = isStaff ? ['CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET'] : ['BANK_TRANSFER', 'CARD', 'E_WALLET'];
  const done = (msg) => (res) => { setModal(null); toast.success(msg); setDetail(res); };

  return (
    <>
      <PageHeader title={<>Hợp đồng {c.contractNumber} <StatusBadge type="contract" value={c.status} /></>}
        subtitle={`Tạo lúc ${dateTime(c.createdAt)}`}>
        {detail.canPay && <Button variant="primary" onClick={() => setModal('pay')}><i className="bi bi-credit-card me-1" />Thanh toán</Button>}
        {detail.canRenew && <Button variant="success" onClick={() => setModal('renew')}><i className="bi bi-arrow-repeat me-1" />Gia hạn</Button>}
        {detail.canEdit && <Button variant="outline-primary" onClick={() => setModal('edit')}><i className="bi bi-pencil me-1" />Sửa</Button>}
        {detail.canCancel && <Button variant="outline-danger" onClick={() => setModal('cancel')}><i className="bi bi-x-circle me-1" />Huỷ hợp đồng</Button>}
        {(c.status === 'ACTIVE' || c.status === 'EXPIRED') && (
          <Link to={`${basePath}/compensations/new?contractId=${c.id}`} className="btn btn-outline-warning">
            <i className="bi bi-cash-coin me-1" />Yêu cầu bồi thường
          </Link>
        )}
      </PageHeader>

      {c.status === 'PENDING_PAYMENT' && !detail.canPay && (
        <Alert variant="warning">Đã quá ngày bắt đầu hiệu lực, hợp đồng sẽ tự động bị huỷ do chưa thanh toán.</Alert>
      )}
      {c.status === 'PENDING_PAYMENT' && detail.canPay && (
        <Alert variant="warning">Hợp đồng chưa có hiệu lực. Vui lòng thanh toán trước ngày {date(c.startDate)}, nếu không hợp đồng sẽ tự huỷ.</Alert>
      )}
      {!detail.canRenew && detail.renewBlockedReason && (c.status === 'ACTIVE' || c.status === 'EXPIRED') && (
        <Alert variant="light" className="border small"><i className="bi bi-info-circle me-1" />Gia hạn: {detail.renewBlockedReason}</Alert>
      )}
      {c.status === 'CANCELLED' && (
        <Alert variant="danger">Hợp đồng đã huỷ lúc {dateTime(c.cancelledAt)}. Lý do: {c.cancelReason}</Alert>
      )}

      <Row className="g-3 mb-3">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">Thông tin hợp đồng</Card.Header>
            <Card.Body>
              <Row>
                <InfoItem label="Gói bảo hiểm">{c.productName} <span className="text-muted small">({c.productCode})</span></InfoItem>
                <InfoItem label="Thời hạn">{c.termYears} năm</InfoItem>
                <InfoItem label="Hiệu lực">{date(c.startDate)} – {date(c.endDate)}</InfoItem>
                <InfoItem label="Tổng phí">{money(c.premiumAmount)}</InfoItem>
                <InfoItem label="Còn hiệu lực">{c.daysUntilExpiry != null ? `${c.daysUntilExpiry} ngày` : '—'}</InfoItem>
                <InfoItem label="Ghi chú">{c.note}</InfoItem>
                <InfoItem label="Khách hàng">
                  {isStaff ? <Link to={`/staff/customers/${c.customerId}`}>{c.customerName}</Link> : c.customerName}
                  <div className="small text-muted">{c.customerCode} · {c.customerPhone}</div>
                </InfoItem>
                <InfoItem label="Xe">{c.licensePlate}<div className="small text-muted">{c.vehicleName} · {c.engineCapacity} cc</div></InfoItem>
                <InfoItem label="Gia hạn">
                  {detail.renewedFromNumber && <div>Gia hạn từ <Link to={`${basePath}/contracts/${c.renewedFromId}`}>{detail.renewedFromNumber}</Link></div>}
                  {detail.renewedByNumber && <div>Đã gia hạn bằng <Link to={`${basePath}/contracts/${detail.renewedById}`}>{detail.renewedByNumber}</Link></div>}
                  {!detail.renewedFromNumber && !detail.renewedByNumber && '—'}
                </InfoItem>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">Quyền lợi bồi thường</Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between small"><span>Hạn mức</span><strong>{money(c.maxCompensation)}</strong></div>
              <div className="d-flex justify-content-between small"><span>Đã sử dụng</span><strong>{money(detail.usedCompensation)}</strong></div>
              <ProgressBar now={usedPct} className="my-2" variant={usedPct > 80 ? 'danger' : 'primary'} />
              <div className="d-flex justify-content-between"><span>Còn lại</span><strong className="text-success">{money(detail.remainingCompensation)}</strong></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Tabs defaultActiveKey="payments" className="mb-3">
            <Tab eventKey="payments" title={`Giao dịch (${detail.payments.length})`}>
              <Table responsive size="sm" className="mb-0">
                <thead><tr><th>Mã GD</th><th>Loại</th><th className="text-end">Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thời gian</th><th>Nội dung</th></tr></thead>
                <tbody>
                  {detail.payments.length === 0 && <EmptyRow colSpan={7} />}
                  {detail.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.paymentCode}</td><td><StatusBadge type="paymentType" value={p.type} /></td>
                      <td className="text-end">{money(p.amount)}</td><td>{PAYMENT_METHODS[p.method] || '—'}</td>
                      <td><StatusBadge type="paymentStatus" value={p.status} /></td>
                      <td>{dateTime(p.paidAt || p.createdAt)}</td><td className="small">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab>
            <Tab eventKey="accidents" title={`Tai nạn (${detail.accidents.length})`}>
              <Table responsive size="sm" className="mb-0">
                <thead><tr><th>Mã</th><th>Thời điểm</th><th>Địa điểm</th><th>Thiệt hại</th><th className="text-end">Ước tính</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {detail.accidents.length === 0 && <EmptyRow colSpan={6} />}
                  {detail.accidents.map((a) => (
                    <tr key={a.id}>
                      <td>{a.accidentCode}</td><td>{dateTime(a.accidentTime)}</td><td>{a.location}</td>
                      <td>{DAMAGE_TYPES[a.damageType]}</td><td className="text-end">{money(a.estimatedDamage)}</td>
                      <td><StatusBadge type="accident" value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab>
            <Tab eventKey="claims" title={`Bồi thường (${detail.compensations.length})`}>
              <Table responsive size="sm" className="mb-0">
                <thead><tr><th>Mã</th><th>Tai nạn</th><th className="text-end">Yêu cầu</th><th className="text-end">Được duyệt</th><th>Trạng thái</th><th>Ngày gửi</th></tr></thead>
                <tbody>
                  {detail.compensations.length === 0 && <EmptyRow colSpan={6} />}
                  {detail.compensations.map((cp) => (
                    <tr key={cp.id}>
                      <td>{cp.claimCode}</td><td>{cp.accidentCode}</td>
                      <td className="text-end">{money(cp.requestedAmount)}</td><td className="text-end">{money(cp.approvedAmount)}</td>
                      <td><StatusBadge type="claim" value={cp.status} /></td><td>{dateTime(cp.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <MethodModal show={modal === 'pay'} title={`Thanh toán hợp đồng ${c.contractNumber}`} amount={c.premiumAmount}
        methods={methods} onHide={() => setModal(null)}
        onSubmit={(method) => contractApi.pay(c.id, method).then(done('Thanh toán thành công. Hợp đồng đã có hiệu lực.'))}>
        {!isStaff && <Alert variant="info" className="small py-2">Cổng thanh toán được mô phỏng: giao dịch được ghi nhận thành công ngay.</Alert>}
      </MethodModal>
      <RenewModal show={modal === 'renew'} contract={c} onHide={() => setModal(null)}
        onDone={(res) => {
          setModal(null);
          toast.success(`Đã tạo hợp đồng gia hạn ${res.contract.contractNumber}. Vui lòng thanh toán để có hiệu lực.`);
          navigate(`${basePath}/contracts/${res.contract.id}`);
        }} />
      <ReasonModal show={modal === 'cancel'} title={`Huỷ hợp đồng ${c.contractNumber}`} label="Lý do huỷ" confirmText="Huỷ hợp đồng"
        onHide={() => setModal(null)} onSubmit={(reason) => contractApi.cancel(c.id, reason).then(done('Đã huỷ hợp đồng'))}>
        {c.status === 'ACTIVE' ? (
          <Alert variant="warning" className="small">
            Hợp đồng đang hiệu lực. Số tiền hoàn dự kiến: <strong>{money(detail.estimatedRefund)}</strong>
            {Number(detail.estimatedRefund) === 0 && ' (không hoàn phí do hợp đồng đã phát sinh bồi thường hoặc hết thời gian)'}.
            Thao tác không thể hoàn tác.
          </Alert>
        ) : <Alert variant="warning" className="small">Giao dịch chờ thanh toán sẽ bị huỷ theo. Thao tác không thể hoàn tác.</Alert>}
      </ReasonModal>
      {isStaff && <EditModal show={modal === 'edit'} contract={c} onHide={() => setModal(null)} onDone={done('Đã cập nhật hợp đồng')} />}
    </>
  );
}
