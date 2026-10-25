/**
 * Print / document branding.
 * - Production (قوة الجود client): default values below
 * - Demo trial: set VITE_DEMO_MODE=true on a SEPARATE Vercel project
 */

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

export const COMPANY_BRAND = 'HEMA';
export const COMPANY_RIGHTS = 'ibrahim alkhegane - 07719936448';

export const COMPANY_FULL_NAME = isDemo
  ? 'شركة تجريبية — HEMA'
  : 'شركة قوة الجود';
export const COMPANY_TAGLINE = isDemo
  ? 'نسخة تجريبية لنظام إدارة المبيعات والمخزون'
  : 'لتجارة زيوت السيارات والفلاتر';
export const COMPANY_LEGAL_NAME = isDemo
  ? 'شركة تجريبية — HEMA Demo'
  : 'شركة قوة الجود لتجارة زيوت السيارات والفلاتر';
export const COMPANY_WAREHOUSE = isDemo ? 'مخزن تجريبي' : 'مخزن قوة الجود';
export const COMPANY_ADDRESS = isDemo
  ? 'العراق — نسخة تجريبية'
  : 'واسط - الحفرية - الشارع العام';
export const COMPANY_PHONES = isDemo
  ? '07719936448'
  : '07709438984 - 07772044733';
export const COMPANY_FOOTER = isDemo
  ? 'نسخة تجريبية — HEMA ERP'
  : 'شكراً لتعاملكم معنا — شركة قوة الجود';
export const COMPANY_RECEIPT_MANAGEMENT = '';
export const COMPANY_PRINT_FOOTER = `${COMPANY_FOOTER}`;

export const IS_DEMO_MODE = isDemo;
