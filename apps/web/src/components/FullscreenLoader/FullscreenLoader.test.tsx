import { render, screen } from '@test-utils';
import FullscreenLoader from './FullscreenLoader';

describe('FullscreenLoader', () => {
  it('should render ', () => {
    render(<FullscreenLoader />);
    expect(screen.getByTestId('fullscreen-loader')).toBeInTheDocument();
  });
});
