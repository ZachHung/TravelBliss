import { render, screen } from '@test-utils';
import Footer from './Footer';

describe('Footer', () => {
  it('should render footer', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy Policy')).toBeVisible();
  });
});
