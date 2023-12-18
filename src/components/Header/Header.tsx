import { ActionIcon, Burger, Flex, Group, Text, useMantineColorScheme } from '@mantine/core';
import { IconTrain, IconWorld, IconSun, IconMoon } from '@tabler/icons-react';

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

const Header = ({ opened, toggle }: HeaderProps) => {
  const { toggleColorScheme, colorScheme } = useMantineColorScheme();
  return (
    <>
      <Flex justify="space-between" align="center" h="100%">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

        <Group gap={0} c="blue">
          <IconTrain size={36} />
          <Text size="xl" fw="bold" style={{ fontFamily: 'Lato' }}>
            TravelBliss
          </Text>
        </Group>

        <Group>
          <ActionIcon variant="light" size="lg">
            <IconWorld size={20} />
          </ActionIcon>

          <ActionIcon variant="light" size="lg" onClick={toggleColorScheme}>
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
        </Group>
      </Flex>
    </>
  );
};

export default Header;
