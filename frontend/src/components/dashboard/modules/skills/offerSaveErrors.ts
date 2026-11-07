import { getApiErrorMessage } from '@/lib/apiError';
import { OFFER_COUNTRY_REQUIRED_CODE } from './offerCountryRequirement';

type Translator = (key: string, fallback: string) => string;

/** Kód, ktorým server odmieta fotku kvôli nevhodnému obsahu (moderácia SafeSearch). */
const IMAGE_MODERATION_REJECTED_CODE = 'image_moderation_rejected';

type OfferApiError = {
  code?: unknown;
  response?: {
    data?: {
      code?: unknown;
    };
  };
};

export function getOfferSaveErrorMessage(error: unknown, t: Translator): string {
  const typedError = error as OfferApiError;
  // Axios adds its own transport code (for example ERR_BAD_REQUEST). The
  // backend business code is more specific and must win when both are present.
  const code = typedError?.response?.data?.code ?? typedError?.code;

  switch (code) {
    case OFFER_COUNTRY_REQUIRED_CODE:
      return t(
        'skills.countryRequired',
        'Vyber krajinu ponuky alebo dopytu.',
      );
    case 'duplicate_offer':
      return t(
        'skills.duplicateCard',
        'Kartu s touto podkategóriou už máš v tejto sekcii vytvorenú.',
      );
    case 'offer_description_too_long':
      return t(
        'skills.descriptionTooLong',
        'Krátky opis môže obsahovať maximálne 150 znakov.',
      );
    case 'offer_limit_reached':
      return t(
        'skills.maxCardsPerTypeAlert',
        'Môžeš mať maximálne 3 karty v tejto sekcii.',
      );
    case 'offer_validation_failed':
      return t(
        'skills.validationFailed',
        'Skontroluj vyplnené údaje a skús to znova.',
      );
    default:
      return t('skills.saveFailed', 'Ponuku sa nepodarilo uložiť. Skús to znova.');
  }
}

/** Odmietol server fotku kvôli nevhodnému obsahu? Kód nesie odpoveď servera, nie transportný kód axiosu. */
export function isImageModerationRejection(error: unknown): boolean {
  return (error as OfferApiError)?.response?.data?.code === IMAGE_MODERATION_REJECTED_CODE;
}

/**
 * Text toastu pre fotku ponuky, ktorú sa nepodarilo nahrať (`index` je poradie fotky od 1).
 *
 * Moderácia má vlastnú hlášku; inak ide názov chyby, poradie fotky a dôvod zo servera (alebo záložný text).
 * Používa ho okno ponúk aj mobilná úprava ponuky, takže chybu fotky hlásia rovnako.
 */
export function getOfferImageUploadErrorMessage(error: unknown, index: number, t: Translator): string {
  if (isImageModerationRejection(error)) {
    return t('skills.uploadModerationRejected', 'Fotka nebola prijatá kvôli nevhodnému obsahu.');
  }
  const reason = getApiErrorMessage(error, t('skills.imageUploadFailed', 'Nahrávanie obrázka zlyhalo'));
  return `${t('skills.imageUploadError', 'Chyba pri nahrávaní obrázka')} ${index}: ${reason}`;
}
