/**
 * Text toastu pri chybe nahrania fotky ponuky (nález 293). Používa ho okno ponúk aj mobilná úprava ponuky,
 * takže obe hlásia chybu fotky rovnako a z jedného miesta.
 */

import { getOfferImageUploadErrorMessage, isImageModerationRejection } from './offerSaveErrors';

/** Preklad, ktorý vráti záložný text zadaný v kóde. */
const fallbackTranslator = (_key: string, fallback: string) => fallback;

const MODERATION_ERROR = { response: { data: { code: 'image_moderation_rejected' } } };

describe('isImageModerationRejection', () => {
  it('pozná odmietnutie moderáciou podľa kódu v odpovedi servera', () => {
    expect(isImageModerationRejection(MODERATION_ERROR)).toBe(true);
  });

  it.each([
    ['iný kód servera', { response: { data: { code: 'duplicate_offer' } } }],
    ['kód len na samotnej chybe (nie v odpovedi servera)', { code: 'image_moderation_rejected' }],
    ['chyba bez odpovede servera', new Error('Network Error')],
    ['null', null],
    ['text namiesto chyby', 'image_moderation_rejected'],
  ])('nepovažuje za moderáciu: %s', (_label, error) => {
    expect(isImageModerationRejection(error)).toBe(false);
  });
});

describe('getOfferImageUploadErrorMessage', () => {
  it('pri moderácii ukáže vlastnú hlášku bez čísla fotky', () => {
    expect(getOfferImageUploadErrorMessage(MODERATION_ERROR, 2, fallbackTranslator)).toBe(
      'Fotka nebola prijatá kvôli nevhodnému obsahu.',
    );
  });

  it('pri inej chybe ukáže názov, poradie fotky a dôvod zo servera', () => {
    const error = { response: { data: { error: 'Neplatný typ súboru.' } } };

    expect(getOfferImageUploadErrorMessage(error, 1, fallbackTranslator)).toBe(
      'Chyba pri nahrávaní obrázka 1: Neplatný typ súboru.',
    );
    expect(getOfferImageUploadErrorMessage(error, 3, fallbackTranslator)).toBe(
      'Chyba pri nahrávaní obrázka 3: Neplatný typ súboru.',
    );
  });

  it('bez dôvodu zo servera použije správu chyby a až potom záložný text', () => {
    expect(getOfferImageUploadErrorMessage(new Error('Network Error'), 2, fallbackTranslator)).toBe(
      'Chyba pri nahrávaní obrázka 2: Network Error',
    );
    expect(getOfferImageUploadErrorMessage({}, 2, fallbackTranslator)).toBe(
      'Chyba pri nahrávaní obrázka 2: Nahrávanie obrázka zlyhalo',
    );
  });

  it('texty berie z prekladov podľa kľúčov', () => {
    const keyTranslator = (key: string) => `[${key}]`;

    expect(getOfferImageUploadErrorMessage({}, 1, keyTranslator)).toBe(
      '[skills.imageUploadError] 1: [skills.imageUploadFailed]',
    );
    expect(getOfferImageUploadErrorMessage(MODERATION_ERROR, 1, keyTranslator)).toBe(
      '[skills.uploadModerationRejected]',
    );
  });
});
