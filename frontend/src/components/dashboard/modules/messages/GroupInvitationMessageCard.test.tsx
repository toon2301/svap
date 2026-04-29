'use client';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GroupInvitationMessageCard } from './GroupInvitationMessageCard';

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('GroupInvitationMessageCard', () => {
  it('renders accept and decline actions for a pending invitation', () => {
    const onRespond = jest.fn();

    render(
      <GroupInvitationMessageCard
        invitation={{
          id: 7,
          status: 'pending',
          invited_user: { id: 2, display_name: 'Anna' },
          invited_by: { id: 1, display_name: 'Peter' },
          can_respond: true,
        }}
        isBusy={false}
        onRespond={onRespond}
      />,
    );

    expect(screen.getByText('Pozvánka do skupiny')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prijať' }));
    fireEvent.click(screen.getByRole('button', { name: 'Odmietnuť' }));

    expect(onRespond).toHaveBeenNthCalledWith(1, 7, 'accept');
    expect(onRespond).toHaveBeenNthCalledWith(2, 7, 'decline');
  });
});
