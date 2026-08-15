import { getOfferSaveErrorMessage } from './offerSaveErrors';

const t = (_key: string, fallback: string) => fallback;

describe('getOfferSaveErrorMessage', () => {
  it.each([
    ['duplicate_offer', 'Takúto ponuku alebo dopyt už máš vytvorený.'],
    [
      'offer_description_too_long',
      'Krátky opis môže obsahovať maximálne 150 znakov.',
    ],
    ['offer_limit_reached', 'Môžeš mať maximálne 3 karty v tejto sekcii.'],
    ['offer_validation_failed', 'Skontroluj vyplnené údaje a skús to znova.'],
  ])('maps %s to a human-readable message', (code, expected) => {
    const error = { response: { data: { code } } };

    expect(getOfferSaveErrorMessage(error, t)).toBe(expected);
  });

  it('does not expose an unknown technical API message', () => {
    const error = {
      response: {
        data: {
          code: 'unknown_code',
          error: 'Database connection traceback',
        },
      },
    };

    expect(getOfferSaveErrorMessage(error, t)).toBe(
      'Ponuku sa nepodarilo uložiť. Skús to znova.',
    );
  });
});
