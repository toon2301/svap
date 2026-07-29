import { isDeletedUserName, requestUserName } from './requestUserName';

const t = (_key: string, fallback: string) => fallback;
const HEX = '0123456789abcdef0123456789abcdef'; // uuid4().hex = 32 hex znakov

describe('isDeletedUserName', () => {
  it('detects the exact anonymized username / email format', () => {
    expect(isDeletedUserName(`deleted-user-${HEX}`)).toBe(true);
    expect(isDeletedUserName(`deleted-user-${HEX}@deleted.local`)).toBe(true);
    // case-insensitive + okolité medzery
    expect(isDeletedUserName(`DELETED-USER-${HEX.toUpperCase()}`)).toBe(true);
    expect(isDeletedUserName(`   deleted-user-${HEX}   `)).toBe(true);
  });

  it('does NOT flag near-match real names', () => {
    // reálne meno, nie hex UUID
    expect(isDeletedUserName('deleted-user-support')).toBe(false);
    // hex, ale nesprávna doména / nekompletný tvar
    expect(isDeletedUserName('deleted-user-abc@example')).toBe(false);
    expect(isDeletedUserName(`deleted-user-${HEX}@evil.com`)).toBe(false);
    // prázdny hex
    expect(isDeletedUserName('deleted-user-')).toBe(false);
    // niečo navyše za UUID (nie presný koniec reťazca)
    expect(isDeletedUserName(`deleted-user-${HEX}extra`)).toBe(false);
    // prefix pred vzorom (nie je kotvený na začiatok)
    expect(isDeletedUserName(`prefix-deleted-user-${HEX}`)).toBe(false);
    // bežné mená a prázdne hodnoty
    expect(isDeletedUserName('Jozko Mrkvicka')).toBe(false);
    expect(isDeletedUserName('')).toBe(false);
    expect(isDeletedUserName(null)).toBe(false);
    expect(isDeletedUserName(undefined)).toBe(false);
  });
});

describe('requestUserName', () => {
  it('vráti lokalizovaný text pre zmazaný účet', () => {
    expect(requestUserName(`deleted-user-${HEX}`, t)).toBe('Zmazaný používateľ');
    expect(requestUserName(`deleted-user-${HEX}@deleted.local`, t)).toBe(
      'Zmazaný používateľ',
    );
  });

  it('near-match reálne mená ponechá zobrazené (nedetekuje ako zmazané)', () => {
    expect(requestUserName('deleted-user-support', t)).toBe('deleted-user-support');
    expect(requestUserName('deleted-user-abc@example', t)).toBe(
      'deleted-user-abc@example',
    );
    expect(requestUserName('Jozko Mrkvicka', t)).toBe('Jozko Mrkvicka');
  });

  it('prázdne meno → fallback "Používateľ"', () => {
    expect(requestUserName('', t)).toBe('Používateľ');
    expect(requestUserName(null, t)).toBe('Používateľ');
    expect(requestUserName(undefined, t)).toBe('Používateľ');
  });
});
