import { useEffect, useState } from 'react';
import { Alert, Card, Col, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { meApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Field, PASSWORD_HELP, PasswordField, SelectField } from '../../components/form';
import { InfoItem, Loading, PageHeader, StatusBadge, SubmitButton } from '../../components/ui';
import { changePasswordSchema, profileSchema, staffProfileSchema, todayStr } from '../../utils/validation';
import { applyServerErrors, errorMessage } from '../../utils/errors';
import { GENDERS, date, dateTime } from '../../utils/format';

function ProfileForm({ profile, isStaff, onSaved }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const c = profile.customer;
  const form = useForm({
    resolver: zodResolver(isStaff ? staffProfileSchema : profileSchema),
    defaultValues: isStaff
      ? { fullName: profile.fullName, phone: profile.phone }
      : { fullName: profile.fullName, phone: profile.phone, dateOfBirth: c.dateOfBirth, gender: c.gender, address: c.address },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const updated = isStaff ? await meApi.updateStaffProfile(values) : await meApi.updateProfile(values);
      toast.success('Đã cập nhật hồ sơ');
      onSaved(updated);
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Form noValidate onSubmit={onSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        <Col md={6}><Field form={form} name="fullName" label="Họ và tên" required maxLength={100} /></Col>
        <Col md={6}><Field form={form} name="phone" label="Số điện thoại" required maxLength={10} inputMode="numeric" /></Col>
        {!isStaff && (
          <>
            <Col md={6}><Field form={form} name="dateOfBirth" label="Ngày sinh" type="date" required max={todayStr()} /></Col>
            <Col md={6}><SelectField form={form} name="gender" label="Giới tính" required options={GENDERS} /></Col>
            <Col md={12}><Field form={form} name="address" label="Địa chỉ" required maxLength={255} /></Col>
          </>
        )}
      </Row>
      <Form.Text muted className="d-block mb-3">
        {isStaff ? 'Email do quản trị cấp, không thể tự thay đổi.' : 'Email và số CCCD là thông tin định danh, chỉ nhân viên được phép thay đổi.'}
      </Form.Text>
      <SubmitButton busy={form.formState.isSubmitting}>Lưu thay đổi</SubmitButton>
    </Form>
  );
}

function ChangePasswordForm() {
  const { saveSession } = useAuth();
  const toast = useToast();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const auth = await meApi.changePassword(values);
      saveSession(auth); // token cũ bị vô hiệu -> dùng token mới
      form.reset();
      toast.success('Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị đăng xuất.');
    } catch (e) {
      setError(applyServerErrors(e, form.setError));
    }
  });

  return (
    <Form noValidate onSubmit={onSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <PasswordField form={form} name="currentPassword" label="Mật khẩu hiện tại" required maxLength={50} autoComplete="current-password" />
      <PasswordField form={form} name="newPassword" label="Mật khẩu mới" required maxLength={50} help={PASSWORD_HELP} autoComplete="new-password" />
      <PasswordField form={form} name="confirmPassword" label="Nhập lại mật khẩu mới" required maxLength={50} autoComplete="new-password" />
      <SubmitButton busy={form.formState.isSubmitting} variant="warning">Đổi mật khẩu</SubmitButton>
    </Form>
  );
}

export default function Profile() {
  const { isStaff, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    meApi.get().then(setProfile).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!profile) return <Loading />;
  const c = profile.customer;

  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" icon="bi-person-circle" subtitle={isStaff ? 'Tài khoản nhân viên' : `Mã khách hàng: ${c.customerCode}`} />
      <Card className="mb-3">
        <Card.Body>
          <Row>
            <InfoItem label="Email">{profile.email}</InfoItem>
            <InfoItem label="Trạng thái"><StatusBadge type="user" value={profile.status} /></InfoItem>
            <InfoItem label="Ngày tạo tài khoản">{dateTime(profile.createdAt)}</InfoItem>
            {c && (
              <>
                <InfoItem label="Số CCCD">{c.idNumber}</InfoItem>
                <InfoItem label="Ngày sinh">{date(c.dateOfBirth)}</InfoItem>
                <InfoItem label="Số xe đã đăng ký">{c.vehicleCount}</InfoItem>
              </>
            )}
          </Row>
        </Card.Body>
      </Card>
      <Row className="g-3">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">Cập nhật thông tin</Card.Header>
            <Card.Body>
              <ProfileForm profile={profile} isStaff={isStaff} onSaved={(p) => { setProfile(p); updateUser({ fullName: p.fullName, phone: p.phone }); }} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="h-100">
            <Card.Header className="bg-white fw-semibold">Đổi mật khẩu</Card.Header>
            <Card.Body><ChangePasswordForm /></Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
