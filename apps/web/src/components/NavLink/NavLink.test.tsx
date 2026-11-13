import { render, screen } from '@test-utils';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router';
import NavLink from './NavLink';

describe('NavLink', () => {
  it('should render correctly', () => {
    render(
      <BrowserRouter>
        <NavLink to="/" label="TEST" />
      </BrowserRouter>
    );
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('should render correctly when path is ACTIVE', () => {
    render(
      <MemoryRouter initialEntries={['/test']}>
        <Routes>
          <Route path="/test" element={<NavLink to="/" label="TEST" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });
});
