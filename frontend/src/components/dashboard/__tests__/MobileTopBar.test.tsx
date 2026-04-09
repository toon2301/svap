import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MobileTopBar from '../MobileTopBar';
import { MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT } from '../modules/messages/messagesEvents';

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

const baseProps = {
  onMenuClick: jest.fn(),
  activeModule: 'messages',
  isMessageConversationOpen: true,
};

describe('MobileTopBar', () => {
  it('dispatches goToUserProfile when the open conversation peer header is clicked', () => {
    const profileEventSpy = jest.fn();
    window.addEventListener('goToUserProfile', profileEventSpy as EventListener);

    render(
      <MobileTopBar
        {...baseProps}
        messagePeerName="Tester"
        messagePeerIdentifier="tester-slug"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Otvoriť profil používateľa' }),
    );

    expect(profileEventSpy).toHaveBeenCalledTimes(1);
    expect((profileEventSpy.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      identifier: 'tester-slug',
    });

    window.removeEventListener('goToUserProfile', profileEventSpy as EventListener);
  });

  it('keeps the peer header disabled when the conversation peer identifier is missing', () => {
    render(
      <MobileTopBar
        {...baseProps}
        messagePeerName="Tester"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Otvoriť profil používateľa' }),
    ).toBeDisabled();
  });

  it('dispatches the open conversation actions event from the mobile message header', () => {
    const actionsSpy = jest.fn();
    window.addEventListener(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT, actionsSpy);

    render(
      <MobileTopBar
        {...baseProps}
        messagePeerName="Tester"
        messagePeerIdentifier="tester-slug"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Otvoriť možnosti konverzácie' }),
    );

    expect(actionsSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(MESSAGING_OPEN_CONVERSATION_ACTIONS_EVENT, actionsSpy);
  });
});
