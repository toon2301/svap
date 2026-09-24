import { getOfferSaveErrorMessage } from './offerSaveErrors';

const t = (_key: string, fallback: string) => fallback;

describe('getOfferSaveErrorMessage', () => {
  it.each([
    ['offer_country_required', 'Vyber krajinu ponuky alebo dopytu.'],
    ['duplicate_offer', 'Kartu s touto podkategóriou už máš v tejto sekcii vytvorenú.'],
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

  it('prefers the backend business code over the Axios transport code', () => {
    const error = {
      code: 'ERR_BAD_REQUEST',
      response: { data: { code: 'duplicate_offer' } },
    };

    expect(getOfferSaveErrorMessage(error, t)).toBe(
      'Kartu s touto podkategóriou už máš v tejto sekcii vytvorenú.',
    );
  });

  it('maps a local pre-validation code too', () => {
    expect(
      getOfferSaveErrorMessage({ code: 'offer_country_required' }, t),
    ).toBe('Vyber krajinu ponuky alebo dopytu.');
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
