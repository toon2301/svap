'use client';

/**
 * Mobilná celoobrazovková obrazovka „Nový príspevok" (routa
 * `feed-post-create`).
 *
 * Vzor prevzatý z `PortfolioCreateScreen`: na mobile je vytváranie samostatná
 * stránka s vlastnou hlavičkou, nie vysúvací panel. Obsah je ten istý
 * `FeedPostComposerForm` ako v desktopovom modale – líši sa len obal.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import SettingsDetailHeader from '../settings/SettingsDetailHeader';
import FeedPostComposerForm from './FeedPostComposerForm';
import type { FeedPost } from '@/lib/feedApi';

type FeedPostCreateScreenProps = {
  /** Návrat na Nástenku – zavolá sa pri „späť" aj po uverejnení. */
  onClose: () => void;
  onCreated?: (created: FeedPost) => void;
};

export default function FeedPostCreateScreen({
  onClose,
  onCreated,
}: FeedPostCreateScreenProps) {
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen bg-white px-4 pb-10 pt-4 dark:bg-[#0f0f10]"
      data-testid="feed-post-create-screen"
    >
      {/* Rovnaká hlavička ako ostatné mobilné celoobrazovkové obrazovky
          (Súkromie a spol.) – zdieľaný SettingsDetailHeader, nie vlastná
          kópia štýlov, aby sa šípka a nadpis nemohli rozísť.
          Obal je sticky: pri dlhom formulári (fotky, tagovanie) by inak
          cesta späť odscrollovala preč. Pozadie musí byť NEPRIEHĽADNÉ, inak
          by pod ňou presvital obsah; záporné okraje ho roztiahnu cez
          horizontálny padding stránky. */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 bg-white px-4 pt-1 pb-3 dark:bg-[#0f0f10]">
        <SettingsDetailHeader
          title={t('feed.composerTitle', 'Nový príspevok')}
          backLabel={t('common.back', 'Späť')}
          onBack={onClose}
          className=""
        />
      </div>

      <FeedPostComposerForm onClose={onClose} onCreated={onCreated} />
    </div>
  );
}
