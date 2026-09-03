'use client';

/**
 * Mobilný prehliadač fotky príspevku – fotka plus celá Nástenka okolo nej.
 *
 * Otvára sa ťukom na fotku na karte vo feede (LEN na mobile; desktop otvára
 * okno detailu a nič sa preň nemení). Oproti pôvodnému správaniu, kde ťuk
 * ukázal holú fotku, tu pribúda hlavička s autorom, text príspevku, riadok
 * akcií, „..." menu a vysúvací panel komentárov.
 *
 * ZNOVUPOUŽITIE: samotné zobrazenie a prepínanie fotiek NEROBÍ tento súbor –
 * robí to `ImageLightbox`, ten istý komponent, aký má portfólio aj doterajší
 * prehliadač Nástenky. Odtiaľ prichádza swipe, šípky, klávesnica, zámok
 * scrollovania, fokus trap aj poradie vrstiev. Tento komponent mu len podáva
 * vlastnú vrstvu (`chrome`) a stará sa o stav okolo nej. Rovnako sú prebraté
 * aj všetky dialógy (lajkujúci, zdieľanie, nahlásenie, úprava, mazanie).
 *
 * Stav lajkov a počtov sa zdieľa s kartou pod prehliadačom cez
 * `feedPostCountEvents`, takže po zatvorení sedia čísla na oboch miestach.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImageLightbox } from '../shared/ImageLightbox';
import { deleteFeedPost, type FeedPost } from '@/lib/feedApi';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostCounts } from './feedPostCountEvents';
import { emitFeedPostDeleted } from './feedPostDeletedEvents';
import { feedViewableSources } from './feedImageSources';
import { useFeedPostLike } from './useFeedPostLike';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPhotoCommentsSheet from './FeedPhotoCommentsSheet';
import FeedPhotoViewerChrome from './FeedPhotoViewerChrome';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostReportModal from './FeedPostReportModal';
import FeedPostShareModal from './FeedPostShareModal';

type FeedPhotoViewerProps = {
  post: FeedPost;
  /** Index v zozname otvárateľných fotiek (`feedViewableSources`). */
  initialIndex: number;
  onClose: () => void;
  /**
   * Autor príspevok upravil.
   *
   * Karta pod prehliadačom si novú verziu prevezme, takže po zatvorení ukazuje
   * upravený obsah bez čakania na obnovenie feedu – ten istý mechanizmus, aký
   * appka už používa medzi kartou a desktopovým oknom detailu.
   */
  onPostUpdated?: (post: FeedPost) => void;
  /** Autor príspevok zmazal – zoznam pod prehliadačom ho má vyhodiť. */
  onDeleted?: (postId: number) => void;
  /** Zdieľanie ďalej vloží nový príspevok na vrch feedu. */
  onShared?: (created: FeedPost) => void;
};

