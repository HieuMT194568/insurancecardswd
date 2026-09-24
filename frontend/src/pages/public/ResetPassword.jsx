import { useState } from 'react';
import { Alert, Card, Container, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/services';
import { PASSWORD_HELP, PasswordField } from '../../components/form';
import { SubmitButton } from '../../components/ui';
import { resetPasswordSchema } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: '', confirmPassword: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      setDone(await authApi.resetPassword({ token, ...values }));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Container className="py-5">
      <Card className="auth-card mx-auto">
        <Card.Body className="p-4">
          <h4 className="fw-bold mb-3">Đặt lại mật khẩu</h4>
          {!token && <Alert variant="danger">Đường dẫn không hợp lệ (thiếu mã đặt lại mật khẩu).</Alert>}
          {error && <Alert variant="danger">{error} {error.includes('hết hạn') && <Link to="/forgot-password">Yêu cầu link mới</Link>}</Alert>}
          {done ? (
            <>
              <Alert variant="success">{done.message}</Alert>
              <Link to="/login" className="btn btn-primary w-100">Đăng nhập</Link>
            </>
          ) : token && (
            <Form noValidate onSubmit={onSubmit}>
              <PasswordField form={form} name="newPassword" label="Mật khẩu mới" required maxLength={50} help={PASSWORD_HELP} autoComplete="new-password" />
              <PasswordField form={form} name="confirmPassword" label="Nhập lại mật khẩu mới" required maxLength={50} autoComplete="new-password" />
              <SubmitButton busy={form.formState.isSubmitting} className="w-100">Đặt lại mật khẩu</SubmitButton>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
