import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { compensationApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import { MoneyField, TextAreaField } from '../../components/form';
import { MethodModal, ReasonModal } from '../../components/modals';
import { EmptyRow, InfoItem, Loading, PageHeader, Paging, SearchBox, StatusBadge, SubmitButton } from '../../components/ui';
import { approveSchema } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';
import { LABELS, dateTime, money } from '../../utils/format';

function ApproveModal({ claim, onHide, onDone }) {
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(approveSchema(claim?.requestedAmount || 0)) });
  useEffect(() => {
    if (claim) { setError(null); form.reset({ approvedAmount: String(claim.requestedAmount), note: '' }); }
  }, [claim]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      onDone(await compensationApi.approve(claim.id, values));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  if (!claim) return null;
  const notVerified = claim.accidentStatus !== 'VERIFIED';
  return (
    <Modal show onHide={onHide} centered>
      <Form noValidate onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title as="h5">Duyệt bồi thường {claim.claimCode}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {notVerified && (
            <Alert variant="warning" className="small">
              Tai nạn {claim.accidentCode} chưa được xác minh. Hãy <Link to="/staff/accidents?status=REPORTED">xác minh tai nạn</Link> trước khi duyệt.
            </Alert>
          )}
          <div className="bg-light rounded p-3 small mb-3">
            <div className="d-flex justify-content-between"><span>Thiệt hại ước tính</span><strong>{money(claim.estimatedDamage)}</strong></div>
            <div className="d-flex justify-content-between"><span>Khách yêu cầu</span><strong>{money(claim.requestedAmount)}</strong></div>
          </div>
          <MoneyField form={form} name="approvedAmount" label="Số tiền duyệt chi" required help="Không vượt quá số tiền yêu cầu và hạn mức còn lại của hợp đồng" />
          <TextAreaField form={form} name="note" label="Ghi chú" maxLength={500} rows={2} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton variant="success" busy={form.formState.isSubmitting} disabled={notVerified}>Duyệt</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function DetailModal({ claim, onHide }) {
  if (!claim) return null;
  const c = claim;
  return (
    <Modal show onHide={onHide} size="lg" centered>
      <Modal.Header closeButton><Modal.Title as="h5">Yêu cầu {c.claimCode} <StatusBadge type="claim" value={c.status} /></Modal.Title></Modal.Header>
      <Modal.Body>
        <Row>
          <InfoItem label="Khách hàng">{c.customerName}</InfoItem>
          <InfoItem label="Hợp đồng">{c.contractNumber}</InfoItem>
          <InfoItem label="Biển số">{c.licensePlate}</InfoItem>
          <InfoItem label="Tai nạn">{c.accidentCode} <StatusBadge type="accident" value={c.accidentStatus} /></InfoItem>
          <InfoItem label="Thời điểm tai nạn">{dateTime(c.accidentTime)}</InfoItem>
          <InfoItem label="Thiệt hại ước tính">{money(c.estimatedDamage)}</InfoItem>
          <InfoItem label="Số tiền yêu cầu">{money(c.requestedAmount)}</InfoItem>
          <InfoItem label="Số tiền được duyệt">{money(c.approvedAmount)}</InfoItem>
          <InfoItem label="Ngày gửi">{dateTime(c.createdAt)}</InfoItem>
          <InfoItem label="Nội dung yêu cầu" className="col-12 mb-3">{c.description}</InfoItem>
          <InfoItem label="Người xử lý">{c.resolvedByName}</InfoItem>
          <InfoItem label="Xử lý lúc">{dateTime(c.resolvedAt)}</InfoItem>
          <InfoItem label="Chi trả lúc">{dateTime(c.paidAt)}</InfoItem>
          <InfoItem label="Ghi chú xử lý" className="col-12 mb-3">{c.resolutionNote}</InfoItem>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default function CompensationsPage() {
  const { isStaff, basePath } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const paged = usePaged(compensationApi.search, { q: '', status: params.get('status') || '' });
  const [viewing, setViewing] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [paying, setPaying] = useState(null);
  const { data, loading } = paged;

  const after = (msg, close) => () => { close(null); toast.success(msg); paged.reload(); };

  return (
    <>
      <PageHeader title={isStaff ? 'Xử lý bồi thường' : 'Lịch sử bồi thường'} icon="bi-cash-coin"
        subtitle="Quy trình: Chờ duyệt → Đã duyệt → Đã chi trả (hoặc Từ chối)">
        <Link to={`${basePath}/compensations/new`} className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Yêu cầu bồi thường</Link>
      </PageHeader>
      <Card>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={6}><SearchBox value={paged.filters.q} onChange={(v) => paged.setFilter('q', v)} placeholder="Mã yêu cầu, mã tai nạn, số hợp đồng..." /></Col>
            <Col md={3}>
              <Form.Select value={paged.filters.status} onChange={(e) => paged.setFilter('status', e.target.value)} aria-label="Trạng thái">
                <option value="">Tất cả trạng thái</option>
                {Object.entries(LABELS.claim).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </Form.Select>
            </Col>
          </Row>
          {paged.error && <Alert variant="danger">{paged.error}</Alert>}
          <Table responsive hover className="mb-0">
            <thead><tr><th>Mã</th>{isStaff && <th>Khách hàng</th>}<th>Hợp đồng / Tai nạn</th><th className="text-end">Yêu cầu</th><th className="text-end">Được duyệt</th><th>Trạng thái</th><th>Ngày gửi</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading && !data && <tr><td colSpan={8}><Loading /></td></tr>}
              {data?.content.length === 0 && <EmptyRow colSpan={8} text="Chưa có yêu cầu bồi thường" />}
              {data?.content.map((c) => (
                <tr key={c.id}>
                  <td className="fw-medium">{c.claimCode}</td>
                  {isStaff && <td>{c.customerName}</td>}
                  <td>
                    <Link to={`${basePath}/contracts/${c.contractId}`}>{c.contractNumber}</Link>
                    <div className="small text-muted">{c.accidentCode} · <StatusBadge type="accident" value={c.accidentStatus} /></div>
                  </td>
                  <td className="text-end text-nowrap">{money(c.requestedAmount)}</td>
                  <td className="text-end text-nowrap">{money(c.approvedAmount)}</td>
                  <td><StatusBadge type="claim" value={c.status} /></td>
                  <td className="small text-nowrap">{dateTime(c.createdAt)}</td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => setViewing(c)} title="Xem"><i className="bi bi-eye" /></Button>
                    {isStaff && c.status === 'PENDING' && (
                      <>
                        <Button size="sm" variant="success" className="me-1" onClick={() => setApproving(c)}>Duyệt</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setRejecting(c)}>Từ chối</Button>
                      </>
                    )}
                    {isStaff && c.status === 'APPROVED' && <Button size="sm" variant="primary" onClick={() => setPaying(c)}>Chi trả</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paging data={data} onChange={paged.setPage} />
        </Card.Body>
      </Card>

      <DetailModal claim={viewing} onHide={() => setViewing(null)} />
      <ApproveModal claim={approving} onHide={() => setApproving(null)} onDone={after('Đã duyệt yêu cầu bồi thường', setApproving)} />
      <ReasonModal show={!!rejecting} title={`Từ chối yêu cầu ${rejecting?.claimCode || ''}`} label="Lý do từ chối" confirmText="Từ chối"
        onHide={() => setRejecting(null)} onSubmit={(note) => compensationApi.reject(rejecting.id, note).then(after('Đã từ chối yêu cầu', setRejecting))} />
      <MethodModal show={!!paying} title={`Chi trả bồi thường ${paying?.claimCode || ''}`} amount={paying?.approvedAmount}
        methods={['BANK_TRANSFER', 'CASH']} confirmText="Xác nhận đã chi trả" onHide={() => setPaying(null)}
        onSubmit={(method) => compensationApi.payout(paying.id, method).then(after('Đã ghi nhận chi trả bồi thường', setPaying))} />
    </>
  );
}
