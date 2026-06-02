import { shareOwnProfileLink } from '../shareOwnProfileLink';
import type { User } from '@/types';

const baseUser: User = {
  id: 1,
  username: 'tester',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'test-user',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 50,
};

const messages = {
  shareTitle: 'Share profile',
  linkCopied: 'Copied',
  linkCopyFailed: 'Copy failed',
};

describe('shareOwnProfileLink', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://example.com' },
    });
  });

  it('uses navigator.share when available', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    await shareOwnProfileLink(baseUser, messages);

    expect(share).toHaveBeenCalledWith({
      title: 'Share profile',
      text: 'Test User',
      url: 'https://example.com/dashboard/users/test-user',
    });
  });

  it('falls back to clipboard when share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onCopied = jest.fn();

    await shareOwnProfileLink(baseUser, messages, { onCopied });

    expect(writeText).toHaveBeenCalledWith('https://example.com/dashboard/users/test-user');
    expect(onCopied).toHaveBeenCalledWith('Copied');
  });

  it('falls back to clipboard when navigator.share fails with a real error', async () => {
    const share = jest.fn().mockRejectedValue(new Error('share failed'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onCopied = jest.fn();

    await shareOwnProfileLink(baseUser, messages, { onCopied });

    expect(share).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith('https://example.com/dashboard/users/test-user');
    expect(onCopied).toHaveBeenCalledWith('Copied');
  });
});
