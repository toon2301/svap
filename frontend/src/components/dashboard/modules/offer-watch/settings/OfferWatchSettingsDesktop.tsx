'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import DelayedSkeleton from '../../settings/DelayedSkeleton';
import SettingsDetailHeader from '../../settings/SettingsDetailHeader';
import { createOfferWatchDraft, validateOfferWatchDraft } from '../offerWatchDraft';
import { MAX_OFFER_WATCHES } from '../types';
import type {
  OfferWatch,
  OfferWatchActionResult,
  OfferWatchDraft,
  OfferWatchDraftField,
  OfferWatchInput,
  OfferWatchValidationErrors,
} from '../types';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchDeleteDialog from './OfferWatchDeleteDialog';
import OfferWatchEditDialog from './OfferWatchEditDialog';
import OfferWatchForm from './OfferWatchForm';
import OfferWatchSavedList, { OfferWatchListSkeleton } from './OfferWatchSavedList';
import OfferWatchSettingsSkeleton from './OfferWatchSettingsSkeleton';
import {
  focusFirstOfferWatchError,
  offerWatchErrorMessage,
  validationErrorsFromApiFields,
} from './offerWatchUi';

type OfferWatchSettingsDesktopProps = {
  onBack?: () => void;
};

const CREATE_FORM_ID = 'offer-watch-create';

/**
 * Desktopové Sledovanie: formulár na vytvorenie sledovania a zoznam uložených. Kostra pri načítavaní (celá stránka pri
 * prvom načítaní, zoznam pri neskoršom) sa ukáže až po 200 ms, takže rýchla odpoveď ju neukáže vôbec a nepreblikla pred
 * prázdnym stavom (nález 310, rovnako ako na mobile od nálezu 286). Obsah, ktorý príde po načítavaní, sa krátko vyfaduje;
 * dialógy ho nevyfadujú, lebo načítavanie nespúšťajú.
 */
