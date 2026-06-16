'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Offer } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import { ProfileOfferDetailMobileContent } from './ProfileOfferDetailMobileContent';
import { ProfileOfferDetailSheetHeader } from './ProfileOfferDetailSheetHeader';
import { useBottomSheetDismiss } from './useBottomSheetDismiss';

interface ProfileOfferDetailMobileProps {
  offer: Offer | null;
  accountType: 'personal' | 'business';
  onClose: () => void;
  onShowHours: (hours: OpeningHours) => void;
}

export function ProfileOfferDetailMobile({
  offer,
  accountType,
  onClose,
  onShowHours,
}: ProfileOfferDetailMobileProps) {
  const { t } = useLanguage();
  const [isEntered, setIsEntered] = useState(false);
  const { dragHandleProps, sheetStyle, isDragging } = useBottomSheetDismiss({
    onDismiss: onClose,
    enabled: Boolean(offer),
  });

  useEffect(() => {
    if (!offer) {
      setIsEntered(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsEntered(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [offer?.id]);

  useEffect(() => {
    if (!offer || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [offer?.id]);

  if (!offer || typeof document === 'undefined') {
    return null;
  }

  const combinedSheetStyle = {
    ...sheetStyle,
    transform: !isEntered ? 'translateY(100%)' : sheetStyle.transform,
    transition: isDragging ? 'none' : sheetStyle.transition ?? 'transform 250ms ease-out',
  };

  const body = (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col rounded-t-3xl bg-[var(--background)] text-[var(--foreground)] shadow-2xl"
        style={combinedSheetStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <ProfileOfferDetailSheetHeader
          title={t('skills.description', 'Popis')}
          swipeHint={t('profile.offerDetailSwipeToClose', 'Potiahni nadol pre zatvorenie')}
          closeLabel={t('common.close', 'Zavrieť')}
          onCloseClick={onClose}
          dragHandleProps={dragHandleProps}
        />
        <div className="min-h-0 flex-1 overflow-y-auto subtle-scrollbar">
          <ProfileOfferDetailMobileContent
            offer={offer}
            accountType={accountType}
            onShowHours={onShowHours}
          />
        </div>
      </div>
    </>
  );

  return createPortal(body, document.getElementById('app-root') ?? document.body);
}
