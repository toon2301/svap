'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import type { PortfolioItem } from './portfolioTypes';
import { PortfolioCreateForm } from './PortfolioCreateForm';
import {
  buildPortfolioDetailPath,
  buildPortfolioListPath,
  getPortfolioOwnerIdentifier,
} from './portfolioRouting';

type PortfolioCreateScreenProps = {
  user: User;
  ownerIdentifier?: string | null;
};

export function PortfolioCreateScreen({ user, ownerIdentifier }: PortfolioCreateScreenProps) {
  const router = useRouter();

  const ownIdentifier = getPortfolioOwnerIdentifier(user.id, user.slug);

  // Redirect cudzieho používateľa na vlastný zoznam portfólia (len vlastník môže vytvárať)
  useEffect(() => {
    if (!ownerIdentifier || !ownIdentifier) return;
    const isSelf =
      ownerIdentifier === ownIdentifier ||
      ownerIdentifier === String(user.id) ||
      (user.slug && ownerIdentifier === user.slug);
    if (!isSelf) {
      router.replace(buildPortfolioListPath(ownIdentifier));
    }
  }, [ownerIdentifier, ownIdentifier, router, user.id, user.slug]);

  const effectiveIdentifier = ownIdentifier ?? ownerIdentifier ?? null;

  const handleCreated = (item: PortfolioItem) => {
    if (effectiveIdentifier) {
      router.push(buildPortfolioDetailPath(effectiveIdentifier, item.id));
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="px-4 pt-2 pb-8">
      <PortfolioCreateForm onCancel={handleCancel} onCreated={handleCreated} />
    </div>
  );
}
