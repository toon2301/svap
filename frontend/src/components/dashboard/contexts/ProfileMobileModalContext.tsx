'use client';

import React from 'react';

interface ProfileMobileModalContextValue {
  isUserProfileModalOpen: boolean;
  openUserProfileModal: () => void;
  closeUserProfileModal: () => void;
  isProfileShareModalOpen: boolean;
  openOwnProfileShareModal: () => void;
  closeProfileShareModal: () => void;
}

const noop = () => {};

const ProfileMobileModalContext = React.createContext<ProfileMobileModalContextValue>({
  isUserProfileModalOpen: false,
  openUserProfileModal: noop,
  closeUserProfileModal: noop,
  isProfileShareModalOpen: false,
  openOwnProfileShareModal: noop,
  closeProfileShareModal: noop,
});

export function ProfileMobileModalProvider({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey?: string | number | null;
}) {
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = React.useState(false);
  const [isProfileShareModalOpen, setIsProfileShareModalOpen] = React.useState(false);
  const previousResetKeyRef = React.useRef(resetKey);

  React.useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    setIsUserProfileModalOpen(false);
    setIsProfileShareModalOpen(false);
  }, [resetKey]);

  const value = React.useMemo<ProfileMobileModalContextValue>(
    () => ({
      isUserProfileModalOpen,
      openUserProfileModal: () => setIsUserProfileModalOpen(true),
      closeUserProfileModal: () => setIsUserProfileModalOpen(false),
      isProfileShareModalOpen,
      openOwnProfileShareModal: () => setIsProfileShareModalOpen(true),
      closeProfileShareModal: () => setIsProfileShareModalOpen(false),
    }),
    [isProfileShareModalOpen, isUserProfileModalOpen],
  );

  return (
    <ProfileMobileModalContext.Provider value={value}>
      {children}
    </ProfileMobileModalContext.Provider>
  );
}

export function useProfileMobileModal() {
  return React.useContext(ProfileMobileModalContext);
}
