import { useEffect } from 'react';
import { apiUrl, getToken } from '../api';

/** Ping backend while user session is active — keeps Railway warm during use. */
const KEEPALIVE_MS = 3 * 60 * 1000;

export function BackendKeepAlive() {
  useEffect(() => {
    function ping() {
      if (!getToken()) return;
      fetch(apiUrl('/health'), { method: 'GET', cache: 'no-store' }).catch(() => {});
    }

    ping();

    const intervalId = window.setInterval(ping, KEEPALIVE_MS);

    function onVisible() {
      if (document.visibilityState === 'visible') {
        ping();
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('autostock:login', ping);
    window.addEventListener('autostock:token-refreshed', ping);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('autostock:login', ping);
      window.removeEventListener('autostock:token-refreshed', ping);
    };
  }, []);

  return null;
}