export default function OfferWatchSettingsDesktop({
  onBack,
}: OfferWatchSettingsDesktopProps) {
  const { country, t } = useLanguage();
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
  const [draft, setDraft] = useState<OfferWatchDraft>(() =>
    createOfferWatchDraft({ detectedCountryCode: country }),
  );
  const [errors, setErrors] = useState<OfferWatchValidationErrors>({});
  const [editingWatch, setEditingWatch] = useState<OfferWatch | null>(null);
  const [deletingWatch, setDeletingWatch] = useState<OfferWatch | null>(null);

  const atLimit = watches.length >= MAX_OFFER_WATCHES;
  const isCreating = mutation?.kind === 'create';
  const isUpdating = mutation?.kind === 'update';
  const isDeleting = mutation?.kind === 'delete';
  const hasLoadError = Boolean(error && !mutation && !isLoading);
  const isInitialLoading = isLoading && watches.length === 0;
  // Krátky prechod dostane len obsah, ktorý príde po načítavaní (nález 310): príznak sa zapne, keď sa načítavanie
  // zaznamená. Otvorenie a zatvorenie dialógov načítavanie nespúšťa, takže ich obsah nevyfaduje.
  const [fadeIn, setFadeIn] = useState(false);
  const fadeClass = fadeIn ? ' animate-content-in' : '';

  /** Zaznamená načítavanie: až potom sa obsah, ktorý po ňom príde, krátko vyfaduje (nález 310). */
  useEffect(/** Zapne prechod obsahu po načítaní. */ () => {
    if (isLoading) setFadeIn(true);
  }, [isLoading]);

  useEffect(() => {
    if (draft.countryCode || !country) return;
    const nextDraft = createOfferWatchDraft({ detectedCountryCode: country });
    if (!nextDraft.countryCode) return;
    setDraft(nextDraft);
    setErrors((current) => {
      const next = { ...current };
      delete next.countryCode;
      return next;
    });
  }, [country, draft.countryCode]);

  const handleDraftChange = useCallback((
    nextDraft: OfferWatchDraft,
    clearFields: OfferWatchDraftField[] = [],
  ) => {
    setDraft(nextDraft);
    if (clearFields.length) {
      setErrors((current) => {
        const next = { ...current };
        clearFields.forEach((field) => delete next[field]);
        return next;
      });
    }
  }, []);

  const handleCreate = async () => {
    if (mutation || atLimit || hasLoadError) return;
    const validation = validateOfferWatchDraft(draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      focusFirstOfferWatchError(CREATE_FORM_ID, validation.errors);
      toast.error(offerWatchErrorMessage(t, 'validation'));
      return;
    }

    const result = await createWatch(validation.input);
    if (result.ok) {
      setDraft(createOfferWatchDraft({ detectedCountryCode: country }));
      setErrors({});
      toast.success(t('offerWatch.createSuccess', 'Sledovanie bolo uložené.'));
      return;
    }
    clearError();
    if (result.error.kind === 'cancelled') return;
    if (result.error.kind === 'validation') {
      const serverErrors = validationErrorsFromApiFields(result.error.fields);
      setErrors(serverErrors);
      focusFirstOfferWatchError(CREATE_FORM_ID, serverErrors);
    }
    toast.error(offerWatchErrorMessage(t, result.error.kind));
    if (result.error.kind === 'limit') void reload();
  };

  const handleUpdate = useCallback(async (
    watchId: number,
    input: OfferWatchInput,
  ): Promise<OfferWatchActionResult<OfferWatch>> => {
    const result = await updateWatch(watchId, input);
    if (!result.ok) clearError();
    return result;
  }, [clearError, updateWatch]);

  const handleUnavailableEdit = useCallback(() => {
    setEditingWatch(null);
    void reload();
  }, [reload]);

  const closeEditDialog = useCallback(() => setEditingWatch(null), []);
  const closeDeleteDialog = useCallback(() => setDeletingWatch(null), []);

  const handleDelete = async () => {
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
  };

  const retryLoad = async () => {
    const result = await reload();
    if (!result.ok && result.error.kind !== 'cancelled') {
      toast.error(offerWatchErrorMessage(t, result.error.kind));
    }
  };

  const disabledMessage = atLimit
    ? t('offerWatch.limitReached', 'Dosiahol si limit 5 sledovaní. Ak chceš pridať nové, jedno z existujúcich vymaž.')
    : hasLoadError
      ? t('offerWatch.loadBeforeCreate', 'Najprv obnov zoznam sledovaní.')
      : undefined;

  return (
    <div className='hidden w-full lg:block'>
      <SettingsDetailHeader
        title={t('offerWatch.title', 'Sledovanie')}
        backLabel={t('common.back', 'Späť')}
        onBack={onBack}
      />
      <p className='mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
        {t('offerWatch.description', 'Vyber, aké ponuky alebo dopyty chceš sledovať. O nových zhodách ťa upozorníme.')}
      </p>

      {isInitialLoading ? (
        // Kostra celej stránky sa ukáže až po 200 ms (rýchla odpoveď ju neukáže vôbec, nález 310) a pulzuje sama.
        <DelayedSkeleton
          isLoading
          label={t('common.loading', 'Načítavam...')}
          pulse={false}
          testId='offer-watch-settings-loading'
        >
          <OfferWatchSettingsSkeleton />
        </DelayedSkeleton>
      ) : (
        <>
          <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#101011] sm:p-6${fadeClass}`} aria-label={t('offerWatch.formLabel', 'Nastavenie sledovania')}>
            <OfferWatchForm
              idPrefix={CREATE_FORM_ID}
              draft={draft}
              errors={errors}
              onChange={handleDraftChange}
              onSubmit={handleCreate}
              submitLabel={t('offerWatch.save', 'Uložiť sledovanie')}
              submittingLabel={t('offerWatch.saving', 'Ukladám sledovanie...')}
              isSubmitting={Boolean(isCreating)}
              disabled={isLoading || hasLoadError || atLimit || Boolean(mutation && !isCreating)}
              disabledMessage={disabledMessage}
            />
          </section>

          <section className={`mt-8${fadeClass}`} aria-labelledby='offer-watch-saved-title'>
            <div className='mb-4 flex items-center justify-between gap-4'>
              <h2 id='offer-watch-saved-title' className='text-xl font-semibold text-gray-900 dark:text-white'>
                {t('offerWatch.savedTitle', 'Uložené sledovania')}
              </h2>
              <span className='rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300' aria-label={t('offerWatch.countLabel', 'Počet uložených sledovaní')}>
                {watches.length} / {MAX_OFFER_WATCHES}
              </span>
            </div>

            {hasLoadError ? (
              <div className='rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center dark:border-red-900/60 dark:bg-red-950/20' role='alert'>
                <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                  {t('offerWatch.loadFailed', 'Sledovania sa nepodarilo načítať.')}
                </p>
                <button
                  type='button'
                  onClick={retryLoad}
                  className='mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/30 dark:border-red-800 dark:bg-[#101011] dark:text-red-200 dark:hover:bg-red-950/40'
                >
                  <ArrowPathIcon className='h-4 w-4' aria-hidden='true' />
                  {t('offerWatch.retry', 'Skúsiť znova')}
                </button>
              </div>
            ) : isLoading ? (
              // Kostra zoznamu pri neskoršom načítavaní: tiež až po 200 ms; karty kostry pulzujú samy.
              <DelayedSkeleton
                isLoading
                label={t('offerWatchResults.loading', 'Načítavam sledovania...')}
                pulse={false}
                testId='offer-watch-desktop-list-loading'
              >
                <OfferWatchListSkeleton />
              </DelayedSkeleton>
            ) : (
              <OfferWatchSavedList
                watches={watches}
                mutation={mutation}
                onEdit={setEditingWatch}
                onDelete={setDeletingWatch}
              />
            )}
          </section>
        </>
      )}

      <OfferWatchEditDialog
        watch={editingWatch}
        isSubmitting={Boolean(isUpdating)}
        onClose={closeEditDialog}
        onSave={handleUpdate}
        onUnavailable={handleUnavailableEdit}
      />
      <OfferWatchDeleteDialog
        watch={deletingWatch}
        isSubmitting={Boolean(isDeleting)}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
      />
    </div>
  );
}
