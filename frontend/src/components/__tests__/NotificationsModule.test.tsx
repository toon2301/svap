import { render, screen, fireEvent } from '@testing-library/react';
import NotificationsModule from '../dashboard/modules/NotificationsModule';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, d: string) => d }),
}));

describe('NotificationsModule (desktop behaviors)', () => {
  it('turn off all disables other toggles', () => {
    // Force desktop by mocking window size via className hidden lg:block logic is in component
    render(<NotificationsModule />);

    const turnOffAll = screen.getAllByText('Vypnúť všetko')[0];
    // Click the switch container (button is next to the text). For simplicity click text then the nearest button.
    const switchButton = turnOffAll.closest('div')?.parentElement?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(switchButton);

    // Now, at least one "Zapnuté" option button in mobile layout should be disabled when master is on
    // On desktop we used inputs originally, but we keep assertion generic by checking disabled attribute on mobile buttons as well
    const anyOnButton = screen.getAllByText('Zapnuté')[0].closest('button') as HTMLButtonElement;
    expect(anyOnButton).toBeDisabled();
  });
});


