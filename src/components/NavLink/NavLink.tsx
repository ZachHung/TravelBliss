import { NavLink as RouterNavLink } from 'react-router-dom';
import { Button } from '@mantine/core';

type NavLinkProps = {
  to: string;
  label: string;
  active?: boolean;
};

function NavLink({ to, label, active }: NavLinkProps) {
  return (
    <RouterNavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Button component="div" fw="normal" variant={active || isActive ? 'filled' : 'outline'}>
          {label}
        </Button>
      )}
    </RouterNavLink>
  );
}

export default NavLink;
