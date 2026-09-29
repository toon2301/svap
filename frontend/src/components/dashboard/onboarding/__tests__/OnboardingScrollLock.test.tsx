import { act, render, renderHook } from '@testing-library/react';
import OnboardingScrollLock, { useOnboardingScrollLock } from '../OnboardingScrollLock';
import { useOptionalDesktopOnboarding } from '../DesktopOnboardingContext';
import { useOptionalMobileOnboarding } from '../MobileOnboardingContext';
import { useDashboardMainKey } from '../../hooks/useDashboardMainKey';

jest.mock('../DesktopOnboardingContext', () => ({
  useOptionalDesktopOnboarding: jest.fn(),
}));

jest.mock('../MobileOnboardingContext', () => ({
  useOptionalMobileOnboarding: jest.fn(),
}));

const mockUseOptionalDesktopOnboarding = jest.mocked(useOptionalDesktopOnboarding);
const mockUseOptionalMobileOnboarding = jest.mocked(useOptionalMobileOnboarding);

function appendDashboardMain(overflowY = 'auto'): HTMLElement {
  const main = document.createElement('main');
  main.dataset.dashboardMain = '';
  main.style.overflowY = overflowY;
  document.body.appendChild(main);
  return main;
}

/** Swaps the dashboard `<main>` for a brand-new element, as `DashboardLayout` does on a module change. */
function replaceDashboardMain(previous: HTMLElement, overflowY = 'auto'): HTMLElement {
  const next = document.createElement('main');
  next.dataset.dashboardMain = '';
  next.style.overflowY = overflowY;
  previous.replaceWith(next);
  return next;
}

