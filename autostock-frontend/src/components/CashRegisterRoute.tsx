import { Navigate, Outlet } from 'react-router-dom';
import { canAccessCashRegister } from '../api';

export function CashRegisterRoute() {
  if (!canAccessCashRegister()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — الصندوق للمسؤول والكاشير والمحاسب فقط' }}
      />
    );
  }

  return <Outlet />;
}
