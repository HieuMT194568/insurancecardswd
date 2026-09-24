import { useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Field, PasswordField } from '../../components/form';
import { SubmitButton } from '../../components/ui';
import { loginSchema } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';

const DEMO = [
  { label: 'Nhân viên', email: 'staff@insurancecard.vn', password: 'Staff@123' },
  { label: 'Khách hàng', email: 'customer@insurancecard.vn', password: 'Customer@123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [resendMsg, setResendMsg] = useState(null);
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null);
    setErrorCode(null);
    setResendMsg(null);
    try {
      const user = await login(email, password);
      const home = user.role === 'STAFF' ? '/staff/dashboard' : '/customer/dashboard';
      const from = location.state?.from;
      const prefix = user.role === 'STAFF' ? '/staff' : '/customer';
      navigate(from && from.startsWith(prefix) ? from : home, { replace: true });
    } catch (e) {
      setErrorCode(e?.response?.data?.code);
      setError(applyServerErrors(e, form.setError));
    }
  });

  const resend = async () => {
    try {
      const res = await authApi.resendVerification(form.getValues('email'));
      setResendMsg(res);
    } catch (e) {
      setResendMsg({ message: e?.response?.data?.message || 'Không gửi được link xác thực' });
    }
  };

  return (
    <Container className="py-5">
      <Card className="auth-card mx-auto">
        <Card.Body className="p-4">
          <h4 className="fw-bold mb-1">Đăng nhập</h4>
          <p className="text-muted small">Đăng nhập để quản lý bảo hiểm xe của bạn</p>
          {params.get('expired') && <Alert variant="warning">Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.</Alert>}
          {error && (
            <Alert variant="danger">
              {error}
              {errorCode === 'EMAIL_NOT_VERIFIED' && (
                <div className="mt-2"><Button size="sm" variant="outline-danger" onClick={resend}>Gửi lại link xác thực</Button></div>
              )}
            </Alert>
          )}
          {resendMsg && (
            <Alert variant="info">
              {resendMsg.message}
              {resendMsg.devLink && <div className="mt-2"><a href={resendMsg.devLink}>Mở link xác thực (chế độ demo)</a></div>}
            </Alert>
          )}
          <Form noValidate onSubmit={onSubmit}>
            <Field form={form} name="email" label="Email" type="email" required autoComplete="username" maxLength={100} autoFocus />
            <PasswordField form={form} name="password" label="Mật khẩu" required autoComplete="current-password" maxLength={50} />
            <div className="d-flex justify-content-end mb-3">
              <Link to="/forgot-password" className="small">Quên mật khẩu?</Link>
            </div>
            <SubmitButton busy={form.formState.isSubmitting} className="w-100">Đăng nhập</SubmitButton>
          </Form>
          <div className="text-center small mt-3">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></div>
          <hr />
          <div className="small text-muted mb-2">Tài khoản demo (bấm để điền):</div>
          <div className="d-flex gap-2">
            {DEMO.map((d) => (
              <Button key={d.email} size="sm" variant="outline-secondary" className="flex-fill"
                onClick={() => { form.setValue('email', d.email); form.setValue('password', d.password); form.clearErrors(); }}>
                {d.label}
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
