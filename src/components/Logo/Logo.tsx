import { IconTrain } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mantine/core';
import { ROUTES } from '@/constants';

const Logo = () => {
  const navigate = useNavigate();
  return (
    <Button
      size="lg"
      style={{ fontFamily: 'Lato' }}
      variant="transparent"
      justify="center"
      onClick={() => navigate(ROUTES.ROOT)}
      leftSection={<IconTrain size={36} />}
    >
      TravelBliss
    </Button>
  );
};

export default Logo;
