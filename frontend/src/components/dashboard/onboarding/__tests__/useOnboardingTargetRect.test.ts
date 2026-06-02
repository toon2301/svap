import { act, renderHook, waitFor } from '@testing-library/react';
import { useOnboardingTargetRect } from '../useOnboardingTargetRect';

function mockRect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('useOnboardingTargetRect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('measures target after delayed DOM mount', async () => {
    const selector = '[data-onboarding="profile-edit-button"]';

    const { result } = renderHook(() => useOnboardingTargetRect(selector, true));

    expect(result.current).toBeNull();

    const button = document.createElement('button');
    button.setAttribute('data-onboarding', 'profile-edit-button');
    button.getBoundingClientRect = () => mockRect(100, 20, 120, 36);
    document.body.appendChild(button);

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        top: 100,
        left: 20,
        width: 120,
        height: 36,
      });
    });
  });

  it('re-measures when refreshKey changes', async () => {
    const selector = '[data-onboarding="profile-edit-button"]';
    const button = document.createElement('button');
    button.setAttribute('data-onboarding', 'profile-edit-button');
    button.getBoundingClientRect = () => mockRect(10, 10, 80, 32);
    document.body.appendChild(button);

    const { result, rerender } = renderHook(
      ({ refreshKey }) => useOnboardingTargetRect(selector, true, refreshKey),
      { initialProps: { refreshKey: 0 } },
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current?.top).toBe(10);
    });

    button.getBoundingClientRect = () => mockRect(40, 10, 80, 32);

    rerender({ refreshKey: 1 });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current?.top).toBe(40);
    });
  });
});
