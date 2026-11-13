import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const {
    info: [user, isResolving],
  } = useAuth();

  const location = useLocation();

  if (isResolving) {
    return <FullscreenLoader />;
  }

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
