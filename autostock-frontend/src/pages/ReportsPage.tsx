import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintBranding, ReportPrintFooter } from '../components/PrintBranding';
import { CustomersReportTab } from '../components/reports/CustomersReportTab';
import { DailyReportTab } from '../components/reports/DailyReportTab';
import { ExpensesReportTab } from '../components/reports/ExpensesReportTab';
import { InventoryReportTab } from '../components/reports/InventoryReportTab';
import { ProductsReportTab } from '../components/reports/ProductsReportTab';
import { SalesReportTab } from '../components/reports/SalesReportTab';

const TABS = [
  { id: 'daily', label: 'تقرير يومي' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'products', label: 'المنتجات' },
  { id: 'customers', label: 'العملاء' },
  { id: 'inventory', label: 'حركة المخزون' },
  { id: 'expenses', label: 'المصاريف' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function resolveReportsTab(tabParam: string | null): TabId {
  if (tabParam === 'products') return 'products';
  if (tabParam === 'sales') return 'sales';
  if (tabParam === 'customers') return 'customers';
  if (tabParam === 'inventory') return 'inventory';
  if (tabParam === 'expenses') return 'expenses';
  return 'daily';
}

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    resolveReportsTab(searchParams.get('tab')),
  );
  const [printPeriod, setPrintPeriod] = useState('');

  useEffect(() => {
    setActiveTab(resolveReportsTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    document.title = 'التقارير — AutoStock ERP';
  }, []);

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'تقرير';

  return (
    <div className="print-page relative">
      <PrintBranding
        documentTitle={`تقرير ${activeLabel}`}
        periodLabel={printPeriod || undefined}
      />

      <div className="no-print mb-6">
        <h2 className="text-xl font-bold text-slate-900">التقارير</h2>
        <p className="mt-1 text-sm text-slate-500">
          تقارير المبيعات والمنتجات والعملاء والمخزون والمصاريف
        </p>
      </div>

      <div className="no-print mb-6 overflow-x-auto whitespace-nowrap border-b border-slate-200 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'inline-block rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border border-b-0 border-slate-200 bg-white text-blue-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'daily' && (
        <DailyReportTab onPeriodChange={setPrintPeriod} />
      )}
      {activeTab === 'sales' && (
        <SalesReportTab onPeriodChange={setPrintPeriod} />
      )}
      {activeTab === 'products' && (
        <ProductsReportTab onPeriodChange={setPrintPeriod} />
      )}
      {activeTab === 'customers' && (
        <CustomersReportTab onPeriodChange={setPrintPeriod} />
      )}
      {activeTab === 'inventory' && (
        <InventoryReportTab onPeriodChange={setPrintPeriod} />
      )}
      {activeTab === 'expenses' && (
        <ExpensesReportTab onPeriodChange={setPrintPeriod} />
      )}

      <ReportPrintFooter />
    </div>
  );
}
