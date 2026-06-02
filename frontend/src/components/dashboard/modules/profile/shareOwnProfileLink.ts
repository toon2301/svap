import { getProfileDisplayName } from '@/lib/profileDisplayName';
import type { User } from '@/types';
import { buildProfileShareUrl } from './profileShareUrl';

type ShareProfileUser = Pick<
  User,
  'id' | 'slug' | 'username' | 'first_name' | 'last_name' | 'company_name' | 'user_type'
>;

export type ShareOwnProfileMessages = {
  shareTitle: string;
  linkCopied: string;
  linkCopyFailed: string;
};

export async function shareOwnProfileLink(
  user: ShareProfileUser,
  messages: ShareOwnProfileMessages,
  options?: {
    onCopied?: (message: string) => void;
    onCopyFailed?: (message: string) => void;
  },
): Promise<void> {
  const profileUrl = buildProfileShareUrl(user);
  const accountType = user.user_type === 'company' ? 'business' : 'personal';
  const displayName = getProfileDisplayName(user, accountType);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: messages.shareTitle,
        text: displayName,
        url: profileUrl,
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(profileUrl);
    options?.onCopied?.(messages.linkCopied);
  } catch {
    options?.onCopyFailed?.(messages.linkCopyFailed);
  }
}
