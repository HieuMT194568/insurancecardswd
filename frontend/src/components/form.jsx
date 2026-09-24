import { useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { getFieldError } from '../utils/errors';

function Label({ label, required }) {
  if (!label) return null;
  return (
    <Form.Label>
      <span className={required ? 'required' : ''}>{label}</span>
    </Form.Label>
  );
}

/** Ô nhập gắn với react-hook-form. `form` là giá trị trả về của useForm(). */
export function Field({ form, name, label, required, help, type = 'text', className = 'mb-3', ...props }) {
  const err = getFieldError(form.formState.errors, name);
  return (
    <Form.Group className={className} controlId={name}>
      <Label label={label} required={required} />
      <Form.Control type={type} isInvalid={!!err} {...form.register(name)} {...props} />
      <Form.Control.Feedback type="invalid">{err?.message}</Form.Control.Feedback>
      {help && !err && <Form.Text muted>{help}</Form.Text>}
    </Form.Group>
  );
}

export function TextAreaField({ form, name, label, required, help, rows = 3, maxLength, className = 'mb-3', ...props }) {
  const err = getFieldError(form.formState.errors, name);
  const value = form.watch(name) || '';
  return (
    <Form.Group className={className} controlId={name}>
      <Label label={label} required={required} />
      <Form.Control as="textarea" rows={rows} isInvalid={!!err} {...form.register(name)} {...props} />
      <Form.Control.Feedback type="invalid">{err?.message}</Form.Control.Feedback>
      <div className="d-flex justify-content-between">
        <Form.Text muted>{!err && help}</Form.Text>
        {maxLength && <Form.Text muted>{value.length}/{maxLength}</Form.Text>}
      </div>
    </Form.Group>
  );
}

/** options: [{ value, label, disabled? }] hoặc object { value: label } */
export function SelectField({ form, name, label, required, options, placeholder = '-- Chọn --', help, className = 'mb-3', ...props }) {
  const err = getFieldError(form.formState.errors, name);
  const list = Array.isArray(options)
    ? options
    : Object.entries(options).map(([value, l]) => ({ value, label: l }));
  return (
    <Form.Group className={className} controlId={name}>
      <Label label={label} required={required} />
      <Form.Select isInvalid={!!err} {...form.register(name)} {...props}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {list.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </Form.Select>
      <Form.Control.Feedback type="invalid">{err?.message}</Form.Control.Feedback>
      {help && !err && <Form.Text muted>{help}</Form.Text>}
    </Form.Group>
  );
}

export function PasswordField({ form, name, label, required, help, className = 'mb-3', ...props }) {
  const [show, setShow] = useState(false);
  const err = getFieldError(form.formState.errors, name);
  return (
    <Form.Group className={className} controlId={name}>
      <Label label={label} required={required} />
      <InputGroup hasValidation>
        <Form.Control type={show ? 'text' : 'password'} isInvalid={!!err} {...form.register(name)} {...props} />
        <Button variant="outline-secondary" onClick={() => setShow((s) => !s)} tabIndex={-1}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
          <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
        </Button>
        <Form.Control.Feedback type="invalid">{err?.message}</Form.Control.Feedback>
      </InputGroup>
      {help && !err && <Form.Text muted>{help}</Form.Text>}
    </Form.Group>
  );
}

/** Ô nhập số tiền VND: chỉ nhận chữ số, hiển thị số đã định dạng bên dưới. */
export function MoneyField({ form, name, label, required, help, className = 'mb-3', ...props }) {
  const err = getFieldError(form.formState.errors, name);
  const raw = form.watch(name);
  const preview = /^\d+$/.test(raw || '') ? `${Number(raw).toLocaleString('vi-VN')} ₫` : null;
  return (
    <Form.Group className={className} controlId={name}>
      <Label label={label} required={required} />
      <InputGroup hasValidation>
        <Form.Control inputMode="numeric" isInvalid={!!err} {...form.register(name)} {...props} />
        <InputGroup.Text>VND</InputGroup.Text>
        <Form.Control.Feedback type="invalid">{err?.message}</Form.Control.Feedback>
      </InputGroup>
      <Form.Text muted>{preview ? `= ${preview}` : help}</Form.Text>
    </Form.Group>
  );
}

export const PASSWORD_HELP = '8-50 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt (VD: Abc@1234)';
