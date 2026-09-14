'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVisualViewportBounds } from '../../../hooks/useVisualViewportBounds';
import { useModalFocusTrap } from '../../profile/useModalFocusTrap';
import { MAX_OFFER_WATCHES, type OfferWatch, type OfferWatchInput } from '../types';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchDeleteDialog from '../settings/OfferWatchDeleteDialog';
import { offerWatchErrorMessage } from '../settings/offerWatchUi';
import OfferWatchMobileFormScreen from './OfferWatchMobileFormScreen';
import OfferWatchMobileListScreen from './OfferWatchMobileListScreen';
import { OFFER_WATCH_MOBILE_TITLE_ID } from './OfferWatchMobileShell';
import type { OfferWatchMobileView } from './offerWatchMobileNavigation';

type OfferWatchSettingsMobileProps = {
  view: OfferWatchMobileView;
  onBack: () => void;
  onPushView: (view: OfferWatchMobileView) => void;
};

export default function OfferWatchSettingsMobile({
  view,
  onBack,
  onPushView,
}: OfferWatchSettingsMobileProps) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const unavailableViewRef = useRef<string | null>(null);
  const createWasAvailableRef = useRef<boolean | null>(null);
  const [deletingWatch, setDeletingWatch] = useState<OfferWatch | null>(null);
  const {
    watches,
    isLoading,
    mutation,
    error,
    reload,
    createWatch,
    updateWatch,
    deleteWatch,
    clearError,
  } = useOfferWatches();
  const hasLoadError = Boolean(error && !mutation && !isLoading);
  const selectedWatch = useMemo(() => (
    view.kind === 'edit'
      ? watches.find((watch) => watch.id === view.watchId) ?? null
      : null
  ), [view, watches]);
  const deleteDialogOpen = deletingWatch !== null;
  const mobileViewportBounds = useVisualViewportBounds(view.kind !== 'list');
  const mobileViewportStyle = mobileViewportBounds
    ? {
      top: `${mobileViewportBounds.top}px`,
      height: `${mobileViewportBounds.height}px`,
    }
    : undefined;

  useModalFocusTrap(!deleteDialogOpen, rootRef);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape'
        || event.defaultPrevented
        || deleteDialogOpen
        || mutation !== null
      ) {
        return;
      }
      event.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [deleteDialogOpen, mutation, onBack]);

  useEffect(() => {
    if (view.kind !== 'create') createWasAvailableRef.current = null;
    if (isLoading || hasLoadError) return;
    let unavailableKey: string | null = null;
    if (view.kind === 'edit') {
      unavailableKey = `edit-${view.watchId}`;
    } else if (view.kind === 'create') {
      if (createWasAvailableRef.current === null) {
        createWasAvailableRef.current = watches.length < MAX_OFFER_WATCHES;
      }
      if (!createWasAvailableRef.current) unavailableKey = 'create-limit';
    }
    if (!unavailableKey || (view.kind === 'edit' && selectedWatch)) {
      unavailableViewRef.current = null;
      return;
    }
    if (unavailableViewRef.current === unavailableKey) return;
    unavailableViewRef.current = unavailableKey;
    toast.error(view.kind === 'edit'
      ? offerWatchErrorMessage(t, 'not_found')
      : offerWatchErrorMessage(t, 'limit'));
    onBack();
  }, [hasLoadError, isLoading, onBack, selectedWatch, t, view, watches.length]);

  const runCreate = useCallback(async (input: OfferWatchInput) => {
    const result = await createWatch(input);
    if (!result.ok) clearError();
    return result;
  }, [clearError, createWatch]);

  const runUpdate = useCallback(async (input: OfferWatchInput) => {
    if (view.kind !== 'edit') {
      return {
        ok: false as const,
        error: Object.assign(new Error('Offer watch is unavailable.'), {
          kind: 'not_found' as const,
          status: 404,
          fields: [],
        }),
      };
    }
    const result = await updateWatch(view.watchId, input);
    if (!result.ok) clearError();
    return result;
  }, [clearError, updateWatch, view]);

  const retryLoad = useCallback(async () => {
    const result = await reload();
    if (!result.ok && result.error.kind !== 'cancelled') {
      toast.error(offerWatchErrorMessage(t, result.error.kind));
    }
  }, [reload, t]);

  const handleUnavailable = useCallback(() => {
    void reload();
    onBack();
  }, [onBack, reload]);

  const handleDelete = useCallback(async () => {
    if (!deletingWatch || mutation) return;
    const result = await deleteWatch(deletingWatch.id);
    if (result.ok) {
      setDeletingWatch(null);
      toast.success(t('offerWatch.deleteSuccess', 'Sledovanie bolo vymazané.'));
      return;
    }
    clearError();
    if (result.error.kind === 'cancelled') return;
    toast.error(offerWatchErrorMessage(t, result.error.kind));
    if (result.error.kind === 'not_found') {
      setDeletingWatch(null);
      void reload();
    }
  }, [clearError, deleteWatch, deletingWatch, mutation, reload, t]);

  const isCreateSubmitting = mutation?.kind === 'create';
  const isUpdateSubmitting = mutation?.kind === 'update';
  const isDeleteSubmitting = mutation?.kind === 'delete';
  const shouldShowLoadingList = view.kind !== 'list' && (isLoading || hasLoadError);

  return (
    <>
      <div
        ref={rootRef}
        className='fixed inset-x-0 top-0 z-[9000] h-dvh overflow-hidden bg-white text-gray-900 dark:bg-black dark:text-white lg:hidden'
        style={mobileViewportStyle}
        role='dialog'
        aria-modal='true'
        aria-label={t('offerWatch.title', 'Sledovanie')}
        aria-labelledby={OFFER_WATCH_MOBILE_TITLE_ID}
        aria-hidden={deleteDialogOpen || undefined}
        data-testid='offer-watch-mobile-screen'
      >
        {view.kind === 'list' || shouldShowLoadingList ? (
          <OfferWatchMobileListScreen
            watches={watches}
            isLoading={isLoading}
            hasLoadError={hasLoadError}
            mutation={mutation}
            onBack={onBack}
            onCreate={() => onPushView({ kind: 'create' })}
            onEdit={(watch) => onPushView({ kind: 'edit', watchId: watch.id })}
            onDelete={setDeletingWatch}
            onRetry={() => { void retryLoad(); }}
          />
        ) : view.kind === 'create' ? (
          <OfferWatchMobileFormScreen
            key='create'
            mode='create'
            isSubmitting={Boolean(isCreateSubmitting)}
            onBack={onBack}
            onSave={runCreate}
            onSaved={onBack}
            onUnavailable={handleUnavailable}
            picker={view.picker}
            onOpenPicker={(picker) => onPushView({ kind: 'create', picker })}
            viewportBounds={mobileViewportBounds}
          />
        ) : selectedWatch ? (
          <OfferWatchMobileFormScreen
            key={`edit-${selectedWatch.id}`}
            mode='edit'
            watch={selectedWatch}
            isSubmitting={Boolean(isUpdateSubmitting)}
            onBack={onBack}
            onSave={runUpdate}
            onSaved={onBack}
            onUnavailable={handleUnavailable}
            picker={view.picker}
            viewportBounds={mobileViewportBounds}
            onOpenPicker={(picker) => onPushView({
              kind: 'edit',
              watchId: selectedWatch.id,
              picker,
            })}
          />
        ) : null}
      </div>

      <OfferWatchDeleteDialog
        watch={deletingWatch}
        isSubmitting={Boolean(isDeleteSubmitting)}
        onClose={() => setDeletingWatch(null)}
        onConfirm={() => { void handleDelete(); }}
      />
    </>
  );
}
