import { render, screen } from '@testing-library/react';

import { NotificationsFeedSkeleton } from '../NotificationsFeedSkeleton';

describe('NotificationsFeedSkeleton', () => {
  it('renders the default number of skeleton rows', () => {
    render(<NotificationsFeedSkeleton />);

    expect(screen.getByTestId('notifications-feed-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('notification-skeleton-row')).toHaveLength(6);
  });

  it('renders a custom row count', () => {
    render(<NotificationsFeedSkeleton rows={3} />);

    expect(screen.getAllByTestId('notification-skeleton-row')).toHaveLength(3);
  });

  it('marks the skeleton as decorative for assistive tech', () => {
    render(<NotificationsFeedSkeleton />);

    expect(screen.getByTestId('notifications-feed-skeleton')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
