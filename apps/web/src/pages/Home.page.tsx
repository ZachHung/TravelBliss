import TextGradient from '@/components/TextGradient/TextGradient';
import { Welcome } from '@/components/Welcome/Welcome';
import { useSession } from '@/session';

const HomePage = () => {
  const { user } = useSession();
  return (
    <>
      {user && <TextGradient> Hello {user.firstName}</TextGradient>}
      <Welcome />
    </>
  );
};

export default HomePage;
