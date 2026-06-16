import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  Users,
  Building2,
  LogOut,
  Settings,
  BarChart3,
  Moon,
  Sun,
  Wallet,
  Receipt,
  ScrollText,
  RotateCcw,
  History,
  Menu,
  X,
} from 'lucide-react';
import {
  clearToken,
  getUsername,
  isAdmin,
  canAccessReports,
  canAccessCashRegister,
  canAccessExpenses,
  canAccessReceipts,
} from '../api';

const THEME_KEY = 'theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
}

const navItems = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/pos', label: 'نقطة البيع', icon: ShoppingCart },
  { to: '/products', label: 'المنتجات', icon: Package },
  { to: '/inventory', label: 'المخزون', icon: Warehouse },
  { to: '/purchasing', label: 'المشتريات', icon: Truck },
  { to: '/customers', label: 'العملاء', icon: Users },
  { to: '/suppliers', label: 'الموردون', icon: Building2 },
] as const;

const cashNavItem = { to: '/cash-register', label: 'الصندوق', icon: Wallet } as const;

const expensesNavItem = { to: '/expenses', label: 'المصاريف', icon: Receipt } as const;

const receiptsNavItem = { to: '/receipts', label: 'الوصولات', icon: ScrollText } as const;

const salesReturnsNavItem = { to: '/sales-returns', label: 'مرتجعات المبيعات', icon: RotateCcw } as const;

const reportsNavItem = { to: '/reports', label: 'التقارير', icon: BarChart3 } as const;

const adminNavItems = [
  { to: '/settings', label: 'الإعدادات', icon: Settings },
  { to: '/activity-log', label: 'سجل النشاط', icon: History },
] as const;

function navLinkClass(isActive: boolean): string {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
  ].join(' ');
}

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const admin = isAdmin();
  const showReports = canAccessReports();
  const showCashRegister = canAccessCashRegister();
  const showExpenses = canAccessExpenses();
  const showReceipts = canAccessReceipts();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => navLinkClass(isActive)} onClick={onNavigate}>
          <Icon className="h-5 w-5 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
      {showCashRegister && (
        <NavLink
          key={cashNavItem.to}
          to={cashNavItem.to}
          className={({ isActive }) => navLinkClass(isActive)}
          onClick={onNavigate}
        >
          <cashNavItem.icon className="h-5 w-5 shrink-0" />
          <span>{cashNavItem.label}</span>
        </NavLink>
      )}
      {showExpenses && (
        <NavLink
          key={expensesNavItem.to}
          to={expensesNavItem.to}
          className={({ isActive }) => navLinkClass(isActive)}
          onClick={onNavigate}
        >
          <expensesNavItem.icon className="h-5 w-5 shrink-0" />
          <span>{expensesNavItem.label}</span>
        </NavLink>
      )}
      {showReceipts && (
        <NavLink
          key={receiptsNavItem.to}
          to={receiptsNavItem.to}
          className={({ isActive }) => navLinkClass(isActive)}
          onClick={onNavigate}
        >
          <receiptsNavItem.icon className="h-5 w-5 shrink-0" />
          <span>{receiptsNavItem.label}</span>
        </NavLink>
      )}
      <NavLink
        key={salesReturnsNavItem.to}
        to={salesReturnsNavItem.to}
        className={({ isActive }) => navLinkClass(isActive)}
        onClick={onNavigate}
      >
        <salesReturnsNavItem.icon className="h-5 w-5 shrink-0" />
        <span>{salesReturnsNavItem.label}</span>
      </NavLink>
      {showReports && (
        <NavLink
          key={reportsNavItem.to}
          to={reportsNavItem.to}
          className={({ isActive }) => navLinkClass(isActive)}
          onClick={onNavigate}
        >
          <reportsNavItem.icon className="h-5 w-5 shrink-0" />
          <span>{reportsNavItem.label}</span>
        </NavLink>
      )}
      {admin &&
        adminNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => navLinkClass(isActive)}
            onClick={onNavigate}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
    </nav>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const username = getUsername() ?? 'مستخدم';
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleThemeToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-s border-slate-200 bg-white shadow-sm lg:flex dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-gray-700">
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400">AutoStock</p>
          <p className="text-lg font-bold text-slate-900 dark:text-gray-100">نظام ERP</p>
        </div>
        <SidebarNav />
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-gray-700 dark:text-gray-500">
          v0.1 — AutoStock ERP
        </div>
      </aside>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile drawer — anchored to physical right (RTL menu) */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-s border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:hidden dark:border-gray-700 dark:bg-gray-800',
          sidebarOpen ? 'translate-x-0' : 'hidden pointer-events-none',
        ].join(' ')}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-gray-700">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400">AutoStock</p>
            <p className="text-lg font-bold text-slate-900 dark:text-gray-100">نظام ERP</p>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav onNavigate={closeSidebar} />
        <div className="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-gray-700 dark:text-gray-500">
          v0.1 — AutoStock ERP
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-gray-100">AutoStock ERP</h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              aria-label={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 sm:block dark:bg-gray-700 dark:text-gray-200">
              {username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-100 p-4 lg:p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