/** MutationObserver callbacks are microtasks – let them (and any follow-up records) run before asserting. */
async function flushMutationObservers(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Mirrors `DashboardLayout`: a new `<main>` element whenever the module changes. */
function DashboardMainHarness({ moduleName, locked }: { moduleName: string; locked: boolean }) {
  const mainKey = useDashboardMainKey(moduleName);
  useOnboardingScrollLock(locked);
  return (
    <main key={mainKey} data-dashboard-main>
      {moduleName}
    </main>
  );
}

describe('OnboardingScrollLock', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockUseOptionalDesktopOnboarding.mockReturnValue(null);
    mockUseOptionalMobileOnboarding.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('locks wheel, touch and keyboard scrolling without blocking clicks', () => {
    const main = appendDashboardMain();
    main.scrollTop = 120;
    const clickHandler = jest.fn();
    main.addEventListener('click', clickHandler);

    const { rerender } = renderHook(
      ({ isLocked }) => useOnboardingScrollLock(isLocked),
      { initialProps: { isLocked: true } },
    );

    expect(main.style.overflowY).toBe('hidden');
    expect(main.scrollTop).toBe(120);
    expect(
      main.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true })),
    ).toBe(false);
    expect(
      main.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true })),
    ).toBe(false);
    expect(
      main.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
      ),
    ).toBe(false);

    expect(main.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(
      true,
    );
    expect(clickHandler).toHaveBeenCalledTimes(1);

    rerender({ isLocked: false });
    expect(main.style.overflowY).toBe('auto');
  });

  it('keeps tutorial panel scrolling and keyboard controls available', () => {
    appendDashboardMain();
    const overlay = document.createElement('div');
    overlay.dataset.onboardingOverlay = '';
    const button = document.createElement('button');
    overlay.appendChild(button);
    document.body.appendChild(overlay);

    const { unmount } = renderHook(() => useOnboardingScrollLock(true));

    expect(
      overlay.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true })),
    ).toBe(true);
    expect(
      overlay.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true })),
    ).toBe(true);
    expect(
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      ),
    ).toBe(true);

    unmount();
  });

  it('restores the original main overflow when unmounted', () => {
    const main = appendDashboardMain('scroll');

    const { unmount } = renderHook(() => useOnboardingScrollLock(true));
    expect(main.style.overflowY).toBe('hidden');

    unmount();
    expect(main.style.overflowY).toBe('scroll');
  });

  it('activates when either onboarding overlay is visible', () => {
    const main = appendDashboardMain();
    mockUseOptionalDesktopOnboarding.mockReturnValue({
      isOverlayVisible: true,
    } as unknown as ReturnType<typeof useOptionalDesktopOnboarding>);

    const { rerender } = render(<OnboardingScrollLock />);
    expect(main.style.overflowY).toBe('hidden');

    mockUseOptionalDesktopOnboarding.mockReturnValue(null);
    mockUseOptionalMobileOnboarding.mockReturnValue({
      isOverlayVisible: true,
    } as unknown as ReturnType<typeof useOptionalMobileOnboarding>);
    rerender(<OnboardingScrollLock />);
    expect(main.style.overflowY).toBe('hidden');

    mockUseOptionalMobileOnboarding.mockReturnValue(null);
    rerender(<OnboardingScrollLock />);
    expect(main.style.overflowY).toBe('auto');
  });

  describe('when the dashboard <main> is replaced while the lock stays active', () => {
    it('moves the lock to the new main and gives the detached one its overflow back', async () => {
      const firstMain = appendDashboardMain('auto');
      renderHook(() => useOnboardingScrollLock(true));
      expect(firstMain.style.overflowY).toBe('hidden');

      const secondMain = replaceDashboardMain(firstMain, 'auto');
      await flushMutationObservers();

      expect(secondMain.style.overflowY).toBe('hidden');
      expect(firstMain.style.overflowY).toBe('auto');
    });

    it('still blocks wheel, touch and keyboard scrolling on the replaced main', async () => {
      const firstMain = appendDashboardMain();
      renderHook(() => useOnboardingScrollLock(true));

      const secondMain = replaceDashboardMain(firstMain);
      await flushMutationObservers();

      expect(
        secondMain.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true })),
      ).toBe(false);
      expect(
        secondMain.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true })),
      ).toBe(false);
      expect(
        secondMain.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
        ),
      ).toBe(false);
    });

    it('unlocking after a replacement restores the CURRENT main, not the first one', async () => {
      const firstMain = appendDashboardMain('auto');
      const { rerender } = renderHook(
        ({ isLocked }) => useOnboardingScrollLock(isLocked),
        { initialProps: { isLocked: true } },
      );
      const secondMain = replaceDashboardMain(firstMain, 'scroll');
      await flushMutationObservers();
      expect(secondMain.style.overflowY).toBe('hidden');

      rerender({ isLocked: false });

      expect(secondMain.style.overflowY).toBe('scroll');
      expect(firstMain.style.overflowY).toBe('auto');
    });

    it('a chain of replacements leaves exactly the last main locked', async () => {
      const mains = [appendDashboardMain('auto')];
      renderHook(() => useOnboardingScrollLock(true));

      for (let step = 0; step < 4; step += 1) {
        mains.push(replaceDashboardMain(mains[mains.length - 1], 'auto'));
        await flushMutationObservers();
      }

      const lockedMains = mains.filter((main) => main.style.overflowY === 'hidden');
      expect(lockedMains).toEqual([mains[mains.length - 1]]);
    });

    it('locks a main that only mounts after the lock has started', async () => {
      renderHook(() => useOnboardingScrollLock(true));

      const lateMain = appendDashboardMain('auto');
      await flushMutationObservers();

      expect(lateMain.style.overflowY).toBe('hidden');
    });

    it('leaves the locked main alone (no style rewrites) on unrelated DOM changes', async () => {
      const main = appendDashboardMain('scroll');
      renderHook(() => useOnboardingScrollLock(true));
      await flushMutationObservers();

      const styleWrites: MutationRecord[] = [];
      const styleWatcher = new MutationObserver((records) => styleWrites.push(...records));
      styleWatcher.observe(main, { attributes: true, attributeFilter: ['style'] });

      const child = document.createElement('div');
      main.appendChild(child);
      child.remove();
      document.body.appendChild(document.createElement('section'));
      await flushMutationObservers();
      styleWatcher.disconnect();

      expect(styleWrites).toHaveLength(0);
      expect(main.style.overflowY).toBe('hidden');
    });

    it('stops following replacements once the lock is released', async () => {
      const firstMain = appendDashboardMain('auto');
      const { rerender } = renderHook(
        ({ isLocked }) => useOnboardingScrollLock(isLocked),
        { initialProps: { isLocked: true } },
      );
      rerender({ isLocked: false });

      const secondMain = replaceDashboardMain(firstMain, 'auto');
      await flushMutationObservers();

      expect(secondMain.style.overflowY).toBe('auto');
    });

    it('stops following replacements after unmount', async () => {
      const firstMain = appendDashboardMain('auto');
      const { unmount } = renderHook(() => useOnboardingScrollLock(true));
      unmount();

      const secondMain = replaceDashboardMain(firstMain, 'auto');
      await flushMutationObservers();

      expect(secondMain.style.overflowY).toBe('auto');
    });

    it('re-locking after a release starts from the main mounted at that moment', async () => {
      const firstMain = appendDashboardMain('auto');
      const { rerender } = renderHook(
        ({ isLocked }) => useOnboardingScrollLock(isLocked),
        { initialProps: { isLocked: true } },
      );
      rerender({ isLocked: false });
      const secondMain = replaceDashboardMain(firstMain, 'scroll');

      rerender({ isLocked: true });
      expect(secondMain.style.overflowY).toBe('hidden');

      rerender({ isLocked: false });
      expect(secondMain.style.overflowY).toBe('scroll');
      expect(firstMain.style.overflowY).toBe('auto');
    });

    it('follows the real React key swap done by useDashboardMainKey (lock active before and after)', async () => {
      const { rerender } = render(<DashboardMainHarness moduleName="home" locked />);
      const homeMain = document.querySelector<HTMLElement>('[data-dashboard-main]') as HTMLElement;
      expect(homeMain.style.overflowY).toBe('hidden');

      rerender(<DashboardMainHarness moduleName="profile" locked />);
      await flushMutationObservers();

      const profileMain = document.querySelector<HTMLElement>('[data-dashboard-main]') as HTMLElement;
      expect(profileMain).not.toBe(homeMain);
      expect(homeMain.isConnected).toBe(false);
      expect(profileMain.style.overflowY).toBe('hidden');
    });

    it('a tutorial that ends on the same commit as the module change leaves the new main scrollable', async () => {
      const { rerender } = render(<DashboardMainHarness moduleName="home" locked />);

      rerender(<DashboardMainHarness moduleName="profile" locked={false} />);
      await flushMutationObservers();

      const profileMain = document.querySelector<HTMLElement>('[data-dashboard-main]') as HTMLElement;
      expect(profileMain.style.overflowY).toBe('');
    });

    it('a tutorial that starts on the same commit as the module change locks the new main', async () => {
      const { rerender } = render(<DashboardMainHarness moduleName="home" locked={false} />);

      rerender(<DashboardMainHarness moduleName="profile" locked />);
      await flushMutationObservers();

      const profileMain = document.querySelector<HTMLElement>('[data-dashboard-main]') as HTMLElement;
      expect(profileMain.style.overflowY).toBe('hidden');
    });
  });
});
