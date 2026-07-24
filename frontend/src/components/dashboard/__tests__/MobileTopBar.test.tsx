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

  it('shows the search switch action on the offer skills view', () => {
    const onSkillsModeToggle = jest.fn();

    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills-offer"
        onSkillsModeToggle={onSkillsModeToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hľadám' }));

    expect(onSkillsModeToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the offer switch action on the search skills view', () => {
    const onSkillsModeToggle = jest.fn();

    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills-search"
        onSkillsModeToggle={onSkillsModeToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ponúkam' }));

    expect(onSkillsModeToggle).toHaveBeenCalledTimes(1);
  });

  it('hides quick profile on skills picker, offer and search views', () => {
    const onProfileClick = jest.fn();

    const { rerender } = render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills"
        onProfileClick={onProfileClick}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Profil' })).not.toBeInTheDocument();

    rerender(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills-offer"
        onProfileClick={onProfileClick}
        onSkillsModeToggle={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Profil' })).not.toBeInTheDocument();

    rerender(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills-search"
        onProfileClick={onProfileClick}
        onSkillsModeToggle={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Profil' })).not.toBeInTheDocument();
  });

  it('shows account settings title and back action on the mobile account settings view', () => {
    const onBackClick = jest.fn();

    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="profile"
        activeRightItem="account-settings"
        onBackClick={onBackClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));

    expect(screen.getByText('Účet')).toBeInTheDocument();
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });


  it('uses the selected mobile account settings detail title', () => {
    const { rerender } = render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="account-settings"
        accountSettingsView="verify-email"
        onBackClick={jest.fn()}
      />,
    );

    expect(screen.getByText(/Overi/i)).toBeInTheDocument();

    rerender(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="account-settings"
        accountSettingsView="delete-account"
        onBackClick={jest.fn()}
      />,
    );

    expect(screen.getByText(/Zmaza/i)).toBeInTheDocument();
  });

  it('shows the blocked users title and back action', () => {
    const onBackClick = jest.fn();

    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule='blocked-users'
        onBackClick={onBackClick}
      />,
    );

    expect(screen.getByText('Blokovaní používatelia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Späť' }));
    expect(onBackClick).toHaveBeenCalledTimes(1);
  });

  it('shows the profile actions hamburger on a reachable foreign profile', () => {
    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="user-profile"
        viewedUserNotFound={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('hides the hamburger on an unreachable foreign profile (e.g. blocked)', () => {
    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="user-profile"
        viewedUserNotFound
      />,
    );

    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

});
