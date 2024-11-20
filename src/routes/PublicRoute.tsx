import { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';

const PublicRoute = ({ children }: Partial<PropsWithChildren>) => {
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
