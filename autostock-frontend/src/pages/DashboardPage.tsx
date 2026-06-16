import { useEffect, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  fetchDashboardSummary,
  formatCount,
  formatDateTime,
  formatMetricTime,
  formatPrice,
  parseTopProductsPeriod,
  UnauthorizedError,
} from '../api';
import type { DashboardMetric } from '../types';

function metricNumber(metric: DashboardMetric | undefined): number {
  if (!metric) return 0;
  const v = metric.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

interface MetricCardProps {
  title: string;
  icon: ReactNode;
  iconBg: string;
  loading: boolean;
  computedAt?: string;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

function clickableCardClass(interactive?: boolean): string {
  if (!interactive) return '';
  return 'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg';
}

function handleCardKeyDown(onClick: () => void, e: KeyboardEvent<HTMLDivElement>) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick();
  }
}

function MetricCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-10 w-10 rounded-lg bg-slate-200" />
      </div>
      <div className="mt-4 h-9 w-36 rounded bg-slate-200" />
      <div className="mt-4 h-3 w-40 rounded bg-slate-100" />
    </div>
  );
}

function MetricCard({
  title,
  icon,
  iconBg,
  loading,
  computedAt,
  empty,
  emptyMessage,
  children,
  footer,
  onClick,
}: MetricCardProps) {
  if (loading) return <MetricCardSkeleton />;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => handleCardKeyDown(onClick, e) : undefined}
      className={[
        'flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm',
        clickableCardClass(!!onClick),
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={[iconBg, 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'].join(' ')}>
          {icon}
        </div>
      </div>

      <div className="mt-3 min-h-[2.5rem] flex-1">
        {empty ? (
          <p className="text-base text-slate-400">{emptyMessage ?? 'لا بيانات بعد'}</p>
        ) : (
          children
        )}
      </div>

      {footer && <div className="mt-3">{footer}</div>}

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        آخر تحديث: {formatMetricTime(computedAt)}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessMessage = (location.state as { message?: string } | null)?.message ?? '';

  useEffect(() => {
    document.title = 'لوحة التحكم — AutoStock ERP';
  }, []);

  useEffect(() => {
    if (!accessMessage) return;
    navigate(location.pathname, { replace: true, state: {} });
  }, [accessMessage, location.pathname, navigate]);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (summaryQuery.error instanceof UnauthorizedError) {
      navigate('/login', { replace: true, state: { message: summaryQuery.error.message } });
    }
  }, [summaryQuery.error, navigate]);

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;
  const isRefreshing = summaryQuery.isFetching && !summaryQuery.isLoading;

  async function handleRefresh() {
    await summaryQuery.refetch({ cancelRefetch: true });
  }

  const salesToday = metricNumber(summary?.sales_today);
  const netProfit = metricNumber(summary?.net_profit_today);
  const customerDebt = metricNumber(summary?.total_customer_debt);
  const lowStock = metricNumber(summary?.low_stock_count);
  const topProducts = parseTopProductsPeriod(summary?.top_products?.period);

  const hasAnyData =
    !!summary &&
    Object.keys(summary).length > 0 &&
    (salesToday !== 0 ||
      netProfit !== 0 ||
      customerDebt !== 0 ||
      lowStock !== 0 ||
      topProducts.length > 0);

  return (
    <div>
      {accessMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {accessMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">لوحة التحكم</h2>
          <p className="mt-1 text-sm text-slate-500">ملخص أداء اليوم والمؤشرات الرئيسية</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={summaryQuery.isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={['h-4 w-4', isRefreshing ? 'animate-spin' : ''].join(' ')} />
          تحديث
        </button>
      </div>

      {summaryQuery.isError && !(summaryQuery.error instanceof UnauthorizedError) && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {summaryQuery.error instanceof Error
            ? summaryQuery.error.message
            : 'فشل تحميل لوحة التحكم'}
        </p>
      )}

      {!loading && !summaryQuery.isError && !hasAnyData && (
        <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">لا بيانات بعد</p>
          <p className="mt-2 text-sm text-slate-400">
            ستظهر المؤشرات بعد أول مبيعات أو تحديث تلقائي للنظام
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="مبيعات اليوم"
          icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={loading}
          computedAt={summary?.sales_today?.computedAt}
          empty={!loading && salesToday === 0}
          emptyMessage="لا مبيعات اليوم بعد"
          onClick={() => navigate('/reports?tab=daily')}
        >
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {formatPrice(salesToday)}
            <span className="ms-1 text-lg font-medium text-slate-400">د.ع</span>
          </p>
        </MetricCard>

        <MetricCard
          title="صافي ربح اليوم"
          icon={
            netProfit >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )
          }
          iconBg={netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          loading={loading}
          computedAt={summary?.net_profit_today?.computedAt}
          empty={!loading && netProfit === 0}
          emptyMessage="لا أرباح مسجّلة اليوم"
          onClick={() => navigate('/reports?tab=daily')}
        >
          <p
            className={[
              'text-3xl font-bold tracking-tight',
              netProfit > 0 ? 'text-emerald-600' : netProfit < 0 ? 'text-red-600' : 'text-slate-900',
            ].join(' ')}
          >
            {formatPrice(netProfit)}
            <span className="ms-1 text-lg font-medium opacity-70">د.ع</span>
          </p>
        </MetricCard>

        <MetricCard
          title="إجمالي ديون العملاء"
          icon={<Users className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-50"
          loading={loading}
          computedAt={summary?.total_customer_debt?.computedAt}
          empty={!loading && customerDebt === 0}
          emptyMessage="لا ديون على العملاء"
          onClick={() => navigate('/customers')}
        >
          <p
            className={[
              'text-3xl font-bold tracking-tight',
              customerDebt > 0 ? 'text-orange-600' : 'text-green-600',
            ].join(' ')}
          >
            {formatPrice(customerDebt)}
            <span className="ms-1 text-lg font-medium opacity-70">د.ع</span>
          </p>
        </MetricCard>

        <MetricCard
          title="منتجات تحت الحد الأدنى"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          loading={loading}
          computedAt={summary?.low_stock_count?.computedAt}
          empty={!loading && lowStock === 0}
          emptyMessage="المخزون ضمن الحدود"
          onClick={() => navigate('/inventory?tab=low-alerts')}
        >
          <p className={['text-3xl font-bold tracking-tight', lowStock > 0 ? 'text-red-600' : 'text-slate-900'].join(' ')}>
            {formatCount(lowStock)}
            <span className="ms-2 text-base font-medium text-slate-400">منتج</span>
          </p>
        </MetricCard>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/reports?tab=products')}
            onKeyDown={(e) => handleCardKeyDown(() => navigate('/reports?tab=products'), e)}
            className={['rounded-xl border border-slate-200 bg-white p-6 shadow-sm', clickableCardClass(true)].join(' ')}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <Package className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">أكثر المنتجات مبيعاً</h3>
                  <p className="text-xs text-slate-500">حسب الكمية المباعة</p>
                </div>
              </div>
              {isRefreshing && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {topProducts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                لا بيانات بعد — لم تُسجَّل مبيعات كافية
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="py-2 pe-4 text-right font-semibold">#</th>
                      <th className="py-2 pe-4 text-right font-semibold">المنتج</th>
                      <th className="py-2 text-right font-semibold">الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((item, index) => (
                      <tr key={item.productId || index} className="border-b border-slate-50">
                        <td className="py-2.5 pe-4 text-slate-400">{index + 1}</td>
                        <td className="py-2.5 pe-4 font-medium text-slate-900">{item.productName}</td>
                        <td className="py-2.5 font-semibold text-violet-700">
                          {formatCount(item.totalQty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              آخر تحديث: {formatMetricTime(summary?.top_products?.computedAt)}
            </p>
          </div>
        )}
      </div>

      {summaryQuery.dataUpdatedAt > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          تم جلب البيانات: {formatDateTime(new Date(summaryQuery.dataUpdatedAt).toISOString())}
          {' · '}
          تحديث تلقائي كل دقيقة
        </p>
      )}
    </div>
  );
}
