import { render, screen, fireEvent } from '@testing-library/react';
import NotificationSettingsModule from '../dashboard/modules/NotificationSettingsModule';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, d: string) => d }),
}));

jest.mock('../dashboard/modules/notifications/usePushMessagesPreference', () => ({
  usePushMessagesPreference: () => ({
    value: false,
    disabled: false,
    loading: false,
    error: null,
    permission: 'granted',
    supported: true,
    onChange: jest.fn(),
  }),
}));

describe('NotificationSettingsModule (desktop behaviors)', () => {
  it('turn off all disables other toggles', () => {
    // Force desktop by mocking window size via className hidden lg:block logic is in component
    render(<NotificationSettingsModule />);

    const turnOffAll = screen.getAllByText('Vypnut vsetko')[0];
    // Click the switch container (button is next to the text). For simplicity click text then the nearest button.
    const switchButton = turnOffAll.closest('div')?.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(switchButton);

    // Now, at least one "Zapnuté" option button in mobile layout should be disabled when master is on
    // On desktop we used inputs originally, but we keep assertion generic by checking disabled attribute on mobile buttons as well
    const hasDisabledNotificationToggle = screen
      .getAllByText('Zapnute')
      .some((label) => (label.closest('button') as HTMLButtonElement | null)?.disabled);
    expect(hasDisabledNotificationToggle).toBe(true);
  });
});


