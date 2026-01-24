import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Inventory from './pages/Inventory';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceView from './pages/InvoiceView';
import Dealers from './pages/Dealers';
import DealerAdd from './pages/DealerAdd';
import DealerUpdate from './pages/DealerUpdate';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AccountSettings from './pages/AccountSettings';

// Admin Modules
import AdminInventory from './pages/admin/AdminInventory';
import AdminInventoryAdd from './pages/admin/AdminInventoryAdd';
import AdminDealers from './pages/admin/AdminDealers';
import SupervisorManagement from './pages/admin/SupervisorManagement';
import AdminDispatch from './pages/admin/AdminDispatch';
import DispatchView from './pages/admin/DispatchView';
import LorryManagement from './pages/admin/LorryManagement';
import LorryAdd from './pages/admin/LorryAdd';
import PurchaseOrders from './pages/admin/PurchaseOrders';
import PurchaseOrderCreate from './pages/admin/PurchaseOrderCreate';
import AdminSales from './pages/admin/AdminSales';
import AdminCheques from './pages/admin/AdminCheques';
import AdminCredit from './pages/admin/AdminCredit';
import SupervisorSales from './pages/SupervisorSales';
import SupervisorDispatchView from './pages/SupervisorDispatchView';
import SupervisorCredit from './pages/SupervisorCredit';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes (Accessible by both unless specified) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/account-settings" element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          } />

          {/* Supervisor Modules */}
          <Route path="/inventory" element={
            <ProtectedRoute requireRole="supervisor">
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="/invoice/new" element={
            <ProtectedRoute requireRole="supervisor">
              <InvoiceCreate />
            </ProtectedRoute>
          } />

          <Route path="/invoice/view" element={
            <ProtectedRoute requireRole="supervisor">
              <InvoiceView />
            </ProtectedRoute>
          } />

          <Route path="/dealers" element={
            <ProtectedRoute requireRole="supervisor">
              <Dealers />
            </ProtectedRoute>
          } />

          <Route path="/dealers/add" element={
            <ProtectedRoute requireRole="supervisor">
              <DealerAdd />
            </ProtectedRoute>
          } />

          <Route path="/dealers/update/:id" element={
            <ProtectedRoute requireRole="supervisor">
              <DealerUpdate />
            </ProtectedRoute>
          } />

          <Route path="/sales/view" element={
            <ProtectedRoute requireRole="supervisor">
              <SupervisorSales />
            </ProtectedRoute>
          } />

          <Route path="/dispatch/view" element={
            <ProtectedRoute requireRole="supervisor">
              <SupervisorDispatchView />
            </ProtectedRoute>
          } />

          <Route path="/invoice/create" element={
            <ProtectedRoute requireRole="supervisor">
              <InvoiceCreate />
            </ProtectedRoute>
          } />

          <Route path="/credit/collection" element={
            <ProtectedRoute requireRole="supervisor">
              <SupervisorCredit />
            </ProtectedRoute>
          } />

          {/* Admin Modules */}
          <Route path="/admin/inventory" element={
            <ProtectedRoute requireRole="admin">
              <AdminInventory />
            </ProtectedRoute>
          } />
          <Route path="/admin/inventory/add" element={
            <ProtectedRoute requireRole="admin">
              <AdminInventoryAdd />
            </ProtectedRoute>
          } />

          <Route path="/admin/dealers" element={
            <ProtectedRoute requireRole="admin">
              <AdminDealers />
            </ProtectedRoute>
          } />
          <Route path="/admin/dealers/add" element={
            <ProtectedRoute requireRole="admin">
              <DealerAdd /> {/* Reusing DealerAdd, sidebar handles context */}
            </ProtectedRoute>
          } />
          <Route path="/admin/dealers/update/:id" element={
            <ProtectedRoute requireRole="admin">
              <DealerUpdate /> {/* Reusing DealerUpdate */}
            </ProtectedRoute>
          } />

          <Route path="/admin/supervisors" element={
            <ProtectedRoute requireRole="admin">
              <SupervisorManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/dispatch" element={
            <ProtectedRoute requireRole="admin">
              <AdminDispatch />
            </ProtectedRoute>
          } />
          <Route path="/admin/dispatch/history" element={
            <ProtectedRoute requireRole="admin">
              <DispatchView />
            </ProtectedRoute>
          } />



          <Route path="/admin/lorries" element={
            <ProtectedRoute requireRole="admin">
              <LorryManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/lorries/add" element={
            <ProtectedRoute requireRole="admin">
              <LorryAdd />
            </ProtectedRoute>
          } />

          <Route path="/admin/purchase-orders" element={
            <ProtectedRoute requireRole="admin">
              <PurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/purchase-orders/add" element={
            <ProtectedRoute requireRole="admin">
              <PurchaseOrderCreate />
            </ProtectedRoute>
          } />

          <Route path="/admin/invoices" element={
            <ProtectedRoute requireRole="admin">
              <InvoiceView /> {/* Admin can view all invoices */}
            </ProtectedRoute>
          } />

          <Route path="/admin/sales" element={
            <ProtectedRoute requireRole="admin">
              <AdminSales />
            </ProtectedRoute>
          } />

          <Route path="/admin/cheques" element={
            <ProtectedRoute requireRole="admin">
              <AdminCheques />
            </ProtectedRoute>
          } />

          <Route path="/admin/credit" element={
            <ProtectedRoute requireRole="admin">
              <AdminCredit />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

