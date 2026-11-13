import { matchRoutes, useLocation } from 'react-router';
import { ROUTES } from '@/constants';

const routes = Object.values(ROUTES).map((pathname) => ({ path: pathname }));

const useCurrentPath = () => {
  const location = useLocation();
  return matchRoutes(routes, location)?.[0]?.route.path;
};

export default useCurrentPath;
