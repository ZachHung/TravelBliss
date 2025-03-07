import { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const ProtectedRoute = ({ children }: Partial<PropsWithChildren>) => {
  const {
    info: [user],
  } = useAuth();

  const location = useLocation();

  if (user && user.id) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }
  return <Navigate to={ROUTES.SIGN_IN} replace state={{ from: location }} />;
};

export default ProtectedRoute;
