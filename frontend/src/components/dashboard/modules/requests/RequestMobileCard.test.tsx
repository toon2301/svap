import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RequestMobileCard } from './RequestMobileCard';
import type { SkillRequest } from './types';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => {
      const map: Record<string, string> = {
        'requests.intentUserOffers': 'ponúka, čo žiadate',
      };
      return map[key] ?? fallback ?? key;
    },
  }),
}));

jest.mock('@/lib/api', () => ({
  api: { defaults: { baseURL: '' } },
}));

const item = {
  id: 5,
  status: 'accepted',
  recipient: 77,
  recipient_display_name: 'Tester',
  recipient_summary: { id: 77, display_name: 'Tester', slug: 'tester', avatar_url: null },
  requester: 1,
  requester_display_name: 'Me',
  offer_subcategory: 'Programovanie',
} as unknown as SkillRequest;

function renderCard() {
  const onPress = jest.fn();
  render(<RequestMobileCard item={item} variant="sent" onPress={onPress} />);
  return onPress;
}

describe('RequestMobileCard click targets', () => {
  it('opens the request detail (not the profile) when the offer label is clicked', () => {
    const profileSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileSpy as EventListener);
    const onPress = renderCard();
    try {
      fireEvent.click(screen.getByText('ponúka, čo žiadate!'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(profileSpy).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', profileSpy as EventListener);
    }
  });

  it('opens the request detail when the offer description / empty space is clicked', () => {
    const profileSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileSpy as EventListener);
    const onPress = renderCard();
    try {
      fireEvent.click(screen.getByText('Programovanie'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(profileSpy).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', profileSpy as EventListener);
    }
  });

  it('opens the profile (and not the detail) only when the name is clicked', () => {
    const profileSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileSpy as EventListener);
    const onPress = renderCard();
    try {
      fireEvent.click(screen.getByText('Tester'));
      expect(profileSpy).toHaveBeenCalledTimes(1);
      expect((profileSpy.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
        identifier: 'tester',
      });
      expect(onPress).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', profileSpy as EventListener);
    }
  });
});
