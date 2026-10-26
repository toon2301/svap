'use client';

/**
 * Akcie na profile cudzieho používateľa pre `SearchUserProfileModule`: napísať správu, pridať medzi
 * obľúbených a „páči sa mi“ na profile (s okamžitou zmenou a návratom späť pri chybe).
 */

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import { setFavoriteUserState } from '../favoritesApi';
import { patchUserProfileInCache } from '../profile/profileUserCache';
import { setProfileLikeState, type ProfileLikeResponse } from '../profile/profileLikesApi';
import { getMessagingErrorMessage } from '../messages/messagingApi';
import { openMessagesFromProfile } from '../messages/messagesProfileOrigin';
import { buildMessagesUrl } from '../messages/messagesRouting';
import { profileActionErrorMessage, type SearchProfileApiError } from './foreignProfileHelpers';

type UseForeignProfileActionsInput = {
  profileUser: User | null;
  setProfileUser: Dispatch<SetStateAction<User | null>>;
};

export function useForeignProfileActions({
  profileUser,
  setProfileUser,
}: UseForeignProfileActionsInput) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isProfileLikePending, setIsProfileLikePending] = useState(false);

  // Z profilu na profil sa prechádza bez odmountovania modulu, takže akcia môže skončiť, až keď sa už
  // zobrazuje iný profil (aj taký, ktorý sa ukázal hneď z medzipamäte). Výsledok akcie – úspech aj návrat
  // po chybe – preto mení zobrazený profil len vtedy, keď je to ten, pre ktorý akcia beží.
  const updateShownProfile = (targetId: number, change: (current: User) => User) => {
    setProfileUser((current) => (current && current.id === targetId ? change(current) : current));
  };

  const handleSendMessage = () => {
    const targetId = profileUser?.id;
    if (!targetId || isOpeningConversation) return;
    void (async () => {
      setIsOpeningConversation(true);
      try {
        openMessagesFromProfile(router, buildMessagesUrl(null, { targetUserId: targetId }));
      } catch (error) {
        toast.error(
          getMessagingErrorMessage(error, {
            fallback: t('messages.openFailed', 'Nepodarilo sa otvoriť konverzáciu. Skúste to znova.'),
            rateLimitFallback: t(
              'messages.openRateLimited',
              'Konverzácie otvárate príliš rýchlo. Skúste chvíľu počkať.',
            ),
            unavailableFallback: t(
              'messages.openUnavailable',
              'Používateľovi momentálne nie je možné napísať.',
            ),
          }),
        );
      } finally {
        setIsOpeningConversation(false);
      }
    })();
  };

  const handleToggleFavorite = async () => {
    if (!profileUser || isFavoritePending) return;
    if (!Number.isInteger(profileUser.id) || profileUser.id <= 0) return;

    const nextIsFavorited = !Boolean(profileUser.is_favorited);
    setIsFavoritePending(true);

    try {
      await setFavoriteUserState(profileUser.id, nextIsFavorited);

      updateShownProfile(profileUser.id, (current) => ({
        ...current,
        is_favorited: nextIsFavorited,
      }));
      patchUserProfileInCache(profileUser.id, {
        is_favorited: nextIsFavorited,
      });
    } catch (error: unknown) {
      toast.error(
        profileActionErrorMessage(
          error as SearchProfileApiError,
          nextIsFavorited
            ? t('search.addToFavoritesError', 'Nepodarilo sa pridať k obľúbeným.')
            : t('search.removeFromFavoritesError', 'Nepodarilo sa odobrať z obľúbených.'),
          t,
        ),
      );
    } finally {
      setIsFavoritePending(false);
    }
  };


  const applyProfileLikeState = (data: ProfileLikeResponse) => {
    const nextLiked = data.is_profile_liked_by_me === true;
    const nextCount = Math.max(0, Number(data.profile_likes_count ?? 0));
    updateShownProfile(data.profile_user_id, (current) => ({
      ...current,
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: nextCount,
    }));
    patchUserProfileInCache(data.profile_user_id, {
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: nextCount,
    });
  };

  const handleToggleProfileLike = async () => {
    if (!profileUser || isProfileLikePending) return;
    if (!Number.isInteger(profileUser.id) || profileUser.id <= 0) return;

    const previousLiked = profileUser.is_profile_liked_by_me === true;
    const previousCount = Math.max(0, Number(profileUser.profile_likes_count ?? 0));
    const nextLiked = !previousLiked;
    const optimisticCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    setIsProfileLikePending(true);
    updateShownProfile(profileUser.id, (current) => ({
      ...current,
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: optimisticCount,
    }));
    patchUserProfileInCache(profileUser.id, {
      is_profile_liked_by_me: nextLiked,
      profile_likes_count: optimisticCount,
    });

    try {
      const data = await setProfileLikeState(profileUser.id, nextLiked);
      applyProfileLikeState(data);
    } catch (error: unknown) {
      const apiError = error as SearchProfileApiError;
      updateShownProfile(profileUser.id, (current) => ({
        ...current,
        is_profile_liked_by_me: previousLiked,
        profile_likes_count: previousCount,
      }));
      patchUserProfileInCache(profileUser.id, {
        is_profile_liked_by_me: previousLiked,
        profile_likes_count: previousCount,
      });
      toast.error(
        profileActionErrorMessage(
          apiError,
          t('profile.profileLikeUpdateFailed', 'Nepodarilo sa aktualizovat paci sa mi.'),
          t,
        ),
      );
    } finally {
      setIsProfileLikePending(false);
    }
  };

  return {
    isOpeningConversation,
    isFavoritePending,
    isProfileLikePending,
    handleSendMessage,
    handleToggleFavorite,
    handleToggleProfileLike,
  };
}
