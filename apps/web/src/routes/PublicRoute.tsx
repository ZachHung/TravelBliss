import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const PublicRoute = ({ children }: { children?: ReactNode }) => {
  const {
    info: [user],
  } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }
  // The one place that redirects after login, so no other navigate can race it
  return <Navigate to={location.state?.from?.pathname ?? ROUTES.ROOT} replace />;
};

export default PublicRoute;
