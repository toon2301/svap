import { OFFER_COUNTRY_REQUIRED_CODE } from './offerCountryRequirement';

type Translator = (key: string, fallback: string) => string;

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
  const code = typedError?.code ?? typedError?.response?.data?.code;

  switch (code) {
    case OFFER_COUNTRY_REQUIRED_CODE:
      return t(
        'skills.countryRequired',
        'Vyber krajinu ponuky alebo dopytu.',
      );
    case 'duplicate_offer':
      return t(
        'skills.duplicateCard',
        'Takúto ponuku alebo dopyt už máš vytvorený.',
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
