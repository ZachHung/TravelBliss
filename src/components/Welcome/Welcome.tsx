import { Stack, Text, Title } from '@mantine/core';
import classes from './Welcome.module.css';

export function Welcome() {
  return (
    <Stack align="center">
      <Title className={classes.title} ta="center" mt={100}>
        Welcome to{' '}
        <Text inherit variant="gradient" component="span" gradient={{ from: 'teal', to: 'blue' }}>
          TravelBliss
        </Text>
      </Title>

      <Text w="66%">
        TravelBliss was established for the purpose of operating the national passenger rail
        services on behalf of the government of Vietnam. Currently TravelBliss operates in 35
        provinces across Vietnam, with 3 main routes covering a distance of over 2,600 kilometers.
      </Text>
    </Stack>
  );
}
