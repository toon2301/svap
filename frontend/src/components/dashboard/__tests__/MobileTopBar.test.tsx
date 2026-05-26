import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import MobileTopBar from '../MobileTopBar';
import {
  ProfileMobileModalProvider,
  useProfileMobileModal,
} from '../contexts/ProfileMobileModalContext';
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

function ProfileShareStateProbe({ onOpen }: { onOpen: () => void }) {
  const { isProfileShareModalOpen } = useProfileMobileModal();

  React.useEffect(() => {
    if (isProfileShareModalOpen) {
      onOpen();
    }
  }, [isProfileShareModalOpen, onOpen]);

  return null;
}

function UserProfileModalStateProbe({ onOpen }: { onOpen: () => void }) {
  const { isUserProfileModalOpen } = useProfileMobileModal();

  React.useEffect(() => {
    if (isUserProfileModalOpen) {
      onOpen();
    }
  }, [isUserProfileModalOpen, onOpen]);

  return null;
}

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

  it('shows skills view switch instead of profile on skills-search', () => {
    const onSkillsOfferClick = jest.fn();

    render(
      <MobileTopBar
        onMenuClick={jest.fn()}
        activeModule="skills-search"
        onProfileClick={jest.fn()}
        onSkillsOfferClick={onSkillsOfferClick}
      />,
    );

    expect(screen.queryByLabelText('Profil')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prepnúť na Ponúkam' }));
    expect(onSkillsOfferClick).toHaveBeenCalledTimes(1);
  });

  it('shows share and menu buttons on own profile and opens share modal', async () => {
    const openShare = jest.fn();

    render(
      <ProfileMobileModalProvider>
        <MobileTopBar
          onMenuClick={jest.fn()}
          activeModule="profile"
        />
        <ProfileShareStateProbe onOpen={openShare} />
      </ProfileMobileModalProvider>,
    );

    expect(screen.getByRole('button', { name: 'Zdieľať profil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zdieľať profil' }));
    await waitFor(() => {
      expect(openShare).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the user profile menu through context on other profiles', async () => {
    const openUserProfileMenu = jest.fn();

    render(
      <ProfileMobileModalProvider>
        <MobileTopBar
          onMenuClick={jest.fn()}
          activeModule="user-profile"
        />
        <UserProfileModalStateProbe onOpen={openUserProfileMenu} />
      </ProfileMobileModalProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    await waitFor(() => {
      expect(openUserProfileMenu).toHaveBeenCalledTimes(1);
    });
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
