'use client';

/**
 * Vrstvy a dialógy karty príspevku: fotoprehliadač pôvodného príspevku z repostu, mobilná obrazovka detailu, mobilný
 * prehliadač fotky, zoznam lajkujúcich, potvrdenie zmazania, potvrdenie odstránenia označenia, okno úpravy, okno
 * nahlásenia a okno zdieľania.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok c delenia karty, nález 333, R23): JSX, komentáre aj obsluhy sú
 * rovnaké ako predtým, odsadenie sa nemení. Komponent nemá vlastný stav ani hooky; vlajky otvorenia, ich nastavovače
 * a obsluhy dostáva od karty ako vlastnosti (stav vrstiev drží karta a hook `useFeedPostCardLayers`).
 *
 * Vracia fragment, takže všetky vrstvy ostávajú PRIAMYMI potomkami koreňa karty (`motion.article`) na rovnakom mieste
 * (za vloženými komentármi) a v DOM nepribudne žiadny obal.
 *
 * Okno zdieľania dostáva `post`, nie `currentPost` (nález 355): po úprave vlastného príspevku preto ešte ukáže starý
 * text. Presun to nemení, opraví sa to samostatne (K56).
 */

import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedLikersDialog from './FeedLikersDialog';
import FeedPostEditModal from './FeedPostEditModal';
import FeedPostReportModal from './FeedPostReportModal';
import FeedPostShareModal from './FeedPostShareModal';
import FeedSharedPhotoViewer from './FeedSharedPhotoViewer';
import FeedPhotoViewer from './FeedPhotoViewer';
import FeedPostMobileDetail from './FeedPostMobileDetail';
import type { FeedPost } from '@/lib/feedApi';
import type { FeedPostCardProps } from './FeedPostCard.types';

type FeedPostCardLayersProps = {
  // Príspevok z feedu (nie `currentPost`): `post.id` berú zoznam lajkujúcich a nahlásenie, celý objekt okno zdieľania.
  post: FeedPost;
  // Fotoprehliadač pôvodného príspevku (fotka v reposte).
  sharedPhotoOpen: boolean;
  sharedPhotoPostId: number | null;
  setSharedPhotoOpen: (open: boolean) => void;
  // Mobilná obrazovka detailu.
  mobileDetailOpen: boolean;
  currentPost: FeedPost;
  setMobileDetailOpen: (open: boolean) => void;
  setCurrentPost: (post: FeedPost) => void;
  onDeleted: FeedPostCardProps['onDeleted'];
  onShared: FeedPostCardProps['onShared'];
  // Mobilný prehliadač fotky.
  photoViewerIndex: number | null;
  viewerPost: FeedPost;
  setPhotoViewerIndex: (index: number | null) => void;
  // Zoznam lajkujúcich.
  likersOpen: boolean;
  setLikersOpen: (open: boolean) => void;
  // Potvrdenie zmazania.
  deleteOpen: boolean;
  deleting: boolean;
  setDeleteOpen: (open: boolean) => void;
  handleDeletePost: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
  // Potvrdenie odstránenia označenia.
  tagRemoveOpen: boolean;
  removingTag: boolean;
  setTagRemoveOpen: (open: boolean) => void;
  handleRemoveOwnTag: () => Promise<void>;
  // Okno úpravy.
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  onPostUpdated: FeedPostCardProps['onPostUpdated'];
  // Okno nahlásenia.
  reportOpen: boolean;
  setReportOpen: (open: boolean) => void;
  setReported: (reported: boolean) => void;
  // Okno zdieľania.
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
};

export default function FeedPostCardLayers({
  post,
  sharedPhotoOpen,
  sharedPhotoPostId,
  setSharedPhotoOpen,
  mobileDetailOpen,
  currentPost,
  setMobileDetailOpen,
  setCurrentPost,
  onDeleted,
  onShared,
  photoViewerIndex,
  viewerPost,
  setPhotoViewerIndex,
  likersOpen,
  setLikersOpen,
  deleteOpen,
  deleting,
  setDeleteOpen,
  handleDeletePost,
  t,
  tagRemoveOpen,
  removingTag,
  setTagRemoveOpen,
  handleRemoveOwnTag,
  editOpen,
  setEditOpen,
  onPostUpdated,
  reportOpen,
  setReportOpen,
  setReported,
  shareOpen,
  setShareOpen,
}: FeedPostCardLayersProps) {
  return (
    <>
      {/* Fotoprehliadač pôvodného príspevku (klik na fotku v reposte). */}
      {sharedPhotoOpen && sharedPhotoPostId != null ? (
        <FeedSharedPhotoViewer
          postId={sharedPhotoPostId}
          onClose={() => setSharedPhotoOpen(false)}
        />
      ) : null}

      {/* Mobilná obrazovka detailu – mountuje sa až pri otvorení. */}
      {mobileDetailOpen ? (
        <FeedPostMobileDetail
          post={currentPost}
          onClose={() => setMobileDetailOpen(false)}
          onPostUpdated={setCurrentPost}
          onDeleted={onDeleted}
          onShared={onShared}
        />
      ) : null}

      {/* Mobilný prehliadač fotky – mountuje sa až pri otvorení, rovnako ako
          ostatné vrstvy karty. */}
      {photoViewerIndex !== null ? (
        <FeedPhotoViewer
          post={viewerPost}
          initialIndex={photoViewerIndex}
          onClose={() => setPhotoViewerIndex(null)}
          onPostUpdated={setCurrentPost}
          onDeleted={onDeleted}
          onShared={onShared}
        />
      ) : null}

      <FeedLikersDialog
        open={likersOpen}
        onClose={() => setLikersOpen(false)}
        postId={post.id}
      />

      <FeedDestructiveConfirm
        open={deleteOpen}
        isDeleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeletePost}
        testId="feed-post-delete-confirm"
        title={t('feed.postDeleteConfirm', 'Naozaj chceš zmazať tento príspevok?')}
        hint={t('feed.postDeleteHint', 'Túto akciu už nie je možné vrátiť späť.')}
      />

      <FeedDestructiveConfirm
        open={tagRemoveOpen}
        isDeleting={removingTag}
        onClose={() => setTagRemoveOpen(false)}
        onConfirm={handleRemoveOwnTag}
        testId="feed-tag-remove-confirm"
        title={t(
          'feed.tagRemoveConfirm',
          'Naozaj chceš odstrániť svoje označenie z tohto príspevku?',
        )}
        hint={t(
          'feed.tagRemoveHint',
          'Príspevok ostane zverejnený, zmizne len tvoje označenie.',
        )}
        confirmLabel={t('feed.tagRemoveAction', 'Odstrániť označenie')}
        busyLabel={t('feed.tagRemoving', 'Odstraňujem...')}
      />

      {/* Mountuje sa až pri otvorení – rovnaký vzor ako composer: každé
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
      <FeedPostReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={post.id}
        onReported={() => setReported(true)}
      />
      <FeedPostShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={post}
        onShared={onShared}
      />
    </>
  );
}
