import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsModule from '../NotificationsModule';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('NotificationsModule', () => {
  it('renders header and first section', () => {
    // Ensure provider picks stored locale and avoids network
    window.localStorage.setItem('appLocale', 'sk');
    render(
      <LanguageProvider>
        <NotificationsModule />
      </LanguageProvider>
    );
    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(screen.getAllByText('Páči sa mi to').length).toBeGreaterThan(0);
  });
});


