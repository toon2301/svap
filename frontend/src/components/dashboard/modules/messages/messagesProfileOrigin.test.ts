/**
 * Pôvod konverzácie otvorenej z profilu (šípka späť v mobilných Správach).
 *
 * Značka sa píše do `history.state` záznamu konverzácie. Overuje sa jej celý
 * život: otvorenie z profilu (vrátane dvojkliku), prevzatie po zobrazení Správ,
 * prenos pri nahradení záznamu a krok späť s ochranou proti dvojitému ťuknutiu.
 */

import {
  adoptMessagesProfileOrigin,
  carryMessagesProfileOrigin,
  openMessagesFromProfile,
  resetMessagesProfileOrigin,
  returnToMessagesProfileOrigin,
} from './messagesProfileOrigin';
import { navigateMessagesUrl } from './messagesRouting';

const KEY = '__svaplyMessagesProfileOrigin';
const MARKER = { version: 1 };
const DRAFT_URL = '/dashboard/messages?targetUserId=42';

const makeRouter = () => ({ push: jest.fn() });

/** Simuluje príchod na stránku, ktorú Next práve otvoril (adresu už zapísal). */
const arriveAt = (url: string) => window.history.replaceState({ __NA: true }, '', url);

const stateOf = () => window.history.state as Record<string, unknown> | null;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  resetMessagesProfileOrigin();
  window.history.replaceState(null, '', '/dashboard/users/jana');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  resetMessagesProfileOrigin();
});

describe('openMessagesFromProfile', () => {
  it('opens the draft route through the router', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, DRAFT_URL);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(DRAFT_URL);
  });

  it('just navigates (and remembers nothing) when the address has no target user', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, '/dashboard/messages');
    arriveAt('/dashboard/messages');
    adoptMessagesProfileOrigin();

    expect(router.push).toHaveBeenCalledWith('/dashboard/messages');
    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('ignores a quick second open of the same user (double click)', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, DRAFT_URL);
    jest.advanceTimersByTime(300);
    openMessagesFromProfile(router, DRAFT_URL);

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('opens again once the double-click window has passed', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, DRAFT_URL);
    jest.advanceTimersByTime(1000);
    openMessagesFromProfile(router, DRAFT_URL);

    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('does not treat another user as a double click', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, DRAFT_URL);
    openMessagesFromProfile(router, '/dashboard/messages?targetUserId=43');

    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('opens again after the first attempt was adopted', () => {
    const router = makeRouter();

    openMessagesFromProfile(router, DRAFT_URL);
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();
    openMessagesFromProfile(router, DRAFT_URL);

    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('forgets the attempt and rethrows when the navigation fails', () => {
    const router = {
      push: jest.fn(() => {
        throw new Error('push failed');
      }),
    };

    expect(() => openMessagesFromProfile(router, DRAFT_URL)).toThrow('push failed');

    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();
    expect(stateOf()?.[KEY]).toBeUndefined();
    // A okamžitý nový pokus nie je „dvojklik" – prvý nedoletel.
    const second = makeRouter();
    openMessagesFromProfile(second, DRAFT_URL);
    expect(second.push).toHaveBeenCalledTimes(1);
  });
});

