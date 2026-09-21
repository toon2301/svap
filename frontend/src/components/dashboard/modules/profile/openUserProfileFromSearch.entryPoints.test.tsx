/**
 * Každý vstup do cudzieho profilu musí odovzdať pôvod.
 *
 * Marker sa postupne pridával po jednom mieste a zakaždým sa našlo ďalšie,
 * ktoré ho obchádzalo vlastným `router.push` – karta ponuky na `/search`,
 * Obľúbené, Žiadosti, Správy. Test preto nekontroluje jedno miesto, ale
 * kontrakt: kto otvára cudzí profil, ide cez `openUserProfileFromSearch`.
 */

import fs from 'fs';
import path from 'path';
import {
  adoptProfileOrigin,
  readProfileOriginDepth,
  resetProfileOriginPending,
  returnToProfileOrigin,
  withProfileOriginStep,
} from './profileOriginHistory';
import { openUserProfileFromSearch } from './openUserProfileFromSearch';

const SRC_DIR = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      found.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/** Navigácia routerom na adresu profilu napísanú priamo v texte. */
const DIRECT_PROFILE_PUSH = /router\.(?:push|replace)\(\s*[`'"]\/dashboard\/users\//;

describe('nikto neotvára cudzí profil priamym pushom', () => {
  it('v zdrojákoch nezostal ani jeden', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((file) => DIRECT_PROFILE_PUSH.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_DIR, file).split(path.sep).join('/'));

    // Priamy push pôvod nenastaví a appková šípka potom profil neopustí –
    // vráti sa len o záložku. Nové miesto má ísť cez zdieľanú funkciu.
    expect(offenders).toEqual([]);
  });
});

describe('scenár z nálezu: karta ponuky na /search?tab=all', () => {
  beforeEach(() => {
    resetProfileOriginPending();
    window.history.replaceState(null, '', '/search?tab=all');
  });

  it('klik na autora → prepnutie záložky → šípka skočí na Vyhľadávanie', () => {
    const go = jest.spyOn(window.history, 'go').mockImplementation(() => {});
    const router = { push: jest.fn((url: string) => window.history.pushState(null, '', url)) };

    // Presne to, čo robí `onProfileClick` na karte ponuky.
    openUserProfileFromSearch(router, 'jana');
    adoptProfileOrigin();
    expect(readProfileOriginDepth(window.history.state)).toBe(0);

    // Používateľ si na profile prepne záložku – vlastný krok histórie.
    window.history.pushState(
      withProfileOriginStep(window.history.state),
      '',
      '/dashboard/users/jana?tab=portfolio',
    );

    expect(returnToProfileOrigin()).toBe(true);
    // Záložka + profil = dva kroky späť na Vyhľadávanie. Predtým sa šípka
    // vrátila len o záložku.
    expect(go).toHaveBeenCalledWith(-2);
    go.mockRestore();
  });

  it('autor so zvýraznenou ponukou (Žiadosti, Správy) tiež', () => {
    const router = { push: jest.fn((url: string) => window.history.pushState(null, '', url)) };

    openUserProfileFromSearch(router, 'jana', { highlightSkillId: 55 });
    adoptProfileOrigin();

    expect(router.push).toHaveBeenCalledWith('/dashboard/users/jana?highlight=55');
    expect(readProfileOriginDepth(window.history.state)).toBe(0);
  });
});
