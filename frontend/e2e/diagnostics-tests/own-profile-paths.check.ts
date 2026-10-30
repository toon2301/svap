import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { matchesAppPath, ownProfilePaths } from '../support/own-profile-paths';

const ORIGIN = 'https://diagnostic.invalid';

test('kanonický slug s bodkou má prednosť pred numerickým fallbackom', () => {
  assert.deepEqual(ownProfilePaths({ id: 7, slug: 'vzor.profil-2' }), {
    canonical: '/dashboard/users/vzor.profil-2', numeric: '/dashboard/users/7',
  });
});

test('legacy slugy s pomlčkou, podčiarkovníkom a veľkými písmenami sa nemenia', () => {
  for (const slug of ['vzor-profil', 'Vzor_Profil', '7profil', 'profil.7']) {
    assert.equal(ownProfilePaths({ id: 7, slug }).canonical, `/dashboard/users/${slug}`);
  }
});

test('numerický tvar sa použije iba pri chýbajúcom historickom slugu', () => {
  for (const slug of [undefined, null, '']) {
    assert.deepEqual(ownProfilePaths({ id: 7, slug }), {
      canonical: '/dashboard/users/7', numeric: '/dashboard/users/7',
    });
  }
});

test('neplatná štruktúra odpovede sa nezamení za inú profilovú adresu', () => {
  for (const value of [undefined, null, false, 7, 'vzor', [], {}]) {
    assert.throws(() => ownProfilePaths(value), /^Error: Príprava profilu:/);
  }
});

test('neplatné ID sa nepoužije ani v prítomnosti platného slugu', () => {
  for (const id of [undefined, null, '7', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => ownProfilePaths({ id, slug: 'vzor.profil' }), /platná identita/);
  }
});

test('neplatný neprázdny slug sa nesmie potichu zameniť za ID', () => {
  for (const slug of [false, 7, {}, [], ' ', 'vzor/profil', 'vzor?x', 'vzor#x', 'vzor%x', '.', '..', 'vzor\nprofil']) {
    assert.throws(() => ownProfilePaths({ id: 7, slug }), /nepodporovaný tvar slugu/);
  }
});

test('slug sa neorezáva a rešpektuje limit serverového poľa', () => {
  const allowed = 'a'.repeat(150);
  assert.equal(ownProfilePaths({ id: 7, slug: allowed }).canonical, `/dashboard/users/${allowed}`);
  assert.throws(() => ownProfilePaths({ id: 7, slug: `${allowed}a` }), /nepodporovaný tvar slugu/);
});

test('chyby nevypisujú hodnotu ID ani slugu', () => {
  const privateMarker = 'DO_NOT_PUBLISH/';
  assert.throws(() => ownProfilePaths({ id: 7, slug: privateMarker }), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /^Príprava profilu:/);
    assert.ok(!error.message.includes(privateMarker));
    assert.ok(!error.message.includes('/dashboard/users/'));
    return true;
  });
});

test('správna cesta sa rozpozná bez ohľadu na nesúvisiace query a fragment', () => {
  const route = '/dashboard/users/vzor.profil/language';
  for (const suffix of ['', '/', '?tab=offers', '#sekcia', '/?tab=offers#sekcia']) {
    assert.equal(matchesAppPath(`${ORIGIN}${route}${suffix}`, route, ORIGIN), true);
  }
});

test('iná sekcia, iný profil ani prefixová zhoda neprejdú', () => {
  const route = '/dashboard/users/vzor.profil/language';
  for (const actual of [
    '/dashboard/users/vzor.profil', '/dashboard/users/iny.profil/language',
    `${route}/extra`, `${route}//`, '/dashboard/language', '/dashboard/users/7/language',
  ]) assert.equal(matchesAppPath(`${ORIGIN}${actual}`, route, ORIGIN), false);
});

test('nesprávna doména, schéma, port a vložené prihlasovacie údaje neprejdú', () => {
  const route = '/dashboard/language';
  for (const origin of ['https://other.invalid', 'http://diagnostic.invalid', 'https://diagnostic.invalid:444',
    'https://diagnostic.invalid.other.invalid', 'https://name:placeholder@diagnostic.invalid']) {
    assert.equal(matchesAppPath(`${origin}${route}`, route, ORIGIN), false);
  }
  assert.equal(matchesAppPath('file:///dashboard/language', route, 'file:///'), false);
  assert.equal(matchesAppPath(`${ORIGIN}${route}`, route, 'https://name:placeholder@diagnostic.invalid'), false);
});

test('neplatná adresa nevyhodí chybu a neprijme relatívnu URL', () => {
  assert.equal(matchesAppPath('/dashboard/language', '/dashboard/language', ORIGIN), false);
  assert.equal(matchesAppPath('not-a-url', '/dashboard/language', ORIGIN), false);
  assert.equal(matchesAppPath(`${ORIGIN}/dashboard/language`, '/dashboard/language', 'not-a-url'), false);
});

test('číslo a kanonický slug zostávajú odlišné očakávania, nie všeobecná výnimka', () => {
  const paths = ownProfilePaths({ id: 7, slug: 'vzor.profil' });
  assert.equal(matchesAppPath(`${ORIGIN}${paths.canonical}`, paths.numeric, ORIGIN), false);
  assert.equal(matchesAppPath(`${ORIGIN}${paths.numeric}`, paths.canonical, ORIGIN), false);
});

test('numerický regresný špec zostáva bežným testom bez skrytia aplikačného pádu', () => {
  const spec = fs.readFileSync(path.join(__dirname, '../profile-numeric-language.spec.ts'), 'utf8');
  assert.ok(spec.includes('paths.numeric}/language'));
  assert.ok(spec.includes('paths.canonical}/language'));
  assert.ok(spec.includes('await page.reload()'));
  assert.ok(!/test\.(?:fail|fixme)\s*\(/.test(spec));
  assert.equal((spec.match(/test\.skip\s*\(/g) ?? []).length, 1);
  assert.ok(spec.includes('test.skip(!isMobile,'));
});
