import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProfileOffersEmptyState } from './ProfileOffersEmptyState';

const translations: Record<string, string> = {
  'profile.offersEmptyOwnerTitle': 'No cards yet',
  'profile.offersEmptyOwnerBody': 'Create your first offer or request.',
  'profile.offersEmptyVisitorTitle': 'No public cards',
  'profile.offersEmptyVisitorBody': 'This user has no public offers or requests.',
  'profile.skills': 'Offers / Looking for',
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
  }),
}));

describe('ProfileOffersEmptyState', () => {
  it('shows the owner action and calls the create handler', () => {
    const onCreate = jest.fn();

    render(<ProfileOffersEmptyState isOwner onCreate={onCreate} />);

    expect(screen.getByText('No cards yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Offers / Looking for' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides the action for visitors', () => {
    render(<ProfileOffersEmptyState isOwner={false} onCreate={jest.fn()} />);

    expect(screen.getByText('No public cards')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offers / Looking for' })).not.toBeInTheDocument();
  });
});
