import { Navigate, Outlet } from 'react-router-dom';
import { canAccessExpenses } from '../api';

export function ExpensesRoute() {
  if (!canAccessExpenses()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — المصاريف للمسؤول والمحاسب فقط' }}
      />
    );
  }

  return <Outlet />;
}
