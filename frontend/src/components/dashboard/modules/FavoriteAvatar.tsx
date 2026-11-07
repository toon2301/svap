'use client';

import { useState, type ReactNode } from 'react';
import BlurredContainImage from './shared/BlurredContainImage';

type FavoriteAvatarProps = {
  avatarUrl?: string | null;
  alt: string;
  /** Náhrada (iniciály), ktorá sa ukáže bez avatara aj vtedy, keď sa jeho fotka nenačíta. */
  fallback: ReactNode;
};

/** Avatar karty v Obľúbených; keď sa fotka nenačíta (zmazaný súbor), ukáže náhradu ako pri používateľovi bez avatara. */
export default function FavoriteAvatar({ avatarUrl, alt, fallback }: FavoriteAvatarProps) {
  // Adresa, ktorej načítanie zlyhalo; nová adresa avatara sa skúsi znova.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!avatarUrl || failedUrl === avatarUrl) return <>{fallback}</>;

  return (
    <BlurredContainImage
      src={avatarUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(avatarUrl)}
    />
  );
}
