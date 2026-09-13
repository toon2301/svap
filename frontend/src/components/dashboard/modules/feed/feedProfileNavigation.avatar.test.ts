import { openUserProfile } from './feedProfileNavigation';
import { preloadProfileAvatar } from '../profile/preloadAvatar';

jest.mock('../profile/preloadAvatar', () => ({
  preloadProfileAvatar: jest.fn(),
}));

describe('openUserProfile avatar preload', () => {
  it('starts loading the known feed avatar before dispatching navigation', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    openUserProfile({
      id: 42,
      slug: 'jana',
      avatar_url: 'https://media.example.com/avatars/jana.webp',
    });

    expect(preloadProfileAvatar).toHaveBeenCalledWith(
      'https://media.example.com/avatars/jana.webp',
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'goToUserProfile' }),
    );
    dispatchSpy.mockRestore();
  });
});
