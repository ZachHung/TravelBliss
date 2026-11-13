import type { ReactNode } from 'react';
import { MockedProvider, type MockedProviderProps } from '@apollo/client/testing/react';
import { render as testingLibraryRender } from '@testing-library/react';
import { MemoryRouter, type InitialEntry } from 'react-router';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/theme';

type RenderOptions = {
  /** Apollo mocks served by `MockedProvider`. */
  mocks?: MockedProviderProps['mocks'];
  /** Wraps the UI in a `MemoryRouter` starting at this entry. Omit when the UI brings its own router. */
  route?: InitialEntry;
};

export function render(ui: ReactNode, { mocks = [], route }: RenderOptions = {}) {
  return testingLibraryRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => {
      const content =
        route === undefined ? (
          children
        ) : (
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        );

      return (
        <MockedProvider mocks={mocks}>
          <MantineProvider theme={theme} env="test">
            {content}
          </MantineProvider>
        </MockedProvider>
      );
    },
  });
}
