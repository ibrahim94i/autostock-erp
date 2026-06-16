import { Navigate, Outlet } from 'react-router-dom';
import { canAccessReports } from '../api';

export function ReportsRoute() {
  if (!canAccessReports()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — التقارير للمسؤول والمحاسب فقط' }}
      />
    );
  }

  return <Outlet />;
}