describe('adoptMessagesProfileOrigin', () => {
  it('marks the conversation entry when the app opened it from a profile', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toEqual(MARKER);
  });

  it('keeps the keys the router wrote into the entry', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);

    adoptMessagesProfileOrigin();

    expect(stateOf()?.__NA).toBe(true);
  });

  it('keeps the address untouched', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);

    adoptMessagesProfileOrigin();

    expect(window.location.pathname + window.location.search).toBe(DRAFT_URL);
  });

  it('adopts only once', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();

    // Iný záznam toho istého typu (napr. otvorený odkazom) značku nedostane.
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('marks nothing when nothing was opened from a profile', () => {
    arriveAt(DRAFT_URL);

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('marks nothing when a different user arrived', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt('/dashboard/messages?targetUserId=43');

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('marks nothing when a conversation list arrived instead', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt('/dashboard/messages');

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('marks nothing on another page', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt('/dashboard/users/jana');

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('marks nothing on another page that happens to carry the same user in its query', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt('/dashboard/users/jana?targetUserId=42');

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('does not let a stale attempt claim an entry opened another way', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    jest.advanceTimersByTime(11_000);
    arriveAt(DRAFT_URL);

    adoptMessagesProfileOrigin();

    expect(stateOf()?.[KEY]).toBeUndefined();
  });

  it('survives an entry that is not an object', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    window.history.replaceState('text', '', DRAFT_URL);

    expect(() => adoptMessagesProfileOrigin()).not.toThrow();
    expect(stateOf()?.[KEY]).toEqual(MARKER);
  });
});

describe('carryMessagesProfileOrigin', () => {
  it('returns nothing for an entry without the marker', () => {
    arriveAt(DRAFT_URL);

    expect(carryMessagesProfileOrigin()).toBeNull();
  });

  it('returns nothing for an empty history state', () => {
    window.history.replaceState(null, '', DRAFT_URL);

    expect(carryMessagesProfileOrigin()).toBeNull();
  });

  it('returns just the marker, never the whole state', () => {
    window.history.replaceState({ __NA: true, other: 1, [KEY]: MARKER }, '', DRAFT_URL);

    // Next preskočí aktualizáciu adresy, keď dostane stav s vlastnými kľúčmi.
    expect(carryMessagesProfileOrigin()).toEqual({ [KEY]: MARKER });
  });

  it('ignores a marker of another version', () => {
    window.history.replaceState({ [KEY]: { version: 2 } }, '', DRAFT_URL);

    expect(carryMessagesProfileOrigin()).toBeNull();
  });
});

describe('returnToMessagesProfileOrigin', () => {
  const marked = () => window.history.replaceState({ __NA: true, [KEY]: MARKER }, '', DRAFT_URL);

  it('says there is no origin for an entry without the marker', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    arriveAt(DRAFT_URL);

    expect(returnToMessagesProfileOrigin()).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it('steps back once when the origin is known', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    marked();

    expect(returnToMessagesProfileOrigin()).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('swallows a second tap while the first step back is still on its way', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    marked();

    returnToMessagesProfileOrigin();
    const second = returnToMessagesProfileOrigin();

    // `true` = obslúžené, volajúci nesmie spadnúť na zoznam konverzácií.
    expect(second).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('works again after the step back finished (popstate)', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    marked();
    returnToMessagesProfileOrigin();

    window.dispatchEvent(new PopStateEvent('popstate'));
    marked();
    returnToMessagesProfileOrigin();

    expect(back).toHaveBeenCalledTimes(2);
  });

  it('lets itself be used again when popstate never arrives', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    marked();
    returnToMessagesProfileOrigin();

    jest.advanceTimersByTime(1500);
    returnToMessagesProfileOrigin();

    expect(back).toHaveBeenCalledTimes(2);
  });

  it('does not leave a listener behind after the step back finished', () => {
    jest.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    marked();
    returnToMessagesProfileOrigin();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});

describe('celý tok: profil → konverzácia → šípka späť', () => {
  it('draft, prvá správa (nahradenie záznamu) a šípka vedú späť na profil', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);

    // Profil → „Poslať správu" → Správy s rozpísanou konverzáciou.
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();
    // Odoslanie prvej správy nahradí záznam adresou vytvorenej konverzácie.
    navigateMessagesUrl(9, { mode: 'replace' });

    expect(window.location.search).toBe('?conversationId=9');
    expect(returnToMessagesProfileOrigin()).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('existujúca konverzácia (draft sa hneď nahradí) drží pôvod rovnako', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);

    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();
    navigateMessagesUrl(12, { mode: 'replace' });

    expect(returnToMessagesProfileOrigin()).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('konverzácia otvorená inak (zoznam, notifikácia) nemá pôvod: šípka ide na zoznam', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined);

    arriveAt('/dashboard/messages?conversationId=9');
    adoptMessagesProfileOrigin();

    expect(returnToMessagesProfileOrigin()).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it('po úprave adresy na zoznam sa pôvod nenesie ďalej', () => {
    openMessagesFromProfile(makeRouter(), DRAFT_URL);
    arriveAt(DRAFT_URL);
    adoptMessagesProfileOrigin();
    navigateMessagesUrl(null, { mode: 'replace' });

    expect(carryMessagesProfileOrigin()).toBeNull();
  });
});
