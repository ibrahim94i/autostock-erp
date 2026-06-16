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

export function AppLayout() {
  const navigate = useNavigate();
  const username = getUsername() ?? 'مستخدم';
  const admin = isAdmin();
  const showReports = canAccessReports();
  const showCashRegister = canAccessCashRegister();
  const showExpenses = canAccessExpenses();
  const showReceipts = canAccessReceipts();
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  function handleThemeToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-gray-900">
      {/* Sidebar — first in RTL flex = right side */}
      <aside className="flex w-64 shrink-0 flex-col border-s border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-gray-700">
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400">AutoStock</p>
          <p className="text-lg font-bold text-slate-900 dark:text-gray-100">نظام ERP</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
          {showCashRegister && (
            <NavLink
              key={cashNavItem.to}
              to={cashNavItem.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                ].join(' ')
              }
            >
              <cashNavItem.icon className="h-5 w-5 shrink-0" />
              <span>{cashNavItem.label}</span>
            </NavLink>
          )}
          {showExpenses && (
            <NavLink
              key={expensesNavItem.to}
              to={expensesNavItem.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                ].join(' ')
              }
            >
              <expensesNavItem.icon className="h-5 w-5 shrink-0" />
              <span>{expensesNavItem.label}</span>
            </NavLink>
          )}
          {showReceipts && (
            <NavLink
              key={receiptsNavItem.to}
              to={receiptsNavItem.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                ].join(' ')
              }
            >
              <receiptsNavItem.icon className="h-5 w-5 shrink-0" />
              <span>{receiptsNavItem.label}</span>
            </NavLink>
          )}
          <NavLink
            key={salesReturnsNavItem.to}
            to={salesReturnsNavItem.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
              ].join(' ')
            }
          >
            <salesReturnsNavItem.icon className="h-5 w-5 shrink-0" />
            <span>{salesReturnsNavItem.label}</span>
          </NavLink>
          {showReports && (
            <NavLink
              key={reportsNavItem.to}
              to={reportsNavItem.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                ].join(' ')
              }
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
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  ].join(' ')
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-gray-700 dark:text-gray-500">
          v0.1 — AutoStock ERP
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-lg font-bold text-slate-900 dark:text-gray-100">AutoStock ERP</h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              aria-label={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-gray-700 dark:text-gray-200">
              {username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-100 p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
