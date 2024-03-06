import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const PublicRoute = ({ children }: { children?: ReactNode }) => {
  const {
    info: [user],
  } = useAuth();

  if (!user) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }
  return <Navigate to={ROUTES.ROOT} />;
};

export default PublicRoute;
