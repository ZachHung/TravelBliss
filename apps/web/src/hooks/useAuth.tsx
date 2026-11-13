import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthProvider';

const useAuth = () => {
  const result = useContext(AuthContext);

  if (!result) {
    throw new Error('useAuth has to be used within <AuthProvider>');
  }

  return result;
};
export default useAuth;
