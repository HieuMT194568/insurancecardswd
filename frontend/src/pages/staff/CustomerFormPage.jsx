import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Field, SelectField } from '../../components/form';
import { Loading, PageHeader, SubmitButton } from '../../components/ui';
import { customerSchema, todayStr } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { GENDERS } from '../../utils/format';

const EMPTY = { fullName: '', email: '', phone: '', idNumber: '', dateOfBirth: '', gender: '', address: '' };

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(!isEdit);
  const [created, setCreated] = useState(null);
  const form = useForm({ resolver: zodResolver(customerSchema), defaultValues: EMPTY, mode: 'onTouched' });

  useEffect(() => {
    if (!isEdit) return;
    customerApi.get(id)
      .then((c) => { form.reset({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k] ?? ''])) }); setLoaded(true); })
      .catch((e) => setError(errorMessage(e)));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (isEdit) {
        await customerApi.update(id, values);
        toast.success('Đã cập nhật khách hàng');
        navigate(`/staff/customers/${id}`);
      } else {
        setCreated(await customerApi.create(values));
      }
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  if (!loaded && !error) return <Loading />;

  return (
    <>
      <PageHeader title={isEdit ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng'} icon={isEdit ? 'bi-pencil-square' : 'bi-person-plus'}
        subtitle={isEdit ? 'Nhân viên được phép sửa cả email và số CCCD sau khi đối chiếu giấy tờ' : 'Tài khoản được kích hoạt ngay, hệ thống sinh mật khẩu tạm thời'}>
        <Link to={isEdit ? `/staff/customers/${id}` : '/staff/customers'} className="btn btn-light">Quay lại</Link>
      </PageHeader>
      <Card style={{ maxWidth: 900 }}>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form noValidate onSubmit={onSubmit}>
            <Row>
              <Col md={6}><Field form={form} name="fullName" label="Họ và tên" required maxLength={100} /></Col>
              <Col md={6}><Field form={form} name="idNumber" label="Số CCCD" required maxLength={12} inputMode="numeric" /></Col>
              <Col md={6}><Field form={form} name="email" label="Email" type="email" required maxLength={100} /></Col>
              <Col md={6}><Field form={form} name="phone" label="Số điện thoại" required maxLength={10} inputMode="numeric" /></Col>
              <Col md={6}><Field form={form} name="dateOfBirth" label="Ngày sinh" type="date" required max={todayStr()} help="Từ 18 đến 100 tuổi" /></Col>
              <Col md={6}><SelectField form={form} name="gender" label="Giới tính" required options={GENDERS} /></Col>
              <Col md={12}><Field form={form} name="address" label="Địa chỉ" required maxLength={255} /></Col>
            </Row>
            <SubmitButton busy={form.formState.isSubmitting}>{isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}</SubmitButton>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={!!created} backdrop="static" centered>
        <Modal.Header><Modal.Title as="h5"><i className="bi bi-check-circle text-success me-2" />Đã tạo khách hàng</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Tài khoản <strong>{created?.customer.email}</strong> ({created?.customer.customerCode}) đã được tạo.</p>
          <Form.Label>Mật khẩu tạm thời (chỉ hiển thị một lần)</Form.Label>
          <InputGroup className="mb-2">
            <Form.Control readOnly value={created?.temporaryPassword || ''} className="font-monospace" />
            <Button variant="outline-secondary" onClick={() => { navigator.clipboard?.writeText(created.temporaryPassword); toast.info('Đã sao chép mật khẩu'); }}>
              <i className="bi bi-clipboard" />
            </Button>
          </InputGroup>
          <div className="small text-muted">Hãy gửi mật khẩu này cho khách hàng và đề nghị đổi mật khẩu sau lần đăng nhập đầu tiên.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => navigate(`/staff/customers/${created.customer.id}`)}>Xem hồ sơ khách hàng</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
