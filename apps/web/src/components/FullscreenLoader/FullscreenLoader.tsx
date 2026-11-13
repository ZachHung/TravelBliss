import { Center, Loader } from '@mantine/core';

const FullscreenLoader = () => (
  <Center w="100dvw" h="100dvh" data-testid="fullscreen-loader">
    <Loader />
  </Center>
);

export default FullscreenLoader;
