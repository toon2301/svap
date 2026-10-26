import {
  classifyProfileLoadFailure,
  isNetworkFailure,
  profileLoadFailureMessage,
  type ProfileLoadFailure,
} from './foreignProfileHelpers';

describe('isNetworkFailure', () => {
  it.each(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'])(
    'chyba %s bez odpovede servera je výpadok siete',
    (code) => {
      expect(isNetworkFailure({ code, message: 'whatever' })).toBe(true);
    },
  );

  it('odpoveď servera nie je výpadok siete ani pri kóde, ktorý znie ako sieť', () => {
    expect(isNetworkFailure({ code: 'ERR_NETWORK', response: { status: 502 } })).toBe(false);
  });

  it('chyba bez kódu nie je výpadok siete (aj s textom „Network Error“)', () => {
    expect(isNetworkFailure({ message: 'Network Error' })).toBe(false);
    expect(isNetworkFailure({})).toBe(false);
  });

  it('iná chyba knižnice nie je výpadok siete', () => {
    expect(isNetworkFailure({ code: 'ERR_BAD_RESPONSE' })).toBe(false);
    expect(isNetworkFailure({ code: 'ERR_CANCELED' })).toBe(false);
  });

  it('prázdna hodnota nespadne', () => {
    expect(isNetworkFailure(null)).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
  });
});

describe('classifyProfileLoadFailure', () => {
  it('404 je nenájdený profil, 429 príliš veľa požiadaviek (aj keď server poslal text)', () => {
    expect(classifyProfileLoadFailure({ response: { status: 404, data: { error: 'Nenájdený' } } })).toEqual({
      kind: 'notFound',
    });
    expect(classifyProfileLoadFailure({ response: { status: 429, data: { detail: 'Throttled' } } })).toEqual({
      kind: 'rateLimited',
    });
  });

  it('text od servera (error, potom detail) sa ponechá tak, ako prišiel', () => {
    expect(
      classifyProfileLoadFailure({ response: { status: 500, data: { error: 'Chyba servera', detail: 'x' } } }),
    ).toEqual({ kind: 'server', message: 'Chyba servera' });
    expect(classifyProfileLoadFailure({ response: { status: 500, data: { detail: 'Podrobnosť' } } })).toEqual({
      kind: 'server',
      message: 'Podrobnosť',
    });
  });

  it('prázdny alebo nereťazcový text od servera sa neukáže', () => {
    expect(classifyProfileLoadFailure({ response: { status: 500, data: { error: '  ' } } })).toEqual({
      kind: 'generic',
    });
    expect(
      classifyProfileLoadFailure({
        response: { status: 500, data: { detail: ['a', 'b'] as unknown as string } },
      }),
    ).toEqual({ kind: 'generic' });
  });

  it('výpadok siete a časový limit sú sieť', () => {
    expect(classifyProfileLoadFailure({ code: 'ERR_NETWORK', message: 'Network Error' })).toEqual({
      kind: 'network',
    });
    expect(classifyProfileLoadFailure({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' })).toEqual({
      kind: 'network',
    });
  });

  it('technická správa knižnice sa nikdy nepoužije: bez kódu a bez textu od servera je to všeobecná chyba', () => {
    expect(classifyProfileLoadFailure({ message: 'Network Error' })).toEqual({ kind: 'generic' });
    expect(
      classifyProfileLoadFailure({ message: 'Request failed with status code 502', response: { status: 502 } }),
    ).toEqual({ kind: 'generic' });
    expect(classifyProfileLoadFailure({})).toEqual({ kind: 'generic' });
    expect(classifyProfileLoadFailure(null)).toEqual({ kind: 'generic' });
  });
});

describe('profileLoadFailureMessage', () => {
  // Atrapa `t`: vráti kľúč, aby bolo vidno, ktorý preklad sa použil.
  const t = (key: string, fallback?: string) => `${key}|${fallback}`;
  const message = (failure: ProfileLoadFailure) => profileLoadFailureMessage(failure, t);

  it('každý druh používa vlastný preklad so slovenským záložným textom', () => {
    expect(message({ kind: 'notFound' })).toBe(
      'search.userProfileNotFound|Profil používateľa sa nepodarilo načítať.',
    );
    expect(message({ kind: 'rateLimited' })).toBe(
      'search.userProfileRateLimited|Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.',
    );
    expect(message({ kind: 'network' })).toBe(
      'common.networkError|Chyba siete. Skontrolujte pripojenie a skúste to znova.',
    );
    expect(message({ kind: 'generic' })).toBe(
      'search.userProfileLoadError|Nepodarilo sa načítať profil používateľa.',
    );
  });

  it('text od servera sa nepreklada', () => {
    expect(message({ kind: 'server', message: 'Chyba servera' })).toBe('Chyba servera');
  });
});
