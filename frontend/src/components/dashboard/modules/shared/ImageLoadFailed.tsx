/**
 * Neutrálna plocha na mieste fotky, ktorú sa nepodarilo načítať (zmazaný alebo nedostupný súbor). Má rovnaké pozadie
 * ako rám `BlurredContainImage`, takže rozloženie ostáva a namiesto pokazeného obrázka s alt textom nie je nič rušivé.
 */
export default function ImageLoadFailed({ className = '' }: { className?: string }) {
  return (
    <div
      data-testid="image-load-failed"
      className={`h-full w-full bg-gray-100 dark:bg-[#0e0e0f] ${className}`}
    />
  );
}
