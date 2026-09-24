import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Container, Form } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/services';
import { Field } from '../../components/form';
import { Loading, SubmitButton } from '../../components/ui';
import { emailSchema } from '../../utils/validation';
import { errorMessage } from '../../utils/errors';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState({ loading: true });
  const called = useRef(false);
  const [resend, setResend] = useState(null);
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });

  useEffect(() => {
    if (called.current) return; // tránh gọi 2 lần ở StrictMode
    called.current = true;
    if (!token) {
      setState({ loading: false, ok: false, message: 'Thiếu mã xác thực trong đường dẫn.' });
      return;
    }
    authApi.verifyEmail(token)
      .then((r) => setState({ loading: false, ok: true, message: r.message }))
      .catch((e) => setState({ loading: false, ok: false, message: errorMessage(e), code: e?.response?.data?.code }));
  }, [token]);

  const onResend = form.handleSubmit(async ({ email }) => {
    try {
      setResend(await authApi.resendVerification(email));
    } catch (e) {
      setResend({ message: errorMessage(e) });
    }
  });

  return (
    <Container className="py-5">
      <Card className="auth-card mx-auto">
        <Card.Body className="p-4 text-center">
          {state.loading ? <Loading text="Đang xác thực email..." /> : (
            <>
              <div className={`display-5 mb-2 ${state.ok ? 'text-success' : 'text-danger'}`}>
                <i className={`bi ${state.ok ? 'bi-patch-check' : 'bi-x-octagon'}`} />
              </div>
              <h5 className="fw-bold">{state.ok ? 'Xác thực thành công' : 'Xác thực không thành công'}</h5>
              <p className="text-muted">{state.message}</p>
              {state.ok && <Link to="/login" className="btn btn-primary">Đăng nhập</Link>}
              {!state.ok && (
                <Form noValidate onSubmit={onResend} className="text-start mt-3">
                  <Field form={form} name="email" label="Nhập email để nhận link xác thực mới" type="email" required maxLength={100} />
                  <SubmitButton busy={form.formState.isSubmitting} className="w-100">Gửi lại link xác thực</SubmitButton>
                  {resend && (
                    <Alert variant="info" className="mt-3 small">
                      {resend.message}
                      {resend.devLink && <div className="mt-1"><a href={resend.devLink}>Mở link xác thực (demo)</a></div>}
                    </Alert>
                  )}
                </Form>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
