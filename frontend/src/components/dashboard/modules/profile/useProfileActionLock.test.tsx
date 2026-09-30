/**
 * Zámok akcií nad vlastným profilom patrí modulu, nie komponentu: prežije
 * odmountovanie inštancie, ktorá akciu začala (viď `ProfileModule.saveLock`).
 */

import { act, renderHook } from '@testing-library/react';
import { resetProfileActionLock, useProfileActionLock } from './useProfileActionLock';

describe('useProfileActionLock', () => {
  beforeEach(() => {
    resetProfileActionLock();
  });

  it('jedna akcia naraz: kým beží, ďalšia sa nezačne', () => {
    const { result } = renderHook(() => useProfileActionLock());
    expect(result.current.isBusy).toBe(false);

    let actionId: number | null = null;
    act(() => {
      actionId = result.current.beginAction();
    });

    expect(actionId).not.toBeNull();
    expect(result.current.isBusy).toBe(true);
    expect(result.current.beginAction()).toBeNull();
  });

  it('zámok prežije odmountovanie inštancie, ktorá akciu začala', () => {
    const first = renderHook(() => useProfileActionLock());
    let actionId = 0;
    act(() => {
      actionId = first.result.current.beginAction() as number;
    });
    first.unmount();

    const second = renderHook(() => useProfileActionLock());

    expect(second.result.current.isBusy).toBe(true);
    expect(second.result.current.beginAction()).toBeNull();
    expect(second.result.current.isActionActive(actionId)).toBe(true);
  });

  it('dokončenie akcie z odmountovanej inštancie uvoľní zámok aj v novej', () => {
    const first = renderHook(() => useProfileActionLock());
    const second = renderHook(() => useProfileActionLock());
    let actionId = 0;
    act(() => {
      actionId = first.result.current.beginAction() as number;
    });
    expect(second.result.current.isBusy).toBe(true);
    first.unmount();

    act(() => {
      first.result.current.endAction(actionId);
    });

    expect(second.result.current.isBusy).toBe(false);
    expect(second.result.current.isActionActive(actionId)).toBe(false);

    let nextId: number | null = null;
    act(() => {
      nextId = second.result.current.beginAction();
    });
    expect(nextId).not.toBeNull();
  });

  it('endAction s cudzím ID zámok neuvoľní', () => {
    const { result } = renderHook(() => useProfileActionLock());
    let actionId = 0;
    act(() => {
      actionId = result.current.beginAction() as number;
    });

    act(() => {
      result.current.endAction(actionId + 1);
    });

    expect(result.current.isBusy).toBe(true);
    expect(result.current.isActionActive(actionId)).toBe(true);
    expect(result.current.isActionActive(actionId + 1)).toBe(false);
  });

  it('každá nová akcia má vlastné ID – skončená akcia už nie je aktívna', () => {
    const { result } = renderHook(() => useProfileActionLock());
    let firstId = 0;
    let secondId = 0;
    act(() => {
      firstId = result.current.beginAction() as number;
    });
    act(() => {
      result.current.endAction(firstId);
    });
    act(() => {
      secondId = result.current.beginAction() as number;
    });

    expect(secondId).not.toBe(firstId);
    expect(result.current.isActionActive(firstId)).toBe(false);
    expect(result.current.isActionActive(secondId)).toBe(true);
  });
});
