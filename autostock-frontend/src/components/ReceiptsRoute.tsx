import { Navigate, Outlet } from 'react-router-dom';
import { canAccessReceipts } from '../api';

export function ReceiptsRoute() {
  if (!canAccessReceipts()) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ message: 'غير مصرح — الوصولات للمسؤول والكاشير والمحاسب فقط' }}
      />
    );
  }

  return <Outlet />;
}
