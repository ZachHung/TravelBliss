import { render, screen, userEvent } from '@test-utils';
import { ROUTES } from '@/constants';
import Logo from './Logo';

const navigateMock = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});
describe('Logo', () => {
  it('should render logo', () => {
    render(<Logo />);

    expect(screen.getByRole('button', { name: 'TravelBliss' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TravelBliss' })).toBeVisible();
  });

  it('should navigate to home when clicking logo', async () => {
    render(<Logo />);

    const logoBtn = screen.getByRole('button', { name: 'TravelBliss' });
    await userEvent.click(logoBtn);
    expect(navigateMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(ROUTES.ROOT);
  });
});
