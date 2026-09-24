import { useState } from 'react';
import { Alert, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/services';
import { Field, PASSWORD_HELP, PasswordField, SelectField } from '../../components/form';
import { SubmitButton } from '../../components/ui';
import { registerSchema, todayStr } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';
import { GENDERS } from '../../utils/format';

const EMPTY = {
  fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  idNumber: '', dateOfBirth: '', gender: '', address: '',
};

export default function Register() {
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: EMPTY, mode: 'onTouched' });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      setDone(await authApi.register(values));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  if (done) {
    return (
      <Container className="py-5">
        <Card className="mx-auto" style={{ maxWidth: 560 }}>
          <Card.Body className="p-4 text-center">
            <div className="display-5 text-success mb-2"><i className="bi bi-envelope-check" /></div>
            <h4 className="fw-bold">Đăng ký thành công</h4>
            <p className="text-muted">{done.message}</p>
            {done.devLink && (
              <Alert variant="info" className="text-start small">
                <strong>Chế độ demo:</strong> hệ thống chưa cấu hình gửi email thật, bấm link dưới đây để xác thực.
                <div className="mt-2"><a href={done.devLink} className="btn btn-sm btn-primary">Xác thực email ngay</a></div>
              </Alert>
            )}
            <Link to="/login" className="btn btn-outline-primary">Về trang đăng nhập</Link>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: 760 }}>
        <Card.Body className="p-4">
          <h4 className="fw-bold mb-1">Đăng ký tài khoản khách hàng</h4>
          <p className="text-muted small">Các trường có dấu <span className="text-danger">*</span> là bắt buộc. Tài khoản cần xác thực qua email trước khi đăng nhập.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form noValidate onSubmit={onSubmit}>
            <h6 className="text-primary mt-2">Thông tin cá nhân</h6>
            <Row>
              <Col md={6}><Field form={form} name="fullName" label="Họ và tên" required maxLength={100} placeholder="Nguyễn Văn A" /></Col>
              <Col md={6}><Field form={form} name="idNumber" label="Số CCCD" required maxLength={12} inputMode="numeric" placeholder="079090001234" /></Col>
              <Col md={6}><Field form={form} name="dateOfBirth" label="Ngày sinh" type="date" required max={todayStr()} help="Khách hàng từ 18 đến 100 tuổi" /></Col>
              <Col md={6}><SelectField form={form} name="gender" label="Giới tính" required options={GENDERS} /></Col>
              <Col md={12}><Field form={form} name="address" label="Địa chỉ" required maxLength={255} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /></Col>
            </Row>
            <h6 className="text-primary mt-2">Thông tin đăng nhập</h6>
            <Row>
              <Col md={6}><Field form={form} name="email" label="Email" type="email" required maxLength={100} autoComplete="email" /></Col>
              <Col md={6}><Field form={form} name="phone" label="Số điện thoại" required maxLength={10} inputMode="numeric" placeholder="0912345678" /></Col>
              <Col md={6}><PasswordField form={form} name="password" label="Mật khẩu" required maxLength={50} help={PASSWORD_HELP} autoComplete="new-password" /></Col>
              <Col md={6}><PasswordField form={form} name="confirmPassword" label="Nhập lại mật khẩu" required maxLength={50} autoComplete="new-password" /></Col>
            </Row>
            <SubmitButton busy={form.formState.isSubmitting} className="w-100 mt-2">Đăng ký</SubmitButton>
          </Form>
          <div className="text-center small mt-3">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></div>
        </Card.Body>
      </Card>
    </Container>
  );
}
