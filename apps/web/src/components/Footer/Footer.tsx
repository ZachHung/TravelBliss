import { Flex, Group, Text } from '@mantine/core';

const Footer = () => (
  <>
    <Flex justify="space-between" align="center" p="xs">
      <Group>
        <Text size="xs">Copyright 2023 TravelBliss. All rights reserved.</Text>
      </Group>

      <Group>
        <Text size="xs">Privacy Policy</Text>
        <Text size="xs">Terms of Service</Text>
        <Text size="xs">Contact</Text>
        <Text size="xs">About</Text>
      </Group>
    </Flex>
  </>
);

export default Footer;
