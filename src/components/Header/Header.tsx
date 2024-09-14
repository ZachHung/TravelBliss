import { IconLogout, IconMoon, IconSun, IconWorld } from '@tabler/icons-react';
import { ActionIcon, Burger, Flex, Group, useMantineColorScheme } from '@mantine/core';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';
import useCurrentPath from '@/hooks/useCurrentPath';
import Logo from '../Logo/Logo';
import NavLink from '../NavLink/NavLink';

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

const Header = ({ opened, toggle }: HeaderProps) => {
  const {
    info: [user],
    onLogout: [logout],
  } = useAuth();
  const { toggleColorScheme, colorScheme } = useMantineColorScheme();
  const currentPath = useCurrentPath();

  return (
    <>
      <Flex justify="space-between" align="center" h="100%">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

        <Logo />

        <Group>
          {!user && currentPath !== ROUTES.SIGN_IN && (
            <NavLink to={ROUTES.SIGN_IN} label="Sign In" active />
          )}
          <ActionIcon variant="light" size="lg">
            <IconWorld size={20} />
          </ActionIcon>
          <ActionIcon variant="light" size="lg" onClick={toggleColorScheme}>
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
          {user && (
            <ActionIcon variant="light" size="lg" onClick={logout}>
              <IconLogout size={20} />
            </ActionIcon>
          )}
        </Group>
      </Flex>
    </>
  );
};

export default Header;
