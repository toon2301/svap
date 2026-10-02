import type { User } from '@/types';
import { isMobileOnboardingBlockedByUi } from '../onboarding/mobileOnboardingScene';
import { messagingUserName } from '../modules/messages/messagingUserName';
import type { MessagingUserBrief } from '../modules/messages/types';

type DashboardRenderValuesInput = {
  authUser: User | null;
  user: User | null;
  t: (key: string, fallback?: string) => string;
  mobileMessagePeer: MessagingUserBrief | null;
  mobileMessageGroup: { name: string } | null;
  activeModule: string;
  activeRightItem: string;
  isRightSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  isNotificationsPanelOpen: boolean;
  isMobileOfferDetailOpen: boolean;
  selectedConversationId: number | null;
  targetUserIdFromMessagesQuery: number | null;
};

/** Hodnoty pre mobilnú hlavičku, onboarding a rozloženie, odvodené zo stavu dashboardu; čistá funkcia. */
export function getDashboardRenderValues({
  authUser,
  user,
  t,
  mobileMessagePeer,
  mobileMessageGroup,
  activeModule,
  activeRightItem,
  isRightSidebarOpen,
  isMobileMenuOpen,
  isNotificationsPanelOpen,
  isMobileOfferDetailOpen,
  selectedConversationId,
  targetUserIdFromMessagesQuery,
}: DashboardRenderValuesInput) {
  // Meno čítame z AuthContextu (authUser) – kanonického zdroja pravdy, ktorý sa
  // aktualizuje po zmene mena aj po refreshi. Fallback na dashboardState.user
  // počas krátkeho auth bootstrapu.
  const accountNameUser = authUser ?? user;
  const mobileAccountName =
    [accountNameUser?.first_name, accountNameUser?.last_name].filter(Boolean).join(' ').trim() ||
    (accountNameUser?.company_name || '').trim() ||
    (accountNameUser?.username || '').trim() ||
    t('navigation.profile', 'Profil');
  // Anonymizovaný/zmazaný peer nemá profil → žiadny identifier (klik nikam nevedie).
  const mobileMessagePeerIdentifier = mobileMessagePeer?.is_deleted
    ? null
    : (mobileMessagePeer?.slug || '').trim() ||
      (typeof mobileMessagePeer?.id === 'number' ? String(mobileMessagePeer.id) : null);
  const mobileMessageTitle =
    mobileMessageGroup?.name ||
    (mobileMessagePeer ? messagingUserName(mobileMessagePeer, t) : undefined);
  const mobileMessageAvatarUrl = mobileMessageGroup ? null : mobileMessagePeer?.avatar_url ?? null;
  const isProfileEditMode =
    activeModule === 'profile' &&
    activeRightItem === 'edit-profile' &&
    isRightSidebarOpen;
  const isMobileMessageConversationOpen = Boolean(
    activeModule === 'messages' &&
      (selectedConversationId != null || targetUserIdFromMessagesQuery != null),
  );
  const showMobileOfferDetailTopBar =
    isMobileOfferDetailOpen &&
    (activeModule === 'profile' || activeModule === 'user-profile');
  const isMobileOnboardingBlocked = isMobileOnboardingBlockedByUi({
    activeModule,
    activeRightItem,
    isRightSidebarOpen,
    isMobileMenuOpen,
    isNotificationsPanelOpen,
    isMessageConversationOpen: isMobileMessageConversationOpen,
  });

  return {
    mobileAccountName,
    mobileMessagePeerIdentifier,
    mobileMessageTitle,
    mobileMessageAvatarUrl,
    isProfileEditMode,
    isMobileMessageConversationOpen,
    showMobileOfferDetailTopBar,
    isMobileOnboardingBlocked,
  };
}
