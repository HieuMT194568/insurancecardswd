import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { contractApi, customerApi, productApi, vehicleApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, SelectField, TextAreaField } from '../../components/form';
import { CustomerPicker } from '../../components/pickers';
import { PageHeader, SubmitButton } from '../../components/ui';
import { contractSchema, endDateOf, todayStr } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';
import { date, money } from '../../utils/format';

export default function ContractCreatePage() {
  const { isStaff, basePath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(contractSchema(isStaff)),
    defaultValues: {
      customerId: params.get('customerId') || '',
      vehicleId: params.get('vehicleId') || '',
      productId: '',
      startDate: todayStr(),
      termYears: '1',
      note: '',
    },
  });
  const [vehicleId, productId, startDate, termYears] = form.watch(['vehicleId', 'productId', 'startDate', 'termYears']);

  useEffect(() => { productApi.listActive().then(setProducts).catch(() => setProducts([])); }, []);

  // Nhân viên mở từ trang khách hàng/xe: nạp sẵn khách hàng
  useEffect(() => {
    const id = params.get('customerId');
    if (isStaff && id) customerApi.get(id).then(setCustomer).catch(() => {});
  }, [isStaff, params]);

  // Nạp danh sách xe của khách hàng đang chọn
  useEffect(() => {
    if (isStaff && !customer) { setVehicles([]); return; }
    vehicleApi.search({ customerId: isStaff ? customer.id : undefined, size: 100 })
      .then((r) => setVehicles(r.content))
      .catch(() => setVehicles([]));
  }, [isStaff, customer]);

  const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId));
  const product = products.find((p) => String(p.id) === String(productId));

  const productOptions = useMemo(() => products.map((p) => {
    const ok = !vehicle || (vehicle.engineCapacity >= p.minEngineCapacity && vehicle.engineCapacity <= p.maxEngineCapacity);
    return {
      value: String(p.id),
      disabled: !ok,
      label: `${p.name} – ${money(p.annualPremium)}/năm${ok ? '' : ` (chỉ áp dụng ${p.minEngineCapacity}-${p.maxEngineCapacity} cc)`}`,
    };
  }), [products, vehicle]);

  // Đổi xe làm gói hiện tại không còn phù hợp -> bỏ chọn gói
  useEffect(() => {
    if (product && vehicle && (vehicle.engineCapacity < product.minEngineCapacity || vehicle.engineCapacity > product.maxEngineCapacity)) {
      form.setValue('productId', '');
    }
  }, [vehicle, product]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await contractApi.create(values);
      toast.success(`Đã tạo hợp đồng ${res.contract.contractNumber}. Vui lòng thanh toán để hợp đồng có hiệu lực.`);
      navigate(`${basePath}/contracts/${res.contract.id}`);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  const years = Number(termYears) || 0;
  const endDate = startDate && years ? endDateOf(startDate, years) : null;

  return (
    <>
      <PageHeader title={isStaff ? 'Tạo hợp đồng bảo hiểm' : 'Mua bảo hiểm xe máy'} icon="bi-cart-plus"
        subtitle="Hợp đồng ở trạng thái chờ thanh toán cho đến khi được thanh toán" />
      <Form noValidate onSubmit={onSubmit}>
        <Row className="g-3">
          <Col lg={8}>
            <Card>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {isStaff && (
                  <CustomerPicker value={customer} error={form.formState.errors.customerId?.message}
                    onChange={(c) => {
                      setCustomer(c);
                      form.setValue('customerId', c ? String(c.id) : '');
                      form.setValue('vehicleId', '');
                      form.clearErrors('customerId');
                    }} />
                )}
                <SelectField form={form} name="vehicleId" label="Xe được bảo hiểm" required
                  disabled={isStaff && !customer}
                  placeholder={isStaff && !customer ? '-- Chọn khách hàng trước --' : '-- Chọn xe --'}
                  options={vehicles.map((v) => ({ value: String(v.id), label: `${v.licensePlate} – ${v.brand} ${v.model} (${v.engineCapacity} cc)` }))}
                  help={vehicles.length === 0 && (!isStaff || customer)
                    ? <>Chưa có xe nào. <Link to={`${basePath}/vehicles`}>Thêm xe</Link> trước khi mua bảo hiểm.</> : null} />
                <SelectField form={form} name="productId" label="Gói bảo hiểm" required options={productOptions}
                  help="Chỉ các gói phù hợp dung tích xe mới được chọn" />
                <Row>
                  <Col md={6}>
                    <Field form={form} name="startDate" label="Ngày bắt đầu hiệu lực" type="date" required min={todayStr()}
                      help="Từ hôm nay đến tối đa 60 ngày sau (theo cấu hình)" />
                  </Col>
                  <Col md={6}>
                    <SelectField form={form} name="termYears" label="Thời hạn" required placeholder={null}
                      options={[{ value: '1', label: '1 năm' }, { value: '2', label: '2 năm' }, { value: '3', label: '3 năm' }]} />
                  </Col>
                </Row>
                <TextAreaField form={form} name="note" label="Ghi chú" maxLength={500} rows={2} />
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="border-primary">
              <Card.Header className="bg-primary text-white fw-semibold">Tóm tắt hợp đồng</Card.Header>
              <Card.Body>
                <dl className="row mb-0 small">
                  <dt className="col-5 text-muted fw-normal">Xe</dt><dd className="col-7">{vehicle ? vehicle.licensePlate : '—'}</dd>
                  <dt className="col-5 text-muted fw-normal">Gói</dt><dd className="col-7">{product ? product.name : '—'}</dd>
                  <dt className="col-5 text-muted fw-normal">Hiệu lực</dt>
                  <dd className="col-7">{startDate ? date(startDate) : '—'} – {endDate ? date(endDate) : '—'}</dd>
                  <dt className="col-5 text-muted fw-normal">Bồi thường tối đa</dt><dd className="col-7">{product ? money(product.maxCompensation) : '—'}</dd>
                  <dt className="col-5 text-muted fw-normal">Phí / năm</dt><dd className="col-7">{product ? money(product.annualPremium) : '—'}</dd>
                </dl>
                <hr />
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Tổng phí ({years || 0} năm)</span>
                  <span className="fs-4 fw-bold text-primary">{product && years ? money(product.annualPremium * years) : '—'}</span>
                </div>
                <SubmitButton busy={form.formState.isSubmitting} className="w-100">Tạo hợp đồng</SubmitButton>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
