import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { methodSchema, reasonSchema } from '../utils/validation';
import { applyServerErrors } from '../utils/errors';
import { PAYMENT_METHODS, money } from '../utils/format';
import { SelectField, TextAreaField } from './form';
import { SubmitButton } from './ui';

/**
 * Chọn phương thức thanh toán / chi trả.
 * methods: danh sách phương thức được phép (khách hàng không có CASH).
 */
export function MethodModal({ show, title, amount, methods, onSubmit, onHide, children, confirmText = 'Xác nhận thanh toán' }) {
  const form = useForm({ resolver: zodResolver(methodSchema), defaultValues: { method: '' } });
  const [serverError, setServerError] = useState(null);
  useEffect(() => { if (show) { form.reset({ method: '' }); setServerError(null); } }, [show]); // eslint-disable-line

  const submit = form.handleSubmit(async ({ method }) => {
    setServerError(null);
    try {
      await onSubmit(method);
    } catch (e) {
      setServerError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form noValidate onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title as="h5">{title}</Modal.Title></Modal.Header>
        <Modal.Body>
          {serverError && <Alert variant="danger">{serverError}</Alert>}
          {amount !== undefined && (
            <div className="mb-3 p-3 bg-light rounded d-flex justify-content-between">
              <span>Số tiền</span><strong className="fs-5">{money(amount)}</strong>
            </div>
          )}
          {children}
          <SelectField form={form} name="method" label="Phương thức" required
            options={methods.map((m) => ({ value: m, label: PAYMENT_METHODS[m] }))} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton busy={form.formState.isSubmitting}>{confirmText}</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/** Nhập lý do (huỷ hợp đồng, từ chối bồi thường, miễn phạt...). */
export function ReasonModal({ show, title, label = 'Lý do', min = 10, max = 500, confirmText = 'Xác nhận', variant = 'danger', onSubmit, onHide, children }) {
  const form = useForm({ resolver: zodResolver(reasonSchema(label, min, max)), defaultValues: { reason: '' } });
  const [serverError, setServerError] = useState(null);
  useEffect(() => { if (show) { form.reset({ reason: '' }); setServerError(null); } }, [show]); // eslint-disable-line

  const submit = form.handleSubmit(async ({ reason }) => {
    setServerError(null);
    try {
      await onSubmit(reason);
    } catch (e) {
      const fe = e?.response?.data?.fieldErrors || {};
      const msg = fe.reason || fe.note;
      if (msg) form.setError('reason', { type: 'server', message: msg });
      setServerError(e?.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form noValidate onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title as="h5">{title}</Modal.Title></Modal.Header>
        <Modal.Body>
          {serverError && <Alert variant="danger">{serverError}</Alert>}
          {children}
          <TextAreaField form={form} name="reason" label={label} required maxLength={max}
            help={`Tối thiểu ${min} ký tự`} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Đóng</Button>
          <SubmitButton variant={variant} busy={form.formState.isSubmitting}>{confirmText}</SubmitButton>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
