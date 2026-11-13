import { render, screen } from '@test-utils';
import TextGradient from './TextGradient';

describe('TextGradient', () => {
  it('should render correctly', () => {
    render(<TextGradient>Hello World</TextGradient>);
    expect(screen.getByText('Hello World')).toBeVisible();
  });
});
