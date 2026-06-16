import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getToken, getTokenExpiryMs, refreshSessionNow } from '../api';

const WARNING_LEAD_MS = 120_000;
const SESSION_EXPIRED_MESSAGE = 'انتهت جلستك، سجّل دخول مجدداً';

export function SessionWarning() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleWarning = useCallback(() => {
    clearTimer();
    setVisible(false);

    const token = getToken();
    if (!token) return;

    const expMs = getTokenExpiryMs(token);
    if (!expMs) return;

    const msUntilWarning = expMs - Date.now() - WARNING_LEAD_MS;
    if (msUntilWarning <= 0) {
      if (expMs > Date.now()) {
        setVisible(true);
      }
      return;
    }

    timerRef.current = window.setTimeout(() => setVisible(true), msUntilWarning);
  }, [clearTimer]);

  useEffect(() => {
    scheduleWarning();

    function onTokenUpdated() {
      scheduleWarning();
    }

    function onSessionExpired() {
      setVisible(false);
      navigate('/login', {
        replace: true,
        state: { message: SESSION_EXPIRED_MESSAGE },
      });
    }

    window.addEventListener('autostock:login', onTokenUpdated);
    window.addEventListener('autostock:token-refreshed', onTokenUpdated);
    window.addEventListener('autostock:session-expired', onSessionExpired);

    return () => {
      clearTimer();
      window.removeEventListener('autostock:login', onTokenUpdated);
      window.removeEventListener('autostock:token-refreshed', onTokenUpdated);
      window.removeEventListener('autostock:session-expired', onSessionExpired);
    };
  }, [clearTimer, navigate, scheduleWarning]);

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      const ok = await refreshSessionNow();
      if (ok) {
        setVisible(false);
        scheduleWarning();
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-lg flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-medium text-amber-900">
        جلستك ستنتهي خلال دقيقتين — اضغط هنا للتجديد
      </p>
      <button
        type="button"
        onClick={() => void handleRefreshNow()}
        disabled={refreshing}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {refreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التجديد...
          </>
        ) : (
          'تجديد الآن'
        )}
      </button>
    </div>
  );
}
