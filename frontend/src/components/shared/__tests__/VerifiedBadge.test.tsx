import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifiedBadge from '../VerifiedBadge';

describe('VerifiedBadge', () => {
  it('renders with the translated tooltip and accessible label', () => {
    render(<VerifiedBadge />);

    const badge = screen.getByTestId('verified-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Overený účet');
    expect(badge).toHaveAttribute('aria-label', 'Overený účet');
  });

  it('supports the small size for list avatars', () => {
    render(<VerifiedBadge size="sm" />);

    const svg = screen.getByTestId('verified-badge').querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('overlaps the top-right edge of a relative parent', () => {
    render(<VerifiedBadge />);

    const badge = screen.getByTestId('verified-badge');
    expect(badge).toHaveClass('right-0', 'top-0', 'translate-x-1/4', '-translate-y-1/4');
  });});
