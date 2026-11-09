import { AxiosError } from 'axios';

import { getApiErrorMessage, getFieldErrorMessage } from '../apiError';

describe('getFieldErrorMessage', () => {
  it('uprednostní data.error pred field poľami', () => {
    const err = { response: { data: { error: 'Chyba', rating: ['R'] } } };
    expect(getFieldErrorMessage(err, 'fb')).toBe('Chyba');
  });

  it('padne na prvý prvok field poľa v poradí rating→pros→cons→text', () => {
    expect(getFieldErrorMessage({ response: { data: { rating: ['R', 'x'] } } }, 'fb')).toBe('R');
    expect(getFieldErrorMessage({ response: { data: { pros: ['P'] } } }, 'fb')).toBe('P');
    expect(getFieldErrorMessage({ response: { data: { cons: ['C'] } } }, 'fb')).toBe('C');
    expect(getFieldErrorMessage({ response: { data: { text: ['T'] } } }, 'fb')).toBe('T');
  });

  it('použije fallback keď nič nesedí (prázdny data, Error, undefined)', () => {
    expect(getFieldErrorMessage({ response: { data: {} } }, 'fb')).toBe('fb');
    expect(getFieldErrorMessage(new Error('boom'), 'fb')).toBe('fb');
    expect(getFieldErrorMessage(undefined, 'fb')).toBe('fb');
  });

  it('ignoruje prázdne reťazce a ne-poľové hodnoty', () => {
    const err = { response: { data: { error: '', rating: 'nie-pole', pros: [''], cons: ['C'] } } };
    expect(getFieldErrorMessage(err, 'fb')).toBe('C');
  });

  it('delete-vzor: bez field polí = data.error || fallback', () => {
    expect(getFieldErrorMessage({ response: { data: { error: 'X' } } }, 'fb')).toBe('X');
    expect(getFieldErrorMessage({ response: { data: {} } }, 'fb')).toBe('fb');
  });

  it('submit-vzor: error.message vložený do fallbacku ostáva v reťazci', () => {
    // Volajúci odovzdá `error.message || localizedFallback` ako fallback.
    const networkErr = { message: 'Network Error' };
    const fallback = (networkErr as { message?: string }).message || 'lokalizovaný';
    expect(getFieldErrorMessage(networkErr, fallback)).toBe('Network Error');
  });
});

describe('getApiErrorMessage', () => {
  it('poradie error → detail → message → error.message → fallback', () => {
    expect(getApiErrorMessage({ response: { data: { error: 'E' } } }, 'fb')).toBe('E');
    expect(getApiErrorMessage({ response: { data: { detail: 'D' } } }, 'fb')).toBe('D');
    expect(getApiErrorMessage({ message: 'M' }, 'fb')).toBe('M');
    expect(getApiErrorMessage(undefined, 'fb')).toBe('fb');
  });
});

/**
 * Sieťová chyba v toaste (nález 306): knižnica axios pri výpadku, offline alebo časovom limite nenastaví `response`
 * a jej `message` je technický anglický text („Network Error“). Používateľ má dostať preložený záložný text.
 */
describe('getApiErrorMessage: chyba axiosu bez odpovede servera', () => {
  it('skutočná sieťová chyba axiosu (ERR_NETWORK) vráti záložný text, nie „Network Error“', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    expect(error.message).toBe('Network Error');
    expect(getApiErrorMessage(error, 'Preložený text')).toBe('Preložený text');
  });

  it.each([
    ['ECONNABORTED', 'timeout of 30000ms exceeded'],
    ['ETIMEDOUT', 'connect ETIMEDOUT'],
    ['ERR_NETWORK', 'Network Error'],
  ])('chyba axiosu s kódom %s a technickou hláškou vráti záložný text', (code, message) => {
    expect(getApiErrorMessage(new AxiosError(message, code), 'fb')).toBe('fb');
    expect(getApiErrorMessage({ code, message }, 'fb')).toBe('fb');
    expect(getApiErrorMessage(Object.assign(new Error(message), { code }), 'fb')).toBe('fb');
  });

  it('zrušená požiadavka axiosu (ERR_CANCELED, bez odpovede) vráti záložný text', () => {
    expect(getApiErrorMessage(new AxiosError('canceled', 'ERR_CANCELED'), 'fb')).toBe('fb');
  });

  it('text, ktorý poslal server, má prednosť aj pri chybe axiosu', () => {
    const error = new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { error: 'Heslo je príliš slabé.' },
    } as never);

    expect(getApiErrorMessage(error, 'fb')).toBe('Heslo je príliš slabé.');
  });

  it('server odpovedal (response je), preto sa kód ani hláška knižnice sieťovej chyby nepoužijú na záložný text', () => {
    const withDetail = { code: 'ERR_NETWORK', response: { data: { detail: 'D' } }, message: 'Network Error' };

    expect(getApiErrorMessage(withDetail, 'fb')).toBe('D');
  });

  it('obyčajné Error s vlastnou správou ostáva ako dnes', () => {
    expect(getApiErrorMessage(new Error('x'), 'fb')).toBe('x');
    expect(getApiErrorMessage(new Error('Odstránenie obrázka zlyhalo'), 'fb')).toBe('Odstránenie obrázka zlyhalo');
    expect(getApiErrorMessage({ message: 'M' }, 'fb')).toBe('M');
  });

  it('Error s textom „Network Error“, ale bez kódu a bez príznaku axiosu, sa nepovažuje za sieťovú chybu', () => {
    expect(getApiErrorMessage(new Error('Network Error'), 'fb')).toBe('Network Error');
  });

  it('bez chyby alebo s nereťazcovou správou vráti záložný text', () => {
    expect(getApiErrorMessage(null, 'fb')).toBe('fb');
    expect(getApiErrorMessage(undefined, 'fb')).toBe('fb');
    expect(getApiErrorMessage({ message: 42 }, 'fb')).toBe('fb');
  });
});
