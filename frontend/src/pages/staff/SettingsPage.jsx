import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, InputGroup, Spinner, Table } from 'react-bootstrap';
import { settingApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Loading, PageHeader } from '../../components/ui';
import { dateTime } from '../../utils/format';
import { errorMessage } from '../../utils/errors';

function SettingRow({ setting, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(setting.value));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirty = value !== String(setting.value);

  const validate = () => {
    if (value.trim() === '') return 'Vui lòng nhập giá trị';
    if (!/^\d+$/.test(value.trim())) return 'Giá trị phải là số nguyên không âm';
    const n = Number(value);
    if (n < setting.minValue || n > setting.maxValue) return `Giá trị phải từ ${setting.minValue} đến ${setting.maxValue}`;
    return null;
  };

  const save = async () => {
    const err = validate();
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      onSaved(await settingApi.update(setting.key, Number(value)));
      toast.success('Đã lưu cấu hình');
    } catch (e) {
      setError(e?.response?.data?.fieldErrors?.value || errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="fw-medium">{setting.description}</div>
        <code className="small">{setting.key}</code>
      </td>
      <td style={{ minWidth: 230 }}>
        <InputGroup size="sm" hasValidation>
          <Form.Control value={value} inputMode="numeric" isInvalid={!!error}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && save()} aria-label={setting.description} />
          <InputGroup.Text>{setting.unit}</InputGroup.Text>
          <Button variant={dirty ? 'primary' : 'outline-secondary'} disabled={!dirty || busy} onClick={save}>
            {busy ? <Spinner size="sm" /> : 'Lưu'}
          </Button>
          <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
        </InputGroup>
      </td>
      <td className="small text-muted text-nowrap">{setting.minValue} – {setting.maxValue}</td>
      <td className="small text-muted text-nowrap">{dateTime(setting.updatedAt)}</td>
    </tr>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    settingApi.list().then(setSettings).catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <>
      <PageHeader title="Cấu hình hệ thống" icon="bi-gear" subtitle="Tham số nghiệp vụ, thay đổi có hiệu lực ngay" />
      {error && <Alert variant="danger">{error}</Alert>}
      {!settings && !error && <Loading />}
      {settings && (
        <Card>
          <Table responsive className="mb-0">
            <thead><tr><th>Tham số</th><th>Giá trị</th><th>Khoảng cho phép</th><th>Cập nhật</th></tr></thead>
            <tbody>
              {settings.map((s) => (
                <SettingRow key={s.key} setting={s}
                  onSaved={(u) => setSettings((list) => list.map((x) => (x.key === u.key ? u : x)))} />
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
