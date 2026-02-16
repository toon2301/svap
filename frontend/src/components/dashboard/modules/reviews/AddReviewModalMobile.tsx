'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, StarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  type AddReviewModalProps,
  getInitials,
  MAX_CHARS,
  MAX_PRO_CON_ITEMS,
  MAX_ITEM_CHARS,
  PRO_CON_LIST_MAX_HEIGHT,
} from './addReviewModalShared';

export function AddReviewModalMobile({
  open,
  onClose,
  reviewerName,
  reviewerAvatarUrl,
  reviewToEdit,
  onSubmit,
}: AddReviewModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoverRating(null);
      setText('');
      setPros([]);
      setCons([]);
      setProInput('');
      setConInput('');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (reviewToEdit) {
        setRating(Number(reviewToEdit.rating) || 0);
        setHoverRating(null);
        setText(reviewToEdit.text || '');
        setPros(reviewToEdit.pros || []);
        setCons(reviewToEdit.cons || []);
        setProInput('');
        setConInput('');
      } else {
        setRating(0);
        setHoverRating(null);
        setText('');
        setPros([]);
        setCons([]);
        setProInput('');
        setConInput('');
      }
    }
  }, [open, reviewToEdit]);

  const displayRating = hoverRating ?? rating;
  const textLength = text.length;
  const isOverLimit = textLength > MAX_CHARS;

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRightHalf = x >= rect.width / 2;
    setRating(starIndex + (isRightHalf ? 1 : 0.5));
  };

  const handleStarMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRightHalf = x >= rect.width / 2;
    setHoverRating(starIndex + (isRightHalf ? 1 : 0.5));
  };

  const addPro = () => {
    const trimmed = proInput.trim().slice(0, MAX_ITEM_CHARS);
    if (trimmed && pros.length < MAX_PRO_CON_ITEMS) {
      setPros((prev) => [...prev, trimmed]);
      setProInput('');
    }
  };

  const addCon = () => {
    const trimmed = conInput.trim().slice(0, MAX_ITEM_CHARS);
    if (trimmed && cons.length < MAX_PRO_CON_ITEMS) {
      setCons((prev) => [...prev, trimmed]);
      setConInput('');
    }
  };

  const removePro = (index: number) => setPros((prev) => prev.filter((_, i) => i !== index));
  const removeCon = (index: number) => setCons((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError(null);
    if (rating === 0) {
      setError('Prosím, vyber hodnotenie (hviezdičky).');
      return;
    }
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(rating, text.slice(0, MAX_CHARS), pros, cons);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Nepodarilo sa pridať recenziu. Skús to znova.');
        setIsSubmitting(false);
      }
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-review-modal-title-mobile"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="w-full mx-auto box-border">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <h2 id="add-review-modal-title-mobile" className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {reviewToEdit ? t('reviews.editReview', 'Upraviť recenziu') : t('reviews.addReview', 'Pridať recenziu')}
                </h2>
                <span
                  className="shrink-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
                  title={t('reviews.reviewDisclaimer', 'Recenzie sú vytvárané používateľmi platformy.')}
                  aria-label={t('reviews.reviewDisclaimer', 'Recenzie sú vytvárané používateľmi platformy.')}
                >
                  <InformationCircleIcon className="w-5 h-5" />
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                aria-label={t('common.close', 'Zavrieť')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              {reviewerAvatarUrl ? (
                <img src={reviewerAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{getInitials(reviewerName)}</span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {reviewerName || t('requests.userFallback', 'Používateľ')}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('reviews.rating', 'Hodnotenie')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((starNum) => {
                    const fillPct = displayRating >= starNum ? 100 : displayRating >= starNum - 0.5 ? 50 : 0;
                    return (
                      <button
                        key={starNum}
                        type="button"
                        className="relative p-1 w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60 rounded touch-manipulation"
                        onClick={(e) => handleStarClick(e, starNum - 1)}
                        onMouseMove={(e) => handleStarMouseMove(e, starNum - 1)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`${starNum} ${starNum === 1 ? 'hviezdička' : 'hviezdičky'}`}
                      >
                        <span className="relative block w-7 h-7">
                          <StarIcon className="w-7 h-7 text-gray-300 dark:text-gray-600 absolute inset-0" />
                          <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
                            <StarIconSolid className="w-7 h-7 text-amber-400" />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-sm font-medium tabular-nums text-gray-600 dark:text-gray-400">
                  {displayRating > 0 ? `${Math.round((displayRating / 5) * 100)} %` : '—'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('reviews.pros', 'Plusy')}</label>
              <input
                type="text"
                value={proInput}
                onChange={(e) => setProInput(e.target.value.slice(0, MAX_ITEM_CHARS))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPro(); } }}
                placeholder={t('reviews.prosPlaceholder', 'Napíšte plus a stlačte Enter')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/60"
              />
              {pros.length > 0 && (
                <div className="flex flex-col gap-0 mt-1 overflow-y-auto overscroll-contain review-modal-mobile-scrollbar [&>span]:-mb-2 last:[&>span]:mb-0" style={{ maxHeight: PRO_CON_LIST_MAX_HEIGHT }}>
                  {pros.map((item, index) => (
                    <span key={`pro-${index}`} className="inline-flex items-center gap-0.5 py-0 pl-0 pr-0.5 text-green-700 dark:text-green-300 text-xs w-full min-w-0 leading-none">
                      <span className="flex-1 min-w-0 truncate">{item}</span>
                      <button type="button" onClick={() => removePro(index)} className="shrink-0 p-0.5 rounded text-green-600 dark:text-green-400 hover:opacity-80" aria-label={t('common.remove', 'Odstrániť')}>
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {pros.length >= MAX_PRO_CON_ITEMS && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('reviews.maxItemsReached', 'Maximálny počet položiek')}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('reviews.cons', 'Minusy')}</label>
              <input
                type="text"
                value={conInput}
                onChange={(e) => setConInput(e.target.value.slice(0, MAX_ITEM_CHARS))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCon(); } }}
                placeholder={t('reviews.consPlaceholder', 'Napíšte mínus a stlačte Enter')}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/60"
              />
              {cons.length > 0 && (
                <div className="flex flex-col gap-0 mt-1 overflow-y-auto overscroll-contain review-modal-mobile-scrollbar [&>span]:-mb-2 last:[&>span]:mb-0" style={{ maxHeight: PRO_CON_LIST_MAX_HEIGHT }}>
                  {cons.map((item, index) => (
                    <span key={`con-${index}`} className="inline-flex items-center gap-0.5 py-0 pl-0 pr-0.5 text-red-700 dark:text-red-300 text-xs w-full min-w-0 leading-none">
                      <span className="flex-1 min-w-0 truncate">{item}</span>
                      <button type="button" onClick={() => removeCon(index)} className="shrink-0 p-0.5 rounded text-red-600 dark:text-red-400 hover:opacity-80" aria-label={t('common.remove', 'Odstrániť')}>
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {cons.length >= MAX_PRO_CON_ITEMS && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('reviews.maxItemsReached', 'Maximálny počet položiek')}</p>}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="add-review-text-mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('reviews.reviewText', 'Recenzia')}</label>
              <textarea
                id="add-review-text-mobile"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
                rows={4}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-gray-400/60 overflow-y-auto review-modal-scrollbar ${isOverLimit ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                placeholder={t('reviews.reviewPlaceholder', 'Napíšte svoju recenziu...')}
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {t('common.cancel', 'Zrušiť')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isOverLimit || rating <= 0 || isSubmitting}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-800 dark:bg-gray-700 text-white font-medium hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reviewToEdit ? t('common.save', 'Uložiť') : isSubmitting ? t('common.loading', 'Pridávam...') : t('reviews.submit', 'Pridať')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
