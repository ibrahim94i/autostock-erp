import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchSettings,
  getToken,
  SETTINGS_CACHE_KEY,
} from '../api';
import type { CompanySettings } from '../types';
import type { ReceiptSize } from '../pos/invoiceUtils';

export const DEFAULT_SETTINGS: CompanySettings = {
  id: 'default',
  companyName: 'شركتي',
  companyPhone: null,
  companyAddress: null,
  companyLogo: null,
  taxNumber: null,
  currency: 'د.ع',
  receiptSize: '80mm',
  defaultTaxRate: 0,
  defaultReceiptFooter: 'شكراً لتعاملكم معنا',
  telegramBotToken: null,
  telegramChatId: null,
  telegramDailyTime: '21:00',
  telegramEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

function readCachedSettings(): CompanySettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompanySettings;
  } catch {
    return null;
  }
}

function writeCachedSettings(settings: CompanySettings): void {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
}

export function normalizeReceiptSize(value: string | undefined): ReceiptSize {
  const normalized = (value ?? '80mm').toLowerCase();
  if (normalized === 'a4') return 'a4';
  if (normalized === '58mm') return '58mm';
  return '80mm';
}

interface SettingsContextValue {
  settings: CompanySettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  setSettingsLocal: (settings: CompanySettings) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(
    () => readCachedSettings() ?? DEFAULT_SETTINGS,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    if (!getToken()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchSettings();
      setSettings(data);
      writeCachedSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الإعدادات';
      setError(message);
      const cached = readCachedSettings();
      if (cached) {
        setSettings(cached);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) {
      void refreshSettings();
    }

    const onLogin = () => {
      void refreshSettings();
    };
    window.addEventListener('autostock:login', onLogin);
    return () => window.removeEventListener('autostock:login', onLogin);
  }, [refreshSettings]);

  const setSettingsLocal = useCallback((next: CompanySettings) => {
    setSettings(next);
    writeCachedSettings(next);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      refreshSettings,
      setSettingsLocal,
    }),
    [settings, loading, error, refreshSettings, setSettingsLocal],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}

export function useSettingsOptional(): SettingsContextValue | null {
  return useContext(SettingsContext);
}
