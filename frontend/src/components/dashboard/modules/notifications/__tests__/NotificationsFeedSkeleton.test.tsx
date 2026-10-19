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

  describe('row height', () => {
    function firstRow(): HTMLElement {
      render(<NotificationsFeedSkeleton rows={1} />);
      return screen.getByTestId('notification-skeleton-row');
    }

    it('matches the height of a notification row on mobile (min 4.5rem) and releases it on desktop', () => {
      const classes = firstRow().className.split(/\s+/);

      expect(classes).toEqual(expect.arrayContaining(['min-h-[4.5rem]', 'lg:min-h-0']));
    });

    it('centres the avatar on mobile like the real row and aligns it to the top on desktop', () => {
      const classes = firstRow().className.split(/\s+/);

      expect(classes).toEqual(expect.arrayContaining(['items-center', 'lg:items-start']));
      expect(classes).not.toContain('items-start');
    });

    it('uses the 44 px avatar on mobile and the original 40 px on desktop', () => {
      const avatar = firstRow().firstElementChild as HTMLElement;

      expect(avatar.className.split(/\s+/)).toEqual(
        expect.arrayContaining(['h-11', 'w-11', 'lg:h-10', 'lg:w-10']),
      );
    });

    it('keeps the original paddings and gaps', () => {
      const classes = firstRow().className.split(/\s+/);

      expect(classes).toEqual(
        expect.arrayContaining(['px-2', 'py-1.5', 'gap-1.5', 'lg:gap-2.5', 'lg:px-3', 'lg:py-2.5']),
      );
    });
  });
});
