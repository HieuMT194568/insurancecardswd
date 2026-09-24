import { useState } from 'react';
import { Alert, Card, Container, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/services';
import { Field } from '../../components/form';
import { SubmitButton } from '../../components/ui';
import { emailSchema } from '../../utils/validation';
import { applyServerErrors } from '../../utils/errors';

export default function ForgotPassword() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      setResult(await authApi.forgotPassword(email));
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Container className="py-5">
      <Card className="auth-card mx-auto">
        <Card.Body className="p-4">
          <h4 className="fw-bold mb-1">Quên mật khẩu</h4>
          <p className="text-muted small">Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu (hiệu lực 30 phút).</p>
          {error && <Alert variant="danger">{error}</Alert>}
          {result ? (
            <Alert variant="success">
              {result.message}
              {result.devLink && (
                <div className="mt-2 small"><strong>Chế độ demo:</strong> <a href={result.devLink}>Mở link đặt lại mật khẩu</a></div>
              )}
            </Alert>
          ) : (
            <Form noValidate onSubmit={onSubmit}>
              <Field form={form} name="email" label="Email" type="email" required maxLength={100} autoFocus />
              <SubmitButton busy={form.formState.isSubmitting} className="w-100">Gửi link đặt lại mật khẩu</SubmitButton>
            </Form>
          )}
          <div className="text-center small mt-3"><Link to="/login">Quay lại đăng nhập</Link></div>
        </Card.Body>
      </Card>
    </Container>
  );
}
