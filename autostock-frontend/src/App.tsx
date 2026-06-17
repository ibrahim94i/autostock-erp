import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionWarning } from './components/SessionWarning';
import { BackendKeepAlive } from './components/BackendKeepAlive';
import { AdminRoute } from './components/AdminRoute';
import { BackendConnectionGate } from './components/BackendConnectionGate';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ExpensesRoute } from './components/ExpensesRoute';
import { CashRegisterRoute } from './components/CashRegisterRoute';
import { ReceiptsRoute } from './components/ReceiptsRoute';
import { ReportsRoute } from './components/ReportsRoute';
import { AppLayout } from './layouts/AppLayout';
import { PageLoader } from './components/ui/PageLoader';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const PosPage = lazy(() => import('./pages/PosPage').then((m) => ({ default: m.PosPage })));
const CashRegisterPage = lazy(() =>
  import('./pages/CashRegisterPage').then((m) => ({ default: m.CashRegisterPage })),
);
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const PurchasingPage = lazy(() =>
  import('./pages/PurchasingPage').then((m) => ({ default: m.PurchasingPage })),
);
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const SalesReturnsPage = lazy(() =>
  import('./pages/SalesReturnsPage').then((m) => ({ default: m.SalesReturnsPage })),
);
const ReceiptsPage = lazy(() =>
  import('./pages/ReceiptsPage').then((m) => ({ default: m.ReceiptsPage })),
);
const ExpensesPage = lazy(() =>
  import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ActivityLogPage = lazy(() =>
  import('./pages/ActivityLogPage').then((m) => ({ default: m.ActivityLogPage })),
);

const isElectronFile = window.location.protocol === 'file:';
const Router = isElectronFile ? HashRouter : BrowserRouter;

function AppRoutes() {
  return (
    <>
      <SessionWarning />
      <BackendKeepAlive />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
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
