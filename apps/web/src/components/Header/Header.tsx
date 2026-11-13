import { IconLogout, IconMoon, IconSun, IconWorld } from '@tabler/icons-react';
import { ActionIcon, Burger, Flex, Group, useMantineColorScheme } from '@mantine/core';
import Logo from '@/components/Logo/Logo';
import NavLink from '@/components/NavLink/NavLink';
import { ROUTES } from '@/constants';
import useCurrentPath from '@/hooks/useCurrentPath';
import { useSession } from '@/session';

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

const Header = ({ opened, toggle }: HeaderProps) => {
  const { user, signOut } = useSession();
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
            <ActionIcon variant="light" size="lg" onClick={signOut}>
              <IconLogout size={20} />
            </ActionIcon>
          )}
        </Group>
      </Flex>
    </>
  );
};

export default Header;
