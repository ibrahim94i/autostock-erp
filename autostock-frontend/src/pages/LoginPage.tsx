import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getToken, login, setToken, setUsername } from '../api';
import { COMPANY_BRAND, COMPANY_RIGHTS } from '../utils/companyInfo';
import { APP_LOGO_URL } from '../utils/companyLogoDataUrl';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionMessage = (location.state as { message?: string } | null)?.message ?? '';
  const [username, setUsernameInput] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `تسجيل الدخول — ${COMPANY_BRAND}`;
  }, []);

  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmed = username.trim();
      const data = await login(trimmed, password);
      setToken(data.accessToken);
      setUsername(trimmed);
      window.dispatchEvent(new Event('autostock:login'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-100">
      <div className="app-watermark pointer-events-none fixed inset-0 z-0 flex items-center justify-center" aria-hidden="true">
        <img src={APP_LOGO_URL} alt="" className="max-w-[min(540px,80vw)] opacity-10" />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <img
              src={APP_LOGO_URL}
              alt={COMPANY_BRAND}
              className="h-14 w-14 object-contain"
            />
            <h1 className="text-2xl font-bold text-slate-900">{COMPANY_BRAND}</h1>
          </div>
          <p className="mt-2 text-center text-sm text-slate-500">تسجيل الدخول</p>

          {sessionMessage && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {sessionMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              اسم المستخدم
              <input
                type="text"
                value={username}
                onChange={(e) => setUsernameInput(e.target.value)}
                autoComplete="username"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              كلمة المرور
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
      <footer className="relative z-10 py-3 text-center text-xs text-slate-400">{COMPANY_RIGHTS}</footer>
    </div>
  );
}
