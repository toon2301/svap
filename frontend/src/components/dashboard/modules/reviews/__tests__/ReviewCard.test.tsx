import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, jest } from '@jest/globals';

import ReviewCard, { type Review } from '../ReviewCard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

const review: Review = {
  id: 10,
  reviewer_id: 2,
  reviewer_display_name: 'Reviewer User',
  reviewer_avatar_url: null,
  rating: 5,
  text: 'Great work.',
  pros: ['Fast'],
  cons: [],
  likes_count: 2,
  is_liked_by_me: true,
  created_at: '2026-05-08T10:00:00.000Z',
  updated_at: '2026-05-08T10:00:00.000Z',
};

describe('ReviewCard', () => {
  it('shows the like count, active state, and delegates toggles', () => {
    const onLikeToggle = jest.fn();

    render(<ReviewCard review={review} onLikeToggle={onLikeToggle} />);

    const likeButton = screen.getByRole('button', { name: 'Páči sa mi' });
    expect(likeButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('2')).toBeTruthy();

    fireEvent.click(likeButton);

    expect(onLikeToggle).toHaveBeenCalledWith(review);
  });
});
