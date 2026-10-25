import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessSettings } from '../api';

export function SettingsRoute() {
  const location = useLocation();

  if (!canAccessSettings()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — لا تملك صلاحية هذه الصفحة' }}
      />
    );
  }

  return <Outlet context={location} />;
}
