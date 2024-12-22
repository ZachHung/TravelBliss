import { PropsWithChildren } from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../src/theme';

export function render(ui: React.ReactNode) {
  return testingLibraryRender(ui, {
    wrapper: ({ children }: PropsWithChildren) => (
      <MantineProvider theme={theme}>{children}</MantineProvider>
    ),
  });
}
