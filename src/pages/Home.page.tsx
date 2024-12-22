import TextGradient from '@/components/TextGradient/TextGradient';
import { Welcome } from '@/components/Welcome/Welcome';
import useAuth from '@/hooks/useAuth';

const HomePage = () => {
  const { info } = useAuth();
  const [user] = info;
  return (
    <>
      {user && <TextGradient> Hello {user.firstName}</TextGradient>}
      <Welcome />
    </>
  );
};

export default HomePage;
