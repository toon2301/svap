'use client';

import { PhotoIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Vzhľad náhrady:
 *  - `default`: ikona a text na neutrálnej ploche (karusel príspevku),
 *  - `compact`: len ikona, text nesie `aria-label` (malé dlaždice, kam by sa text nezmestil),
 *  - `onDark`: svetlé farby pre fullscreen prehliadač na tmavom podklade.
 */
export type ImageLoadFailedVariant = 'default' | 'compact' | 'onDark';

type ImageLoadFailedProps = {
  variant?: ImageLoadFailedVariant;
  /** Doplnkové triedy obalu (napr. zaoblenie). Rozmery určuje rodič, obal vždy vypĺňa jeho plochu. */
  className?: string;
  /** Test id obalu; keď sú na obrazovke dve náhrady naraz, každá potrebuje vlastné. */
  testId?: string;
};

const NEUTRAL_TONE = 'bg-gray-100 text-gray-600 dark:bg-[#0e0e0f] dark:text-gray-400';

const TONE: Record<ImageLoadFailedVariant, string> = {
  default: NEUTRAL_TONE,
  compact: NEUTRAL_TONE,
  onDark: 'bg-white/5 text-white/70',
};

const ICON_SIZE: Record<ImageLoadFailedVariant, string> = {
  default: 'h-10 w-10',
  compact: 'h-8 w-8',
  onDark: 'h-12 w-12',
};

/**
 * Viditeľná náhrada na mieste fotky, ktorú sa nepodarilo načítať (zmazaný alebo nedostupný súbor). Rozloženie ostáva
 * rovnaké ako pri fotke (obal vypĺňa rodiča), no namiesto prázdnej plochy, ktorá v tmavom režime vyzerala ako veľká
 * čierna škvrna, je na nej ikona a text. Obal je `role="img"` s popisom, takže dôvod zistia aj čítačky obrazovky.
 */
export default function ImageLoadFailed({
  variant = 'default',
  className = '',
  testId = 'image-load-failed',
}: ImageLoadFailedProps) {
  const { t } = useLanguage();
  const label = t('common.imageLoadFailed', 'Fotku sa nepodarilo načítať');

  return (
    <div
      role="img"
      aria-label={label}
      data-testid={testId}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center ${TONE[variant]} ${className}`}
    >
      <PhotoIcon aria-hidden="true" className={`${ICON_SIZE[variant]} opacity-80`} />
      {variant === 'compact' ? null : <span className="text-sm leading-5">{label}</span>}
    </div>
  );
}
