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
