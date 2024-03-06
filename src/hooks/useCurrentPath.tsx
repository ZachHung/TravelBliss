import { matchRoutes, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';

const routes = Object.values(ROUTES).map((pathname) => ({ path: pathname }));

const useCurrentPath = () => {
  const location = useLocation();
  const [{ route }] = matchRoutes(routes, location)!;
  return route.path;
};

export default useCurrentPath;
