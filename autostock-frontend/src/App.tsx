import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionWarning } from './components/SessionWarning';
import { AdminRoute } from './components/AdminRoute';
import { BackendConnectionGate } from './components/BackendConnectionGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ExpensesRoute } from './components/ExpensesRoute';
import { CashRegisterRoute } from './components/CashRegisterRoute';
import { ReceiptsRoute } from './components/ReceiptsRoute';
import { ReportsRoute } from './components/ReportsRoute';
import { AppLayout } from './layouts/AppLayout';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { PurchasingPage } from './pages/PurchasingPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SalesReturnsPage } from './pages/SalesReturnsPage';
import { ActivityLogPage } from './pages/ActivityLogPage';

const isElectronFile = window.location.protocol === 'file:';
const Router = isElectronFile ? HashRouter : BrowserRouter;

function AppRoutes() {
  return (
    <>
      <SessionWarning />
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route element={<CashRegisterRoute />}>
            <Route path="cash-register" element={<CashRegisterPage />} />
          </Route>
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchasing" element={<PurchasingPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="sales-returns" element={<SalesReturnsPage />} />

          <Route element={<ReceiptsRoute />}>
            <Route path="receipts" element={<ReceiptsPage />} />
          </Route>

          <Route element={<ExpensesRoute />}>
            <Route path="expenses" element={<ExpensesPage />} />
          </Route>

          <Route element={<ReportsRoute />}>
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="activity-log" element={<ActivityLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}

function App() {
  const app = (
    <Router>
      <AppRoutes />
    </Router>
  );

  if (isElectronFile) {
    return <BackendConnectionGate>{app}</BackendConnectionGate>;
  }

  return app;
}

export default App;
