import { useEffect, useState } from 'react';
import { Alert, ButtonGroup, Card, Col, Form, Row, ToggleButton } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { accidentApi, compensationApi, contractApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MoneyField, SelectField, TextAreaField } from '../../components/form';
import { ContractPicker } from '../../components/pickers';
import { PageHeader, SubmitButton } from '../../components/ui';
import { claimExistingSchema, claimNewSchema } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';
import { dateTime, money } from '../../utils/format';
import { AccidentFields } from './AccidentsPage';

const EMPTY_ACCIDENT = { contractId: '', accidentTime: '', location: '', description: '', damageType: '', estimatedDamage: '', policeReportNumber: '' };

/** Chọn schema theo chế độ: tai nạn đã khai báo / khai báo mới. */
const resolver = (values, ctx, opts) =>
  zodResolver(values.mode === 'new' ? claimNewSchema : claimExistingSchema)(values, ctx, opts);

export default function CompensationRequestPage() {
  const { basePath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [accidents, setAccidents] = useState([]);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver,
    defaultValues: { mode: 'new', accidentId: '', accident: EMPTY_ACCIDENT, requestedAmount: '', description: '' },
  });
  const mode = form.watch('mode');
  const accidentId = form.watch('accidentId');
  const selectedAccident = accidents.find((a) => String(a.id) === String(accidentId));

  // Tai nạn có thể yêu cầu bồi thường: đã khai báo, chưa bị bác bỏ
  useEffect(() => {
    accidentApi.search({ size: 100 }).then((r) => setAccidents(r.content.filter((a) => a.status !== 'REJECTED'))).catch(() => {});
  }, []);

  // Mở từ trang chi tiết hợp đồng: chọn sẵn hợp đồng
  useEffect(() => {
    const id = params.get('contractId');
    if (id) {
      contractApi.get(id).then((d) => {
        setContract(d.contract);
        form.setValue('accident.contractId', String(d.contract.id));
      }).catch(() => {});
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const body = values.mode === 'new'
      ? { accident: values.accident, requestedAmount: values.requestedAmount, description: values.description }
      : { accidentId: values.accidentId, requestedAmount: values.requestedAmount, description: values.description };
    try {
      const res = await compensationApi.create(body);
      toast.success(`Đã gửi yêu cầu bồi thường ${res.claimCode}`);
      navigate(`${basePath}/compensations`);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <>
      <PageHeader title="Yêu cầu bồi thường" icon="bi-cash-coin"
        subtitle="Yêu cầu sẽ được nhân viên xác minh tai nạn và duyệt số tiền bồi thường" />
      <Form noValidate onSubmit={onSubmit}>
        <Row className="g-3">
          <Col lg={8}>
            <Card className="mb-3">
              <Card.Header className="bg-white fw-semibold">1. Thông tin tai nạn</Card.Header>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <ButtonGroup className="mb-3">
                  {[['new', 'Khai báo tai nạn mới'], ['existing', 'Tai nạn đã khai báo']].map(([v, l]) => (
                    <ToggleButton key={v} id={`mode-${v}`} type="radio" variant="outline-primary" value={v}
                      checked={mode === v} onChange={() => { form.setValue('mode', v); form.clearErrors(); }}>{l}</ToggleButton>
                  ))}
                </ButtonGroup>
                {mode === 'existing' ? (
                  <SelectField form={form} name="accidentId" label="Chọn tai nạn" required
                    options={accidents.map((a) => ({
                      value: String(a.id),
                      label: `${a.accidentCode} – HĐ ${a.contractNumber} – ${dateTime(a.accidentTime)} – ${money(a.estimatedDamage)}`,
                    }))}
                    help={accidents.length === 0 ? 'Chưa có tai nạn nào đã khai báo' : 'Mỗi tai nạn chỉ có 1 yêu cầu đang xử lý / đã chi trả'} />
                ) : (
                  <>
                    <ContractPicker value={contract} error={form.formState.errors.accident?.contractId?.message}
                      onChange={(c) => { setContract(c); form.setValue('accident.contractId', c ? String(c.id) : ''); form.clearErrors('accident.contractId'); }} />
                    <AccidentFields form={form} prefix="accident." />
                  </>
                )}
                {selectedAccident && mode === 'existing' && (
                  <Alert variant="light" className="small border mb-0">
                    <strong>{selectedAccident.location}</strong> — {selectedAccident.description}
                  </Alert>
                )}
              </Card.Body>
            </Card>
            <Card>
              <Card.Header className="bg-white fw-semibold">2. Nội dung yêu cầu</Card.Header>
              <Card.Body>
                <MoneyField form={form} name="requestedAmount" label="Số tiền yêu cầu bồi thường" required
                  help="Không vượt quá thiệt hại ước tính và hạn mức bồi thường còn lại của hợp đồng" />
                <TextAreaField form={form} name="description" label="Nội dung yêu cầu" required maxLength={1000}
                  help="Tối thiểu 20 ký tự: hạng mục thiệt hại, chứng từ kèm theo..." />
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card>
              <Card.Body className="small text-muted">
                <h6 className="text-body">Lưu ý</h6>
                <ul className="ps-3 mb-3">
                  <li>Chỉ yêu cầu cho hợp đồng đang hiệu lực hoặc đã hết hạn.</li>
                  <li>Thời điểm tai nạn phải nằm trong thời hạn hợp đồng.</li>
                  <li>Thời hạn yêu cầu bồi thường: tối đa 365 ngày kể từ ngày tai nạn (theo cấu hình).</li>
                  <li>Số tiền yêu cầu ≤ thiệt hại ước tính và ≤ hạn mức còn lại của hợp đồng.</li>
                </ul>
                <SubmitButton busy={form.formState.isSubmitting} className="w-100">Gửi yêu cầu</SubmitButton>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
