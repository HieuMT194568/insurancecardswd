import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout, GuestOnly, PublicLayout, RequireRole } from './components/layouts';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import NotFound from './pages/public/NotFound';
import Profile from './pages/shared/Profile';
import VehiclesPage from './pages/shared/VehiclesPage';
import ContractsPage from './pages/shared/ContractsPage';
import ContractCreatePage from './pages/shared/ContractCreatePage';
import ContractDetailPage from './pages/shared/ContractDetailPage';
import PaymentsPage from './pages/shared/PaymentsPage';
import AccidentsPage from './pages/shared/AccidentsPage';
import CompensationsPage from './pages/shared/CompensationsPage';
import CompensationRequestPage from './pages/shared/CompensationRequestPage';
import PunishmentsPage from './pages/shared/PunishmentsPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import CustomersPage from './pages/staff/CustomersPage';
import CustomerFormPage from './pages/staff/CustomerFormPage';
import CustomerDetailPage from './pages/staff/CustomerDetailPage';
import ProductsPage from './pages/staff/ProductsPage';
import SettingsPage from './pages/staff/SettingsPage';

/** Các màn hình dùng chung cho cả khách hàng và nhân viên (hiển thị/quyền khác nhau theo vai trò). */
const sharedRoutes = (
  <>
    <Route path="profile" element={<Profile />} />
    <Route path="vehicles" element={<VehiclesPage />} />
    <Route path="contracts" element={<ContractsPage />} />
    <Route path="contracts/new" element={<ContractCreatePage />} />
    <Route path="contracts/:id" element={<ContractDetailPage />} />
    <Route path="payments" element={<PaymentsPage />} />
    <Route path="accidents" element={<AccidentsPage />} />
    <Route path="compensations" element={<CompensationsPage />} />
    <Route path="compensations/new" element={<CompensationRequestPage />} />
    <Route path="punishments" element={<PunishmentsPage />} />
  </>
);

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="reset-password" element={<ResetPassword />} />
      </Route>

      <Route path="customer" element={<RequireRole role="CUSTOMER" />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          {sharedRoutes}
        </Route>
      </Route>

      <Route path="staff" element={<RequireRole role="STAFF" />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {sharedRoutes}
        </Route>
      </Route>

      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
