import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractApi, customerApi, punishmentApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { Field, MoneyField, SelectField, TextAreaField } from '../../components/form';
import { CustomerPicker } from '../../components/pickers';
import { MethodModal, ReasonModal } from '../../components/modals';
import { ConfirmModal, EmptyRow, Loading, PageHeader, Paging, SearchBox, StatusBadge, SubmitButton } from '../../components/ui';
import { punishmentSchema, todayStr } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { LABELS, VIOLATION_TYPES, date, money } from '../../utils/format';

function PunishmentFormModal({ show, punishment, onHide, onSaved }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [contracts, setContracts] = useState([]);
  const form = useForm({ resolver: zodResolver(punishmentSchema) });

  useEffect(() => {
    if (!show) return;
    setError(null);
    const p = punishment;
    form.reset({
      customerId: p ? String(p.customerId) : '',
      contractId: p?.contractId ? String(p.contractId) : '',
      violationType: p?.violationType || '',
      description: p?.description || '',
      violationDate: p?.violationDate || todayStr(),
      amount: p ? String(p.amount) : '',
      dueDate: p?.dueDate || '',
    });
    setCustomer(null);
    if (p) customerApi.get(p.customerId).then(setCustomer).catch(() => {});
  }, [show, punishment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!customer) { setContracts([]); return; }
    contractApi.search({ customerId: customer.id, size: 100 }).then((r) => setContracts(r.content)).catch(() => setContracts([]));
  }, [customer]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = punishment ? await punishmentApi.update(punishment.id, values) : await punishmentApi.create(values);
      toast.success(punishment ? 'Đã cập nhật biên bản phạt' : `Đã lập biên bản ${saved.punishmentCode}`);
      onSaved(saved);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">{punishment ? `Sửa biên bản ${punishment.punishmentCode}` : 'Lập biên bản phạt'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <CustomerPicker value={customer} disabled={!!punishment} error={form.formState.errors.customerId?.message}
            onChange={(c) => { setCustomer(c); form.setValue('customerId', c ? String(c.id) : ''); form.setValue('contractId', ''); form.clearErrors('customerId'); }} />
          <Row>
            <Col md={6}>
              <SelectField form={form} name="contractId" label="Hợp đồng liên quan" placeholder="-- Không gắn hợp đồng --"
                options={contracts.map((c) => ({ value: String(c.id), label: `${c.contractNumber} – ${c.licensePlate}` }))} />
            </Col>
            <Col md={6}><SelectField form={form} name="violationType" label="Loại vi phạm" required options={VIOLATION_TYPES} /></Col>
            <Col md={12}><TextAreaField form={form} name="description" label="Nội dung vi phạm" required maxLength={500} rows={2} /></Col>
            <Col md={4}><Field form={form} name="violationDate" label="Ngày vi phạm" type="date" required max={todayStr()} /></Col>
            <Col md={4}><Field form={form} name="dueDate" label="Hạn nộp" type="date" min={todayStr()} help="Để trống: ngày vi phạm + 30 ngày" /></Col>
            <Col md={4}><MoneyField form={form} name="amount" label="Số tiền phạt" required /></Col>
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

export default function PunishmentsPage() {
  const { isStaff } = useAuth();
  const toast = useToast();
  const paged = usePaged(punishmentApi.search, { q: '', status: '' });
  const [editing, setEditing] = useState(undefined);
  const [paying, setPaying] = useState(null);
  const [waiving, setWaiving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading } = paged;
  const after = (msg, close) => () => { close(null); toast.success(msg); paged.reload(); };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await punishmentApi.remove(deleting.id);
      toast.success('Đã xoá biên bản phạt');
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
      <PageHeader title={isStaff ? 'Xử lý vi phạm' : 'Lịch sử vi phạm / phạt'} icon="bi-shield-exclamation">
        {isStaff && <Button onClick={() => setEditing(null)}><i className="bi bi-plus-lg me-1" />Lập biên bản phạt</Button>}
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Mã biên bản, số hợp đồng, tên khách hàng..." /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.punishment).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead><tr><th>Mã</th>{isStaff && <th>Khách hàng</th>}<th>Vi phạm</th><th>Ngày vi phạm</th><th>Hạn nộp</th><th className="text-end">Số tiền</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={8} text="Không có vi phạm nào" />}
              {data?.content.map((p) => (
                <tr key={p.id}>
                  <td className="fw-medium">{p.punishmentCode}{p.contractNumber && <div className="small text-muted">HĐ {p.contractNumber}</div>}</td>
                  {isStaff && <td>{p.customerName}<div className="small text-muted">{p.customerCode}</div></td>}
                  <td>{VIOLATION_TYPES[p.violationType]}<div className="small text-muted">{p.description}</div>
                    {p.resolutionNote && <div className="small fst-italic">Ghi chú: {p.resolutionNote}</div>}</td>
                  <td>{date(p.violationDate)}</td>
                  <td className="text-nowrap">{date(p.dueDate)} {p.overdue && <span className="badge bg-danger">Quá hạn</span>}</td>
                  <td className="text-end text-nowrap">{money(p.amount)}</td>
                  <td><StatusBadge type="punishment" value={p.status} /></td>
                  <td className="text-end text-nowrap">
                    {p.status === 'UNPAID' && (
                      <>
                        <Button size="sm" variant="primary" className="me-1" onClick={() => setPaying(p)}>{isStaff ? 'Thu tiền' : 'Nộp phạt'}</Button>
                        {isStaff && (
                          <>
                            <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => setWaiving(p)}>Miễn</Button>
                            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setEditing(p)} title="Sửa"><i className="bi bi-pencil" /></Button>
                            <Button size="sm" variant="outline-danger" onClick={() => setDeleting(p)} title="Xoá"><i className="bi bi-trash" /></Button>
                          </>
                        )}
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

      {isStaff && (
        <PunishmentFormModal show={editing !== undefined} punishment={editing} onHide={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); paged.reload(); }} />
      )}
      <MethodModal show={!!paying} title={`Nộp phạt ${paying?.punishmentCode || ''}`} amount={paying?.amount}
        methods={isStaff ? ['CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET'] : ['BANK_TRANSFER', 'CARD', 'E_WALLET']}
        onHide={() => setPaying(null)}
        onSubmit={(method) => punishmentApi.pay(paying.id, method).then(after('Đã ghi nhận nộp phạt', setPaying))} />
      <ReasonModal show={!!waiving} title={`Miễn phạt ${waiving?.punishmentCode || ''}`} label="Lý do miễn phạt" variant="warning" confirmText="Miễn phạt"
        onHide={() => setWaiving(null)} onSubmit={(note) => punishmentApi.waive(waiving.id, note).then(after('Đã miễn phạt', setWaiving))} />
      <ConfirmModal show={!!deleting} title="Xoá biên bản phạt" busy={busy} confirmText="Xoá" onHide={() => setDeleting(null)} onConfirm={confirmDelete}>
        Xoá biên bản <strong>{deleting?.punishmentCode}</strong> (lập nhầm)? Chỉ xoá được biên bản chưa nộp.
      </ConfirmModal>
    </>
  );
}
