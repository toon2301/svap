import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';

/**
 * Texty chyby pri pridaní a úprave recenzie (nález 336): `reviews.addReviewFailed` a `reviews.editReviewFailed` sú vo
 * všetkých šiestich jazykoch, každý jazyk má vlastný preklad (nie slovenskú kópiu) a text pridania sa líši od textu
 * úpravy. Okno „Pridať recenziu“ ich ukáže pri chybe bez textu zo servera (napr. pri vypnutom internete) namiesto
 * anglického „Network Error“.
 */
const LANGUAGES = { sk, cs, en, pl, de, hu };
type Language = keyof typeof LANGUAGES;

const EXPECTED: Record<Language, { addReviewFailed: string; editReviewFailed: string }> = {
  sk: {
    addReviewFailed: 'Nepodarilo sa pridať recenziu. Skúste to znova.',
    editReviewFailed: 'Nepodarilo sa upraviť recenziu. Skúste to znova.',
  },
  cs: {
    addReviewFailed: 'Recenzi se nepodařilo přidat. Zkuste to znovu.',
    editReviewFailed: 'Recenzi se nepodařilo upravit. Zkuste to znovu.',
  },
  en: {
    addReviewFailed: 'Could not add the review. Please try again.',
    editReviewFailed: 'Could not update the review. Please try again.',
  },
  pl: {
    addReviewFailed: 'Nie udało się dodać opinii. Spróbuj ponownie.',
    editReviewFailed: 'Nie udało się edytować opinii. Spróbuj ponownie.',
  },
  de: {
    addReviewFailed: 'Die Bewertung konnte nicht hinzugefügt werden. Bitte versuchen Sie es erneut.',
    editReviewFailed: 'Die Bewertung konnte nicht bearbeitet werden. Bitte versuchen Sie es erneut.',
  },
  hu: {
    addReviewFailed: 'Nem sikerült hozzáadni az értékelést. Próbálja újra.',
    editReviewFailed: 'Nem sikerült szerkeszteni az értékelést. Próbálja újra.',
  },
};

const LANGUAGE_CODES = Object.keys(LANGUAGES) as Language[];
const NON_SLOVAK = LANGUAGE_CODES.filter((language) => language !== 'sk');

describe('reviews.addReviewFailed a reviews.editReviewFailed: chyba pri pridaní a úprave recenzie (nález 336)', () => {
  it.each(LANGUAGE_CODES)('%s: oba kľúče sú v bloku reviews a majú dohodnuté znenie', (language) => {
    const { reviews } = LANGUAGES[language];

    expect(reviews.addReviewFailed).toBe(EXPECTED[language].addReviewFailed);
    expect(reviews.editReviewFailed).toBe(EXPECTED[language].editReviewFailed);
  });

  it.each(NON_SLOVAK)('%s: texty nie sú skopírované zo slovenčiny', (language) => {
    const { reviews } = LANGUAGES[language];

    expect(reviews.addReviewFailed).not.toBe(sk.reviews.addReviewFailed);
    expect(reviews.editReviewFailed).not.toBe(sk.reviews.editReviewFailed);
  });

  it.each(LANGUAGE_CODES)('%s: text pridania sa líši od textu úpravy', (language) => {
    const { reviews } = LANGUAGES[language];

    expect(reviews.addReviewFailed).not.toBe(reviews.editReviewFailed);
  });

  it('texty sa v jednotlivých jazykoch navzájom líšia (nie sú skopírované medzi jazykmi)', () => {
    const add = LANGUAGE_CODES.map((language) => LANGUAGES[language].reviews.addReviewFailed);
    const edit = LANGUAGE_CODES.map((language) => LANGUAGES[language].reviews.editReviewFailed);

    expect(new Set(add).size).toBe(LANGUAGE_CODES.length);
    expect(new Set(edit).size).toBe(LANGUAGE_CODES.length);
  });
});
