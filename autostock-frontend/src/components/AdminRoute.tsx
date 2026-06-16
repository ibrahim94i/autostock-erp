import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAdmin } from '../api';

export function AdminRoute() {
  const location = useLocation();

  if (!isAdmin()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — هذه الصفحة للمسؤول فقط' }}
      />
    );
  }

  return <Outlet context={location} />;
}
