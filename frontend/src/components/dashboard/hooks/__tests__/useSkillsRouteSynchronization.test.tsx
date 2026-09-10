import { act, renderHook } from '@testing-library/react';
import {
  getSkillsModuleFromPath,
  useSkillsRouteSynchronization,
} from '../useSkillsRouteSynchronization';

function renderSynchronization() {
  const actions = {
    onModuleChange: jest.fn(),
    setIsSearchOpen: jest.fn(),
    setViewedUserId: jest.fn(),
    setViewedUserSlug: jest.fn(),
    setViewedUserSummary: jest.fn(),
  };
  const hook = renderHook(() => useSkillsRouteSynchronization(actions));
  return { ...hook, actions };
}

describe('useSkillsRouteSynchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/dashboard');
  });

  it.each([
    ['/dashboard/skills', 'skills'],
    ['/dashboard/skills/', 'skills'],
    ['/dashboard/skills/offer', 'skills-offer'],
    ['/dashboard/skills/search', 'skills-search'],
  ] as const)('maps %s to %s', (pathname, moduleId) => {
    expect(getSkillsModuleFromPath(pathname)).toBe(moduleId);
  });

  it('synchronizes the chooser after browser Back from a skills mode', () => {
    const { actions } = renderSynchronization();
    window.history.replaceState(null, '', '/dashboard/skills/offer');

    act(() => {
      window.history.replaceState(null, '', '/dashboard/skills');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(actions.onModuleChange).toHaveBeenCalledWith('skills');
    expect(actions.setIsSearchOpen).toHaveBeenCalledWith(false);
    expect(actions.setViewedUserId).toHaveBeenCalledWith(null);
    expect(actions.setViewedUserSlug).toHaveBeenCalledWith(null);
    expect(actions.setViewedUserSummary).toHaveBeenCalledWith(null);
  });

  it('synchronizes both skills modes when navigating Forward or Back', () => {
    const { actions } = renderSynchronization();

    act(() => {
      window.history.replaceState(null, '', '/dashboard/skills/search');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(actions.onModuleChange).toHaveBeenLastCalledWith('skills-search');

    act(() => {
      window.history.replaceState(null, '', '/dashboard/skills/offer');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(actions.onModuleChange).toHaveBeenLastCalledWith('skills-offer');
  });

  it('ignores unrelated and lookalike routes', () => {
    const { actions } = renderSynchronization();

    act(() => {
      window.history.replaceState(null, '', '/dashboard/skills/offering');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(actions.onModuleChange).not.toHaveBeenCalled();
  });
});