export default function FeedPhotoViewer({
  post,
  initialIndex,
  onClose,
  onPostUpdated,
  onDeleted,
  onShared,
}: FeedPhotoViewerProps) {
  const { t } = useLanguage();
  const [currentPost, setCurrentPost] = useState(post);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  // Optimistický lajk je spoločný pre kartu aj obe mobilné vrstvy.
  const { isLiked, likesCount, toggleLike } = useFeedPostLike({
    postId: post.id,
    initialLiked: post.is_liked_by_me,
    initialCount: post.likes_count,
    t,
  });
  /** Ťuk na fotku skryje celú vrstvu; ďalší ju vráti. */
  const [chromeHidden, setChromeHidden] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sources = feedViewableSources(currentPost.images ?? []);

  // Karta je vlastníkom príspevku – jej čerstvejšia verzia má prednosť pred
  // lokálnou (rovnaký prop-sync ako v samotnej karte).
  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  // Prehliadač sa otvára nad kartou, ktorá si tie isté počty drží tiež –
  // rovnaký mechanizmus ako medzi feedom a oknom detailu na desktope.
  useEffect(() => {
    emitFeedPostCounts({ postId: post.id, commentsCount });
  }, [post.id, commentsCount]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFeedPost(post.id);
      setDeleteOpen(false);
      toast.success(t('feed.postDeleted', 'Príspevok bol zmazaný.'));
      onDeleted?.(post.id);
      // Feed pod prehliadačom o zmazaní inak nevie a nechal by kartu.
      emitFeedPostDeleted(post.id);
      onClose();
    } catch (error) {
      toast.error(
        translateFeedActionError(t, error, () =>
          t('feed.postDeleteError', 'Príspevok sa nepodarilo zmazať.'),
        ),
      );
    } finally {
      setDeleting(false);
    }
  }, [deleting, onClose, onDeleted, post.id, t]);

  /**
   * Ťuk na fotku prepína vrstvu. Keď je vysunutý panel komentárov, ťuk ho
   * najprv zavrie – inak by sa vrstva skryla pod ním a používateľ by nemal
   * ako sa k nej dostať.
   */
  const handlePhotoActivate = useCallback(() => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setChromeHidden((hidden) => !hidden);
  }, [commentsOpen]);

  return (
    <>
      <ImageLightbox
        open
        sources={sources}
        initialIndex={initialIndex}
        alt={t('feed.imageAlt', 'Fotka príspevku')}
        onClose={onClose}
        testId="feed-photo-viewer"
        // Pevný rámec: vysoká aj široká fotka sa vykreslia v tom istom ráme,
        // celé (`object-contain`), nič sa neoreže.
        fixedFrame
        // Podklad je tu plocha na prepínanie vrstvy, nie na zatváranie;
        // zatvára sa výhradne cez „X" v hlavičke (a Escape).
        dismissOnBackdropClick={false}
        hideCloseButton
        onImageActivate={handlePhotoActivate}
        labels={{
          dialog: t('feed.imageCarousel', 'Fotky príspevku'),
          close: t('common.close', 'Zavrieť'),
          previous: t('feed.imagePrev', 'Predchádzajúca fotka'),
          next: t('feed.imageNext', 'Ďalšia fotka'),
          counter: (current, count) => `${current}/${count}`,
        }}
        chrome={
          <>
            {chromeHidden ? null : (
              <FeedPhotoViewerChrome
                post={currentPost}
                isLiked={isLiked}
                likesCount={likesCount}
                commentsCount={commentsCount}
                reported={reported}
                onToggleLike={() => void toggleLike()}
                onOpenLikers={() => setLikersOpen(true)}
                onOpenComments={() => setCommentsOpen(true)}
                onOpenShare={() => setShareOpen(true)}
                onOpenReport={() => setReportOpen(true)}
                onOpenEdit={() => setEditOpen(true)}
                onOpenDelete={() => setDeleteOpen(true)}
                onClose={onClose}
              />
            )}

            <FeedPhotoCommentsSheet
              postId={post.id}
              open={commentsOpen}
              onClose={() => setCommentsOpen(false)}
              onCountChange={(delta) =>
                setCommentsCount((count) => Math.max(0, count + delta))
              }
              onTotalChange={setCommentsCount}
            />
          </>
        }
      />

      <FeedLikersDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        postId={post.id}
      />
      <FeedPostShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={currentPost}
        onShared={onShared}
      />
      <FeedPostReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onReported={() => setReported(true)}
      />
      {/* Mountuje sa až pri otvorení – rovnaký vzor ako na karte: každé
          otvorenie je čistý stav, bez resetovacieho efektu. */}
      {editOpen ? (
        <FeedPostEditModal
          open
          post={currentPost}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => {
            setCurrentPost(updated);
            onPostUpdated?.(updated);
          }}
        />
      ) : null}
      <FeedDestructiveConfirm
        open={deleteOpen}
        isDeleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        testId="feed-photo-viewer-delete-confirm"
        title={t('feed.postDeleteConfirm', 'Naozaj chceš zmazať tento príspevok?')}
        hint={t('feed.postDeleteHint', 'Túto akciu už nie je možné vrátiť späť.')}
      />
    </>
  );
}
