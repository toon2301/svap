import { render, renderHook } from '@testing-library/react';
import OnboardingScrollLock, { useOnboardingScrollLock } from '../OnboardingScrollLock';
import { useOptionalDesktopOnboarding } from '../DesktopOnboardingContext';
import { useOptionalMobileOnboarding } from '../MobileOnboardingContext';

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
});
