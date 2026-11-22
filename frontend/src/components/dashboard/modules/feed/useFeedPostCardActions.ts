'use client';

/**
 * Obsluhy karty príspevku: odstránenie vlastného označenia a zmazanie príspevku.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok f delenia karty, etapa 1, nález 333, R23): obe obsluhy aj komentár pri
 * prvej z nich sú rovnaké ako predtým. Hook nemá vlastný stav ani efekty, takže poradie efektov karty sa nemení. Stav,
 * ktorého nastavovače obsluhy volajú (`removingTag`, `deleting`, `taggedUsers`, potvrdenia), dostáva od karty; karta ho
 * volá až PO tomto stave (inak by `tsc` hlásil použitie pred deklaráciou).
 */

import type { Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { deleteFeedPost, removeOwnFeedPostTag } from '@/lib/feedApi';
import type { FeedPost, FeedTaggedUser } from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';
import type { FeedPostCardProps } from './FeedPostCard.types';

type UseFeedPostCardActionsArgs = {
  post: FeedPost;
  t: (key: string, fallback?: string) => string;
  onSelfTagRemoved: FeedPostCardProps['onSelfTagRemoved'];
  onDeleted: FeedPostCardProps['onDeleted'];
  removingTag: boolean;
  setRemovingTag: (removing: boolean) => void;
  setTagRemoveOpen: (open: boolean) => void;
  setTaggedUsers: Dispatch<SetStateAction<FeedTaggedUser[]>>;
  deleting: boolean;
  setDeleting: (deleting: boolean) => void;
  setDeleteOpen: (open: boolean) => void;
};

export function useFeedPostCardActions({
  post,
  t,
  onSelfTagRemoved,
  onDeleted,
  removingTag,
  setRemovingTag,
  setTagRemoveOpen,
  setTaggedUsers,
  deleting,
  setDeleting,
  setDeleteOpen,
}: UseFeedPostCardActionsArgs) {
  // Odstránenie sa premietne AŽ po potvrdení serverom – rovnako ako mazanie
  // komentára. Optimistický vzor je vo feede vyhradený lajku, kde je zlyhanie
  // bezvýznamné; tu by zmiznutý a späť vrátený chip pôsobil ako chyba.
  const handleRemoveOwnTag = async () => {
    if (removingTag) return;
    setRemovingTag(true);
    try {
      await removeOwnFeedPostTag(post.id);
      setTaggedUsers((current) => current.filter((tag) => !tag.can_remove_tag));
      setTagRemoveOpen(false);
      toast.success(t('feed.tagRemoved', 'Označenie bolo odstránené.'));
      onSelfTagRemoved?.(post.id);
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.tagRemoveError', 'Označenie sa nepodarilo odstrániť.'),
        ),
      );
    } finally {
      setRemovingTag(false);
    }
  };

  const handleDeletePost = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFeedPost(post.id);
      setDeleteOpen(false);
      toast.success(t('feed.postDeleted', 'Príspevok bol zmazaný.'));
      // Zoznam si kartu odstráni sám; na detaile to znamená odchod na Nástenku.
      onDeleted?.(post.id);
      // Mazať sa dá aj z okna detailu, ktoré leží NAD feedom – ten sa o tom
      // inak nedozvie a nechal by kartu neexistujúceho príspevku.
      emitFeedPostDeleted(post.id);
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.postDeleteError', 'Príspevok sa nepodarilo zmazať.'),
        ),
      );
    } finally {
      setDeleting(false);
    }
  };

  return { handleRemoveOwnTag, handleDeletePost };
}
