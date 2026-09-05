'use client';

/**
 * Fotoprehliadač PÔVODNÉHO príspevku, otvorený z repost náhľadu.
 *
 * Klik na fotku vnútri repostu sa má správať ako klik na fotku bežného
 * príspevku – teda otvoriť fotku, nie detail zdieľajúceho. Fotka ale patrí
 * pôvodnému príspevku, takže sa najprv dotiahne (`getFeedPost`): snapshot v
 * `shared_content` nesie len jeden malý náhľad, kým skutočný príspevok má
 * všetky fotky vo veľkej variante, autora, text aj počty.
 *
 * ZNOVUPOUŽITIE: nič sa nekreslí nanovo. Na mobile sa otvorí `FeedPhotoViewer`
 * (imerzný prehliadač so všetkými akciami PÔVODNÉHO príspevku), na desktope
 * `ImageLightbox` – presne to, čo appka pri fotkách používa na oboch
 * platformách.
 */

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';
import { ImageLightbox } from '../shared/ImageLightbox';
import FeedPhotoViewer from './FeedPhotoViewer';
import { feedViewableSources } from './feedImageSources';
import { handleFeedPostErrorIfGone } from './feedPostGone';

type FeedSharedPhotoViewerProps = {
  /** Id PÔVODNÉHO príspevku (`shared_content.id`). */
  postId: number;
  onClose: () => void;
};

export default function FeedSharedPhotoViewer({
  postId,
  onClose,
}: FeedSharedPhotoViewerProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [post, setPost] = useState<FeedPost | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let active = true;
    void getFeedPost(postId)
      .then((loaded) => {
        if (active) setPost(loaded);
      })
      .catch((error) => {
        if (!active) return;
        // Pôvodný príspevok medzitým zmizol – spoločné spracovanie ho odstráni
        // zo zoznamov a povie o tom raz. Repost sám ostáva, ten existuje ďalej.
        handleFeedPostErrorIfGone(error, postId, t);
        closeRef.current();
      });
    return () => {
      active = false;
    };
    // `t` zámerne mimo závislostí – jazyk sa počas jedného otvorenia nemení a
    // reštart by príspevok načítal znova.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  /**
   * Náhľad repostu má fotku, ale pôvodný príspevok už žiadnu zobraziteľnú
   * nemá – prehliadač sa musí ZAVRIEŤ, nie len nič nevykresliť.
   *
   * Rodič si drží „otvorené" vo vlastnom stave. Keby sa tu len vrátilo `null`,
   * ostal by ten stav natrvalo zapnutý: ďalší klik naň nastaví už pravdivú
   * hodnotu, komponent sa nepremountuje a náhľad by bol do konca života karty
   * mŕtvy. Zatvára sa v EFEKTE, nie počas renderu – zápis do stavu rodiča
   * počas vykresľovania dieťaťa React zakazuje.
   */
  useEffect(() => {
    if (!post) return;
    if (feedViewableSources(post.images ?? []).length > 0) return;
    closeRef.current();
  }, [post]);

  // Kým sa príspevok načítava, nekreslí sa nič: je to jediný request a
  // medzistav v podobe prázdneho čierneho plátna by pôsobil ako chyba.
  if (!post) return null;

  const sources = feedViewableSources(post.images ?? []);
  // Fotka medzitým zmizla (zamietnutá moderáciou, zmazaná pri úprave) –
  // zatvorenie vybaví efekt vyššie, tu ostáva len nevykresliť nič.
  if (sources.length === 0) return null;

  if (isMobile) {
    return (
      <FeedPhotoViewer
        post={post}
        initialIndex={0}
        onClose={onClose}
        // Vlastníkom pôvodného príspevku je TENTO komponent (dotiahol si ho
        // sám), takže úpravu musí prevziať – inak by sa po zatvorení stratila.
        onPostUpdated={setPost}
      />
    );
  }

  return (
    <ImageLightbox
      open
      sources={sources}
      initialIndex={0}
      alt={t('feed.imageAlt', 'Fotka príspevku')}
      onClose={onClose}
      testId="feed-shared-photo-lightbox"
      labels={{
        dialog: t('feed.imageCarousel', 'Fotky príspevku'),
        close: t('common.close', 'Zavrieť'),
        previous: t('feed.imagePrev', 'Predchádzajúca fotka'),
        next: t('feed.imageNext', 'Ďalšia fotka'),
        counter: (current, count) => `${current}/${count}`,
      }}
    />
  );
}
