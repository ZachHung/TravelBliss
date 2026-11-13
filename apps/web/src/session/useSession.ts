import { useContext } from 'react';
import { SessionContext } from './SessionProvider';

const useSession = () => {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useSession has to be used within <SessionProvider>');
  }

  return session;
};

export default useSession;
