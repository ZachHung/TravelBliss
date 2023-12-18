import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';

const RootLayout = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <>
      <AppShell
        header={{ height: 52 }}
        footer={{ height: 36 }}
        // navbar={{
        //   width: 100,
        //   breakpoint: 'sm',
        //   collapsed: { mobile: !opened },
        // }}
      >
        <AppShell.Header p="xs">
          <Header opened={opened} toggle={toggle} />
        </AppShell.Header>

        {/* <AppShell.Navbar p="md">Navbar</AppShell.Navbar> */}

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
        <AppShell.Footer zIndex="1000">
          <Footer />
        </AppShell.Footer>
      </AppShell>
    </>
  );
};
export default RootLayout;
